"""
Authentication utilities: JWT handling and password hashing.
"""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from dotenv import load_dotenv
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select

from app.database import get_session
from app.models import User, TokenData, UserRole

load_dotenv()

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-super-secret-key-change-this")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))  # 8 hours
COOKIE_NAME = "access_token"

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme (optional fallback)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[TokenData]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            return None
        user_id: int = int(user_id_str)  # Convert string back to int
        email: str = payload.get("email")
        role: str = payload.get("role")
        organization_id: Optional[int] = payload.get("organization_id")
        return TokenData(user_id=user_id, email=email, role=role, organization_id=organization_id)
    except (JWTError, ValueError):
        return None


def set_auth_cookie(response: Response, token: str) -> None:
    """Set HTTP-only authentication cookie."""
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )


def clear_auth_cookie(response: Response) -> None:
    """Clear authentication cookie."""
    response.delete_cookie(
        key=COOKIE_NAME,
        path="/",
        httponly=True,
        secure=False,
        samesite="lax",
    )


def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    session: Session = Depends(get_session)
) -> User:
    """Get the current authenticated user from cookie or header."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Try to get token from cookie first
    cookie_token = request.cookies.get(COOKIE_NAME)
    auth_token = cookie_token or token
    
    print(f"[AUTH] get_current_user - Cookie token: {bool(cookie_token)}, Header token: {bool(token)}")
    
    if not auth_token:
        print("[AUTH] No token found in cookie or header")
        raise credentials_exception
    
    token_data = decode_token(auth_token)
    if token_data is None:
        print("[AUTH] Token decode failed - invalid token")
        raise credentials_exception
    
    print(f"[AUTH] Token decoded - User ID: {token_data.user_id}, Email: {token_data.email}, Role: {token_data.role}")
    
    statement = select(User).where(User.id == token_data.user_id)
    user = session.exec(statement).first()
    
    if user is None:
        print(f"[AUTH] User not found in database for ID: {token_data.user_id}")
        raise credentials_exception
    if not user.is_active:
        print(f"[AUTH] User {user.email} is inactive")
        raise HTTPException(status_code=400, detail="Inactive user")
    if user.organization_id is None:
        raise HTTPException(status_code=400, detail="User is not assigned to any organization")
    
    print(f"[AUTH] User authenticated successfully: {user.email}")
    return user


def ensure_same_organization(current_user: User, org_id: Optional[int], resource_name: str = "resource") -> None:
    """Raise 403 if a record does not belong to the current user's organization."""
    if current_user.organization_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User organization missing")
    if org_id is None or org_id != current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Not authorized to access this {resource_name}",
        )


def normalize_role_value(raw_role: object) -> str:
    """Normalize enum/string role values to canonical lowercase role names."""
    if raw_role is None:
        return ""
    if isinstance(raw_role, UserRole):
        return raw_role.value
    if hasattr(raw_role, "value"):
        try:
            value = str(getattr(raw_role, "value")).strip().lower()
            if value:
                return value
        except Exception:
            pass
    role_str = str(raw_role).strip().lower()
    if role_str.endswith(".admin"):
        return "admin"
    if role_str.endswith(".manager"):
        return "manager"
    if role_str.endswith(".employee"):
        return "employee"
    return role_str


def is_admin_user(user: User) -> bool:
    """Return True when a user has admin privileges."""
    return normalize_role_value(user.role) == UserRole.admin.value


def get_current_user_optional(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    session: Session = Depends(get_session)
) -> Optional[User]:
    """Get current user if authenticated, None otherwise."""
    try:
        return get_current_user(request, token, session)
    except HTTPException:
        return None


def get_current_admin_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    session: Session = Depends(get_session)
) -> User:
    """Verify the current user is an admin."""
    current_user = get_current_user(request, token, session)
    if not is_admin_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user
