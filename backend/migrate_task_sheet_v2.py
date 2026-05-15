"""
Migration: Update TaskSheet to structured format
Adds tasks_completed, work_impact, time_taken and removes achievements.
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
    # 1. Add new columns
    "ALTER TABLE task_sheets ADD COLUMN IF NOT EXISTS tasks_completed TEXT;",
    "ALTER TABLE task_sheets ADD COLUMN IF NOT EXISTS work_impact TEXT;",
    "ALTER TABLE task_sheets ADD COLUMN IF NOT EXISTS time_taken VARCHAR(100);",
    
    # 2. (Optional) Migrate existing data from achievements to tasks_completed
    "UPDATE task_sheets SET tasks_completed = achievements WHERE tasks_completed IS NULL AND achievements IS NOT NULL;",
    "UPDATE task_sheets SET work_impact = 'Migrated from legacy achievements' WHERE work_impact IS NULL AND achievements IS NOT NULL;",
    "UPDATE task_sheets SET time_taken = 'N/A' WHERE time_taken IS NULL AND achievements IS NOT NULL;",

    # 3. Alter achievements to be nullable (so we can remove it safely later)
    "ALTER TABLE task_sheets ALTER COLUMN achievements DROP NOT NULL;",
    
    # 4. Handle HappySheet updates (remove ai_explanation if it was a column, though it seems it wasn't in the original migration)
    # The models show it as a field, but let's check happy_sheets table
    "ALTER TABLE happy_sheets ADD COLUMN IF NOT EXISTS goals_without_greed_impossible TEXT DEFAULT '';",
]

try:
    conn = psycopg2.connect(database_url)
    cursor = conn.cursor()
    print("Connected to database. Running migration...")
    for cmd in commands:
        try:
            cursor.execute(cmd)
            conn.commit()
            print(f"  SUCCESS: {cmd}")
        except Exception as e:
            conn.rollback()
            print(f"  SKIPPED/ERROR: {cmd} -> {e}")
            
    print("\nTask Sheet V2 migration complete.")
except Exception as e:
    print(f"Connection error: {e}")
    sys.exit(1)
finally:
    if "conn" in locals() and conn:
        conn.close()
