#!/usr/bin/env python3
"""
Migration script to add goals_without_greed_impossible column to happy_sheets table.
This script safely adds the new column if it doesn't already exist.
"""

import os
from typing import Optional
from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError
from app.database import engine

def column_exists(table_name: str, column_name: str) -> bool:
    """Check if a column exists in a table."""
    try:
        inspector = inspect(engine)
        columns = inspector.get_columns(table_name)
        return any(col['name'] == column_name for col in columns)
    except Exception as e:
        print(f"Error checking column: {e}")
        return False

def add_column_to_happy_sheets() -> bool:
    """Add goals_without_greed_impossible column to happy_sheets table."""
    table_name = "happy_sheets"
    column_name = "goals_without_greed_impossible"
    
    print(f"Checking if column '{column_name}' exists in table '{table_name}'...")
    
    if column_exists(table_name, column_name):
        print(f"✓ Column '{column_name}' already exists. No migration needed.")
        return True
    
    try:
        print(f"Adding column '{column_name}' to table '{table_name}'...")
        
        with engine.connect() as conn:
            # Add the column with a default value of empty string
            alter_query = f"""
            ALTER TABLE {table_name}
            ADD COLUMN {column_name} VARCHAR NOT NULL DEFAULT '';
            """
            conn.execute(text(alter_query))
            conn.commit()
        
        print(f"✓ Successfully added column '{column_name}' to table '{table_name}'.")
        return True
        
    except SQLAlchemyError as e:
        print(f"✗ Database error: {e}")
        return False
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return False

def main():
    """Main migration function."""
    print("=" * 60)
    print("Happy Sheet Migration: Add goals_without_greed_impossible")
    print("=" * 60)
    
    # Check database URL
    db_url = os.getenv("DATABASE_URL", "").strip()
    if not db_url:
        print("✗ DATABASE_URL not set. Cannot proceed with migration.")
        return False
    
    print(f"Database: {db_url.split('@')[1] if '@' in db_url else db_url}")
    
    success = add_column_to_happy_sheets()
    
    print("=" * 60)
    if success:
        print("Migration completed successfully!")
        return True
    else:
        print("Migration failed. Please check the errors above.")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
