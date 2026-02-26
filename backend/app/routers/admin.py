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
    TaskStatus, LeaveStatus, DashboardStats, Notification, TaskComment, Subtask,
    EmployeePerformance, AttendanceStats, EmployeeListItem
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
    
    # Pending tasks (tasks submitted for review)
    pending_tasks = len(session.exec(
        select(Task).where(Task.status == TaskStatus.submitted)
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


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Permanently delete a user from the database (admin only).
    WARNING: This will also delete all associated records (tasks, attendance, etc.)
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
            detail="Cannot delete your own account"
        )
    
    user_email = user.email
    
    # Delete all related records
    # 1. Delete subtasks assigned to or created by this user
    subtasks = session.exec(select(Subtask).where(
        (Subtask.assigned_to == user_id) | (Subtask.assigned_by == user_id)
    )).all()
    for subtask in subtasks:
        session.delete(subtask)
    
    # 2. Delete task comments by this user
    comments = session.exec(select(TaskComment).where(TaskComment.user_id == user_id)).all()
    for comment in comments:
        session.delete(comment)
    
    # 3. Delete tasks assigned to or created by this user
    tasks = session.exec(select(Task).where(
        (Task.assigned_to == user_id) | (Task.assigned_by == user_id)
    )).all()
    for task in tasks:
        session.delete(task)
    
    # 4. Delete attendance records
    attendance_records = session.exec(select(Attendance).where(Attendance.user_id == user_id)).all()
    for record in attendance_records:
        session.delete(record)
    
    # 5. Delete leave requests
    leave_requests = session.exec(select(LeaveRequest).where(LeaveRequest.user_id == user_id)).all()
    for leave in leave_requests:
        session.delete(leave)
    
    # 6. Delete notifications
    notifications = session.exec(select(Notification).where(Notification.user_id == user_id)).all()
    for notification in notifications:
        session.delete(notification)
    
    # Finally, delete the user
    session.delete(user)
    session.commit()
    
    return {"message": f"User {user_email} has been permanently deleted along with all associated data"}


@router.get("/employee-performance", response_model=List[EmployeePerformance])
async def get_employee_performance(
    request: Request,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    """Get employee performance data for charts (admin only)."""
    # Mock performance data - replace with actual calculations
    performance_data = [
        EmployeePerformance(period="Jan", score=75, department="Engineering"),
        EmployeePerformance(period="Feb", score=82, department="Engineering"),
        EmployeePerformance(period="Mar", score=68, department="Engineering"),
        EmployeePerformance(period="Apr", score=91, department="Engineering"),
        EmployeePerformance(period="May", score=78, department="Engineering"),
        EmployeePerformance(period="Jun", score=87, department="Engineering"),
    ]
    return performance_data


@router.get("/attendance-stats", response_model=AttendanceStats)
async def get_attendance_stats(
    request: Request,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    """Get attendance statistics for dashboard (admin only)."""
    # Get today's attendance data
    today = date.today()
    
    # Count employees with attendance records today
    present_count = len(session.exec(
        select(Attendance).where(
            Attendance.date == today,
            Attendance.punch_in != None
        )
    ).all())
    
    # Get total employees
    total_employees = len(session.exec(
        select(User).where(User.role == UserRole.employee, User.is_active == True)
    ).all())
    
    # Count employees on leave today (simplified - using pending leaves as proxy)
    on_leave_count = len(session.exec(
        select(LeaveRequest).where(
            LeaveRequest.status == LeaveStatus.approved,
            LeaveRequest.start_date <= today,
            LeaveRequest.end_date >= today
        )
    ).all())
    
    # Calculate absent (total - present - on_leave)
    absent_count = max(0, total_employees - present_count - on_leave_count)
    
    return AttendanceStats(
        present=present_count,
        absent=absent_count,
        on_leave=on_leave_count,
        total=total_employees
    )


@router.get("/employees-list", response_model=List[EmployeeListItem])
async def get_employees_list(
    request: Request,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    """Get employees list with performance data (admin only)."""
    # Get all employees
    employees = session.exec(
        select(User).where(User.role == UserRole.employee)
    ).all()
    
    employees_list = []
    for emp in employees:
        # Calculate attendance rate (simplified - mock data)
        # In a real app, this would calculate actual attendance percentage
        attendance_rate = min(95, max(70, hash(emp.email) % 30 + 70))  # Mock: 70-95%
        
        # Determine role, team, etc. (mock data)
        roles = ["UX Engineer", "Senior Manager", "Product Manager", "Developer", "Designer"]
        teams = ["Team Alpha", "Team Beta", "Team Gamma", "Team Delta"]
        workspaces = ["Remote", "On-site", "Hybrid"]
        
        employee_item = EmployeeListItem(
            id=emp.id,
            name=emp.name,
            email=emp.email,
            role=roles[emp.id % len(roles)],
            contract_type="Full Time",
            team=teams[emp.id % len(teams)],
            workspace=workspaces[emp.id % len(workspaces)],
            is_active=emp.is_active,
            attendance_rate=attendance_rate
        )
        employees_list.append(employee_item)
    
    return employees_list
