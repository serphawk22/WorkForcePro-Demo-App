"""
Task comment management routes for admin-employee communication.
"""
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlmodel import Session, select

from app.database import get_session
from app.models import (
    User, Task, TaskComment, TaskCommentCreate, TaskCommentRead, TaskCommentWithUser,
    UserRole, NotificationType
)
from app.auth import get_current_user, get_current_admin_user
from app.routers.notifications import create_notification

router = APIRouter(prefix="/comments", tags=["Comments"])


@router.post("/", response_model=TaskCommentRead, status_code=status.HTTP_201_CREATED)
async def create_comment(
    comment_data: TaskCommentCreate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Create a comment on a task.
    
    Rules:
    - Admins can comment on any task
    - Employees can only comment on tasks assigned to them
    - All admins get notified of any comment
    - Assigned employee gets notified of admin comments
    """
    # Verify task exists
    task_stmt = select(Task).where(Task.id == comment_data.task_id)
    task = session.exec(task_stmt).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Check permission
    if current_user.role == UserRole.employee:
        # Employee can only comment on tasks assigned to them
        if task.assigned_to != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only comment on tasks assigned to you"
            )
    
    # Create comment
    comment = TaskComment(
        task_id=comment_data.task_id,
        user_id=current_user.id,
        comment=comment_data.comment
    )
    
    session.add(comment)
    session.commit()
    session.refresh(comment)
    
    # Send notifications based on who commented
    if current_user.role == UserRole.admin:
        # Admin commented: notify assigned employee
        if task.assigned_to:
            create_notification(
                session=session,
                user_id=task.assigned_to,
                type=NotificationType.TASK_COMMENT,
                message=f"Admin commented on Task #{task.id} - {task.title}",
                task_id=task.id
            )
    elif current_user.role == UserRole.employee:
        # Employee commented: notify all admins
        admin_stmt = select(User).where(User.role == UserRole.admin)
        admins = session.exec(admin_stmt).all()
        
        for admin in admins:
            create_notification(
                session=session,
                user_id=admin.id,
                type=NotificationType.TASK_COMMENT,
                message=f"{current_user.name} commented on Task #{task.id} - {task.title}",
                task_id=task.id
            )
    
    return comment


@router.get("/task/{task_id}", response_model=List[TaskCommentWithUser])
async def get_task_comments(
    task_id: int,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get all comments for a specific task.
    
    Rules:
    - Admins can see comments on any task
    - Employees can only see comments on tasks assigned to them
    """
    # Verify task exists
    task_stmt = select(Task).where(Task.id == task_id)
    task = session.exec(task_stmt).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Check permission
    if current_user.role == UserRole.employee:
        if task.assigned_to != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view comments on tasks assigned to you"
            )
    
    # Get comments
    comments_stmt = select(TaskComment).where(TaskComment.task_id == task_id).order_by(TaskComment.created_at.asc())
    comments = session.exec(comments_stmt).all()
    
    result = []
    for comment in comments:
        user_stmt = select(User).where(User.id == comment.user_id)
        user = session.exec(user_stmt).first()
        
        result.append(TaskCommentWithUser(
            id=comment.id,
            task_id=comment.task_id,
            user_id=comment.user_id,
            comment=comment.comment,
            created_at=comment.created_at,
            updated_at=comment.updated_at,
            user_name=user.name if user else "Unknown",
            user_email=user.email if user else None,
            user_role=user.role if user else None
        ))
    
    return result


@router.delete("/{comment_id}")
async def delete_comment(
    comment_id: int,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Delete a comment.
    
    Rules:
    - Admins can delete any comment
    - Employees can only delete their own comments
    """
    comment_stmt = select(TaskComment).where(TaskComment.id == comment_id)
    comment = session.exec(comment_stmt).first()
    
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )
    
    # Check permission
    if current_user.role == UserRole.employee:
        if comment.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own comments"
            )
    
    session.delete(comment)
    session.commit()
    
    return {"message": "Comment deleted successfully"}
