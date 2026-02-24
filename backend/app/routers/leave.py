"""
Leave request management routes.
"""
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlmodel import Session, select

from app.database import get_session
from app.models import (
    User, LeaveRequest, LeaveRequestCreate, LeaveRequestUpdate,
    LeaveRequestRead, LeaveRequestWithUser, LeaveStatus, UserRole
)
from app.auth import get_current_user, get_current_admin_user

router = APIRouter(prefix="/leave", tags=["Leave Requests"])


# Employee routes
@router.post("/", response_model=LeaveRequestRead, status_code=status.HTTP_201_CREATED)
async def create_leave_request(
    leave_data: LeaveRequestCreate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Create a new leave request."""
    # Validate dates
    if leave_data.end_date < leave_data.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date"
        )
    
    leave_request = LeaveRequest(
        user_id=current_user.id,
        reason=leave_data.reason,
        start_date=leave_data.start_date,
        end_date=leave_data.end_date,
        leave_type=leave_data.leave_type
    )
    
    session.add(leave_request)
    session.commit()
    session.refresh(leave_request)
    
    return leave_request


@router.get("/me", response_model=List[LeaveRequestRead])
async def get_my_leave_requests(
    request: Request,
    status_filter: Optional[LeaveStatus] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get current user's leave requests."""
    statement = select(LeaveRequest).where(LeaveRequest.user_id == current_user.id)
    
    if status_filter:
        statement = statement.where(LeaveRequest.status == status_filter)
    
    statement = statement.order_by(LeaveRequest.created_at.desc())
    requests = session.exec(statement).all()
    
    return requests


@router.delete("/{leave_id}")
async def cancel_leave_request(
    leave_id: int,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Cancel a pending leave request."""
    statement = select(LeaveRequest).where(LeaveRequest.id == leave_id)
    leave_request = session.exec(statement).first()
    
    if not leave_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found"
        )
    
    if leave_request.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to cancel this request"
        )
    
    if leave_request.status != LeaveStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only cancel pending requests"
        )
    
    session.delete(leave_request)
    session.commit()
    
    return {"message": "Leave request cancelled"}


# Admin routes
@router.get("/", response_model=List[LeaveRequestWithUser])
async def get_all_leave_requests(
    request: Request,
    status_filter: Optional[LeaveStatus] = None,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    """Get all leave requests (admin only)."""
    statement = select(LeaveRequest)
    
    if status_filter:
        statement = statement.where(LeaveRequest.status == status_filter)
    
    statement = statement.order_by(LeaveRequest.created_at.desc())
    requests = session.exec(statement).all()
    
    result = []
    for req in requests:
        user_stmt = select(User).where(User.id == req.user_id)
        user = session.exec(user_stmt).first()
        
        result.append(LeaveRequestWithUser(
            id=req.id,
            user_id=req.user_id,
            reason=req.reason,
            start_date=req.start_date,
            end_date=req.end_date,
            leave_type=req.leave_type,
            status=req.status,
            admin_comment=req.admin_comment,
            reviewed_by=req.reviewed_by,
            created_at=req.created_at,
            reviewed_at=req.reviewed_at,
            user_name=user.name if user else None,
            user_email=user.email if user else None
        ))
    
    return result


@router.get("/pending", response_model=List[LeaveRequestWithUser])
async def get_pending_leave_requests(
    request: Request,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    """Get all pending leave requests (admin only)."""
    statement = select(LeaveRequest).where(
        LeaveRequest.status == LeaveStatus.pending
    ).order_by(LeaveRequest.created_at.asc())
    
    requests = session.exec(statement).all()
    
    result = []
    for req in requests:
        user_stmt = select(User).where(User.id == req.user_id)
        user = session.exec(user_stmt).first()
        
        result.append(LeaveRequestWithUser(
            id=req.id,
            user_id=req.user_id,
            reason=req.reason,
            start_date=req.start_date,
            end_date=req.end_date,
            leave_type=req.leave_type,
            status=req.status,
            admin_comment=req.admin_comment,
            reviewed_by=req.reviewed_by,
            created_at=req.created_at,
            reviewed_at=req.reviewed_at,
            user_name=user.name if user else None,
            user_email=user.email if user else None
        ))
    
    return result


@router.patch("/{leave_id}", response_model=LeaveRequestRead)
async def review_leave_request(
    leave_id: int,
    review_data: LeaveRequestUpdate,
    request: Request,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    """Approve or reject a leave request (admin only)."""
    statement = select(LeaveRequest).where(LeaveRequest.id == leave_id)
    leave_request = session.exec(statement).first()
    
    if not leave_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found"
        )
    
    if leave_request.status != LeaveStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only review pending requests"
        )
    
    leave_request.status = review_data.status
    leave_request.admin_comment = review_data.admin_comment
    leave_request.reviewed_by = admin.id
    leave_request.reviewed_at = datetime.now(timezone.utc)
    
    session.add(leave_request)
    session.commit()
    session.refresh(leave_request)
    
    return leave_request


@router.get("/stats")
async def get_leave_stats(
    request: Request,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user)
):
    """Get leave request statistics (admin only)."""
    total = len(session.exec(select(LeaveRequest)).all())
    pending = len(session.exec(select(LeaveRequest).where(LeaveRequest.status == LeaveStatus.pending)).all())
    approved = len(session.exec(select(LeaveRequest).where(LeaveRequest.status == LeaveStatus.approved)).all())
    rejected = len(session.exec(select(LeaveRequest).where(LeaveRequest.status == LeaveStatus.rejected)).all())
    
    return {
        "total": total,
        "pending": pending,
        "approved": approved,
        "rejected": rejected
    }
