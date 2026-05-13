"""
Migration: add bank_account_number, bank_ifsc_code, bank_name, bank_account_holder columns to users table.
Run once: python migrate_bank_details.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import engine
from sqlalchemy import text

COLUMNS = [
    ("bank_account_number", "VARCHAR(30)"),
    ("bank_ifsc_code",       "VARCHAR(20)"),
    ("bank_name",            "VARCHAR(100)"),
    ("bank_account_holder",  "VARCHAR(100)"),
]

with engine.connect() as conn:
    for col, col_type in COLUMNS:
        try:
            conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {col_type}"))
            conn.commit()
            print(f"  ✓ Added column: {col}")
        except Exception as e:
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                print(f"  – Column already exists, skipping: {col}")
            else:
                print(f"  ✗ Error adding {col}: {e}")
                raise

print("\nMigration complete.")
