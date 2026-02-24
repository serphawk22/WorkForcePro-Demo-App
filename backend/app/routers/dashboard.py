"""
Dashboard endpoints for admins and employees.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from datetime import datetime, timedelta, date, timezone
from app.database import get_session
from app.models import User, Task, Attendance, LeaveRequest, TaskStatus, LeaveStatus
from app.auth import get_current_user, get_current_admin_user
from app.schemas import AdminDashboardStats, EmployeeDashboardStats

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/admin", response_model=AdminDashboardStats)
async def get_admin_dashboard(
    current_user: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session)
):
    """
    Get admin dashboard statistics.
    
    Returns:
        - total_employees: Total number of active employees
        - active_sessions: Employees currently clocked in
        - pending_tasks: Tasks not yet completed
        - avg_daily_hours: Average hours worked per day
        - recent_activities: Recent system activities
        - leave_requests_pending: Pending leave requests
    """
    # Total employees
    total_employees = session.exec(
        select(func.count(User.id)).where(User.is_active == True)
    ).one()
    
    # Active sessions (clocked in today)
    today = date.today()
    active_sessions = session.exec(
        select(func.count(Attendance.id)).where(
            Attendance.date == today,
            Attendance.punch_in.isnot(None),
            Attendance.punch_out.is_(None)
        )
    ).one()
    
    #Pending tasks (tasks submitted for review)
    pending_tasks = session.exec(
        select(func.count(Task.id)).where(
            Task.status == TaskStatus.submitted
        )
    ).one()
    
    # Average daily hours (last 30 days)
    thirty_days_ago = today - timedelta(days=30)
    avg_hours_result = session.exec(
        select(func.avg(Attendance.total_hours)).where(
            Attendance.date >= thirty_days_ago,
            Attendance.total_hours.isnot(None)
        )
    ).one()
    avg_daily_hours = round(float(avg_hours_result or 0), 2)
    
    # Pending leave requests
    leave_requests_pending = session.exec(
        select(func.count(LeaveRequest.id)).where(
            LeaveRequest.status == LeaveStatus.pending
        )
    ).one()
    
    # Recent activities (last 10 actions)
    recent_tasks = session.exec(
        select(Task, User.name).join(User, Task.assigned_to == User.id)
        .order_by(Task.created_at.desc())
        .limit(5)
    ).all()
    
    recent_leaves = session.exec(
        select(LeaveRequest, User.name).join(User, LeaveRequest.user_id == User.id)
        .order_by(LeaveRequest.created_at.desc())
        .limit(5)
    ).all()
    
    recent_activities = []
    
    for task, user_name in recent_tasks:
        recent_activities.append({
            "type": "task",
            "description": f"{user_name} was assigned: {task.title}",
            "timestamp": task.created_at.isoformat(),
            "status": task.status
        })
    
    for leave, user_name in recent_leaves:
        recent_activities.append({
            "type": "leave",
            "description": f"{user_name} requested leave from {leave.start_date} to {leave.end_date}",
            "timestamp": leave.created_at.isoformat(),
            "status": leave.status
        })
    
    # Sort by timestamp
    recent_activities.sort(key=lambda x: x["timestamp"], reverse=True)
    recent_activities = recent_activities[:10]
    
    return AdminDashboardStats(
        total_employees=total_employees,
        active_sessions=active_sessions,
        pending_tasks=pending_tasks,
        avg_daily_hours=avg_daily_hours,
        recent_activities=recent_activities,
        leave_requests_pending=leave_requests_pending
    )


@router.get("/employee", response_model=EmployeeDashboardStats)
async def get_employee_dashboard(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Get employee dashboard statistics.
    
    Returns:
        - current_session: Current attendance session if clocked in
        - tasks_due_today: Number of tasks due today
        - tasks_completed: Total completed tasks
        - productivity_score: Calculated productivity percentage
        - active_projects: Number of ongoing tasks
        - leave_balance: Remaining leave days
        - pending_leave_requests: Pending leave requests
    """
    today = date.today()
    
    # Calculate today's UTC time range for timezone-safe queries
    now = datetime.now(timezone.utc)
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + timedelta(days=1)
    
    # Current session - check for active session first (timezone-safe)
    current_session_record = session.exec(
        select(Attendance).where(
            Attendance.user_id == current_user.id,
            Attendance.punch_in >= start_of_day,
            Attendance.punch_in < end_of_day,
            Attendance.punch_out.is_(None)
        )
    ).first()
    
    current_session = None
    if current_session_record:
        # Active session - calculate hours from punch_in to now
        hours_worked = 0
        elapsed_seconds = 0
        if current_session_record.punch_in:
            delta = datetime.now(timezone.utc) - current_session_record.punch_in
            hours_worked = round(delta.total_seconds() / 3600, 2)
            elapsed_seconds = int(delta.total_seconds())
        
        current_session = {
            "clocked_in": True,
            "punch_in": current_session_record.punch_in.isoformat() if current_session_record.punch_in else None,
            "hours_worked": hours_worked,
            "elapsed_seconds": elapsed_seconds
        }
    else:
        # No active session - check for today's completed session (timezone-safe)
        completed_session_record = session.exec(
            select(Attendance).where(
                Attendance.user_id == current_user.id,
                Attendance.punch_in >= start_of_day,
                Attendance.punch_in < end_of_day,
                Attendance.punch_out.isnot(None)
            )
        ).first()
        
        if completed_session_record:
            # Show today's completed session
            elapsed_seconds = 0
            if completed_session_record.punch_in and completed_session_record.punch_out:
                delta = completed_session_record.punch_out - completed_session_record.punch_in
                elapsed_seconds = int(delta.total_seconds())
            
            current_session = {
                "clocked_in": False,
                "punch_in": completed_session_record.punch_in.isoformat() if completed_session_record.punch_in else None,
                "punch_out": completed_session_record.punch_out.isoformat() if completed_session_record.punch_out else None,
                "hours_worked": completed_session_record.total_hours or 0,
                "elapsed_seconds": elapsed_seconds
            }
    
    # Tasks due today (not yet approved)
    tasks_due_today = session.exec(
        select(func.count(Task.id)).where(
            Task.assigned_to == current_user.id,
            Task.due_date == today,
            Task.status != TaskStatus.approved
        )
    ).one()
    
    # Tasks completed (approved by admin)
    tasks_completed = session.exec(
        select(func.count(Task.id)).where(
            Task.assigned_to == current_user.id,
            Task.status == TaskStatus.approved
        )
    ).one()
    
    # Active projects (in-progress tasks)
    active_projects = session.exec(
        select(func.count(Task.id)).where(
            Task.assigned_to == current_user.id,
            Task.status == TaskStatus.in_progress
        )
    ).one()
    
    # Total tasks
    total_tasks = session.exec(
        select(func.count(Task.id)).where(
            Task.assigned_to == current_user.id
        )
    ).one()
    
    # Productivity score (completed / total * 100)
    productivity_score = round((tasks_completed / total_tasks * 100) if total_tasks > 0 else 0, 1)
    
    # Leave balance (simplified - assuming 20 days per year)
    total_leave_days = 20
    used_leave_days = session.exec(
        select(func.sum(
            func.julianday(LeaveRequest.end_date) - func.julianday(LeaveRequest.start_date) + 1
        )).where(
            LeaveRequest.user_id == current_user.id,
            LeaveRequest.status == LeaveStatus.approved
        )
    ).one() or 0
    
    leave_balance = total_leave_days - int(used_leave_days)
    
    # Pending leave requests
    pending_leave_requests = session.exec(
        select(func.count(LeaveRequest.id)).where(
            LeaveRequest.user_id == current_user.id,
            LeaveRequest.status == LeaveStatus.pending
        )
    ).one()
    
    return EmployeeDashboardStats(
        current_session=current_session,
        tasks_due_today=tasks_due_today,
        tasks_completed=tasks_completed,
        productivity_score=productivity_score,
        active_projects=active_projects,
        leave_balance=leave_balance,
        pending_leave_requests=pending_leave_requests
    )


@router.get("/users", response_model=list)
async def get_all_users(
    current_user: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session)
):
    """Get all users (admin only)."""
    users = session.exec(select(User).where(User.is_active == True)).all()
    return [
        {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "created_at": user.created_at.isoformat()
        }
        for user in users
    ]
