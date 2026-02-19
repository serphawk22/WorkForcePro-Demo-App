"""
FastAPI main application entry point.
WorkForce Pro - Workforce Management System Backend
"""
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import create_db_and_tables
from app.routers import auth, admin, attendance, tasks, leave

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup: Create database tables
    create_db_and_tables()
    
    # Seed default admin account
    from app.database import engine
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
            admin_user = User(
                name="admin",
                email=admin_email,
                hashed_password=get_password_hash("admin"),
                role=UserRole.admin,
                is_active=True
            )
            session.add(admin_user)
            session.commit()
            print(f"✅ Default admin account created: {admin_email} / admin")
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
origins = [
    FRONTEND_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(attendance.router)
app.include_router(tasks.router)
app.include_router(leave.router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "WorkForce Pro API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
