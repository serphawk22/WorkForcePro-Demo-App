"""
Database migration: add department/base_salary to users and create payrolls table.
Run this script once to update the database schema.
"""
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()


def run_migration():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL not found in environment variables")
        return

    print("🔗 Connecting to database...")
    conn = psycopg2.connect(database_url)
    cursor = conn.cursor()
    print("✅ Connected to database")

    # 1. Add department column to users
    print("\n📝 Adding 'department' column to users table...")
    cursor.execute("""
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT NULL;
    """)
    print("✅ department added")

    # 2. Add base_salary column to users
    print("\n📝 Adding 'base_salary' column to users table...")
    cursor.execute("""
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS base_salary FLOAT DEFAULT NULL;
    """)
    print("✅ base_salary added")

    # 3. Create payrolls table
    print("\n📝 Creating 'payrolls' table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS payrolls (
            id SERIAL PRIMARY KEY,
            employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            month INTEGER NOT NULL,
            year INTEGER NOT NULL,
            salary FLOAT NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'Pending',
            pay_date DATE DEFAULT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS ix_payrolls_employee_id ON payrolls(employee_id);
    """)
    print("✅ payrolls table created")

    conn.commit()
    cursor.close()
    conn.close()
    print("\n🎉 Migration complete!")


if __name__ == "__main__":
    run_migration()
