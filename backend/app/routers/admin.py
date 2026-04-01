"""
Admin routes: protected endpoints for admin users only.
"""
from datetime import date, datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlmodel import Session, select

from app.database import get_session
from app.models import (
    User, UserCreate, UserRead, UserRole, UserStatus, Attendance, Task, LeaveRequest,
    TaskStatus, LeaveStatus, DashboardStats, Notification, TaskComment, Subtask,
    EmployeePerformance, AttendanceStats, EmployeeListItem, NotificationType,
    Payroll, TaskSheet, HappySheet, DreamProject, LearningFocus, PersonalProject
)
from app.auth import get_current_admin_user, get_password_hash, ensure_same_organization

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
        select(User).where(
            User.role == UserRole.employee,
            User.is_active == True,
            User.organization_id == admin.organization_id,
        )
    ).all()
    total_employees = len(employees)
    
    # Active sessions (punched in today, not punched out)
    today = date.today()
    active = session.exec(
        select(Attendance).where(
            Attendance.organization_id == admin.organization_id,
            Attendance.date == today,
            Attendance.punch_in != None,
            Attendance.punch_out == None
        )
    ).all()
    active_sessions = len(active)
    
    # Pending tasks (tasks submitted for review)
    pending_tasks = len(session.exec(
        select(Task).where(
            Task.organization_id == admin.organization_id,
            Task.status == TaskStatus.submitted,
        )
    ).all())
    
    # Pending leave requests
    pending_leaves = len(session.exec(
        select(LeaveRequest).where(
            LeaveRequest.organization_id == admin.organization_id,
            LeaveRequest.status == LeaveStatus.pending,
        )
    ).all())
    
    # Average daily hours (from last 30 days)
    recent_attendance = session.exec(
        select(Attendance).where(
            Attendance.organization_id == admin.organization_id,
            Attendance.total_hours != None,
        )
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
        avg_daily_hours=round(avg_hours, 1),
        pending_registrations=len(session.exec(
            select(User).where(
                User.status == "PENDING",
                User.organization_id == admin.organization_id,
            )
        ).all())
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
    statement = select(User).where(
        User.role == UserRole.employee,
        User.organization_id == current_user.organization_id,
    )
    employees = session.exec(statement).all()
    return employees


@router.get("/users", response_model=List[UserRead])
async def get_all_users(
    status_filter: Optional[str] = Query(None, alias="status"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Get all users (admin only). Optionally filter by status=PENDING|APPROVED|REJECTED.
    """
    statement = select(User).where(User.organization_id == current_user.organization_id)
    if status_filter:
        statement = statement.where(User.status == status_filter.upper())
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
    statement = select(User).where(
        User.id == user_id,
        User.organization_id == current_user.organization_id,
    )
    user = session.exec(statement).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user


@router.put("/users/{user_id}/approve")
async def approve_user(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin_user)
):
    """Approve a pending user registration (admin only)."""
    try:
        user = session.exec(
            select(User).where(
                User.id == user_id,
                User.organization_id == current_user.organization_id,
            )
        ).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        user.status = UserStatus.APPROVED
        # Try to set approved_at/approved_by, but don't fail if columns don't exist
        try:
            user.approved_at = datetime.now(timezone.utc)
            user.approved_by = current_user.id
        except Exception:
            pass  # Columns may not exist in DB yet
        
        session.add(user)
        session.commit()
        session.refresh(user)
        
        # Skip notification creation - the enum type may not be in sync
        # This can be re-enabled once DB is fully migrated
        
        return {"message": f"User {user.email} has been approved.", "status": "APPROVED"}
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to approve user: {str(e)}")


@router.put("/users/{user_id}/reject")
async def reject_user(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin_user)
):
    """Reject a pending user registration (admin only)."""
    user = session.exec(
        select(User).where(
            User.id == user_id,
            User.organization_id == current_user.organization_id,
        )
    ).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.status = UserStatus.REJECTED
    session.add(user)
    session.commit()
    return {"message": f"User {user.email} has been rejected.", "status": "REJECTED"}


@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_employee(
    user_data: UserCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin_user)
):
    """Create a new employee directly (admin only). Account is auto-approved."""
    existing = session.exec(
        select(User).where(
            User.email == user_data.email,
            User.organization_id == current_user.organization_id,
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    hashed_password = get_password_hash(user_data.password)
    user = User(
        name=user_data.name,
        email=user_data.email,
        hashed_password=hashed_password,
        role=user_data.role,
        organization_id=current_user.organization_id,
        status=UserStatus.APPROVED,
        approved_at=datetime.now(timezone.utc),
        approved_by=current_user.id,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.patch("/users/{user_id}/date-joined")
async def update_date_joined(
    user_id: int,
    date_joined: str = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Set or update an employee's date of joining (admin only).
    Pass date_joined as query param in YYYY-MM-DD format, or omit to clear it.
    """
    from datetime import date as DateType
    user = session.exec(
        select(User).where(
            User.id == user_id,
            User.organization_id == current_user.organization_id,
        )
    ).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if date_joined:
        try:
            user.date_joined = DateType.fromisoformat(date_joined)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        user.date_joined = None

    session.add(user)
    session.commit()
    session.refresh(user)
    return {"message": "Date of joining updated", "date_joined": str(user.date_joined) if user.date_joined else None}


@router.patch("/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Deactivate a user account (admin only).
    """
    statement = select(User).where(
        User.id == user_id,
        User.organization_id == current_user.organization_id,
    )
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
    statement = select(User).where(
        User.id == user_id,
        User.organization_id == current_user.organization_id,
    )
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
    try:
        statement = select(User).where(
            User.id == user_id,
            User.organization_id == current_user.organization_id,
        )
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
        try:
            subtasks = session.exec(select(Subtask).where(
                (Subtask.assigned_to == user_id) | (Subtask.assigned_by == user_id)
            )).all()
            for subtask in subtasks:
                session.delete(subtask)
        except Exception:
            pass
        
        # 2. Delete task comments by this user
        try:
            comments = session.exec(select(TaskComment).where(TaskComment.user_id == user_id)).all()
            for comment in comments:
                session.delete(comment)
        except Exception:
            pass
        
        # 3. Delete tasks assigned to or created by this user
        try:
            tasks = session.exec(select(Task).where(
                (Task.assigned_to == user_id) | (Task.assigned_by == user_id)
            )).all()
            for task in tasks:
                # First delete any subtasks for this task
                task_subtasks = session.exec(select(Subtask).where(Subtask.task_id == task.id)).all()
                for st in task_subtasks:
                    session.delete(st)
                # Then delete task comments
                task_comments = session.exec(select(TaskComment).where(TaskComment.task_id == task.id)).all()
                for tc in task_comments:
                    session.delete(tc)
                session.delete(task)
        except Exception:
            pass
        
        # 4. Delete attendance records
        try:
            attendance_records = session.exec(select(Attendance).where(Attendance.user_id == user_id)).all()
            for record in attendance_records:
                session.delete(record)
        except Exception:
            pass
        
        # 5. Delete leave requests
        try:
            leave_requests = session.exec(select(LeaveRequest).where(LeaveRequest.user_id == user_id)).all()
            for leave in leave_requests:
                session.delete(leave)
        except Exception:
            pass
        
        # 6. Delete notifications
        try:
            notifications = session.exec(select(Notification).where(Notification.user_id == user_id)).all()
            for notification in notifications:
                session.delete(notification)
        except Exception:
            pass
        
        # 7. Delete payroll records (uses employee_id, not user_id)
        try:
            payrolls = session.exec(select(Payroll).where(Payroll.employee_id == user_id)).all()
            for payroll in payrolls:
                session.delete(payroll)
        except Exception:
            pass
        
        # 8. Delete my-space records (TaskSheet, HappySheet, DreamProject, LearningFocus, PersonalProject)
        try:
            task_sheets = session.exec(select(TaskSheet).where(TaskSheet.user_id == user_id)).all()
            for ts in task_sheets:
                session.delete(ts)
        except Exception:
            pass
        
        try:
            happy_sheets = session.exec(select(HappySheet).where(HappySheet.user_id == user_id)).all()
            for hs in happy_sheets:
                session.delete(hs)
        except Exception:
            pass
        
        try:
            dream_projects = session.exec(select(DreamProject).where(DreamProject.user_id == user_id)).all()
            for dp in dream_projects:
                session.delete(dp)
        except Exception:
            pass
        
        try:
            learning_focuses = session.exec(select(LearningFocus).where(LearningFocus.user_id == user_id)).all()
            for lf in learning_focuses:
                session.delete(lf)
        except Exception:
            pass
        
        try:
            personal_projects = session.exec(select(PersonalProject).where(PersonalProject.user_id == user_id)).all()
            for pp in personal_projects:
                session.delete(pp)
        except Exception:
            pass
        
        # Finally, delete the user
        session.delete(user)
        session.commit()
        
        return {"message": f"User {user_email} has been permanently deleted along with all associated data"}
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user: {str(e)}"
        )


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
