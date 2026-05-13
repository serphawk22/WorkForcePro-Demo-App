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
    QueryStatus, User, Workspace, Organization
)
from app.auth import get_current_admin_user, ensure_same_organization

router = APIRouter(prefix="/admin/queries", tags=["Admin Queries"])


def _to_admin_query_read(session: Session, query: AdminQuery) -> AdminQueryRead:
    workspace = session.exec(select(Workspace).where(Workspace.id == query.workspace_id)).first()
    raised_by_user = session.exec(select(User).where(User.id == query.raised_by)).first()
    assigned_to_user = session.exec(select(User).where(User.id == query.assigned_to)).first() if query.assigned_to else None

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
    )


@router.post("", response_model=AdminQueryRead, status_code=status.HTTP_201_CREATED)
async def create_admin_query(
    query_data: AdminQueryCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin_user),
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
    )
    session.add(admin_query)
    session.commit()
    session.refresh(admin_query)

    return _to_admin_query_read(session, admin_query)


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
    current_user: User = Depends(get_current_admin_user),
) -> AdminQueryRead:
    """Mark a query as started (begin work on it)."""
    admin_query = session.exec(select(AdminQuery).where(AdminQuery.id == query_id)).first()
    if not admin_query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    if admin_query.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
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
    current_user: User = Depends(get_current_admin_user),
) -> AdminQueryRead:
    """Mark a query as resolved."""
    admin_query = session.exec(select(AdminQuery).where(AdminQuery.id == query_id)).first()
    if not admin_query:
        raise HTTPException(status_code=404, detail="Query not found")
    
    if admin_query.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    admin_query.resolved_at = datetime.now(timezone.utc)
    admin_query.status = QueryStatus.resolved
    admin_query.updated_at = datetime.now(timezone.utc)
    session.add(admin_query)
    session.commit()
    session.refresh(admin_query)
    
    return _to_admin_query_read(session, admin_query)


# ==================== HELPER FUNCTIONS ====================

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
