"""
User profile management routes.
"""
import base64
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy import or_
from sqlmodel import Session, select

from app.database import get_session
from app.models import User, UserRole
from app.schemas import UserRead, UserUpdate, BankDetailsUpdate
from app.auth import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserRead)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Get logged-in user's full profile details.
    """
    # Refresh user data from database to ensure we have latest
    statement = select(User).where(User.id == current_user.id)
    user = session.exec(statement).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user


@router.get("/employees", response_model=List[UserRead])
async def get_all_employees(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Get all active employees (accessible to both admin and employee).
    Used for assigning tasks and subtasks.
    """
    # Get all active employees
    statement = select(User).where(
        User.role == UserRole.employee,
        User.is_active == True,
        User.organization_id == current_user.organization_id,
    )
    employees = session.exec(statement).all()
    
    return employees


@router.get("/assignable", response_model=List[UserRead])
async def get_assignable_users(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Active admins and employees who can receive task/subtask assignments.
    Accessible to any authenticated user (admin or employee).
    """
    statement = (
        select(User)
        .where(
            User.is_active == True,
            User.organization_id == current_user.organization_id,
            or_(User.role == UserRole.admin, User.role == UserRole.employee),
        )
        .order_by(User.name)
    )
    return list(session.exec(statement).all())


@router.put("/me", response_model=UserRead)
async def update_my_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Update logged-in user's profile.
    
    - **name**: Full name (editable)
    - **age**: Age (required, 18-100)
    - **date_joined**: Date of joining (required)
    - **github_url**: GitHub profile URL (required, must start with https://github.com/)
    - **linkedin_url**: LinkedIn profile URL (required, must start with https://linkedin.com/)
    - **profile_picture**: Profile picture (optional, base64 or URL)
    
    Note: Email cannot be updated.
    """
    # Get user from database
    statement = select(User).where(User.id == current_user.id)
    user = session.exec(statement).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update fields (email is NOT updatable)
    user.name = user_update.name
    user.age = user_update.age
    user.date_joined = user_update.date_joined
    user.github_url = user_update.github_url
    user.linkedin_url = user_update.linkedin_url
    
    # Only update profile_picture if provided
    if user_update.profile_picture is not None:
        user.profile_picture = user_update.profile_picture
    
    session.add(user)
    session.commit()
    session.refresh(user)
    
    return user


@router.post("/me/upload-picture", response_model=dict)
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Upload profile picture for logged-in user.
    
    Accepts image files (jpg, jpeg, png, gif, webp).
    Saves image as base64 string in the database.
    Automatically replaces old profile picture.
    """
    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only image files (jpg, jpeg, png, gif, webp) are allowed"
        )
    
    # Validate file size (max 5MB)
    try:
        contents = await file.read()
        file_size = len(contents)
        
        if file_size > 5 * 1024 * 1024:  # 5MB
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image size must be less than 5MB"
            )
        
        # Convert to base64
        base64_image = base64.b64encode(contents).decode('utf-8')
        
        # Create data URI with mime type
        data_uri = f"data:{file.content_type};base64,{base64_image}"
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process image: {str(e)}"
        )
    
    # Update user's profile_picture field (old picture is automatically replaced)
    statement = select(User).where(User.id == current_user.id)
    user = session.exec(statement).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Old profile picture in DB is automatically replaced
    user.profile_picture = data_uri
    session.add(user)
    session.commit()
    
    return {
        "message": "Profile picture uploaded successfully",
        "preview": data_uri[:100] + "..." if len(data_uri) > 100 else data_uri
    }


@router.put("/me/bank-details", response_model=UserRead)
async def update_bank_details(
    body: BankDetailsUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Update the logged-in employee's bank details."""
    user = session.exec(select(User).where(User.id == current_user.id)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.bank_account_number = body.bank_account_number
    user.bank_ifsc_code = body.bank_ifsc_code
    user.bank_name = body.bank_name
    user.bank_account_holder = body.bank_account_holder
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
