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
from app.routers import auth, admin, attendance, tasks, leave, dashboard, users, notifications, comments, subtasks, payroll, myspace, chatbot, teams, ai_assistant, weekly_progress, workspaces, organizations

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup: Create database tables
    create_db_and_tables()

    # Local/dev default: skip heavy bootstrap migrations/backfills after core tables exist.
    # Set SKIP_STARTUP_BOOTSTRAP=0 to run the full migration/backfill flow.
    if os.getenv("SKIP_STARTUP_BOOTSTRAP", "1") == "1":
        print("[startup] SKIP_STARTUP_BOOTSTRAP=1 -> core tables ready, skipping heavy startup bootstrap")
        yield
        return

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
        # Organizations table
        '''
        CREATE TABLE IF NOT EXISTS organizations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            domain VARCHAR(255),
            logo VARCHAR(1000),
            theme VARCHAR(64),
            timezone VARCHAR(64) DEFAULT 'UTC',
            created_by INTEGER,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        ''',
        # Workspaces table
        '''
        CREATE TABLE IF NOT EXISTS workspaces (
            id SERIAL PRIMARY KEY,
            name VARCHAR(120) NOT NULL UNIQUE,
            description VARCHAR(1000),
            icon VARCHAR(16),
            color VARCHAR(32),
            created_by INTEGER NOT NULL REFERENCES users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        ''',
        # Bank details columns on users table
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR',
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_ifsc_code VARCHAR',
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name VARCHAR',
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_holder VARCHAR',
        # Multi-tenant org fields
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id INTEGER',
        'ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS organization_id INTEGER',
        'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS organization_id INTEGER',
        'ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS organization_id INTEGER',
        'ALTER TABLE attendance ADD COLUMN IF NOT EXISTS organization_id INTEGER',
        'ALTER TABLE payrolls ADD COLUMN IF NOT EXISTS organization_id INTEGER',
        'ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS organization_id INTEGER',
        'ALTER TABLE task_sheets ADD COLUMN IF NOT EXISTS organization_id INTEGER',
        'ALTER TABLE weekly_progress ADD COLUMN IF NOT EXISTS organization_id INTEGER',
        # Organization settings columns
        'ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo VARCHAR(1000)',
        'ALTER TABLE organizations ADD COLUMN IF NOT EXISTS theme VARCHAR(64)',
        'ALTER TABLE organizations ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) DEFAULT \'UTC\'',
        # Leave request document attachment columns
        'ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS document_data TEXT',
        'ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS document_filename VARCHAR',
        # Task start_date column
        'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()',
        'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id INTEGER',
        'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE',
        'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_hours DOUBLE PRECISION',
        'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_hours DOUBLE PRECISION',
        'CREATE INDEX IF NOT EXISTS ix_tasks_parent_task_id ON tasks(parent_task_id)',
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
        # Task workspace hierarchy
        'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS workspace_id INTEGER',
        'CREATE INDEX IF NOT EXISTS ix_tasks_workspace_id ON tasks(workspace_id)',
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
        # Add workspace FK only if missing
        try:
            with engine.connect() as conn:
                conn.execute(text("""
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM pg_constraint WHERE conname = 'fk_tasks_workspace_id'
                        ) THEN
                            ALTER TABLE tasks
                            ADD CONSTRAINT fk_tasks_workspace_id
                            FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT;
                        END IF;
                    END$$;
                """))
                conn.commit()
        except Exception:
            pass

    if not is_sqlite:
        # Add task self-reference FK only if missing
        try:
            with engine.connect() as conn:
                conn.execute(text("""
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM pg_constraint WHERE conname = 'fk_tasks_parent_task_id'
                        ) THEN
                            ALTER TABLE tasks
                            ADD CONSTRAINT fk_tasks_parent_task_id
                            FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE;
                        END IF;
                    END$$;
                """))
                conn.commit()
        except Exception:
            pass

    if not is_sqlite:
        # Add organization FKs only if missing
        org_fk_sql = [
            ("fk_users_organization_id", "users", "organization_id", "organizations"),
            ("fk_workspaces_organization_id", "workspaces", "organization_id", "organizations"),
            ("fk_tasks_organization_id", "tasks", "organization_id", "organizations"),
            ("fk_subtasks_organization_id", "subtasks", "organization_id", "organizations"),
            ("fk_attendance_organization_id", "attendance", "organization_id", "organizations"),
            ("fk_payrolls_organization_id", "payrolls", "organization_id", "organizations"),
            ("fk_leave_requests_organization_id", "leave_requests", "organization_id", "organizations"),
            ("fk_task_sheets_organization_id", "task_sheets", "organization_id", "organizations"),
            ("fk_weekly_progress_organization_id", "weekly_progress", "organization_id", "organizations"),
        ]
        for constraint_name, table_name, col_name, ref_table in org_fk_sql:
            try:
                with engine.connect() as conn:
                    conn.execute(text(f"""
                        DO $$
                        BEGIN
                            IF NOT EXISTS (
                                SELECT 1 FROM pg_constraint WHERE conname = '{constraint_name}'
                            ) THEN
                                ALTER TABLE {table_name}
                                ADD CONSTRAINT {constraint_name}
                                FOREIGN KEY ({col_name}) REFERENCES {ref_table}(id) ON DELETE RESTRICT;
                            END IF;
                        END$$;
                    """))
                    conn.commit()
            except Exception:
                pass

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
    from app.models import User, UserRole, Workspace, Organization
    from app.auth import get_password_hash
    from sqlmodel import Session, select
    
    with Session(engine) as session:
        # Ensure default organization exists
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
                organization_id=default_org.id,
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
                if existing_admin.organization_id is None:
                    existing_admin.organization_id = default_org.id
                session.add(existing_admin)
                session.commit()
                print(f"✅ Admin account updated to APPROVED status: {admin_email}")
            else:
                print(f"✅ Admin account already exists: {admin_email}")

        # Backfill users organization_id
        orgless_users = session.exec(select(User).where(User.organization_id.is_(None))).all()
        for u in orgless_users:
            u.organization_id = default_org.id
            session.add(u)
        if orgless_users:
            session.commit()

        # Ensure at least one workspace exists and backfill tasks.workspace_id for legacy rows.
        default_workspace = session.exec(select(Workspace).where(Workspace.name == "General")).first()
        if not default_workspace:
            admin_user = session.exec(select(User).where(User.role == UserRole.admin).order_by(User.id.asc())).first()
            if admin_user:
                default_workspace = Workspace(
                    name="General",
                    description="Default workspace for uncategorized projects",
                    icon="📁",
                    color="#7C8EA3",
                    organization_id=admin_user.organization_id,
                    created_by=admin_user.id,
                )
                session.add(default_workspace)
                session.commit()
                session.refresh(default_workspace)

        # Backfill multi-tenant organization_id on core tables.
        from app.models import Task, Subtask, Attendance, Payroll, LeaveRequest, TaskSheet, WeeklyProgress

        for ws in session.exec(select(Workspace).where(Workspace.organization_id.is_(None))).all():
            creator = session.exec(select(User).where(User.id == ws.created_by)).first()
            ws.organization_id = creator.organization_id if creator else default_org.id
            session.add(ws)

        for t in session.exec(select(Task).where(Task.organization_id.is_(None))).all():
            owner = session.exec(select(User).where(User.id == t.assigned_by)).first()
            t.organization_id = owner.organization_id if owner else default_org.id
            session.add(t)

        for st in session.exec(select(Subtask).where(Subtask.organization_id.is_(None))).all():
            parent = session.exec(select(Task).where(Task.id == st.parent_task_id)).first()
            st.organization_id = parent.organization_id if parent else default_org.id
            session.add(st)

        for a in session.exec(select(Attendance).where(Attendance.organization_id.is_(None))).all():
            usr = session.exec(select(User).where(User.id == a.user_id)).first()
            a.organization_id = usr.organization_id if usr else default_org.id
            session.add(a)

        for p in session.exec(select(Payroll).where(Payroll.organization_id.is_(None))).all():
            usr = session.exec(select(User).where(User.id == p.employee_id)).first()
            p.organization_id = usr.organization_id if usr else default_org.id
            session.add(p)

        for lr in session.exec(select(LeaveRequest).where(LeaveRequest.organization_id.is_(None))).all():
            usr = session.exec(select(User).where(User.id == lr.user_id)).first()
            lr.organization_id = usr.organization_id if usr else default_org.id
            session.add(lr)

        for ts in session.exec(select(TaskSheet).where(TaskSheet.organization_id.is_(None))).all():
            usr = session.exec(select(User).where(User.id == ts.user_id)).first()
            ts.organization_id = usr.organization_id if usr else default_org.id
            session.add(ts)

        for wp in session.exec(select(WeeklyProgress).where(WeeklyProgress.organization_id.is_(None))).all():
            usr = session.exec(select(User).where(User.id == wp.user_id)).first()
            wp.organization_id = usr.organization_id if usr else default_org.id
            session.add(wp)

        session.commit()

        if default_workspace:
            from app.models import Task
            orphan_tasks = session.exec(select(Task).where(Task.workspace_id.is_(None))).all()
            for orphan in orphan_tasks:
                orphan.workspace_id = default_workspace.id
                session.add(orphan)
            if orphan_tasks:
                session.commit()
    
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
FRONTEND_URLS = os.getenv("FRONTEND_URLS", "")

# Allow Vercel preview deployments for this project and (optionally) all Vercel domains.
# FRONTEND_ORIGIN_REGEX from env is supported, but we always include a safe
# Vercel fallback so stale env values do not break deployed previews.
DEFAULT_VERCEL_ORIGIN_REGEX = r"https://([a-z0-9-]+\.)?vercel\.app"
ENV_FRONTEND_ORIGIN_REGEX = os.getenv("FRONTEND_ORIGIN_REGEX", "").strip()
if ENV_FRONTEND_ORIGIN_REGEX:
    FRONTEND_ORIGIN_REGEX = f"(?:{ENV_FRONTEND_ORIGIN_REGEX})|(?:{DEFAULT_VERCEL_ORIGIN_REGEX})"
else:
    FRONTEND_ORIGIN_REGEX = DEFAULT_VERCEL_ORIGIN_REGEX

origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "https://work-force-pro-4jae.vercel.app",  # Your Vercel deployment
    "https://work-force-pro-demo-app.vercel.app", # New Vercel demo app
    "https://attendence-dashboard.allytechcourses.com",  # Custom domain
]

# Add production frontend URL if set
if FRONTEND_URL and FRONTEND_URL not in origins:
    origins.append(FRONTEND_URL)

if PRODUCTION_FRONTEND and PRODUCTION_FRONTEND not in origins:
    origins.append(PRODUCTION_FRONTEND)

# Add any additional origins from env (comma-separated)
if FRONTEND_URLS:
    for origin in [o.strip() for o in FRONTEND_URLS.split(",") if o.strip()]:
        if origin not in origins:
            origins.append(origin)

print(f"[CORS] Allowed origins: {origins}")
print(f"[CORS] Allowed origin regex: {FRONTEND_ORIGIN_REGEX}")

# CRITICAL: Cannot use allow_origins=["*"] with allow_credentials=True
# This will cause browsers to reject CORS requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Use explicit origins list instead of wildcard
    allow_origin_regex=FRONTEND_ORIGIN_REGEX,
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
app.include_router(workspaces.router)
app.include_router(organizations.router)


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
