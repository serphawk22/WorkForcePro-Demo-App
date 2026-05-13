"""
Database migration to add start_date to tasks and parent_subtask_id to subtasks.
Run this script once to update the database schema.
"""
import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def run_migration():
    """Add new columns to existing tables."""
    # Get database URL from environment
    database_url = os.getenv("DATABASE_URL")
    
    if not database_url:
        print("❌ DATABASE_URL not found in environment variables")
        return
    
    print(f"🔗 Connecting to database...")
    
    try:
        # Connect to database
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        print("✅ Connected to database")
        
        # Add start_date column to tasks table
        print("\n📝 Adding start_date column to tasks table...")
        try:
            cursor.execute("""
                ALTER TABLE tasks 
                ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            """)
            print("✅ Added start_date column to tasks")
        except Exception as e:
            print(f"⚠️  start_date column may already exist: {e}")
        
        # Update existing tasks to have start_date = created_at
        print("\n📝 Updating existing tasks with start_date...")
        cursor.execute("""
            UPDATE tasks 
            SET start_date = created_at 
            WHERE start_date IS NULL;
        """)
        print("✅ Updated existing tasks with start_date")
        
        # Add parent_subtask_id column to subtasks table
        print("\n📝 Adding parent_subtask_id column to subtasks table...")
        try:
            cursor.execute("""
                ALTER TABLE subtasks 
                ADD COLUMN IF NOT EXISTS parent_subtask_id INTEGER REFERENCES subtasks(id);
            """)
            print("✅ Added parent_subtask_id column to subtasks")
        except Exception as e:
            print(f"⚠️  parent_subtask_id column may already exist: {e}")
        
        # Add index for better query performance
        print("\n📝 Adding index on parent_subtask_id...")
        try:
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_subtasks_parent_subtask_id 
                ON subtasks(parent_subtask_id);
            """)
            print("✅ Added index on parent_subtask_id")
        except Exception as e:
            print(f"⚠️  Index may already exist: {e}")
        
        # Commit changes
        conn.commit()
        print("\n✅ Migration completed successfully!")
        print("\n📊 Summary:")
        print("   • Added start_date column to tasks table")
        print("   • Updated existing tasks with start_date")
        print("   • Added parent_subtask_id column to subtasks table")
        print("   • Added index on parent_subtask_id for performance")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        if conn:
            conn.rollback()
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
        print("\n🔒 Database connection closed")

if __name__ == "__main__":
    print("🚀 Starting database migration...\n")
    run_migration()
