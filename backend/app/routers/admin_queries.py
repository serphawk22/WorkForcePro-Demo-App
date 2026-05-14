"""
Admin Query/Ticket management routes with time tracking.
"""
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, and_

from app.database import get_session
from app.models import (
    AdminQuery, AdminQueryCreate, AdminQueryRead, AdminQueryUpdate,
    QueryStatus, Task, User, Workspace, Organization, UserRole, NotificationType,
    Label, LabelCreate, LabelRead, AdminQueryLabel,
    TicketComment, TicketCommentCreate, TicketCommentRead,
    TimeLogEntry, TimeLogCreate, TimeLogRead
)
from app.auth import get_current_admin_user, get_current_user, ensure_same_organization
from app.routers.notifications import create_notification

router = APIRouter(prefix="/admin/queries", tags=["Admin Queries"])


def _to_admin_query_read(session: Session, query: AdminQuery) -> AdminQueryRead:
    workspace = session.exec(select(Workspace).where(Workspace.id == query.workspace_id)).first()
    raised_by_user = session.exec(select(User).where(User.id == query.raised_by)).first()
    assigned_to_user = session.exec(select(User).where(User.id == query.assigned_to)).first() if query.assigned_to else None
    
    # Fetch labels for this query
    label_links = session.exec(
        select(AdminQueryLabel).where(AdminQueryLabel.admin_query_id == query.id)
    ).all()
    labels = []
    for link in label_links:
        label = session.exec(select(Label).where(Label.id == link.label_id)).first()
        if label:
            labels.append(LabelRead(
                id=label.id,
                name=label.name,
                color=label.color,
                description=label.description,
                organization_id=label.organization_id,
                created_by=label.created_by,
                created_at=label.created_at,
            ))
    
    # Calculate remaining hours
    remaining_hours = None
    if query.estimated_hours:
        remaining_hours = max(0, query.estimated_hours - query.actual_hours_logged)

    return AdminQueryRead(
        id=query.id,
        organization_id=query.organization_id,
        workspace_id=query.workspace_id,
        workspace_name=workspace.name if workspace else None,
        raised_by=query.raised_by,
        raised_by_name=raised_by_user.name if raised_by_user else None,
        assigned_to=query.assigned_to,
        assigned_to_name=assigned_to_user.name if assigned_to_user else None,
        assigned_to_email=assigned_to_user.email if assigned_to_user else None,
        title=query.title,
        description=query.description,
        status=query.status,
        priority=query.priority,
        related_task_id=query.related_task_id,
        created_at=query.created_at,
        started_at=query.started_at,
        resolved_at=query.resolved_at,
        updated_at=query.updated_at,
        duration_hours=_calculate_duration(query),
        time_to_start_hours=_calculate_time_to_start(query),
        labels=labels if labels else None,
        estimated_hours=query.estimated_hours,
        actual_hours_logged=query.actual_hours_logged,
        remaining_hours=remaining_hours,
    )


@router.post("", response_model=AdminQueryRead, status_code=status.HTTP_201_CREATED)
async def create_admin_query(
    query_data: AdminQueryCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> AdminQueryRead:
    """Create a new admin query/ticket for a project."""
    # Verify workspace exists and user has access
    workspace = session.exec(
        select(Workspace).where(Workspace.id == query_data.workspace_id)
    ).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    # Ensure same organization
    if workspace.organization_id and current_user.organization_id:
        if workspace.organization_id != current_user.organization_id:
            raise HTTPException(status_code=403, detail="Not authorized for this workspace")

    if query_data.assigned_to is not None:
        assigned_to_user = session.exec(select(User).where(User.id == query_data.assigned_to)).first()
        if not assigned_to_user:
            raise HTTPException(status_code=404, detail="Assigned developer not found")
        if assigned_to_user.organization_id and current_user.organization_id and assigned_to_user.organization_id != current_user.organization_id:
            raise HTTPException(status_code=403, detail="Not authorized to assign this developer")

    if query_data.related_task_id is not None:
        related_task = session.exec(select(Task).where(Task.id == query_data.related_task_id)).first()
        if not related_task:
            raise HTTPException(status_code=404, detail="Project not found")
        if related_task.workspace_id != query_data.workspace_id:
            raise HTTPException(status_code=400, detail="Selected project does not belong to the chosen space")
        if related_task.organization_id and current_user.organization_id and related_task.organization_id != current_user.organization_id:
            raise HTTPException(status_code=403, detail="Not authorized for this project")
    
    # Create the query
    admin_query = AdminQuery(
        organization_id=current_user.organization_id,
        workspace_id=query_data.workspace_id,
        raised_by=current_user.id,
        assigned_to=query_data.assigned_to,
        title=query_data.title,
        description=query_data.description,
        priority=query_data.priority,
        related_task_id=query_data.related_task_id,
        estimated_hours=query_data.estimated_hours,
        actual_hours_logged=0.0,
    )
    session.add(admin_query)
    session.commit()
    session.refresh(admin_query)
    
    # Add labels if provided
    if query_data.label_ids:
        for label_id in query_data.label_ids:
            label = session.exec(select(Label).where(Label.id == label_id)).first()
            if not label:
                raise HTTPException(status_code=404, detail=f"Label {label_id} not found")
            if label.organization_id != current_user.organization_id:
                raise HTTPException(status_code=403, detail="Not authorized to use this label")
            
            label_link = AdminQueryLabel(admin_query_id=admin_query.id, label_id=label_id)
            session.add(label_link)
        session.commit()

    if current_user.role == UserRole.employee:
        admins = session.exec(
            select(User).where(
                User.role == UserRole.admin,
                User.organization_id == current_user.organization_id,
            )
        ).all()
        for admin in admins:
            try:
                create_notification(
                    session=session,
                    user_id=admin.id,
                    type=NotificationType.ADMIN_QUERY_RAISED,
                    message=f"{current_user.name} raised ticket #{admin_query.id} - {admin_query.title}",
                    task_id=query_data.related_task_id,
                )
            except Exception:
                pass

    return _to_admin_query_read(session, admin_query)


@router.get("/my", response_model=List[AdminQueryRead])
async def get_my_admin_queries(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> List[AdminQueryRead]:
    """Get tickets that the current user raised or is assigned to."""
    query_stmt = select(AdminQuery).where(
        AdminQuery.organization_id == current_user.organization_id,
        (AdminQuery.raised_by == current_user.id) | (AdminQuery.assigned_to == current_user.id),
    ).order_by(AdminQuery.created_at.desc())

    queries = session.exec(query_stmt).all()
    return [_to_admin_query_read(session, query) for query in queries]


@router.get("/list", response_model=List[AdminQueryRead])
async def get_admin_queries(
    workspace_id: Optional[int] = None,
    status: Optional[QueryStatus] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin_user),
) -> List[AdminQueryRead]:
    """Get all admin queries for the current user's organization."""
    conditions = [AdminQuery.organization_id == current_user.organization_id]
    
    if workspace_id:
        conditions.append(AdminQuery.workspace_id == workspace_id)
    
    if status:
        conditions.append(AdminQuery.status == status)
    
    query_stmt = select(AdminQuery).where(and_(*conditions)).order_by(AdminQuery.created_at.desc())
    queries = session.exec(query_stmt).all()
    
    # Enrich with workspace names
    result = []
    for q in queries:
        result.append(_to_admin_query_read(session, q))
    
    return result


@router.get("/{query_id}", response_model=AdminQueryRead)
async def get_admin_query(
    query_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin_user),
) -> AdminQueryRead:
    """Get a specific admin query."""
    admin_query = session.exec(select(AdminQuery).where(AdminQuery.id == query_id)).first()
    if not admin_query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    # Verify access
    if admin_query.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return _to_admin_query_read(session, admin_query)


@router.patch("/{query_id}", response_model=AdminQueryRead)
async def update_admin_query(
    query_id: int,
    update_data: AdminQueryUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin_user),
) -> AdminQueryRead:
    """Update an admin query status/priority."""
    admin_query = session.exec(select(AdminQuery).where(AdminQuery.id == query_id)).first()
    if not admin_query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    # Verify access
    if admin_query.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Update fields
    if update_data.title is not None:
        admin_query.title = update_data.title
    if update_data.description is not None:
        admin_query.description = update_data.description
    if update_data.status is not None:
        admin_query.status = update_data.status
    if update_data.priority is not None:
        admin_query.priority = update_data.priority
    if update_data.assigned_to is not None:
        assigned_to_user = session.exec(select(User).where(User.id == update_data.assigned_to)).first()
        if not assigned_to_user:
            raise HTTPException(status_code=404, detail="Assigned developer not found")
        if assigned_to_user.organization_id and current_user.organization_id and assigned_to_user.organization_id != current_user.organization_id:
            raise HTTPException(status_code=403, detail="Not authorized to assign this developer")
        admin_query.assigned_to = update_data.assigned_to
    if update_data.started_at is not None:
        admin_query.started_at = update_data.started_at
    if update_data.resolved_at is not None:
        admin_query.resolved_at = update_data.resolved_at
    if update_data.label_ids is not None:
        # Remove old labels
        session.exec(
            select(AdminQueryLabel).where(AdminQueryLabel.admin_query_id == query_id)
        ).delete()
        session.commit()
        
        # Add new labels
        for label_id in update_data.label_ids:
            label = session.exec(select(Label).where(Label.id == label_id)).first()
            if not label:
                raise HTTPException(status_code=404, detail=f"Label {label_id} not found")
            if label.organization_id != current_user.organization_id:
                raise HTTPException(status_code=403, detail="Not authorized to use this label")
            
            label_link = AdminQueryLabel(admin_query_id=query_id, label_id=label_id)
            session.add(label_link)
        session.commit()
    
    admin_query.updated_at = datetime.now(timezone.utc)
    session.add(admin_query)
    session.commit()
    session.refresh(admin_query)

    return _to_admin_query_read(session, admin_query)


@router.delete("/{query_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_admin_query(
    query_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin_user),
) -> None:
    """Delete an admin query."""
    admin_query = session.exec(select(AdminQuery).where(AdminQuery.id == query_id)).first()
    if not admin_query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    # Verify access
    if admin_query.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    session.delete(admin_query)
    session.commit()


@router.post("/{query_id}/start", response_model=AdminQueryRead)
async def start_query(
    query_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> AdminQueryRead:
    """Mark a query as started (begin work on it)."""
    admin_query = session.exec(select(AdminQuery).where(AdminQuery.id == query_id)).first()
    if not admin_query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    if admin_query.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if current_user.role != UserRole.admin and admin_query.assigned_to != current_user.id and admin_query.raised_by != current_user.id:
        raise HTTPException(status_code=403, detail="You can only work on your own assigned ticket")
    
    admin_query.started_at = datetime.now(timezone.utc)
    admin_query.status = QueryStatus.in_progress
    admin_query.updated_at = datetime.now(timezone.utc)
    session.add(admin_query)
    session.commit()
    session.refresh(admin_query)
    
    return _to_admin_query_read(session, admin_query)


@router.post("/{query_id}/resolve", response_model=AdminQueryRead)
async def resolve_query(
    query_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> AdminQueryRead:
    """Mark a query as resolved."""
    admin_query = session.exec(select(AdminQuery).where(AdminQuery.id == query_id)).first()
    if not admin_query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    if admin_query.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if current_user.role != UserRole.admin and admin_query.assigned_to != current_user.id and admin_query.raised_by != current_user.id:
        raise HTTPException(status_code=403, detail="You can only close your own assigned ticket")
    
    admin_query.resolved_at = datetime.now(timezone.utc)
    admin_query.status = QueryStatus.resolved
    admin_query.updated_at = datetime.now(timezone.utc)
    session.add(admin_query)
    session.commit()
    session.refresh(admin_query)
    
    return _to_admin_query_read(session, admin_query)


# ==================== LABEL MANAGEMENT ====================

@router.post("/labels", response_model=LabelRead, status_code=status.HTTP_201_CREATED)
async def create_label(
    label_data: LabelCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin_user),
) -> LabelRead:
    """Create a new label for organizing tickets."""
    # Check if label with same name already exists in organization
    existing = session.exec(
        select(Label).where(
            Label.organization_id == current_user.organization_id,
            Label.name.ilike(label_data.name)
        )
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Label with this name already exists")
    
    label = Label(
        organization_id=current_user.organization_id,
        name=label_data.name,
        color=label_data.color,
        description=label_data.description,
        created_by=current_user.id,
    )
    session.add(label)
    session.commit()
    session.refresh(label)
    
    return LabelRead(
        id=label.id,
        name=label.name,
        color=label.color,
        description=label.description,
        organization_id=label.organization_id,
        created_by=label.created_by,
        created_at=label.created_at,
    )


@router.get("/labels", response_model=List[LabelRead])
async def list_labels(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> List[LabelRead]:
    """List all labels for the current organization. Creates default labels if none exist."""
    labels = session.exec(
        select(Label).where(Label.organization_id == current_user.organization_id).order_by(Label.name)
    ).all()
    
    # If no labels exist, create default ones
    if not labels:
        default_labels = [
            ("bug", "#EF4444", "Bug or error report"),
            ("feature", "#3B82F6", "New feature request"),
            ("hotfix", "#F97316", "Urgent hotfix needed"),
            ("urgent", "#DC2626", "Critical/urgent priority"),
            ("technical-debt", "#8B5CF6", "Technical debt or refactoring"),
        ]
        
        for name, color, description in default_labels:
            label = Label(
                organization_id=current_user.organization_id,
                name=name,
                color=color,
                description=description,
                created_by=current_user.id,
            )
            session.add(label)
        session.commit()
        
        # Fetch the newly created labels
        labels = session.exec(
            select(Label).where(Label.organization_id == current_user.organization_id).order_by(Label.name)
        ).all()
    
    return [
        LabelRead(
            id=label.id,
            name=label.name,
            color=label.color,
            description=label.description,
            organization_id=label.organization_id,
            created_by=label.created_by,
            created_at=label.created_at,
        )
        for label in labels
    ]


@router.delete("/labels/{label_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_label(
    label_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin_user),
) -> None:
    """Delete a label."""
    label = session.exec(select(Label).where(Label.id == label_id)).first()
    if not label:
        raise HTTPException(status_code=404, detail="Label not found")
    
    if label.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    session.delete(label)
    session.commit()

def _calculate_duration(query: AdminQuery) -> Optional[float]:
    """Calculate total duration from creation to resolution in hours."""
    if not query.resolved_at:
        return None
    delta = query.resolved_at - query.created_at
    return delta.total_seconds() / 3600


def _calculate_time_to_start(query: AdminQuery) -> Optional[float]:
    """Calculate time from creation to start in hours."""
    if not query.started_at:
        return None
    delta = query.started_at - query.created_at
    return delta.total_seconds() / 3600


# ==================== TIME LOGGING ====================

@router.post("/{query_id}/log-time", response_model=AdminQueryRead)
async def log_time(
    query_id: int,
    time_data: TimeLogCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> AdminQueryRead:
    """Log time spent on a ticket."""
    admin_query = session.exec(select(AdminQuery).where(AdminQuery.id == query_id)).first()
    if not admin_query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    if admin_query.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Create time log entry
    time_log = TimeLogEntry(
        admin_query_id=query_id,
        user_id=current_user.id,
        hours_spent=time_data.hours_spent,
        note=time_data.note,
    )
    session.add(time_log)
    
    # Update total logged time
    admin_query.actual_hours_logged += time_data.hours_spent
    admin_query.updated_at = datetime.now(timezone.utc)
    session.add(admin_query)
    session.commit()
    session.refresh(admin_query)
    
    return _to_admin_query_read(session, admin_query)


@router.get("/{query_id}/time-logs", response_model=List[TimeLogRead])
async def get_time_logs(
    query_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> List[TimeLogRead]:
    """Get all time logs for a ticket."""
    admin_query = session.exec(select(AdminQuery).where(AdminQuery.id == query_id)).first()
    if not admin_query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    if admin_query.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    time_logs = session.exec(
        select(TimeLogEntry).where(TimeLogEntry.admin_query_id == query_id).order_by(TimeLogEntry.logged_at.desc())
    ).all()
    
    result = []
    for log in time_logs:
        user = session.exec(select(User).where(User.id == log.user_id)).first()
        result.append(TimeLogRead(
            id=log.id,
            admin_query_id=log.admin_query_id,
            user_id=log.user_id,
            user_name=user.name if user else None,
            hours_spent=log.hours_spent,
            note=log.note,
            logged_at=log.logged_at,
        ))
    
    return result


# ==================== COMMENTS ====================

@router.post("/{query_id}/comments", response_model=TicketCommentRead)
async def create_comment(
    query_id: int,
    comment_data: TicketCommentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> TicketCommentRead:
    """Create a comment on a ticket."""
    admin_query = session.exec(select(AdminQuery).where(AdminQuery.id == query_id)).first()
    if not admin_query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    if admin_query.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Validate mentioned users
    if comment_data.mentions:
        for user_id in comment_data.mentions:
            user = session.exec(select(User).where(User.id == user_id)).first()
            if not user or user.organization_id != current_user.organization_id:
                raise HTTPException(status_code=404, detail=f"User {user_id} not found or not in your organization")
    
    # Create comment
    import json
    comment = TicketComment(
        admin_query_id=query_id,
        user_id=current_user.id,
        content=comment_data.content,
        mentions=json.dumps(comment_data.mentions) if comment_data.mentions else None,
    )
    session.add(comment)
    session.commit()
    session.refresh(comment)
    
    # Notify @mentioned users
    if comment_data.mentions:
        for user_id in comment_data.mentions:
            try:
                create_notification(
                    session=session,
                    user_id=user_id,
                    type=NotificationType.TASK_COMMENT,
                    message=f"{current_user.name} mentioned you in ticket #{admin_query.id}",
                    task_id=query_id,
                )
            except Exception:
                pass
    
    user = session.exec(select(User).where(User.id == current_user.id)).first()
    mentions = json.loads(comment.mentions) if comment.mentions else None
    
    return TicketCommentRead(
        id=comment.id,
        admin_query_id=comment.admin_query_id,
        user_id=comment.user_id,
        user_name=user.name if user else None,
        user_email=user.email if user else None,
        content=comment.content,
        mentions=mentions,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
    )


@router.get("/{query_id}/comments", response_model=List[TicketCommentRead])
async def get_comments(
    query_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> List[TicketCommentRead]:
    """Get all comments on a ticket."""
    admin_query = session.exec(select(AdminQuery).where(AdminQuery.id == query_id)).first()
    if not admin_query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    if admin_query.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    comments = session.exec(
        select(TicketComment).where(TicketComment.admin_query_id == query_id).order_by(TicketComment.created_at.asc())
    ).all()
    
    import json
    result = []
    for comment in comments:
        user = session.exec(select(User).where(User.id == comment.user_id)).first()
        mentions = json.loads(comment.mentions) if comment.mentions else None
        
        result.append(TicketCommentRead(
            id=comment.id,
            admin_query_id=comment.admin_query_id,
            user_id=comment.user_id,
            user_name=user.name if user else None,
            user_email=user.email if user else None,
            content=comment.content,
            mentions=mentions,
            created_at=comment.created_at,
            updated_at=comment.updated_at,
        ))
    
    return result


@router.delete("/{query_id}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    query_id: int,
    comment_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete a comment (only comment author or admins can delete)."""
    comment = session.exec(select(TicketComment).where(TicketComment.id == comment_id)).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    admin_query = session.exec(select(AdminQuery).where(AdminQuery.id == query_id)).first()
    if not admin_query or comment.admin_query_id != query_id:
        raise HTTPException(status_code=404, detail="Comment not found on this ticket")
    
    if admin_query.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Only comment author or admins can delete
    if comment.user_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="You can only delete your own comments")
    
    session.delete(comment)
    session.commit()
