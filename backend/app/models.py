"""
Database models using SQLModel.
"""
from datetime import datetime, timezone
from datetime import date as DateType
from typing import Optional, List
from sqlalchemy import Column, Text
from sqlmodel import SQLModel, Field, Relationship
from enum import Enum
from pydantic import BaseModel


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


class RecurrenceType(str, Enum):
    """How a task repeats."""
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"


class TaskInstanceStatus(str, Enum):
    """Per-occurrence status for recurring tasks."""
    todo = "todo"
    in_progress = "in_progress"
    completed = "completed"


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


class UserStatus(str, Enum):
    """Account approval status."""
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


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
    SALARY_PAID = "salary_paid"
    NEW_REGISTRATION = "new_registration"
    USER_APPROVED = "user_approved"
    USER_REJECTED = "user_rejected"
    WEEKLY_PROGRESS_COMMENT = "weekly_progress_comment"


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
    department: Optional[str] = Field(default=None, max_length=100)
    base_salary: Optional[float] = Field(default=None)
    bank_account_number: Optional[str] = Field(default=None, max_length=30)
    bank_ifsc_code: Optional[str] = Field(default=None, max_length=20)
    bank_name: Optional[str] = Field(default=None, max_length=100)
    bank_account_holder: Optional[str] = Field(default=None, max_length=100)


class User(UserBase, table=True):
    """User database model."""
    __tablename__ = "users"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: str
    status: str = Field(default="PENDING")
    approved_at: Optional[datetime] = Field(default=None)
    approved_by: Optional[int] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


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
    status: str = "PENDING"
    approved_at: Optional[datetime] = None
    approved_by: Optional[int] = None
    created_at: datetime
    age: Optional[int] = None
    date_joined: Optional[DateType] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    profile_picture: Optional[str] = None
    department: Optional[str] = None
    base_salary: Optional[float] = None
    bank_account_number: Optional[str] = None
    bank_ifsc_code: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_holder: Optional[str] = None

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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


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
    public_id: Optional[str] = Field(default=None, max_length=10, unique=True, index=True)
    assigned_to: Optional[int] = Field(default=None, foreign_key="users.id", index=True)
    assigned_by: int = Field(foreign_key="users.id")  # Admin who created/assigned the task
    status: TaskStatus = Field(default=TaskStatus.todo)
    done_by_employee: bool = Field(default=False)  # True when employee marks task as done
    github_link: Optional[str] = Field(default=None, max_length=500)  # GitHub repository link
    deployed_link: Optional[str] = Field(default=None, max_length=500)  # Deployed application link
    start_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))  # Auto-recorded start date
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # Recurring task rule (Jira-style template; occurrences live in task_instances)
    is_recurring: bool = Field(default=False)
    recurrence_type: Optional[str] = Field(default=None, max_length=20)  # daily | weekly | monthly
    recurrence_interval: int = Field(default=1, ge=1)  # every N days/weeks/months
    repeat_days: Optional[str] = Field(default=None, max_length=64)  # JSON array of weekday 0=Mon..6=Sun
    recurrence_start_date: Optional[DateType] = Field(default=None)
    recurrence_end_date: Optional[DateType] = Field(default=None)
    monthly_day: Optional[int] = Field(default=None, ge=1, le=31)  # for monthly: day-of-month


class TaskCreate(TaskBase):
    """Schema for creating task."""
    assigned_to: Optional[int] = None
    github_link: Optional[str] = None
    deployed_link: Optional[str] = None
    # Recurrence (optional)
    is_recurring: bool = False
    recurrence_type: Optional[str] = None  # daily | weekly | monthly
    recurrence_interval: int = 1
    repeat_days: Optional[List[int]] = None  # weekdays 0=Mon .. 6=Sun for weekly
    recurrence_start_date: Optional[DateType] = None
    recurrence_end_date: Optional[DateType] = None
    monthly_day: Optional[int] = None


class TaskUpdate(SQLModel):
    """Schema for updating task."""
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None
    due_date: Optional[DateType] = None
    assigned_to: Optional[int] = None
    github_link: Optional[str] = None
    deployed_link: Optional[str] = None
    is_recurring: Optional[bool] = None
    recurrence_type: Optional[str] = None
    recurrence_interval: Optional[int] = None
    repeat_days: Optional[List[int]] = None
    recurrence_start_date: Optional[DateType] = None
    recurrence_end_date: Optional[DateType] = None
    monthly_day: Optional[int] = None


class TaskRead(TaskBase):
    """Schema for reading task data."""
    id: int
    public_id: Optional[str] = None
    assigned_to: Optional[int]
    assigned_by: int
    status: TaskStatus
    done_by_employee: bool = False
    github_link: Optional[str] = None
    deployed_link: Optional[str] = None
    start_date: datetime
    created_at: datetime
    updated_at: datetime
    is_recurring: bool = False
    recurrence_type: Optional[str] = None
    recurrence_interval: int = 1
    repeat_days: Optional[str] = None
    recurrence_start_date: Optional[DateType] = None
    recurrence_end_date: Optional[DateType] = None
    monthly_day: Optional[int] = None


class TaskWithAssignee(TaskRead):
    """Task with assignee and assigner info."""
    assignee_name: Optional[str] = None
    assignee_email: Optional[str] = None
    assigned_by_name: Optional[str] = None
    progress: Optional[int] = None  # Task completion progress (0-100)


class TaskInstance(SQLModel, table=True):
    """Single occurrence of a recurring parent task."""
    __tablename__ = "task_instances"

    id: Optional[int] = Field(default=None, primary_key=True)
    task_id: int = Field(foreign_key="tasks.id", index=True)
    instance_date: DateType = Field(index=True)
    status: TaskInstanceStatus = Field(default=TaskInstanceStatus.todo)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TaskInstanceRead(SQLModel):
    """API: one instance row."""
    id: int
    task_id: int
    instance_date: DateType
    status: TaskInstanceStatus
    created_at: datetime
    updated_at: datetime


class TaskInstanceWithTask(TaskInstanceRead):
    """Instance with parent task title / ref for dashboards."""
    task_title: Optional[str] = None
    public_id: Optional[str] = None
    priority: Optional[TaskPriority] = None


# ==================== TASK COMMENT MODELS ====================

class TaskComment(SQLModel, table=True):
    """Task comment database model."""
    __tablename__ = "task_comments"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    task_id: int = Field(foreign_key="tasks.id", index=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    comment: str = Field(min_length=1, max_length=2000)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


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
    """Subtask database model for task delegation with nested hierarchy support."""
    __tablename__ = "subtasks"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    public_id: Optional[str] = Field(default=None, max_length=10, unique=True, index=True)
    parent_task_id: int = Field(foreign_key="tasks.id", index=True)
    parent_subtask_id: Optional[int] = Field(default=None, foreign_key="subtasks.id", index=True)  # For nested subtasks
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    assigned_to: Optional[int] = Field(default=None, foreign_key="users.id", index=True)
    assigned_by: int = Field(foreign_key="users.id", index=True)
    priority: TaskPriority = Field(default=TaskPriority.medium)
    due_date: Optional[DateType] = None
    status: SubtaskStatus = Field(default=SubtaskStatus.todo)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SubtaskCreate(SQLModel):
    """Schema for creating a subtask."""
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    assigned_to: Optional[int] = None
    priority: TaskPriority = Field(default=TaskPriority.medium)
    due_date: Optional[DateType] = None
    parent_subtask_id: Optional[int] = None  # For creating nested subtasks


class SubtaskUpdate(SQLModel):
    """Schema for updating a subtask."""
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    status: Optional[SubtaskStatus] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[DateType] = None
    assigned_to: Optional[int] = None


class SubtaskRead(SQLModel):
    """Schema for reading subtask data."""
    id: int
    public_id: Optional[str] = None
    parent_task_id: int
    parent_subtask_id: Optional[int]
    title: str
    description: Optional[str]
    priority: TaskPriority
    due_date: Optional[DateType]
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
    children: List["SubtaskWithAssignee"] = []  # For hierarchical structure


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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    reviewed_at: Optional[datetime] = None
    document_data: Optional[str] = Field(default=None, sa_column_kwargs={"nullable": True})  # base64 data URI
    document_filename: Optional[str] = Field(default=None, sa_column_kwargs={"nullable": True})


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
    document_data: Optional[str] = None
    document_filename: Optional[str] = None


class LeaveRequestWithUser(LeaveRequestRead):
    """Leave request with user info."""
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    user_profile_picture: Optional[str] = None


# ==================== NOTIFICATION MODELS ====================

class Notification(SQLModel, table=True):
    """Notification model for task assignments and updates."""
    __tablename__ = "notifications"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    type: NotificationType = Field(default=NotificationType.TASK_ASSIGNED)
    message: str = Field(max_length=500)
    task_id: Optional[int] = Field(default=None, foreign_key="tasks.id")
    weekly_progress_id: Optional[int] = Field(default=None, foreign_key="weekly_progress.id")
    is_read: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class NotificationRead(SQLModel):
    """Schema for reading notification data."""
    id: int
    user_id: int
    type: NotificationType
    message: str
    task_id: Optional[int]
    weekly_progress_id: Optional[int] = None
    is_read: bool
    created_at: datetime


class NotificationCreate(SQLModel):
    """Schema for creating notification."""
    user_id: int
    type: NotificationType
    message: str
    task_id: Optional[int] = None
    weekly_progress_id: Optional[int] = None


# ==================== WEEKLY PROGRESS ====================

class WeeklyProgress(SQLModel, table=True):
    """One weekly status update per employee per week (week anchored on Monday)."""
    __tablename__ = "weekly_progress"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    week_start_date: DateType = Field(index=True)  # Monday of the ISO week
    description: str = Field(sa_column=Column(Text, nullable=False))
    github_link: Optional[str] = Field(default=None, max_length=500)
    deployed_link: Optional[str] = Field(default=None, max_length=500)
    last_seen_comments_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class WeeklyComment(SQLModel, table=True):
    """Admin feedback on a weekly progress entry."""
    __tablename__ = "weekly_comments"

    id: Optional[int] = Field(default=None, primary_key=True)
    weekly_progress_id: int = Field(foreign_key="weekly_progress.id", index=True)
    admin_id: int = Field(foreign_key="users.id", index=True)
    comment: str = Field(sa_column=Column(Text, nullable=False))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class WeeklyProgressCreate(SQLModel):
    week_start_date: DateType
    description: str = Field(min_length=10, max_length=8000)
    github_link: Optional[str] = None
    deployed_link: Optional[str] = None


class WeeklyProgressUpdate(SQLModel):
    description: Optional[str] = Field(default=None, min_length=10, max_length=8000)
    github_link: Optional[str] = None
    deployed_link: Optional[str] = None


class WeeklyCommentCreate(SQLModel):
    comment: str = Field(min_length=1, max_length=4000)


class WeeklyCommentRead(SQLModel):
    id: int
    weekly_progress_id: int
    admin_id: int
    comment: str
    created_at: datetime
    admin_name: Optional[str] = None


class WeeklyProgressRead(SQLModel):
    id: int
    user_id: int
    week_start_date: DateType
    description: str
    github_link: Optional[str] = None
    deployed_link: Optional[str] = None
    last_seen_comments_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    comments: List["WeeklyCommentRead"] = Field(default_factory=list)
    has_unread_comments: bool = False
    employee_name: Optional[str] = None
    employee_email: Optional[str] = None


# ==================== DASHBOARD STATS ====================

class DashboardStats(SQLModel):
    """Dashboard statistics schema."""
    total_employees: int
    active_sessions: int
    pending_tasks: int
    pending_leaves: int
    avg_daily_hours: float
    pending_registrations: int = 0


class EmployeePerformance(BaseModel):
    """Employee performance data for charts."""
    period: str  # e.g., "Week 1", "Jan 2024", etc.
    score: int   # Performance score (0-100)
    department: Optional[str] = None


class AttendanceStats(BaseModel):
    """Attendance statistics for dashboard."""
    present: int
    absent: int
    on_leave: int
    total: int


# ==================== PAYROLL MODELS ====================

class PayrollStatus(str, Enum):
    pending = "Pending"
    paid = "Paid"
    processing = "Processing"


class Payroll(SQLModel, table=True):
    """Payroll record per employee per month."""
    __tablename__ = "payrolls"

    id: Optional[int] = Field(default=None, primary_key=True)
    employee_id: int = Field(foreign_key="users.id", index=True)
    month: int  # 1-12
    year: int
    salary: float
    status: str = Field(default="Pending")  # Pending | Paid | Processing
    pay_date: Optional[DateType] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PayrollRead(SQLModel):
    """Schema for reading payroll data."""
    id: int
    employee_id: int
    name: str
    department: Optional[str]
    month: int
    year: int
    salary: float
    status: str
    pay_date: Optional[DateType]


class EmployeeListItem(BaseModel):
    """Employee data for list/table view."""
    id: int
    name: str
    email: str
    role: Optional[str] = None
    contract_type: Optional[str] = None
    team: Optional[str] = None
    workspace: Optional[str] = None
    is_active: bool
    attendance_rate: Optional[int] = None  # Percentage


# ==================== MY SPACE MODELS ====================

class TaskSheet(SQLModel, table=True):
    """Daily task sheet tracking model."""
    __tablename__ = "task_sheets"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    date: DateType = Field(default_factory=DateType.today)
    achievements: str = Field(max_length=1000)
    repo_link: Optional[str] = Field(default=None, max_length=500)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TaskSheetCreate(SQLModel):
    achievements: str = Field(max_length=1000)
    repo_link: Optional[str] = None

class TaskSheetRead(SQLModel):
    id: int
    user_id: int
    date: DateType
    achievements: str
    repo_link: Optional[str]
    created_at: datetime

class TaskSheetWithUser(TaskSheetRead):
    user_name: Optional[str] = None
    user_email: Optional[str] = None


class HappySheet(SQLModel, table=True):
    """Personal well-being happy sheet tracking model."""
    __tablename__ = "happy_sheets"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    date: DateType = Field(default_factory=DateType.today)
    what_made_you_happy: str
    what_made_others_happy: str
    goals_without_greed: str
    dreams_supported: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class HappySheetCreate(SQLModel):
    what_made_you_happy: str
    what_made_others_happy: str
    goals_without_greed: str
    dreams_supported: str
    date: Optional[DateType] = None  # if None, defaults to today on the backend

class HappySheetRead(SQLModel):
    id: int
    user_id: int
    date: DateType
    what_made_you_happy: str
    what_made_others_happy: str
    goals_without_greed: str
    dreams_supported: str
    created_at: datetime

class HappySheetWithUser(HappySheetRead):
    user_name: Optional[str] = None
    user_email: Optional[str] = None


class DreamProject(SQLModel, table=True):
    """Visionary Canvas: My Dream Project tracking model."""
    __tablename__ = "dream_projects"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    description: str = Field(max_length=2000)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DreamProjectCreate(SQLModel):
    description: str = Field(max_length=2000)

class DreamProjectRead(SQLModel):
    id: int
    user_id: int
    description: str
    created_at: datetime

class DreamProjectWithUser(DreamProjectRead):
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    profile_picture: Optional[str] = None


class LearningFocus(SQLModel, table=True):
    """Learning Canvas: My Focus tracking model."""
    __tablename__ = "learning_focuses"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    focus: str = Field(max_length=500)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LearningFocusCreate(SQLModel):
    focus: str = Field(max_length=500)

class LearningFocusRead(SQLModel):
    id: int
    user_id: int
    focus: str
    created_at: datetime

class LearningFocusWithUser(LearningFocusRead):
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    profile_picture: Optional[str] = None


class PersonalProject(SQLModel, table=True):
    """Learning Canvas: My Projects folder listing model."""
    __tablename__ = "personal_projects"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    title: str = Field(max_length=200)
    tag: Optional[str] = Field(default=None, max_length=50)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PersonalProjectCreate(SQLModel):
    title: str = Field(max_length=200)
    tag: Optional[str] = Field(default=None, max_length=50)

class PersonalProjectRead(SQLModel):
    id: int
    user_id: int
    title: str
    tag: Optional[str]
    created_at: datetime


# ==================== TEAMS MEETING MODELS ====================

class TeamsMeeting(SQLModel, table=True):
    """Teams meeting link shared by admin for all employees."""
    __tablename__ = "teams_meetings"

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(max_length=200)
    meeting_link: str = Field(max_length=1000)
    created_by: int = Field(foreign_key="users.id")
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TeamsMeetingCreate(SQLModel):
    title: str = Field(max_length=200)
    meeting_link: str = Field(max_length=1000)


class TeamsMeetingRead(SQLModel):
    id: int
    title: str
    meeting_link: str
    created_by: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    creator_name: Optional[str] = None
