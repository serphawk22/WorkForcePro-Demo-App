"""
Migration: Create My Space tables
Run: python migrate_my_space.py
"""
import os
import sys
import psycopg2
from dotenv import load_dotenv

load_dotenv()
database_url = os.getenv("DATABASE_URL")

if not database_url:
    print("ERROR: DATABASE_URL not set in .env")
    sys.exit(1)

commands = [
    """
    CREATE TABLE IF NOT EXISTS task_sheets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        date DATE NOT NULL,
        achievements VARCHAR(1000) NOT NULL,
        repo_link VARCHAR(500),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_task_sheets_user_id ON task_sheets (user_id);",
    """
    CREATE TABLE IF NOT EXISTS happy_sheets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        date DATE NOT NULL,
        what_made_you_happy TEXT NOT NULL,
        what_made_others_happy TEXT NOT NULL,
        goals_without_greed TEXT NOT NULL,
        dreams_supported TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_happy_sheets_user_id ON happy_sheets (user_id);",
    """
    CREATE TABLE IF NOT EXISTS dream_projects (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        description VARCHAR(2000) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_dream_projects_user_id ON dream_projects (user_id);",
    """
    CREATE TABLE IF NOT EXISTS learning_focuses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        focus VARCHAR(500) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_learning_focuses_user_id ON learning_focuses (user_id);",
    """
    CREATE TABLE IF NOT EXISTS personal_projects (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        title VARCHAR(200) NOT NULL,
        tag VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_personal_projects_user_id ON personal_projects (user_id);",
]

try:
    conn = psycopg2.connect(database_url)
    cursor = conn.cursor()
    for cmd in commands:
        try:
            cursor.execute(cmd)
            conn.commit()
            label = cmd.strip().split("\n")[0].strip()[:60]
            print(f"  OK  {label}")
        except Exception as e:
            conn.rollback()
            print(f"  ERR {cmd.strip()[:60]}: {e}")
    print("\nMy Space migration complete.")
except Exception as e:
    print(f"Connection error: {e}")
    sys.exit(1)
finally:
    if "conn" in locals() and conn:
        conn.close()
