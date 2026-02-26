"""
Pydantic schemas for request/response validation.
"""
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from app.models import UserRole, LeaveStatus, TaskStatus, TaskPriority


# ==================== AUTH SCHEMAS ====================

class UserCreate(BaseModel):
    """Schema for user registration."""
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6)
    role: UserRole = UserRole.employee


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str


class Token(BaseModel):
    """JWT token response schema."""
    access_token: str
    token_type: str = "bearer"
    user_id: int
    email: str
    name: str
    role: str


class TokenData(BaseModel):
    """Data encoded in JWT token."""
    user_id: Optional[int] = None
    email: Optional[str] = None
    role: Optional[str] = None


class UserRead(BaseModel):
    """Schema for reading user data."""
    id: int
    name: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime
    age: Optional[int] = None
    date_joined: Optional[date] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    profile_picture: Optional[str] = None

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    """Schema for updating user profile."""
    name: str = Field(min_length=2, max_length=100)
    age: int = Field(ge=18, le=100)
    date_joined: date
    github_url: str = Field(pattern=r'^https://github\.com/.*')
    linkedin_url: str = Field(pattern=r'^https://linkedin\.com/.*|^https://www\.linkedin\.com/.*')
    profile_picture: Optional[str] = None


# ==================== DASHBOARD SCHEMAS ====================

class AdminDashboardStats(BaseModel):
    """Admin dashboard statistics."""
    total_employees: int
    active_sessions: int
    pending_tasks: int
    avg_daily_hours: float
    recent_activities: list
    leave_requests_pending: int
    # Extended real-time fields
    employees_on_leave_today: int = 0
    late_checkins_today: int = 0
    active_tasks_count: int = 0
    total_tasks_count: int = 0
    upcoming_tasks: list = []


class EmployeeDashboardStats(BaseModel):
    """Employee dashboard statistics."""
    current_session: Optional[dict]
    tasks_due_today: int
    tasks_completed: int
    productivity_score: float
    active_projects: int
    leave_balance: int
    pending_leave_requests: int


# ==================== LEAVE SCHEMAS ====================

class LeaveRequestCreate(BaseModel):
    """Schema for creating a leave request."""
    start_date: date
    end_date: date
    reason: str = Field(min_length=10, max_length=500)
    leave_type: str = Field(default="casual")  # casual, sick, vacation


class LeaveRequestUpdate(BaseModel):
    """Schema for updating leave request status."""
    status: LeaveStatus
    admin_notes: Optional[str] = None


class LeaveRequestRead(BaseModel):
    """Schema for reading leave request."""
    id: int
    user_id: int
    user_name: str
    start_date: date
    end_date: date
    reason: str
    leave_type: str
    status: LeaveStatus
    admin_notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== TASK SCHEMAS ====================

class TaskCreate(BaseModel):
    """Schema for creating a task."""
    title: str = Field(min_length=3, max_length=200)
    description: Optional[str] = None
    assigned_to: int
    priority: TaskPriority = TaskPriority.medium
    due_date: Optional[date] = None


class TaskUpdate(BaseModel):
    """Schema for updating a task."""
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[date] = None


class TaskRead(BaseModel):
    """Schema for reading task data."""
    id: int
    title: str
    description: Optional[str]
    assigned_to: int
    assigned_to_name: str
    status: TaskStatus
    priority: TaskPriority
    due_date: Optional[date]
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== ATTENDANCE SCHEMAS ====================

class AttendanceRead(BaseModel):
    """Schema for reading attendance data."""
    id: int
    user_id: int
    user_name: str
    check_in: datetime
    check_out: Optional[datetime]
    duration_hours: Optional[float]
    date: date

    class Config:
        from_attributes = True


class AttendanceCreate(BaseModel):
    """Schema for clock in/out."""
    action: str  # "in" or "out"
