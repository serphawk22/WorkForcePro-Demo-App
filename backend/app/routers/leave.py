"""
Leave request management routes.
"""
import base64
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File, Form
from pydantic import BaseModel
from sqlmodel import Session, select

from app.database import get_session
from app.models import (
    User, LeaveRequest, LeaveRequestCreate, LeaveRequestUpdate,
    LeaveRequestRead, LeaveRequestWithUser, LeaveStatus, UserRole
)
from app.auth import get_current_user, get_current_admin_user

router = APIRouter(prefix="/leave", tags=["Leave Requests"])


# ── AI-created leave request (JSON body, no file upload) ──────────────────────

class LeaveCreateAI(BaseModel):
    reason: str
    start_date: str       # YYYY-MM-DD
    end_date: str         # YYYY-MM-DD
    leave_type: str = "personal"


@router.post("/ai-create", response_model=LeaveRequestRead, status_code=status.HTTP_201_CREATED)
async def create_leave_request_from_ai(
    data: LeaveCreateAI,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a leave request submitted via the AI assistant (JSON, no file upload)."""
    from datetime import date as DateType
    try:
        start = DateType.fromisoformat(data.start_date)
        end = DateType.fromisoformat(data.end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    if end < start:
        raise HTTPException(status_code=400, detail="End date must be after start date.")

    leave_request = LeaveRequest(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        reason=data.reason,
        start_date=start,
        end_date=end,
        leave_type=data.leave_type,
    )
    session.add(leave_request)
    session.commit()
    session.refresh(leave_request)
    return leave_request


# Employee routes
@router.post("/", response_model=LeaveRequestRead, status_code=status.HTTP_201_CREATED)
async def create_leave_request(
    request: Request,
    reason: str = Form(..., min_length=5, max_length=500),
    start_date: str = Form(...),
    end_date: str = Form(...),
    leave_type: str = Form(default="personal"),
    document: Optional[UploadFile] = File(default=None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Create a new leave request with optional document attachment."""
    from datetime import date as DateType
    start = DateType.fromisoformat(start_date)
    end = DateType.fromisoformat(end_date)

    if end < start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date"
        )

    # Handle optional document upload
    document_data = None
    document_filename = None
    if document and document.filename:
        allowed_types = [
            "application/pdf",
            "image/jpeg", "image/jpg", "image/png",
            "image/gif", "image/webp",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ]
        if document.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only PDF, images (jpg, png, gif, webp) or Word documents are allowed"
            )
        contents = await document.read()
        if len(contents) > 10 * 1024 * 1024:  # 10 MB limit
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Document size must be less than 10 MB"
            )
        document_data = f"data:{document.content_type};base64,{base64.b64encode(contents).decode('utf-8')}"
        document_filename = document.filename

    leave_request = LeaveRequest(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        reason=reason,
        start_date=start,
        end_date=end,
        leave_type=leave_type,
        document_data=document_data,
        document_filename=document_filename,
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
    statement = select(LeaveRequest).where(
        LeaveRequest.id == leave_id,
        LeaveRequest.organization_id == current_user.organization_id,
    )
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
    statement = select(LeaveRequest).where(LeaveRequest.organization_id == admin.organization_id)
    
    if status_filter:
        statement = statement.where(LeaveRequest.status == status_filter)
    
    statement = statement.order_by(LeaveRequest.created_at.desc())
    requests = session.exec(statement).all()
    
    result = []
    for req in requests:
        user_stmt = select(User).where(
            User.id == req.user_id,
            User.organization_id == admin.organization_id,
        )
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
        LeaveRequest.organization_id == admin.organization_id,
        LeaveRequest.status == LeaveStatus.pending
    ).order_by(LeaveRequest.created_at.asc())
    
    requests = session.exec(statement).all()
    
    result = []
    for req in requests:
        user_stmt = select(User).where(
            User.id == req.user_id,
            User.organization_id == admin.organization_id,
        )
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
    statement = select(LeaveRequest).where(
        LeaveRequest.id == leave_id,
        LeaveRequest.organization_id == admin.organization_id,
    )
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
    total = len(session.exec(select(LeaveRequest).where(LeaveRequest.organization_id == admin.organization_id)).all())
    pending = len(session.exec(select(LeaveRequest).where(LeaveRequest.organization_id == admin.organization_id, LeaveRequest.status == LeaveStatus.pending)).all())
    approved = len(session.exec(select(LeaveRequest).where(LeaveRequest.organization_id == admin.organization_id, LeaveRequest.status == LeaveStatus.approved)).all())
    rejected = len(session.exec(select(LeaveRequest).where(LeaveRequest.organization_id == admin.organization_id, LeaveRequest.status == LeaveStatus.rejected)).all())
    
    return {
        "total": total,
        "pending": pending,
        "approved": approved,
        "rejected": rejected
    }


@router.get("/{leave_id}", response_model=LeaveRequestWithUser)
async def get_leave_request_by_id(
    leave_id: int,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get a specific leave request by ID (owner or admin)."""
    statement = select(LeaveRequest).where(
        LeaveRequest.id == leave_id,
        LeaveRequest.organization_id == current_user.organization_id,
    )
    leave_request = session.exec(statement).first()

    if not leave_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found"
        )

    # Only owner or admin may view
    if current_user.role != UserRole.admin and leave_request.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this request"
        )

    user_stmt = select(User).where(
        User.id == leave_request.user_id,
        User.organization_id == current_user.organization_id,
    )
    user = session.exec(user_stmt).first()

    return LeaveRequestWithUser(
        id=leave_request.id,
        user_id=leave_request.user_id,
        reason=leave_request.reason,
        start_date=leave_request.start_date,
        end_date=leave_request.end_date,
        leave_type=leave_request.leave_type,
        status=leave_request.status,
        admin_comment=leave_request.admin_comment,
        reviewed_by=leave_request.reviewed_by,
        created_at=leave_request.created_at,
        reviewed_at=leave_request.reviewed_at,
        document_data=leave_request.document_data,
        document_filename=leave_request.document_filename,
        user_name=user.name if user else None,
        user_email=user.email if user else None,
        user_profile_picture=user.profile_picture if user else None,
    )
