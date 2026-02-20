"""
Database models using SQLModel.
"""
from datetime import datetime
from datetime import date as DateType
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from enum import Enum


class UserRole(str, Enum):
    admin = "admin"
    employee = "employee"


class TaskStatus(str, Enum):
    todo = "todo"
    in_progress = "in_progress"
    done = "done"


class LeaveStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class TaskPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


# ==================== USER MODELS ====================

class UserBase(SQLModel):
    """Base user model with common fields."""
    name: str = Field(min_length=2, max_length=100)
    email: str = Field(unique=True, index=True)
    role: UserRole = Field(default=UserRole.employee)
    is_active: bool = Field(default=True)
    age: Optional[int] = Field(default=None, ge=18, le=100)
    date_joined: Optional[DateType] = Field(default=None)
    github_url: Optional[str] = Field(default=None, max_length=255)
    linkedin_url: Optional[str] = Field(default=None, max_length=255)
    profile_picture: Optional[str] = Field(default=None)  # No max_length for base64 images


class User(UserBase, table=True):
    """User database model."""
    __tablename__ = "users"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserCreate(SQLModel):
    """Schema for user registration."""
    name: str = Field(min_length=2, max_length=100)
    email: str
    password: str = Field(min_length=6)
    role: UserRole = Field(default=UserRole.employee)


class UserRead(SQLModel):
    """Schema for reading user data (public)."""
    id: int
    name: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime
    age: Optional[int] = None
    date_joined: Optional[DateType] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    profile_picture: Optional[str] = None


class UserLogin(SQLModel):
    """Schema for user login."""
    email: str
    password: str


class Token(SQLModel):
    """JWT token response schema."""
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    name: str
    email: str


class TokenData(SQLModel):
    """Data encoded in JWT token."""
    user_id: Optional[int] = None
    email: Optional[str] = None
    role: Optional[str] = None


# ==================== ATTENDANCE MODELS ====================

class Attendance(SQLModel, table=True):
    """Attendance tracking model."""
    __tablename__ = "attendance"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    date: DateType = Field(default_factory=DateType.today)
    punch_in: Optional[datetime] = None
    punch_out: Optional[datetime] = None
    total_hours: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AttendanceCreate(SQLModel):
    """Schema for creating attendance record."""
    pass  # Auto-populated


class AttendanceRead(SQLModel):
    """Schema for reading attendance data."""
    id: int
    user_id: int
    date: DateType
    punch_in: Optional[datetime]
    punch_out: Optional[datetime]
    total_hours: Optional[float]


class AttendanceWithUser(AttendanceRead):
    """Attendance with user info."""
    user_name: Optional[str] = None
    user_email: Optional[str] = None


# ==================== TASK MODELS ====================

class TaskBase(SQLModel):
    """Base task model."""
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    priority: TaskPriority = Field(default=TaskPriority.medium)
    due_date: Optional[DateType] = None


class Task(TaskBase, table=True):
    """Task database model."""
    __tablename__ = "tasks"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    assigned_to: Optional[int] = Field(default=None, foreign_key="users.id", index=True)
    created_by: int = Field(foreign_key="users.id")
    status: TaskStatus = Field(default=TaskStatus.todo)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class TaskCreate(TaskBase):
    """Schema for creating task."""
    assigned_to: Optional[int] = None


class TaskUpdate(SQLModel):
    """Schema for updating task."""
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None
    due_date: Optional[DateType] = None
    assigned_to: Optional[int] = None


class TaskRead(TaskBase):
    """Schema for reading task data."""
    id: int
    assigned_to: Optional[int]
    created_by: int
    status: TaskStatus
    created_at: datetime
    updated_at: datetime


class TaskWithAssignee(TaskRead):
    """Task with assignee info."""
    assignee_name: Optional[str] = None
    assignee_email: Optional[str] = None


# ==================== LEAVE REQUEST MODELS ====================

class LeaveRequestBase(SQLModel):
    """Base leave request model."""
    reason: str = Field(min_length=5, max_length=500)
    start_date: DateType
    end_date: DateType
    leave_type: str = Field(default="personal")  # personal, sick, vacation, etc.


class LeaveRequest(LeaveRequestBase, table=True):
    """Leave request database model."""
    __tablename__ = "leave_requests"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    status: LeaveStatus = Field(default=LeaveStatus.pending)
    admin_comment: Optional[str] = None
    reviewed_by: Optional[int] = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    reviewed_at: Optional[datetime] = None


class LeaveRequestCreate(LeaveRequestBase):
    """Schema for creating leave request."""
    pass


class LeaveRequestUpdate(SQLModel):
    """Schema for admin to update leave request."""
    status: LeaveStatus
    admin_comment: Optional[str] = None


class LeaveRequestRead(LeaveRequestBase):
    """Schema for reading leave request data."""
    id: int
    user_id: int
    status: LeaveStatus
    admin_comment: Optional[str]
    reviewed_by: Optional[int]
    created_at: datetime
    reviewed_at: Optional[datetime]


class LeaveRequestWithUser(LeaveRequestRead):
    """Leave request with user info."""
    user_name: Optional[str] = None
    user_email: Optional[str] = None


# ==================== DASHBOARD STATS ====================

class DashboardStats(SQLModel):
    """Dashboard statistics schema."""
    total_employees: int
    active_sessions: int
    pending_tasks: int
    pending_leaves: int
    avg_daily_hours: float
