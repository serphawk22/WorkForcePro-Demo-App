"""
Database configuration and session management.
"""
import os
from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse
from dotenv import load_dotenv
from sqlmodel import SQLModel, create_engine, Session
from typing import Generator

load_dotenv(override=True)

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("Set DATABASE_URL in backend/.env to your PostgreSQL database connection string.")


def _normalize_postgres_url(url: str) -> str:
    """Ensure production-safe PostgreSQL defaults for SSL and connect timeout."""
    if not url.startswith("postgresql://"):
        return url

    parsed = urlparse(url)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))

    # Railway/managed Postgres often requires TLS.
    query.setdefault("sslmode", "require")
    # Fail fast instead of hanging login requests when DB is unavailable.
    query.setdefault("connect_timeout", "8")

    return urlunparse(parsed._replace(query=urlencode(query)))


DATABASE_URL = _normalize_postgres_url(DATABASE_URL)


def _is_pooled_postgres_url(url: str) -> bool:
    """Detect managed pooled endpoints that reject startup options."""
    if not url.startswith("postgresql://"):
        return False
    host = (urlparse(url).hostname or "").lower()
    return "pooler" in host or host.endswith("proxy.rlwy.net")

connect_args = {}
if DATABASE_URL.startswith("postgresql://"):
    # Some pooled providers reject startup parameters passed via options.
    if _is_pooled_postgres_url(DATABASE_URL):
        connect_args = {
            "connect_timeout": 8,
        }
    else:
        # Fail fast on lock contention so one blocked query does not freeze the API.
        connect_args = {
            "connect_timeout": 8,
            "options": "-c statement_timeout=15000 -c lock_timeout=5000 -c idle_in_transaction_session_timeout=15000",
        }

engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_timeout=20,
    pool_recycle=3600,
    pool_pre_ping=True,
    connect_args=connect_args,
)


def create_db_and_tables():
    """Create all database tables."""
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """Dependency for getting database sessions."""
    with Session(engine) as session:
        yield session
