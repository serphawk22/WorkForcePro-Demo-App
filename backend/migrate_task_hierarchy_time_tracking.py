"""One-off migration for task hierarchy and time-tracking fields.

Run from backend/:
    python migrate_task_hierarchy_time_tracking.py
"""
from sqlalchemy import text

from app.database import engine


MIGRATIONS = [
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id INTEGER",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_hours DOUBLE PRECISION",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_hours DOUBLE PRECISION",
    "CREATE INDEX IF NOT EXISTS ix_tasks_parent_task_id ON tasks(parent_task_id)",
]

PARENT_FK = """
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
"""


def main() -> None:
    with engine.connect() as conn:
        for sql in MIGRATIONS:
            conn.execute(text(sql))
        try:
            conn.execute(text(PARENT_FK))
        except Exception:
            # SQLite and some hosted setups do not support DO blocks.
            pass
        conn.commit()
    print("Task hierarchy/time-tracking migration completed")


if __name__ == "__main__":
    main()
