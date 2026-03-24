"""
Database configuration and session management.
"""
import os
from dotenv import load_dotenv
from sqlmodel import SQLModel, create_engine, Session
from typing import Generator

load_dotenv()

# PostgreSQL in production; optional SQLite when SQLITE_DEV=1 (no Docker/Postgres required locally)
if os.getenv("SQLITE_DEV") == "1":
    DATABASE_URL = "sqlite:///./workforce_local.db"
else:
    DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "Set DATABASE_URL in backend/.env (see .env.example) or SQLITE_DEV=1 for local SQLite."
    )

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        echo=False,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_engine(
        DATABASE_URL,
        echo=False,
        pool_timeout=20,
        pool_recycle=3600,
        pool_pre_ping=True,
    )


def create_db_and_tables():
    """Create all database tables."""
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """Dependency for getting database sessions."""
    with Session(engine) as session:
        yield session
