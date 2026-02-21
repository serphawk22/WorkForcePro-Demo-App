"""
Attendance management routes.
"""
from datetime import datetime, date
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
        active_session.punch_out = datetime.utcnow()
        if active_session.punch_in:
            delta = active_session.punch_out - active_session.punch_in
            active_session.total_hours = round(delta.total_seconds() / 3600, 2)
        session.add(active_session)
    
    # Check if already completed attendance for today
    statement = select(Attendance).where(
        Attendance.user_id == current_user.id,
        Attendance.date == today
    )
    existing = session.exec(statement).first()
    
    if existing and existing.punch_out:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already completed attendance for today."
        )
    
    # Create new attendance record
    attendance = Attendance(
        user_id=current_user.id,
        date=today,
        punch_in=datetime.utcnow()
    )
    session.add(attendance)
    session.commit()
    session.refresh(attendance)
    
    return attendance


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
    today = date.today()
    
    # Find today's attendance
    statement = select(Attendance).where(
        Attendance.user_id == current_user.id,
        Attendance.date == today
    )
    attendance = session.exec(statement).first()
    
    if not attendance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No punch-in record found for today. Please punch in first."
        )
    
    if attendance.punch_out:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already punched out for today."
        )
    
    # Update with punch out time
    attendance.punch_out = datetime.utcnow()
    
    # Calculate total hours
    if attendance.punch_in:
        delta = attendance.punch_out - attendance.punch_in
        attendance.total_hours = round(delta.total_seconds() / 3600, 2)
    
    session.add(attendance)
    session.commit()
    session.refresh(attendance)
    
    return attendance


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
    """Get current user's attendance for today."""
    today = date.today()
    statement = select(Attendance).where(
        Attendance.user_id == current_user.id,
        Attendance.date == today
    )
    attendance = session.exec(statement).first()
    return attendance


@router.get("/status")
async def get_attendance_status(
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get current user's attendance status for today."""
    today = date.today()
    statement = select(Attendance).where(
        Attendance.user_id == current_user.id,
        Attendance.date == today
    )
    attendance = session.exec(statement).first()
    
    if not attendance:
        return {
            "status": "not_started",
            "punch_in": None,
            "punch_out": None,
            "elapsed_seconds": 0
        }
    
    elapsed = 0
    if attendance.punch_in and not attendance.punch_out:
        elapsed = (datetime.utcnow() - attendance.punch_in).total_seconds()
    elif attendance.punch_in and attendance.punch_out:
        elapsed = (attendance.punch_out - attendance.punch_in).total_seconds()
    
    status = "not_started"
    if attendance.punch_in and not attendance.punch_out:
        status = "working"
    elif attendance.punch_out:
        status = "completed"
    
    return {
        "status": status,
        "punch_in": attendance.punch_in.isoformat() if attendance.punch_in else None,
        "punch_out": attendance.punch_out.isoformat() if attendance.punch_out else None,
        "elapsed_seconds": int(elapsed),
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
