"""
Notification routes for task assignments and updates.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from app.models import User, Notification, NotificationRead, NotificationType
from app.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def create_notification(session: Session, user_id: int, type: NotificationType, message: str, task_id: int = None):
    """Helper function to create a notification."""
    notification = Notification(
        user_id=user_id,
        type=type,
        message=message,
        task_id=task_id
    )
    session.add(notification)
    session.commit()
    return notification


@router.get("/", response_model=List[NotificationRead])
async def get_notifications(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get all notifications for current user."""
    statement = select(Notification).where(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc())
    
    notifications = session.exec(statement).all()
    return notifications


@router.get("/unread/count")
async def get_unread_count(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get count of unread notifications."""
    statement = select(Notification).where(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    )
    
    notifications = session.exec(statement).all()
    return {"count": len(notifications)}


@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Mark a notification as read."""
    statement = select(Notification).where(Notification.id == notification_id)
    notification = session.exec(statement).first()
    
    if not notification:
        raise HTTPException (
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    # Verify ownership
    if notification.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to mark this notification"
        )
    
    notification.is_read = True
    session.add(notification)
    session.commit()
    session.refresh(notification)
    
    return {"message": "Notification marked as read"}


@router.patch("/read-all")
async def mark_all_notifications_read(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Mark all notifications as read for current user."""
    statement = select(Notification).where(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    )
    
    notifications = session.exec(statement).all()
    
    for notification in notifications:
        notification.is_read = True
        session.add(notification)
    
    session.commit()
    
    return {"message": f"Marked {len(notifications)} notifications as read"}
