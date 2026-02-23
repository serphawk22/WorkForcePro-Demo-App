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
    todo = "todo"  # Employee view: "To Do"
    in_progress = "in_progress"  # Employee view: "In Progress"
    submitted = "submitted"  # When employee marks "Done" - goes to admin for review
    reviewing = "reviewing"  # Admin is reviewing the submission
    approved = "approved"  # Admin approved
    rejected = "rejected"  # Admin rejected - needs changes


class LeaveStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class TaskPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class SubtaskStatus(str, Enum):
    """Subtask status values."""
    # Employee statuses
    todo = "todo"
    in_progress = "in_progress"
    completed = "completed"
    # Admin review statuses
    reviewing = "reviewing"
    approved = "approved"
    rejected = "rejected"


class NotificationType(str, Enum):
    """Notification types for different events."""
    TASK_ASSIGNED = "task_assigned"
    TASK_SUBMITTED = "task_submitted"
    TASK_APPROVED = "task_approved"
    TASK_REJECTED = "task_rejected"
    TASK_COMMENT = "task_comment"
    SUBTASK_ASSIGNED = "subtask_assigned"
    SUBTASK_REVIEWING = "subtask_reviewing"
    SUBTASK_APPROVED = "subtask_approved"
    SUBTASK_REJECTED = "subtask_rejected"
    LEAVE_APPROVED = "leave_approved"
    LEAVE_REJECTED = "leave_rejected"


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
    """Task database model - flat structure with deliverable tracking."""
    __tablename__ = "tasks"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    assigned_to: Optional[int] = Field(default=None, foreign_key="users.id", index=True)
    assigned_by: int = Field(foreign_key="users.id")  # Admin who created/assigned the task
    status: TaskStatus = Field(default=TaskStatus.todo)
    done_by_employee: bool = Field(default=False)  # True when employee marks task as done
    github_link: Optional[str] = Field(default=None, max_length=500)  # GitHub repository link
    deployed_link: Optional[str] = Field(default=None, max_length=500)  # Deployed application link
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class TaskCreate(TaskBase):
    """Schema for creating task."""
    assigned_to: Optional[int] = None
    github_link: Optional[str] = None
    deployed_link: Optional[str] = None


class TaskUpdate(SQLModel):
    """Schema for updating task."""
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None
    due_date: Optional[DateType] = None
    github_link: Optional[str] = None
    deployed_link: Optional[str] = None


class TaskRead(TaskBase):
    """Schema for reading task data."""
    id: int
    assigned_to: Optional[int]
    assigned_by: int
    status: TaskStatus
    done_by_employee: bool = False
    github_link: Optional[str] = None
    deployed_link: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class TaskWithAssignee(TaskRead):
    """Task with assignee and assigner info."""
    assignee_name: Optional[str] = None
    assignee_email: Optional[str] = None
    assigned_by_name: Optional[str] = None


# ==================== TASK COMMENT MODELS ====================

class TaskComment(SQLModel, table=True):
    """Task comment database model."""
    __tablename__ = "task_comments"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    task_id: int = Field(foreign_key="tasks.id", index=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    comment: str = Field(min_length=1, max_length=2000)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class TaskCommentCreate(SQLModel):
    """Schema for creating a task comment."""
    task_id: int
    comment: str = Field(min_length=1, max_length=2000)


class TaskCommentRead(SQLModel):
    """Schema for reading task comment data."""
    id: int
    task_id: int
    user_id: int
    comment: str
    created_at: datetime
    updated_at: datetime


class TaskCommentWithUser(TaskCommentRead):
    """Task comment with user info."""
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    user_role: Optional[UserRole] = None


# ==================== SUBTASK MODELS ====================

class Subtask(SQLModel, table=True):
    """Subtask database model for task delegation."""
    __tablename__ = "subtasks"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    parent_task_id: int = Field(foreign_key="tasks.id", index=True)
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    assigned_to: Optional[int] = Field(default=None, foreign_key="users.id", index=True)
    assigned_by: int = Field(foreign_key="users.id", index=True)
    status: SubtaskStatus = Field(default=SubtaskStatus.todo)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class SubtaskCreate(SQLModel):
    """Schema for creating a subtask."""
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    assigned_to: Optional[int] = None


class SubtaskUpdate(SQLModel):
    """Schema for updating a subtask."""
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    status: Optional[SubtaskStatus] = None
    assigned_to: Optional[int] = None


class SubtaskRead(SQLModel):
    """Schema for reading subtask data."""
    id: int
    parent_task_id: int
    title: str
    description: Optional[str]
    assigned_to: Optional[int]
    assigned_by: int
    status: SubtaskStatus
    created_at: datetime
    updated_at: datetime


class SubtaskWithAssignee(SubtaskRead):
    """Subtask with assignee info."""
    assignee_name: Optional[str] = None
    assignee_email: Optional[str] = None
    assigned_by_name: Optional[str] = None


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


# ==================== NOTIFICATION MODELS ====================

class Notification(SQLModel, table=True):
    """Notification model for task assignments and updates."""
    __tablename__ = "notifications"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    type: NotificationType = Field(default=NotificationType.TASK_ASSIGNED)
    message: str = Field(max_length=500)
    task_id: Optional[int] = Field(default=None, foreign_key="tasks.id")
    is_read: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class NotificationRead(SQLModel):
    """Schema for reading notification data."""
    id: int
    user_id: int
    type: NotificationType
    message: str
    task_id: Optional[int]
    is_read: bool
    created_at: datetime


class NotificationCreate(SQLModel):
    """Schema for creating notification."""
    user_id: int
    type: NotificationType
    message: str
    task_id: Optional[int] = None


# ==================== DASHBOARD STATS ====================

class DashboardStats(SQLModel):
    """Dashboard statistics schema."""
    total_employees: int
    active_sessions: int
    pending_tasks: int
    pending_leaves: int
    avg_daily_hours: float
