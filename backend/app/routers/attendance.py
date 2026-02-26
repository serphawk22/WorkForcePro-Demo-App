"""
Attendance management routes.
"""
from datetime import datetime, date, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlmodel import Session, select

from app.database import get_session
from app.models import (
    User, Attendance, AttendanceRead, AttendanceWithUser, UserRole
)
from app.auth import get_current_user, get_current_admin_user

router = APIRouter(prefix="/attendance", tags=["Attendance"])


@router.post("/punch-in", response_model=AttendanceRead)
async def punch_in(
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Punch in for the current day.
    Creates a new attendance record with punch_in time.
    Automatically closes any previous open session.
    """
    today = date.today()
    
    # Close any previous open session (where punch_out is null)
    active_session_statement = select(Attendance).where(
        Attendance.user_id == current_user.id,
        Attendance.punch_out == None
    )
    active_session = session.exec(active_session_statement).first()
    
    if active_session:
        # Auto-close the previous session
        active_session.punch_out = datetime.now(timezone.utc)
        if active_session.punch_in:
            punch_in_aware = active_session.punch_in
            punch_out_aware = active_session.punch_out
            if punch_in_aware.tzinfo is None:
                punch_in_aware = punch_in_aware.replace(tzinfo=timezone.utc)
            if punch_out_aware.tzinfo is None:
                punch_out_aware = punch_out_aware.replace(tzinfo=timezone.utc)
            
            delta = punch_out_aware - punch_in_aware
            active_session.total_hours = round(delta.total_seconds() / 3600, 2)
        session.add(active_session)
    
    # Check if already completed attendance for today (by date field)
    statement = select(Attendance).where(
        Attendance.user_id == current_user.id,
        Attendance.date == today
    )
    existing = session.exec(statement).first()
    
    if existing and existing.punch_out:
        # If already completed today, delete the old record and create fresh one
        # This allows employees to punch in again if needed
        session.delete(existing)
        session.commit()
    
    # Create new attendance record (or re-use if not completed)
    if not existing or existing.punch_out:
        attendance = Attendance(
            user_id=current_user.id,
            date=today,
            punch_in=datetime.now(timezone.utc)
        )
    else:
        # Existing record without punch_out - shouldn't happen but handle it
        attendance = existing
        attendance.punch_in = datetime.now(timezone.utc)
    
    session.add(attendance)
    session.commit()
    session.refresh(attendance)
    
    # Return response with is_active flag for UI synchronization
    return {
        "id": attendance.id,
        "user_id": attendance.user_id,
        "date": attendance.date,
        "punch_in": attendance.punch_in,
        "punch_out": attendance.punch_out,
        "total_hours": attendance.total_hours,
        "is_active": True  # Just punched in, session is active
    }


@router.post("/punch-out", response_model=AttendanceRead)
async def punch_out(
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Punch out for the current day.
    Updates the attendance record with punch_out time and calculates total hours.
    """
    # Find active session (timezone-safe) - don't use date field
    statement = select(Attendance).where(
        Attendance.user_id == current_user.id,
        Attendance.punch_out == None  # Find active session
    ).order_by(Attendance.punch_in.desc())  # Get most recent
    
    attendance = session.exec(statement).first()
    
    if not attendance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active punch-in session found. Please punch in first."
        )
    
    # Update with punch out time
    attendance.punch_out = datetime.now(timezone.utc)
    
    # Calculate total hours (handle timezone-naive datetimes)
    if attendance.punch_in:
        punch_in_aware = attendance.punch_in
        punch_out_aware = attendance.punch_out
        if punch_in_aware.tzinfo is None:
            punch_in_aware = punch_in_aware.replace(tzinfo=timezone.utc)
        if punch_out_aware.tzinfo is None:
            punch_out_aware = punch_out_aware.replace(tzinfo=timezone.utc)
        
        delta = punch_out_aware - punch_in_aware
        attendance.total_hours = round(delta.total_seconds() / 3600, 2)
    
    session.add(attendance)
    session.commit()
    session.refresh(attendance)
    
    # Return response with is_active flag for UI synchronization
    return {
        "id": attendance.id,
        "user_id": attendance.user_id,
        "date": attendance.date,
        "punch_in": attendance.punch_in,
        "punch_out": attendance.punch_out,
        "total_hours": attendance.total_hours,
        "is_active": False  # Just punched out, session is complete
    }


@router.get("/me", response_model=List[AttendanceRead])
async def get_my_attendance(
    request: Request,
    limit: int = 30,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get current user's attendance records."""
    statement = select(Attendance).where(
        Attendance.user_id == current_user.id
    ).order_by(Attendance.date.desc()).limit(limit)
    
    records = session.exec(statement).all()
    return records


@router.get("/today", response_model=Optional[AttendanceRead])
async def get_today_attendance(
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get current user's attendance for today (timezone-safe)."""
    # Calculate today's UTC time range (start and end of day)
    now = datetime.now(timezone.utc)
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + timedelta(days=1)
    
    # Query by punch_in timestamp range instead of date field (timezone-safe)
    statement = select(Attendance).where(
        Attendance.user_id == current_user.id,
        Attendance.punch_in >= start_of_day,
        Attendance.punch_in < end_of_day
    )
    attendance = session.exec(statement).first()
    return attendance


@router.get("/status")
async def get_attendance_status(
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get current user's attendance status for today (timezone-safe)."""
    # Calculate today's UTC time range (start and end of day)
    now = datetime.now(timezone.utc)
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + timedelta(days=1)
    
    # Query by punch_in timestamp range instead of date field (timezone-safe)
    statement = select(Attendance).where(
        Attendance.user_id == current_user.id,
        Attendance.punch_in >= start_of_day,
        Attendance.punch_in < end_of_day
    )
    attendance = session.exec(statement).first()
    
    if not attendance:
        return {
            "status": "not_started",
            "punch_in": None,
            "punch_out": None,
            "elapsed_seconds": 0,
            "is_active": False,
            "total_hours": None
        }
    
    elapsed = 0
    if attendance.punch_in and not attendance.punch_out:
        # Ensure punch_in is timezone-aware (convert if naive)
        punch_in_aware = attendance.punch_in
        if punch_in_aware.tzinfo is None:
            punch_in_aware = punch_in_aware.replace(tzinfo=timezone.utc)
        elapsed = (datetime.now(timezone.utc) - punch_in_aware).total_seconds()
        # Prevent negative elapsed time (clock sync issues)
        elapsed = max(0, elapsed)
    elif attendance.punch_in and attendance.punch_out:
        # Ensure both are timezone-aware (convert if naive)
        punch_in_aware = attendance.punch_in
        punch_out_aware = attendance.punch_out
        if punch_in_aware.tzinfo is None:
            punch_in_aware = punch_in_aware.replace(tzinfo=timezone.utc)
        if punch_out_aware.tzinfo is None:
            punch_out_aware = punch_out_aware.replace(tzinfo=timezone.utc)
        elapsed = (punch_out_aware - punch_in_aware).total_seconds()
        # Prevent negative elapsed time
        elapsed = max(0, elapsed)
    
    status = "not_started"
    is_active = False
    if attendance.punch_in and not attendance.punch_out:
        status = "working"
        is_active = True
    elif attendance.punch_out:
        status = "completed"
        is_active = False
    
    return {
        "status": status,
        "punch_in": attendance.punch_in.isoformat() if attendance.punch_in else None,
        "punch_out": attendance.punch_out.isoformat() if attendance.punch_out else None,
        "elapsed_seconds": int(elapsed),
        "is_active": is_active,
        "total_hours": attendance.total_hours
    }


# Admin routes
@router.get("/all", response_model=List[AttendanceWithUser])
async def get_all_attendance(
    request: Request,
    date_filter: Optional[date] = None,
    limit: int = 100,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    """Get all attendance records (admin only)."""
    statement = select(Attendance)
    
    if date_filter:
        statement = statement.where(Attendance.date == date_filter)
    
    statement = statement.order_by(Attendance.date.desc()).limit(limit)
    records = session.exec(statement).all()
    
    # Enrich with user info
    result = []
    for record in records:
        user_statement = select(User).where(User.id == record.user_id)
        user = session.exec(user_statement).first()
        
        result.append(AttendanceWithUser(
            id=record.id,
            user_id=record.user_id,
            date=record.date,
            punch_in=record.punch_in,
            punch_out=record.punch_out,
            total_hours=record.total_hours,
            user_name=user.name if user else None,
            user_email=user.email if user else None
        ))
    
    return result


@router.get("/active-sessions")
async def get_active_sessions(
    request: Request,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    """Get count of employees currently working (punched in but not out)."""
    today = date.today()
    statement = select(Attendance).where(
        Attendance.date == today,
        Attendance.punch_in != None,
        Attendance.punch_out == None
    )
    active = session.exec(statement).all()
    
    return {
        "active_sessions": len(active),
        "users": [
            {"user_id": a.user_id, "punch_in": a.punch_in.isoformat()}
            for a in active
        ]
    }
