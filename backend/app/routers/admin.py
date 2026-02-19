"""
Admin routes: protected endpoints for admin users only.
"""
from datetime import date
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlmodel import Session, select

from app.database import get_session
from app.models import (
    User, UserRead, UserRole, Attendance, Task, LeaveRequest,
    TaskStatus, LeaveStatus, DashboardStats
)
from app.auth import get_current_admin_user

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    request: Request,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    """Get dashboard statistics (admin only)."""
    # Total employees
    employees = session.exec(
        select(User).where(User.role == UserRole.employee, User.is_active == True)
    ).all()
    total_employees = len(employees)
    
    # Active sessions (punched in today, not punched out)
    today = date.today()
    active = session.exec(
        select(Attendance).where(
            Attendance.date == today,
            Attendance.punch_in != None,
            Attendance.punch_out == None
        )
    ).all()
    active_sessions = len(active)
    
    # Pending tasks
    pending_tasks = len(session.exec(
        select(Task).where(Task.status == TaskStatus.pending)
    ).all())
    
    # Pending leave requests
    pending_leaves = len(session.exec(
        select(LeaveRequest).where(LeaveRequest.status == LeaveStatus.pending)
    ).all())
    
    # Average daily hours (from last 30 days)
    recent_attendance = session.exec(
        select(Attendance).where(Attendance.total_hours != None)
    ).all()
    
    if recent_attendance:
        avg_hours = sum(a.total_hours for a in recent_attendance) / len(recent_attendance)
    else:
        avg_hours = 0.0
    
    return DashboardStats(
        total_employees=total_employees,
        active_sessions=active_sessions,
        pending_tasks=pending_tasks,
        pending_leaves=pending_leaves,
        avg_daily_hours=round(avg_hours, 1)
    )


@router.get("/employees", response_model=List[UserRead])
async def get_all_employees(
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Get all employees (admin only).
    
    Returns a list of all users with role='employee'.
    Requires admin authentication.
    """
    statement = select(User).where(User.role == UserRole.employee)
    employees = session.exec(statement).all()
    return employees


@router.get("/users", response_model=List[UserRead])
async def get_all_users(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Get all users (admin only).
    
    Returns a list of all users regardless of role.
    Requires admin authentication.
    """
    statement = select(User)
    users = session.exec(statement).all()
    return users


@router.get("/users/{user_id}", response_model=UserRead)
async def get_user_by_id(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Get a specific user by ID (admin only).
    """
    statement = select(User).where(User.id == user_id)
    user = session.exec(statement).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user


@router.patch("/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Deactivate a user account (admin only).
    """
    statement = select(User).where(User.id == user_id)
    user = session.exec(statement).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )
    
    user.is_active = False
    session.add(user)
    session.commit()
    
    return {"message": f"User {user.email} has been deactivated"}


@router.patch("/users/{user_id}/activate")
async def activate_user(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Activate a user account (admin only).
    """
    statement = select(User).where(User.id == user_id)
    user = session.exec(statement).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.is_active = True
    session.add(user)
    session.commit()
    
    return {"message": f"User {user.email} has been activated"}
