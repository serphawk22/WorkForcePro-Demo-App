"""
Dashboard endpoints for admins and employees.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from datetime import datetime, timedelta, date, timezone, time
from app.database import get_session
from app.models import User, Task, Attendance, LeaveRequest, TaskStatus, LeaveStatus, TaskPriority, UserRole
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
    try:
        today = date.today()
        
        # Total active organization users (include admin-role staff)
        total_employees = session.exec(
            select(func.count(User.id)).where(
                User.is_active == True,
                User.organization_id == current_user.organization_id,
            )
        ).one() or 0
        
        # Active sessions (clocked in today)
        active_sessions = session.exec(
            select(func.count(Attendance.id)).where(
                Attendance.organization_id == current_user.organization_id,
                Attendance.date == today,
                Attendance.punch_in.isnot(None),
                Attendance.punch_out.is_(None)
            )
        ).one() or 0
        
        # Count tasks by status using raw SQL to avoid enum type issues
        from sqlalchemy import text as sql_text
        
        # Pending tasks (tasks submitted for review) - cast enum to text to avoid type mismatch
        pending_tasks_result = session.exec(
            sql_text("SELECT COUNT(*) FROM tasks WHERE organization_id = :org_id AND status::text IN ('submitted', 'reviewing')").bindparams(
                org_id=current_user.organization_id
            )
        ).one()
        pending_tasks = int(pending_tasks_result[0] if hasattr(pending_tasks_result, '__getitem__') else pending_tasks_result or 0)
        
        # Active tasks (any status except approved/rejected) - cast enum to text
        active_tasks_result = session.exec(
            sql_text("SELECT COUNT(*) FROM tasks WHERE organization_id = :org_id AND status::text NOT IN ('approved', 'rejected')").bindparams(
                org_id=current_user.organization_id
            )
        ).one()
        active_tasks_count = int(active_tasks_result[0] if hasattr(active_tasks_result, '__getitem__') else active_tasks_result or 0)

        # Total tasks
        total_tasks_count = session.exec(
            select(func.count(Task.id)).where(Task.organization_id == current_user.organization_id)
        ).one() or 0

        # Employees on leave today (approved leave covering today) - cast enum to text
        employees_on_leave_result = session.exec(
            sql_text("SELECT COUNT(*) FROM leave_requests WHERE organization_id = :org_id AND status::text = 'approved' AND start_date <= :today AND end_date >= :today").bindparams(
                org_id=current_user.organization_id,
                today=today,
            )
        ).one()
        employees_on_leave_today = int(employees_on_leave_result[0] if hasattr(employees_on_leave_result, '__getitem__') else employees_on_leave_result or 0)

        # Late check-ins today (punch_in after 09:30 local — stored as UTC datetime)
        # We use a simple hour-based heuristic: punch_in hour (UTC) > 4 as proxy for late
        today_late_threshold = datetime.combine(today, time(4, 0, 0))  # ~9:30 IST in UTC
        late_checkins_today = session.exec(
            select(func.count(Attendance.id)).where(
                Attendance.organization_id == current_user.organization_id,
                Attendance.date == today,
                Attendance.punch_in.isnot(None),
                Attendance.punch_in > today_late_threshold
            )
        ).one() or 0

        # Upcoming tasks (nearest due dates, non-approved, with public_id) - using raw SQL
        upcoming_tasks = []
        try:
            # Use raw SQL to fetch upcoming tasks and avoid enum type issues
            upcoming_raw = session.exec(
                sql_text("""
                    SELECT t.id, t.title, t.due_date, t.priority, t.status, u.name as assignee_name
                    FROM tasks t
                    LEFT JOIN users u ON t.assigned_to = u.id
                    WHERE t.organization_id = :org_id
                    AND t.status::text NOT IN ('approved', 'rejected')
                    AND t.due_date IS NOT NULL
                    ORDER BY t.due_date ASC
                    LIMIT 6
                """)
                .bindparams(org_id=current_user.organization_id)
            ).all()

            for row in upcoming_raw:
                upcoming_tasks.append({
                    "id": row[0],
                    "public_id": "",  # Skip public_id to avoid column issues
                    "title": row[1],
                    "due_date": row[2].isoformat() if row[2] else None,
                    "priority": str(row[3]) if row[3] else "medium",
                    "status": str(row[4]) if row[4] else "todo",
                    "assignee_name": row[5],
                })
        except Exception as e:
            print(f"Warning: Could not fetch upcoming tasks: {e}")
            upcoming_tasks = []
        
        # Average daily hours (last 30 days)
        thirty_days_ago = today - timedelta(days=30)
        avg_hours_result = session.exec(
            select(func.avg(Attendance.total_hours)).where(
                Attendance.organization_id == current_user.organization_id,
                Attendance.date >= thirty_days_ago,
                Attendance.total_hours.isnot(None)
            )
        ).one()
        avg_daily_hours = round(float(avg_hours_result or 0), 2)
        
        # Pending leave requests - cast enum to text
        leave_pending_result = session.exec(
            sql_text("SELECT COUNT(*) FROM leave_requests WHERE organization_id = :org_id AND status::text = 'pending'").bindparams(
                org_id=current_user.organization_id
            )
        ).one()
        leave_requests_pending = int(leave_pending_result[0] if hasattr(leave_pending_result, '__getitem__') else leave_pending_result or 0)
        
        # Recent activities (last 10 actions)
        recent_activities = []
        try:
            recent_tasks = session.exec(
                select(Task, User.name).join(User, Task.assigned_to == User.id, isouter=True)
                .where(Task.organization_id == current_user.organization_id)
                .order_by(Task.created_at.desc())
                .limit(5)
            ).all()
            
            for task, user_name in recent_tasks:
                recent_activities.append({
                    "type": "task",
                    "description": f"{user_name or 'Unknown'} was assigned: {task.title}",
                    "timestamp": task.created_at.isoformat() if task.created_at else datetime.now().isoformat(),
                    "status": task.status.value if hasattr(task.status, 'value') else str(task.status)
                })
        except Exception as e:
            print(f"Warning: Could not fetch recent tasks: {e}")
        
        try:
            recent_leaves = session.exec(
                select(LeaveRequest, User.name).join(User, LeaveRequest.user_id == User.id, isouter=True)
                .where(LeaveRequest.organization_id == current_user.organization_id)
                .order_by(LeaveRequest.created_at.desc())
                .limit(5)
            ).all()
            
            for leave, user_name in recent_leaves:
                recent_activities.append({
                    "type": "leave",
                    "description": f"{user_name or 'Unknown'} requested leave from {leave.start_date} to {leave.end_date}",
                    "timestamp": leave.created_at.isoformat() if leave.created_at else datetime.now().isoformat(),
                    "status": leave.status.value if hasattr(leave.status, 'value') else str(leave.status)
                })
        except Exception as e:
            print(f"Warning: Could not fetch recent leaves: {e}")
        
        # Sort by timestamp
        recent_activities.sort(key=lambda x: x["timestamp"], reverse=True)
        recent_activities = recent_activities[:10]
        
        return AdminDashboardStats(
            total_employees=total_employees,
            active_sessions=active_sessions,
            pending_tasks=pending_tasks,
            avg_daily_hours=avg_daily_hours,
            recent_activities=recent_activities,
            leave_requests_pending=leave_requests_pending,
            employees_on_leave_today=employees_on_leave_today,
            late_checkins_today=late_checkins_today,
            active_tasks_count=active_tasks_count,
            total_tasks_count=total_tasks_count,
            upcoming_tasks=upcoming_tasks
        )
    except Exception as e:
        print(f"Dashboard error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Dashboard error: {str(e)}")


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
            Attendance.organization_id == current_user.organization_id,
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
            # Ensure punch_in is timezone-aware (convert if naive)
            punch_in_aware = current_session_record.punch_in
            if punch_in_aware.tzinfo is None:
                punch_in_aware = punch_in_aware.replace(tzinfo=timezone.utc)
            
            delta = datetime.now(timezone.utc) - punch_in_aware
            hours_worked = round(delta.total_seconds() / 3600, 2)
            elapsed_seconds = int(delta.total_seconds())
            # Prevent negative elapsed time (clock sync issues)
            elapsed_seconds = max(0, elapsed_seconds)
            hours_worked = max(0.0, hours_worked)
        
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
                Attendance.organization_id == current_user.organization_id,
                Attendance.punch_in >= start_of_day,
                Attendance.punch_in < end_of_day,
                Attendance.punch_out.isnot(None)
            )
        ).first()
        
        if completed_session_record:
            # Show today's completed session
            elapsed_seconds = 0
            if completed_session_record.punch_in and completed_session_record.punch_out:
                # Ensure datetimes are timezone-aware (convert if naive)
                punch_in_aware = completed_session_record.punch_in
                punch_out_aware = completed_session_record.punch_out
                if punch_in_aware.tzinfo is None:
                    punch_in_aware = punch_in_aware.replace(tzinfo=timezone.utc)
                if punch_out_aware.tzinfo is None:
                    punch_out_aware = punch_out_aware.replace(tzinfo=timezone.utc)
                
                delta = punch_out_aware - punch_in_aware
                elapsed_seconds = int(delta.total_seconds())
                # Prevent negative elapsed time
                elapsed_seconds = max(0, elapsed_seconds)
            
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
            Task.organization_id == current_user.organization_id,
            Task.due_date == today,
            Task.status != TaskStatus.approved
        )
    ).one()
    
    # Tasks completed (approved by admin)
    tasks_completed = session.exec(
        select(func.count(Task.id)).where(
            Task.assigned_to == current_user.id,
            Task.organization_id == current_user.organization_id,
            Task.status == TaskStatus.approved
        )
    ).one()
    
    # Active projects (in-progress tasks)
    active_projects = session.exec(
        select(func.count(Task.id)).where(
            Task.assigned_to == current_user.id,
            Task.organization_id == current_user.organization_id,
            Task.status == TaskStatus.in_progress
        )
    ).one()
    
    # Total tasks
    total_tasks = session.exec(
        select(func.count(Task.id)).where(
            Task.assigned_to == current_user.id,
            Task.organization_id == current_user.organization_id,
        )
    ).one()
    
    # Productivity score (completed / total * 100)
    productivity_score = round((tasks_completed / total_tasks * 100) if total_tasks > 0 else 0, 1)
    
    # Leave balance (simplified - assuming 20 days per year)
    total_leave_days = 20
    # Use PostgreSQL date arithmetic instead of julianday
    used_leave_days = session.exec(
        select(func.sum(
            (LeaveRequest.end_date - LeaveRequest.start_date) + 1
        )).where(
            LeaveRequest.user_id == current_user.id,
            LeaveRequest.organization_id == current_user.organization_id,
            LeaveRequest.status == LeaveStatus.approved
        )
    ).one() or 0
    
    leave_balance = total_leave_days - int(used_leave_days)
    
    # Pending leave requests
    pending_leave_requests = session.exec(
        select(func.count(LeaveRequest.id)).where(
            LeaveRequest.user_id == current_user.id,
            LeaveRequest.organization_id == current_user.organization_id,
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
    users = session.exec(
        select(User).where(
            User.is_active == True,
            User.organization_id == current_user.organization_id,
        )
    ).all()
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
