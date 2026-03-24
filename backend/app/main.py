"""
FastAPI main application entry point.
WorkForce Pro - Workforce Management System Backend
"""
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import create_db_and_tables, engine
from app.routers import auth, admin, attendance, tasks, leave, dashboard, users, notifications, comments, subtasks, payroll, myspace, chatbot, teams, ai_assistant, weekly_progress

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup: Create database tables
    create_db_and_tables()

    is_sqlite = engine.url.drivername == "sqlite"
    if is_sqlite:
        print("✅ SQLite dev: skipping PostgreSQL-only migrations (tables from SQLModel metadata)")
    from sqlalchemy import text

    if not is_sqlite:
        # Run database migrations to add any missing columns (PostgreSQL specific)
        with engine.connect() as conn:
            try:
                # Add approved_at column if it doesn't exist
                conn.execute(text("""
                    ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
                """))
                # Add approved_by column if it doesn't exist
                conn.execute(text("""
                    ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by INTEGER;
                """))
                # Add public_id column to tasks table if it doesn't exist
                conn.execute(text("""
                    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS public_id VARCHAR(10);
                """))
                # Add public_id column to subtasks table if it doesn't exist
                conn.execute(text("""
                    ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS public_id VARCHAR(10);
                """))
                # Add USER_APPROVED to notification type enum if it doesn't exist
                try:
                    conn.execute(text("""
                        ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'USER_APPROVED';
                    """))
                except Exception:
                    pass  # Enum value may already exist or not applicable
                try:
                    conn.execute(text("""
                        ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'WEEKLY_PROGRESS_COMMENT';
                    """))
                except Exception:
                    pass
                # Add 'submitted' and 'reviewing' to taskstatus enum if missing
                try:
                    conn.execute(text("""
                        ALTER TYPE taskstatus ADD VALUE IF NOT EXISTS 'submitted';
                    """))
                except Exception:
                    pass
                try:
                    conn.execute(text("""
                        ALTER TYPE taskstatus ADD VALUE IF NOT EXISTS 'reviewing';
                    """))
                except Exception:
                    pass
                # Backfill public_id for existing tasks that have NULL
                conn.execute(text("""
                    UPDATE tasks
                    SET public_id = UPPER(
                        SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT), 1, 6)
                    )
                    WHERE public_id IS NULL;
                """))
                # Backfill public_id for existing subtasks that have NULL
                conn.execute(text("""
                    UPDATE subtasks
                    SET public_id = UPPER(
                        SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT), 1, 6)
                    )
                    WHERE public_id IS NULL;
                """))
                conn.commit()
                print("✅ Database migrations completed (approved_at, approved_by, public_id, taskstatus enum)")
            except Exception as e:
                print(f"⚠️ Migration note: {e}")

    if not is_sqlite:
        # Additional migrations — each runs in its own connection so one failure doesn't abort others
        additional_migrations = [
        # Bank details columns on users table
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR',
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_ifsc_code VARCHAR',
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name VARCHAR',
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_holder VARCHAR',
        # Leave request document attachment columns
        'ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS document_data TEXT',
        'ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS document_filename VARCHAR',
        # Task start_date column
        'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()',
        # Subtask parent_subtask_id column
        'ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS parent_subtask_id INTEGER',
        # Recurring task rule columns on tasks
        'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE',
        'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_type VARCHAR(20)',
        'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT 1',
        'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS repeat_days VARCHAR(64)',
        'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_start_date DATE',
        'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_end_date DATE',
        'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS monthly_day INTEGER',
        ]

        for migration in additional_migrations:
            try:
                with engine.connect() as conn:
                    conn.execute(text(migration))
                    conn.commit()
            except Exception:
                pass  # Already exists or syntax error on non-Postgres
        print("✅ Additional migrations complete")

    if not is_sqlite:
        # task_instances table (recurring occurrences)
        try:
            with engine.connect() as conn:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS task_instances (
                        id SERIAL PRIMARY KEY,
                        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
                        instance_date DATE NOT NULL,
                        status VARCHAR(20) NOT NULL DEFAULT 'todo',
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );
                """))
                conn.execute(text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS uix_task_instance_date ON task_instances (task_id, instance_date);"
                ))
                conn.execute(text(
                    "CREATE INDEX IF NOT EXISTS ix_task_instances_task_id ON task_instances (task_id);"
                ))
                conn.commit()
            print("✅ task_instances table ready")
        except Exception as e:
            print(f"⚠️ task_instances migration note: {e}")

        # weekly_progress + weekly_comments + notifications.weekly_progress_id
        try:
            with engine.connect() as conn:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS weekly_progress (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        week_start_date DATE NOT NULL,
                        description TEXT NOT NULL,
                        github_link VARCHAR(500),
                        deployed_link VARCHAR(500),
                        last_seen_comments_at TIMESTAMP WITH TIME ZONE,
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
                    );
                """))
                conn.execute(text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS uix_weekly_progress_user_week ON weekly_progress (user_id, week_start_date);"
                ))
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS weekly_comments (
                        id SERIAL PRIMARY KEY,
                        weekly_progress_id INTEGER NOT NULL REFERENCES weekly_progress(id) ON DELETE CASCADE,
                        admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        comment TEXT NOT NULL,
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
                    );
                """))
                conn.execute(text(
                    "CREATE INDEX IF NOT EXISTS ix_weekly_comments_progress ON weekly_comments (weekly_progress_id);"
                ))
                conn.execute(text(
                    "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS weekly_progress_id INTEGER REFERENCES weekly_progress(id) ON DELETE SET NULL;"
                ))
                conn.commit()
            print("✅ weekly_progress tables ready")
        except Exception as e:
            print(f"⚠️ weekly_progress migration note: {e}")
    
    # Seed default admin account
    from app.models import User, UserRole
    from app.auth import get_password_hash
    from sqlmodel import Session, select
    
    with Session(engine) as session:
        # Check if admin exists
        admin_email = "admin@gmail.com"
        statement = select(User).where(User.email == admin_email)
        existing_admin = session.exec(statement).first()
        
        if not existing_admin:
            # Create default admin
            from datetime import date
            admin_user = User(
                name="admin",
                email=admin_email,
                hashed_password=get_password_hash("admin"),
                role=UserRole.admin,
                is_active=True,
                status="APPROVED",  # Admin should be pre-approved
                age=30,
                date_joined=date.today(),
                github_url="https://github.com/admin",
                linkedin_url="https://linkedin.com/in/admin"
            )
            session.add(admin_user)
            session.commit()
            print(f"✅ Default admin account created: {admin_email} / admin")
        else:
            # Ensure admin is approved and active
            if existing_admin.status != "APPROVED" or not existing_admin.is_active:
                existing_admin.status = "APPROVED"
                existing_admin.is_active = True
                session.add(existing_admin)
                session.commit()
                print(f"✅ Admin account updated to APPROVED status: {admin_email}")
            else:
                print(f"✅ Admin account already exists: {admin_email}")
    
    yield
    # Shutdown: cleanup if needed


app = FastAPI(
    title="WorkForce Pro API",
    description="Backend API for WorkForce Pro - Modern Workforce Management Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
PRODUCTION_FRONTEND = os.getenv("PRODUCTION_FRONTEND_URL", "")

origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "https://work-force-pro-4jae.vercel.app",  # Your Vercel deployment
    "https://attendence-dashboard.allytechcourses.com",  # Custom domain
]

# Add production frontend URL if set
if FRONTEND_URL and FRONTEND_URL not in origins:
    origins.append(FRONTEND_URL)

if PRODUCTION_FRONTEND and PRODUCTION_FRONTEND not in origins:
    origins.append(PRODUCTION_FRONTEND)

print(f"[CORS] Allowed origins: {origins}")

# CRITICAL: Cannot use allow_origins=["*"] with allow_credentials=True
# This will cause browsers to reject CORS requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Use explicit origins list instead of wildcard
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(payroll.router)
app.include_router(admin.router)
app.include_router(attendance.router)
app.include_router(tasks.router)
app.include_router(subtasks.router)
app.include_router(leave.router)
app.include_router(dashboard.router)
app.include_router(notifications.router)
app.include_router(comments.router)
app.include_router(myspace.router)
app.include_router(chatbot.router)
app.include_router(teams.router)
app.include_router(ai_assistant.router)
app.include_router(weekly_progress.router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "WorkForce Pro API",
        "version": "1.0.0",
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}
