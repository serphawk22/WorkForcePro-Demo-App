"""
Team communication (Slack-style): workspace channels, direct messages,
threaded messages, unread counters, and real-time delivery over WebSockets.

REST handles history/pagination and persistence; the WebSocket pushes new
messages and typing indicators to connected channel members (no polling).
"""
from datetime import datetime, timezone
from typing import Dict, List, Optional, Set

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlmodel import Session, select

from app.auth import decode_token, get_current_user
from app.database import engine, get_session
from app.models import (
    Channel,
    ChannelCreate,
    ChannelMember,
    ChannelRead,
    ChannelType,
    Message,
    MessageCreate,
    MessageRead,
    User,
)

router = APIRouter(prefix="/chat", tags=["Chat"])


# ---------- in-memory connection manager ----------

class ConnectionManager:
    def __init__(self) -> None:
        self.active: Dict[int, Set[WebSocket]] = {}

    async def connect(self, user_id: int, ws: WebSocket) -> None:
        await ws.accept()
        self.active.setdefault(user_id, set()).add(ws)

    def disconnect(self, user_id: int, ws: WebSocket) -> None:
        conns = self.active.get(user_id)
        if conns:
            conns.discard(ws)
            if not conns:
                self.active.pop(user_id, None)

    def online_user_ids(self) -> List[int]:
        return list(self.active.keys())

    async def send_to_users(self, user_ids, payload: dict) -> None:
        for uid in set(user_ids):
            for ws in list(self.active.get(uid, [])):
                try:
                    await ws.send_json(payload)
                except Exception:
                    pass


manager = ConnectionManager()


# ---------- helpers ----------

def _member_ids(session: Session, channel_id: int) -> List[int]:
    return list(session.exec(select(ChannelMember.user_id).where(ChannelMember.channel_id == channel_id)).all())


def _is_member(session: Session, channel_id: int, user_id: int) -> bool:
    return session.exec(
        select(ChannelMember).where(ChannelMember.channel_id == channel_id, ChannelMember.user_id == user_id)
    ).first() is not None


def _ensure_member(session: Session, channel_id: int, user_id: int) -> None:
    if not _is_member(session, channel_id, user_id):
        session.add(ChannelMember(channel_id=channel_id, user_id=user_id))
        session.commit()


def _message_read(session: Session, msg: Message, users: Optional[dict] = None) -> MessageRead:
    sender = (users or {}).get(msg.sender_id) if users else session.get(User, msg.sender_id)
    return MessageRead(
        id=msg.id,
        channel_id=msg.channel_id,
        sender_id=msg.sender_id,
        sender_name=sender.name if sender else None,
        sender_profile_picture=sender.profile_picture if sender else None,
        body="(message deleted)" if msg.deleted_at else msg.body,
        thread_root_id=msg.thread_root_id,
        edited_at=msg.edited_at,
        deleted_at=msg.deleted_at,
        created_at=msg.created_at,
    )


def _channel_read(session: Session, ch: Channel, user_id: int) -> ChannelRead:
    members = _member_ids(session, ch.id)
    last_msg = session.exec(
        select(Message).where(Message.channel_id == ch.id).order_by(Message.created_at.desc())
    ).first()

    # unread = messages after this member's last_read_message_id
    cm = session.exec(
        select(ChannelMember).where(ChannelMember.channel_id == ch.id, ChannelMember.user_id == user_id)
    ).first()
    last_read = cm.last_read_message_id if cm else None
    unread_stmt = select(Message.id).where(Message.channel_id == ch.id, Message.sender_id != user_id)
    if last_read:
        unread_stmt = unread_stmt.where(Message.id > last_read)
    unread = len(session.exec(unread_stmt).all()) if cm else 0

    name = ch.name
    if ch.channel_type == ChannelType.direct:
        other_id = next((m for m in members if m != user_id), None)
        other = session.get(User, other_id) if other_id else None
        name = other.name if other else "Direct message"

    return ChannelRead(
        id=ch.id,
        organization_id=ch.organization_id,
        workspace_id=ch.workspace_id,
        channel_type=ch.channel_type,
        name=name,
        description=ch.description,
        created_by=ch.created_by,
        is_archived=ch.is_archived,
        created_at=ch.created_at,
        member_count=len(members),
        unread_count=unread,
        last_message_at=last_msg.created_at if last_msg else None,
    )


# ---------- channels ----------

@router.get("/channels", response_model=List[ChannelRead])
async def list_channels(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Public channels in the org + private channels/DMs the user belongs to."""
    member_channel_ids = set(
        session.exec(select(ChannelMember.channel_id).where(ChannelMember.user_id == current_user.id)).all()
    )
    public = session.exec(
        select(Channel).where(
            Channel.organization_id == current_user.organization_id,
            Channel.channel_type == ChannelType.channel,
            Channel.is_archived == False,  # noqa: E712
        )
    ).all()
    ids = {c.id for c in public} | member_channel_ids
    channels = [session.get(Channel, cid) for cid in ids]
    channels = [c for c in channels if c and not c.is_archived]
    reads = [_channel_read(session, c, current_user.id) for c in channels]
    reads.sort(key=lambda r: (r.last_message_at or r.created_at), reverse=True)
    return reads


@router.post("/channels", response_model=ChannelRead, status_code=status.HTTP_201_CREATED)
async def create_channel(
    data: ChannelCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    channel = Channel(
        organization_id=current_user.organization_id,
        workspace_id=data.workspace_id,
        channel_type=data.channel_type,
        name=data.name.strip(),
        description=data.description,
        created_by=current_user.id,
    )
    session.add(channel)
    session.commit()
    session.refresh(channel)

    member_ids = set(data.member_ids or [])
    member_ids.add(current_user.id)
    for uid in member_ids:
        session.add(ChannelMember(channel_id=channel.id, user_id=uid))
    session.commit()
    return _channel_read(session, channel, current_user.id)


@router.post("/dm/{user_id}", response_model=ChannelRead)
async def get_or_create_dm(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get (or create) the 1:1 direct-message channel with another user."""
    other = session.get(User, user_id)
    if not other or other.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # find an existing DM containing exactly these two users
    my_dms = session.exec(
        select(Channel)
        .join(ChannelMember, ChannelMember.channel_id == Channel.id)
        .where(Channel.channel_type == ChannelType.direct, ChannelMember.user_id == current_user.id)
    ).all()
    for ch in my_dms:
        members = set(_member_ids(session, ch.id))
        if members == {current_user.id, user_id}:
            return _channel_read(session, ch, current_user.id)

    channel = Channel(
        organization_id=current_user.organization_id,
        channel_type=ChannelType.direct,
        created_by=current_user.id,
    )
    session.add(channel)
    session.commit()
    session.refresh(channel)
    session.add(ChannelMember(channel_id=channel.id, user_id=current_user.id))
    if user_id != current_user.id:
        session.add(ChannelMember(channel_id=channel.id, user_id=user_id))
    session.commit()
    return _channel_read(session, channel, current_user.id)


# ---------- messages ----------

@router.get("/channels/{channel_id}/messages", response_model=List[MessageRead])
async def get_messages(
    channel_id: int,
    before_id: Optional[int] = None,
    limit: int = 50,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    channel = session.get(Channel, channel_id)
    if not channel or channel.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Channel not found")
    if channel.channel_type == ChannelType.channel:
        _ensure_member(session, channel_id, current_user.id)  # auto-join public channels
    elif not _is_member(session, channel_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this channel")

    stmt = select(Message).where(Message.channel_id == channel_id)
    if before_id:
        stmt = stmt.where(Message.id < before_id)
    stmt = stmt.order_by(Message.created_at.desc()).limit(min(limit, 100))
    rows = list(reversed(session.exec(stmt).all()))
    users = {u.id: u for u in session.exec(select(User).where(User.id.in_({m.sender_id for m in rows}))).all()} if rows else {}
    return [_message_read(session, m, users) for m in rows]


@router.post("/channels/{channel_id}/messages", response_model=MessageRead, status_code=status.HTTP_201_CREATED)
async def send_message(
    channel_id: int,
    data: MessageCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    channel = session.get(Channel, channel_id)
    if not channel or channel.organization_id != current_user.organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Channel not found")
    if channel.channel_type == ChannelType.channel:
        _ensure_member(session, channel_id, current_user.id)
    elif not _is_member(session, channel_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this channel")

    body = (data.body or "").strip()
    if not body:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message body required")

    msg = Message(
        organization_id=current_user.organization_id,
        channel_id=channel_id,
        sender_id=current_user.id,
        body=body,
        thread_root_id=data.thread_root_id,
    )
    session.add(msg)
    session.commit()
    session.refresh(msg)

    read = _message_read(session, msg)
    await manager.send_to_users(
        _member_ids(session, channel_id),
        {"type": "message", "channel_id": channel_id, "message": read.model_dump(mode="json")},
    )
    return read


@router.patch("/messages/{message_id}", response_model=MessageRead)
async def edit_message(
    message_id: int,
    data: MessageCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    msg = session.get(Message, message_id)
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    if msg.sender_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only edit your own messages")
    msg.body = data.body.strip()
    msg.edited_at = datetime.now(timezone.utc)
    session.add(msg)
    session.commit()
    session.refresh(msg)
    read = _message_read(session, msg)
    await manager.send_to_users(
        _member_ids(session, msg.channel_id),
        {"type": "message_edited", "channel_id": msg.channel_id, "message": read.model_dump(mode="json")},
    )
    return read


@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    msg = session.get(Message, message_id)
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    if msg.sender_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete your own messages")
    msg.deleted_at = datetime.now(timezone.utc)
    session.add(msg)
    session.commit()
    await manager.send_to_users(
        _member_ids(session, msg.channel_id),
        {"type": "message_deleted", "channel_id": msg.channel_id, "message_id": message_id},
    )
    return {"message": "Message deleted"}


@router.post("/channels/{channel_id}/read")
async def mark_read(
    channel_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    cm = session.exec(
        select(ChannelMember).where(ChannelMember.channel_id == channel_id, ChannelMember.user_id == current_user.id)
    ).first()
    if not cm:
        return {"unread_count": 0}
    last = session.exec(select(Message).where(Message.channel_id == channel_id).order_by(Message.id.desc())).first()
    if last:
        cm.last_read_message_id = last.id
        session.add(cm)
        session.commit()
    return {"unread_count": 0}


# ---------- websocket ----------

@router.websocket("/ws")
async def chat_websocket(websocket: WebSocket, token: str = ""):
    """Authenticate via ?token=, then push messages/typing to channel members."""
    token_data = decode_token(token) if token else None
    if not token_data or not token_data.user_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    user_id = token_data.user_id

    await manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "typing":
                channel_id = data.get("channel_id")
                if channel_id:
                    with Session(engine) as session:
                        recipients = [m for m in _member_ids(session, channel_id) if m != user_id]
                        user = session.get(User, user_id)
                    await manager.send_to_users(
                        recipients,
                        {
                            "type": "typing",
                            "channel_id": channel_id,
                            "user_id": user_id,
                            "user_name": user.name if user else None,
                        },
                    )
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
    except Exception:
        manager.disconnect(user_id, websocket)
