"""
Notification routes for task assignments and updates.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from app.models import User, Notification, NotificationRead, NotificationType, Task, TaskStatus
from app.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def _prune_stale_task_notifications(session: Session, user_id: int) -> None:
    """Delete all task-linked notifications for tasks already completed/submitted."""
    actionable_types = {
        NotificationType.TASK_ASSIGNED,
        NotificationType.TASK_SUBMITTED,
        NotificationType.TASK_APPROVED,
        NotificationType.TASK_COMMENT,
        NotificationType.TASK_REJECTED,
        NotificationType.SUBTASK_ASSIGNED,
        NotificationType.SUBTASK_REVIEWING,
        NotificationType.SUBTASK_APPROVED,
        NotificationType.SUBTASK_REJECTED,
    }
    statement = select(Notification).where(
        Notification.user_id == user_id,
        Notification.task_id.is_not(None),
        Notification.type.in_(actionable_types),
    )
    notifications = session.exec(statement).all()
    if not notifications:
        return

    task_ids = {n.task_id for n in notifications if n.task_id is not None}
    if not task_ids:
        return

    tasks = session.exec(select(Task).where(Task.id.in_(task_ids))).all()
    completed_task_ids = {
        task.id
        for task in tasks
        if task.id is not None and task.status in [TaskStatus.submitted, TaskStatus.approved]
    }
    if not completed_task_ids:
        return

    deleted = False
    for notification in notifications:
        if notification.task_id in completed_task_ids:
            session.delete(notification)
            deleted = True

    if deleted:
        session.commit()


def create_notification(
    session: Session,
    user_id: int,
    type: NotificationType,
    message: str,
    task_id: int = None,
    weekly_progress_id: int = None,
):
    """Helper function to create a notification."""
    notification = Notification(
        user_id=user_id,
        type=type,
        message=message,
        task_id=task_id,
        weekly_progress_id=weekly_progress_id,
    )
    session.add(notification)
    session.commit()
    return notification


@router.get("", response_model=List[NotificationRead])
@router.get("/", response_model=List[NotificationRead], include_in_schema=False)
async def get_notifications(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get all notifications for current user."""
    _prune_stale_task_notifications(session, current_user.id)
    statement = select(Notification).where(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc())
    
    notifications = session.exec(statement).all()
    return [
        NotificationRead(
            id=n.id,
            user_id=n.user_id,
            type=str(n.type.value if hasattr(n.type, "value") else n.type),
            message=n.message,
            task_id=n.task_id,
            weekly_progress_id=n.weekly_progress_id,
            is_read=n.is_read,
            created_at=n.created_at,
        )
        for n in notifications
    ]


@router.get("/unread/count")
async def get_unread_count(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get count of unread notifications."""
    _prune_stale_task_notifications(session, current_user.id)
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
    """Mark a notification as read (and remove it from the feed)."""
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
    
    session.delete(notification)
    session.commit()

    return {"message": "Notification removed"}


@router.patch("/read-all")
async def mark_all_notifications_read(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Mark all notifications as read for current user (clear feed)."""
    statement = select(Notification).where(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    )
    
    notifications = session.exec(statement).all()
    
    for notification in notifications:
        session.delete(notification)
    
    session.commit()
    
    return {"message": f"Cleared {len(notifications)} notifications"}
