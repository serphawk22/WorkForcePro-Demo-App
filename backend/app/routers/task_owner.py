"""
API endpoints for task owner management - supporting multiple project owners.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.models import (
    Task, TaskOwner, TaskOwnerCreate, TaskOwnerRead, TaskOwnerWithUser,
    User, UserRead
)
from app.database import get_session
from app.dependencies import get_current_user, check_organization_access

router = APIRouter(prefix="/tasks/{task_id}/owners", tags=["task-owners"])


@router.get("", response_model=List[TaskOwnerWithUser])
async def get_task_owners(
    task_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get all owners of a specific task/project."""
    # Verify task exists and user has access
    task = session.exec(select(Task).where(Task.id == task_id)).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await check_organization_access(current_user, task.organization_id, session)
    
    # Get all owners for this task
    owners = session.exec(
        select(TaskOwner)
        .where(TaskOwner.task_id == task_id)
        .order_by(TaskOwner.is_primary.desc())  # Primary first
    ).all()
    
    # Fetch user info for each owner
    result = []
    for owner in owners:
        user = session.exec(select(User).where(User.id == owner.user_id)).first()
        if user:
            result.append(TaskOwnerWithUser(
                id=owner.id,
                task_id=owner.task_id,
                user_id=owner.user_id,
                is_primary=owner.is_primary,
                created_at=owner.created_at,
                user_name=user.name,
                user_email=user.email,
                user_role=str(user.role) if user.role else None
            ))
    
    return result


@router.post("", response_model=TaskOwnerRead)
async def add_task_owner(
    task_id: int,
    owner_data: TaskOwnerCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Add a new owner to a task/project. Only current owners can add owners."""
    # Verify task exists
    task = session.exec(select(Task).where(Task.id == task_id)).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await check_organization_access(current_user, task.organization_id, session)
    
    # Check if current_user is an owner or admin
    is_owner = session.exec(
        select(TaskOwner).where(
            (TaskOwner.task_id == task_id) & 
            (TaskOwner.user_id == current_user.id)
        )
    ).first()
    
    if not is_owner and current_user.role.value != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only task owners and admins can add new owners"
        )
    
    # Verify new owner exists in the organization
    new_owner = session.exec(
        select(User).where(
            (User.id == owner_data.user_id) &
            (User.organization_id == task.organization_id)
        )
    ).first()
    
    if not new_owner:
        raise HTTPException(
            status_code=404,
            detail="User not found in this organization"
        )
    
    # Check if user is already an owner
    existing = session.exec(
        select(TaskOwner).where(
            (TaskOwner.task_id == task_id) &
            (TaskOwner.user_id == owner_data.user_id)
        )
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=409,
            detail="User is already an owner of this task"
        )
    
    # Create new owner relationship
    task_owner = TaskOwner(
        task_id=task_id,
        user_id=owner_data.user_id,
        is_primary=owner_data.is_primary
    )
    session.add(task_owner)
    session.commit()
    session.refresh(task_owner)
    
    return TaskOwnerRead(
        id=task_owner.id,
        task_id=task_owner.task_id,
        user_id=task_owner.user_id,
        is_primary=task_owner.is_primary,
        created_at=task_owner.created_at
    )


@router.put("/{owner_id}", response_model=TaskOwnerRead)
async def update_task_owner(
    task_id: int,
    owner_id: int,
    is_primary: bool,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update owner details (e.g., set as primary). Only current owners can update."""
    # Verify task exists
    task = session.exec(select(Task).where(Task.id == task_id)).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await check_organization_access(current_user, task.organization_id, session)
    
    # Check if current_user is an owner
    is_owner = session.exec(
        select(TaskOwner).where(
            (TaskOwner.task_id == task_id) & 
            (TaskOwner.user_id == current_user.id)
        )
    ).first()
    
    if not is_owner and current_user.role.value != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only task owners and admins can update ownership"
        )
    
    # Get the owner to update
    owner = session.exec(
        select(TaskOwner).where(TaskOwner.id == owner_id)
    ).first()
    
    if not owner or owner.task_id != task_id:
        raise HTTPException(status_code=404, detail="Owner relationship not found")
    
    # Update primary status
    owner.is_primary = is_primary
    session.add(owner)
    session.commit()
    session.refresh(owner)
    
    return TaskOwnerRead(
        id=owner.id,
        task_id=owner.task_id,
        user_id=owner.user_id,
        is_primary=owner.is_primary,
        created_at=owner.created_at
    )


@router.delete("/{owner_id}", status_code=204)
async def remove_task_owner(
    task_id: int,
    owner_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Remove an owner from a task/project. Only current owners can remove owners."""
    # Verify task exists
    task = session.exec(select(Task).where(Task.id == task_id)).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await check_organization_access(current_user, task.organization_id, session)
    
    # Check if current_user is an owner
    is_owner = session.exec(
        select(TaskOwner).where(
            (TaskOwner.task_id == task_id) & 
            (TaskOwner.user_id == current_user.id)
        )
    ).first()
    
    if not is_owner and current_user.role.value != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only task owners and admins can remove owners"
        )
    
    # Get the owner to remove
    owner = session.exec(
        select(TaskOwner).where(TaskOwner.id == owner_id)
    ).first()
    
    if not owner or owner.task_id != task_id:
        raise HTTPException(status_code=404, detail="Owner relationship not found")
    
    # Prevent removing the last owner
    owner_count = session.exec(
        select(TaskOwner).where(TaskOwner.task_id == task_id)
    ).all()
    
    if len(owner_count) <= 1:
        raise HTTPException(
            status_code=400,
            detail="Cannot remove the last owner of a task"
        )
    
    session.delete(owner)
    session.commit()


@router.post("/transfer/{new_owner_id}")
async def transfer_ownership(
    task_id: int,
    new_owner_id: int,
    remove_old_owners: bool = False,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Transfer task ownership to a new owner. Old ownership can optionally be removed."""
    # Verify task exists
    task = session.exec(select(Task).where(Task.id == task_id)).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await check_organization_access(current_user, task.organization_id, session)
    
    # Check if current_user is an owner or admin
    is_owner = session.exec(
        select(TaskOwner).where(
            (TaskOwner.task_id == task_id) & 
            (TaskOwner.user_id == current_user.id)
        )
    ).first()
    
    if not is_owner and current_user.role.value != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only task owners and admins can transfer ownership"
        )
    
    # Verify new owner exists in the organization
    new_owner = session.exec(
        select(User).where(
            (User.id == new_owner_id) &
            (User.organization_id == task.organization_id)
        )
    ).first()
    
    if not new_owner:
        raise HTTPException(status_code=404, detail="New owner not found")
    
    # Check if new owner is already an owner
    existing = session.exec(
        select(TaskOwner).where(
            (TaskOwner.task_id == task_id) &
            (TaskOwner.user_id == new_owner_id)
        )
    ).first()
    
    if existing:
        # Just make them primary
        if not existing.is_primary:
            existing.is_primary = True
            session.add(existing)
    else:
        # Add as new primary owner
        task_owner = TaskOwner(
            task_id=task_id,
            user_id=new_owner_id,
            is_primary=True
        )
        session.add(task_owner)
    
    # Optionally remove all old owners
    if remove_old_owners:
        old_owners = session.exec(
            select(TaskOwner).where(
                (TaskOwner.task_id == task_id) &
                (TaskOwner.user_id != new_owner_id)
            )
        ).all()
        for owner in old_owners:
            session.delete(owner)
    else:
        # Just mark new owner as primary, others as secondary
        other_owners = session.exec(
            select(TaskOwner).where(
                (TaskOwner.task_id == task_id) &
                (TaskOwner.user_id != new_owner_id) &
                (TaskOwner.is_primary == True)
            )
        ).all()
        for owner in other_owners:
            owner.is_primary = False
            session.add(owner)
    
    session.commit()
    
    return {
        "message": "Ownership transferred successfully",
        "task_id": task_id,
        "new_primary_owner_id": new_owner_id,
        "removed_old_owners": remove_old_owners
    }


@router.get("/{owner_id}", response_model=TaskOwnerWithUser)
async def get_owner_details(
    task_id: int,
    owner_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get details of a specific task owner."""
    # Verify task exists
    task = session.exec(select(Task).where(Task.id == task_id)).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await check_organization_access(current_user, task.organization_id, session)
    
    # Get the owner
    owner = session.exec(
        select(TaskOwner).where(TaskOwner.id == owner_id)
    ).first()
    
    if not owner or owner.task_id != task_id:
        raise HTTPException(status_code=404, detail="Owner not found")
    
    # Get user info
    user = session.exec(select(User).where(User.id == owner.user_id)).first()
    
    return TaskOwnerWithUser(
        id=owner.id,
        task_id=owner.task_id,
        user_id=owner.user_id,
        is_primary=owner.is_primary,
        created_at=owner.created_at,
        user_name=user.name if user else None,
        user_email=user.email if user else None,
        user_role=str(user.role) if user and user.role else None
    )
