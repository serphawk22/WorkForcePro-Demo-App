"""
Reusable helpers for the generic Comment / Member / ActivityLog tables.

Every entity in the new hierarchy (node, task, subtask) shares these tables so
comment, membership and activity-history logic lives in exactly one place.
"""
from typing import Iterable, List, Optional

from sqlmodel import Session, select

from app.models import (
    ActivityLog,
    ActivityLogRead,
    Comment,
    CommentRead,
    Member,
    MemberRead,
    User,
)


# ---------- internal user lookups ----------

def _users_by_id(session: Session, ids: Iterable[int]) -> dict:
    wanted = {i for i in ids if i}
    if not wanted:
        return {}
    rows = session.exec(select(User).where(User.id.in_(wanted))).all()
    return {u.id: u for u in rows}


# ---------- activity history ----------

def log_activity(
    session: Session,
    *,
    organization_id: Optional[int],
    entity_type: str,
    entity_id: int,
    actor_id: int,
    action: str,
    detail: Optional[str] = None,
    commit: bool = False,
) -> ActivityLog:
    """Record an activity entry. Caller commits (or pass commit=True)."""
    entry = ActivityLog(
        organization_id=organization_id,
        entity_type=entity_type,
        entity_id=entity_id,
        actor_id=actor_id,
        action=action,
        detail=detail,
    )
    session.add(entry)
    if commit:
        session.commit()
        session.refresh(entry)
    return entry


def list_activity(session: Session, entity_type: str, entity_id: int, limit: int = 50) -> List[ActivityLogRead]:
    rows = session.exec(
        select(ActivityLog)
        .where(ActivityLog.entity_type == entity_type, ActivityLog.entity_id == entity_id)
        .order_by(ActivityLog.created_at.desc())
        .limit(limit)
    ).all()
    users = _users_by_id(session, {r.actor_id for r in rows})
    return [
        ActivityLogRead(
            id=r.id,
            entity_type=r.entity_type,
            entity_id=r.entity_id,
            actor_id=r.actor_id,
            actor_name=users[r.actor_id].name if r.actor_id in users else None,
            action=r.action,
            detail=r.detail,
            created_at=r.created_at,
        )
        for r in rows
    ]


# ---------- comments ----------

def _comment_read(comment: Comment, user: Optional[User]) -> CommentRead:
    return CommentRead(
        id=comment.id,
        entity_type=comment.entity_type,
        entity_id=comment.entity_id,
        user_id=comment.user_id,
        body=comment.body,
        parent_comment_id=comment.parent_comment_id,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        user_name=user.name if user else None,
        user_email=user.email if user else None,
        user_profile_picture=user.profile_picture if user else None,
    )


def add_comment(
    session: Session,
    *,
    organization_id: Optional[int],
    entity_type: str,
    entity_id: int,
    user_id: int,
    body: str,
    parent_comment_id: Optional[int] = None,
) -> Comment:
    comment = Comment(
        organization_id=organization_id,
        entity_type=entity_type,
        entity_id=entity_id,
        user_id=user_id,
        body=body,
        parent_comment_id=parent_comment_id,
    )
    session.add(comment)
    session.commit()
    session.refresh(comment)
    return comment


def list_comments(session: Session, entity_type: str, entity_id: int) -> List[CommentRead]:
    rows = session.exec(
        select(Comment)
        .where(Comment.entity_type == entity_type, Comment.entity_id == entity_id)
        .order_by(Comment.created_at.asc())
    ).all()
    users = _users_by_id(session, {r.user_id for r in rows})
    return [_comment_read(r, users.get(r.user_id)) for r in rows]


# ---------- members ----------

def list_members(session: Session, entity_type: str, entity_id: int) -> List[MemberRead]:
    rows = session.exec(
        select(Member).where(Member.entity_type == entity_type, Member.entity_id == entity_id)
    ).all()
    users = _users_by_id(session, {r.user_id for r in rows})
    out: List[MemberRead] = []
    for r in rows:
        u = users.get(r.user_id)
        out.append(
            MemberRead(
                id=r.id,
                entity_type=r.entity_type,
                entity_id=r.entity_id,
                user_id=r.user_id,
                role=r.role,
                user_name=u.name if u else None,
                user_email=u.email if u else None,
                user_profile_picture=u.profile_picture if u else None,
            )
        )
    return out


def sync_members(
    session: Session,
    *,
    entity_type: str,
    entity_id: int,
    user_ids: Optional[Iterable[int]],
    role: str = "member",
) -> None:
    """Make the member set for an entity exactly match user_ids (for the given role)."""
    if user_ids is None:
        return
    target = {int(u) for u in user_ids}
    existing = session.exec(
        select(Member).where(
            Member.entity_type == entity_type,
            Member.entity_id == entity_id,
            Member.role == role,
        )
    ).all()
    existing_ids = {m.user_id for m in existing}
    for m in existing:
        if m.user_id not in target:
            session.delete(m)
    for uid in target - existing_ids:
        session.add(Member(entity_type=entity_type, entity_id=entity_id, user_id=uid, role=role))
    session.commit()


def delete_entity_aux(session: Session, entity_type: str, entity_id: int) -> None:
    """Remove comments / members / activity rows for an entity being deleted."""
    for model in (Comment, Member, ActivityLog):
        for row in session.exec(
            select(model).where(model.entity_type == entity_type, model.entity_id == entity_id)
        ).all():
            session.delete(row)
