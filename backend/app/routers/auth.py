"""
Authentication routes: register and login.
"""
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select

from app.database import get_session
from app.models import User, UserCreate, UserRead, UserLogin, Token, UserRole, UserStatus, Notification, NotificationType
from app.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    get_current_user,
    set_auth_cookie,
    clear_auth_cookie,
    COOKIE_NAME,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
def register(
    user_data: UserCreate,
    session: Session = Depends(get_session)
):
    """
    Register a new user.
    
    - **name**: User's full name
    - **email**: Unique email address
    - **password**: Password (min 6 characters)
    - **role**: 'admin' or 'employee' (default: employee)
    """
    # Check if email already exists
    statement = select(User).where(User.email == user_data.email)
    existing_user = session.exec(statement).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Resolve organization for new user
    from app.models import Organization
    organization_id = user_data.organization_id

    if organization_id:
        org = session.exec(select(Organization).where(Organization.id == organization_id)).first()
        if not org:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Organization not found"
            )
    elif user_data.organization_name:
        existing_org = session.exec(select(Organization).where(Organization.name == user_data.organization_name.strip())).first()
        if existing_org:
            organization_id = existing_org.id
        else:
            new_org = Organization(
                name=user_data.organization_name.strip(),
                domain=user_data.organization_domain,
                theme="default",
                timezone="UTC",
            )
            session.add(new_org)
            session.commit()
            session.refresh(new_org)
            organization_id = new_org.id
    else:
        default_org = session.exec(select(Organization).where(Organization.name == "Default Organization")).first()
        if not default_org:
            default_org = Organization(
                name="Default Organization",
                domain=None,
                theme="default",
                timezone="UTC",
            )
            session.add(default_org)
            session.commit()
            session.refresh(default_org)
        organization_id = default_org.id

    # Create new user
    hashed_password = get_password_hash(user_data.password)
    user = User(
        name=user_data.name,
        email=user_data.email,
        hashed_password=hashed_password,
        role=user_data.role,
        organization_id=organization_id,
        status=UserStatus.PENDING
    )
    
    session.add(user)
    session.commit()
    session.refresh(user)

    # Notify all admins about the new pending registration
    admins = session.exec(
        select(User).where(
            User.role == UserRole.admin,
            User.organization_id == user.organization_id,
        )
    ).all()
    for admin in admins:
        notification = Notification(
            user_id=admin.id,
            type=NotificationType.NEW_REGISTRATION,
            message=f"New registration pending approval: {user.name} ({user.email})"
        )
        session.add(notification)
    session.commit()
    
    return {"message": "Account created. Awaiting admin approval.", "user_id": user.id}


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session)
):
    """
    Login and get JWT access token.
    
    - **username**: Email address
    - **password**: Password
    """
    # Find user by email
    statement = select(User).where(User.email == form_data.username)
    user = session.exec(statement).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if user.status == UserStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending admin approval."
        )

    if user.status == UserStatus.REJECTED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account registration has been rejected. Please contact your administrator."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": str(user.id),  # JWT sub claim must be a string
            "email": user.email,
            "role": user.role.value,
            "name": user.name,
            "organization_id": user.organization_id,
        },
        expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        name=user.name,
        role=user.role.value,
        organization_id=user.organization_id,
    )


@router.post("/login/json", response_model=Token)
def login_json(
    credentials: UserLogin,
    response: Response,
    session: Session = Depends(get_session)
):
    """
    Login with JSON body and set HTTP-only cookie.
    
    - **email**: Email address
    - **password**: Password
    """
    # Find user by email
    statement = select(User).where(User.email == credentials.email)
    user = session.exec(statement).first()
    
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.status == UserStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending admin approval."
        )

    if user.status == UserStatus.REJECTED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account registration has been rejected. Please contact your administrator."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": str(user.id),  # JWT sub claim must be a string
            "email": user.email,
            "role": user.role.value,
            "name": user.name,
            "organization_id": user.organization_id,
        },
        expires_delta=access_token_expires
    )
    
    # Set HTTP-only cookie
    set_auth_cookie(response, access_token)
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        name=user.name,
        role=user.role.value,
        organization_id=user.organization_id,
    )


@router.get("/me", response_model=UserRead)
def get_current_user_info(
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Get current authenticated user's information."""
    return current_user


@router.post("/logout")
def logout(response: Response):
    """Logout and clear authentication cookie."""
    clear_auth_cookie(response)
    return {"message": "Successfully logged out"}


@router.get("/verify")
def verify_session(
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Verify if the current session is valid."""
    print(f"[VERIFY] User authenticated: {current_user.email} (Role: {current_user.role.value})")
    return {
        "authenticated": True,
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "name": current_user.name,
            "role": current_user.role.value,
            "organization_id": current_user.organization_id,
        }
    }
