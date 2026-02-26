"""
Migration: add public_id column to tasks and subtasks, then populate existing rows.
Run once from within the backend directory:
    python migrate_public_ids.py
"""
import os
import random
import string
import psycopg2
from dotenv import load_dotenv

load_dotenv()


def generate_public_id(length: int = 6) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


def run_migration():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not set")
        return

    conn = psycopg2.connect(database_url)
    cursor = conn.cursor()
    print("Connected to database.")

    # Add column to tasks
    print("Adding public_id column to tasks...")
    cursor.execute("""
        ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS public_id VARCHAR(10);
    """)

    # Add column to subtasks
    print("Adding public_id column to subtasks...")
    cursor.execute("""
        ALTER TABLE subtasks
        ADD COLUMN IF NOT EXISTS public_id VARCHAR(10);
    """)
    conn.commit()

    # Populate tasks missing public_id
    cursor.execute("SELECT id FROM tasks WHERE public_id IS NULL OR public_id = ''")
    task_ids = [row[0] for row in cursor.fetchall()]

    cursor.execute("SELECT public_id FROM tasks WHERE public_id IS NOT NULL AND public_id <> ''")
    existing = {row[0] for row in cursor.fetchall()}

    updated_tasks = 0
    for task_id in task_ids:
        new_id = None
        for _ in range(50):
            candidate = generate_public_id()
            if candidate not in existing:
                new_id = candidate
                existing.add(candidate)
                break
        if new_id:
            cursor.execute("UPDATE tasks SET public_id = %s WHERE id = %s", (new_id, task_id))
            updated_tasks += 1
    conn.commit()
    print(f"Updated {updated_tasks} tasks.")

    # Populate subtasks missing public_id
    cursor.execute("SELECT id FROM subtasks WHERE public_id IS NULL OR public_id = ''")
    subtask_ids = [row[0] for row in cursor.fetchall()]

    cursor.execute("SELECT public_id FROM subtasks WHERE public_id IS NOT NULL AND public_id <> ''")
    st_existing = {row[0] for row in cursor.fetchall()}

    updated_subtasks = 0
    for subtask_id in subtask_ids:
        new_id = None
        for _ in range(50):
            candidate = generate_public_id()
            if candidate not in st_existing:
                new_id = candidate
                st_existing.add(candidate)
                break
        if new_id:
            cursor.execute("UPDATE subtasks SET public_id = %s WHERE id = %s", (new_id, subtask_id))
            updated_subtasks += 1
    conn.commit()
    print(f"Updated {updated_subtasks} subtasks.")

    # Add unique index (skip if exists)
    try:
        cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_tasks_public_id ON tasks(public_id) WHERE public_id IS NOT NULL")
        cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_subtasks_public_id ON subtasks(public_id) WHERE public_id IS NOT NULL")
        conn.commit()
        print("Unique indexes created.")
    except Exception as e:
        print(f"Index note: {e}")
        conn.rollback()

    cursor.close()
    conn.close()
    print("Migration complete.")


if __name__ == "__main__":
    run_migration()

