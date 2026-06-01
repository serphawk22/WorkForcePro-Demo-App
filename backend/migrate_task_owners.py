"""
Migration script to add TaskOwner table for multiple project owners support.
Run: python migrate_task_owners.py
"""

import sys
from sqlmodel import create_engine, SQLModel, Session, select
from app.models import Task, TaskOwner, User
from app.config import DATABASE_URL

def migrate_task_owners():
    """Create TaskOwner table and migrate existing task creators as owners."""
    engine = create_engine(DATABASE_URL, echo=True)
    
    # Create the TaskOwner table
    print("Creating TaskOwner table...")
    SQLModel.metadata.create_all(engine)
    print("✓ TaskOwner table created successfully")
    
    # Migrate existing tasks: set assigned_by as primary owner
    print("\nMigrating existing task assignments to owners...")
    with Session(engine) as session:
        # Get all tasks that don't have owners yet
        tasks = session.exec(select(Task)).all()
        migrated_count = 0
        
        for task in tasks:
            # Check if this task already has owners
            existing_owner = session.exec(
                select(TaskOwner).where(TaskOwner.task_id == task.id)
            ).first()
            
            if not existing_owner and task.assigned_by:
                # Create TaskOwner record with assigned_by as primary owner
                owner = TaskOwner(
                    task_id=task.id,
                    user_id=task.assigned_by,
                    is_primary=True
                )
                session.add(owner)
                migrated_count += 1
        
        if migrated_count > 0:
            session.commit()
            print(f"✓ Migrated {migrated_count} tasks with primary owners")
        else:
            print("ℹ No tasks to migrate (already have owners or no assigned_by)")
    
    print("\n✓ Migration completed successfully!")
    print("  - TaskOwner table is ready")
    print("  - Existing task assignments preserved as primary owners")
    print("\nNext steps:")
    print("  1. Add task owner management endpoints in routers/task_owner.py")
    print("  2. Update frontend to display and manage multiple owners")
    print("  3. Test owner management with multiple users per task")

if __name__ == "__main__":
    try:
        migrate_task_owners()
    except Exception as e:
        print(f"✗ Migration failed: {str(e)}")
        sys.exit(1)
