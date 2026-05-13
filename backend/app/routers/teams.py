"""
Teams meeting routes — admin shares a Teams link, employees can read it.
"""
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from app.models import User, TeamsMeeting, TeamsMeetingCreate, TeamsMeetingRead
from app.auth import get_current_user, get_current_admin_user

router = APIRouter(prefix="/teams", tags=["teams"])


@router.post("/meeting", response_model=TeamsMeetingRead, status_code=status.HTTP_201_CREATED)
async def share_meeting_link(
    payload: TeamsMeetingCreate,
    current_user: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session),
):
    """Admin creates or replaces the active Teams meeting link."""
    # Deactivate any existing active meetings
    existing = session.exec(
        select(TeamsMeeting).where(TeamsMeeting.is_active == True)
    ).all()
    for m in existing:
        m.is_active = False
        session.add(m)

    meeting = TeamsMeeting(
        title=payload.title,
        meeting_link=payload.meeting_link,
        created_by=current_user.id,
        is_active=True,
    )
    session.add(meeting)
    session.commit()
    session.refresh(meeting)

    return TeamsMeetingRead(
        **meeting.model_dump(),
        creator_name=current_user.name,
    )


@router.get("/meeting", response_model=Optional[TeamsMeetingRead])
async def get_active_meeting(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Get the currently active Teams meeting link (visible to all authenticated users)."""
    meeting = session.exec(
        select(TeamsMeeting).where(TeamsMeeting.is_active == True).order_by(TeamsMeeting.created_at.desc())
    ).first()

    if not meeting:
        return None

    creator = session.get(User, meeting.created_by)
    return TeamsMeetingRead(
        **meeting.model_dump(),
        creator_name=creator.name if creator else None,
    )


@router.delete("/meeting", status_code=status.HTTP_200_OK)
async def deactivate_meeting(
    current_user: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session),
):
    """Admin removes/deactivates the current Teams meeting link."""
    meetings = session.exec(
        select(TeamsMeeting).where(TeamsMeeting.is_active == True)
    ).all()

    if not meetings:
        raise HTTPException(status_code=404, detail="No active meeting found")

    for m in meetings:
        m.is_active = False
        session.add(m)
    session.commit()

    return {"message": "Meeting link removed"}
