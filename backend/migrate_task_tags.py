"""
Database migration to add tags to tasks and enable pg_trgm for fuzzy matching.
Run this script once to update the database schema.
"""
import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def run_migration():
    """Add new columns to existing tables and enable extensions."""
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
        
        # Enable pg_trgm extension for fuzzy search
        print("\n📝 Enabling pg_trgm extension...")
        try:
            cursor.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
            print("✅ pg_trgm extension enabled")
        except Exception as e:
            print(f"⚠️ Failed to enable pg_trgm: {e}")

        # Add tags column to tasks table
        print("\n📝 Adding tags column to tasks table...")
        try:
            cursor.execute("""
                ALTER TABLE tasks 
                ADD COLUMN IF NOT EXISTS tags VARCHAR(500) DEFAULT NULL;
            """)
            print("✅ Added tags column to tasks")
        except Exception as e:
            print(f"⚠️ tags column may already exist: {e}")
        
        # Commit changes
        conn.commit()
        print("\n✅ Migration completed successfully!")
        
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
