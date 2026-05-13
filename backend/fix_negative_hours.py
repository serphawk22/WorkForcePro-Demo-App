"""
Migration script to fix negative total_hours values in attendance records.
This script ensures all total_hours values are non-negative.
"""
import os
import sys
from datetime import datetime, timezone

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import Session, select
from app.database import engine
from app.models import Attendance


def fix_negative_hours():
    """Fix all negative total_hours values in the database."""
    with Session(engine) as session:
        # Get all attendance records
        statement = select(Attendance)
        all_records = session.exec(statement).all()
        
        fixed_count = 0
        recalculated_count = 0
        
        for record in all_records:
            needs_update = False
            
            # Fix negative total_hours
            if record.total_hours is not None and record.total_hours < 0:
                print(f"Found negative total_hours: {record.total_hours}h for user_id={record.user_id}, date={record.date}")
                
                # Recalculate if both punch_in and punch_out exist
                if record.punch_in and record.punch_out:
                    punch_in_aware = record.punch_in
                    punch_out_aware = record.punch_out
                    
                    # Ensure timezone awareness
                    if punch_in_aware.tzinfo is None:
                        punch_in_aware = punch_in_aware.replace(tzinfo=timezone.utc)
                    if punch_out_aware.tzinfo is None:
                        punch_out_aware = punch_out_aware.replace(tzinfo=timezone.utc)
                    
                    delta = punch_out_aware - punch_in_aware
                    new_total = max(0, round(delta.total_seconds() / 3600, 2))
                    
                    print(f"  Recalculated: {new_total}h")
                    record.total_hours = new_total
                    recalculated_count += 1
                else:
                    # Just set to 0 if can't recalculate
                    print(f"  Setting to 0 (missing punch times)")
                    record.total_hours = 0
                
                session.add(record)
                fixed_count += 1
                needs_update = True
            
            # Also fix records with both punch times but null total_hours
            elif record.total_hours is None and record.punch_in and record.punch_out:
                punch_in_aware = record.punch_in
                punch_out_aware = record.punch_out
                
                # Ensure timezone awareness
                if punch_in_aware.tzinfo is None:
                    punch_in_aware = punch_in_aware.replace(tzinfo=timezone.utc)
                if punch_out_aware.tzinfo is None:
                    punch_out_aware = punch_out_aware.replace(tzinfo=timezone.utc)
                
                delta = punch_out_aware - punch_in_aware
                new_total = max(0, round(delta.total_seconds() / 3600, 2))
                
                print(f"Fixed null total_hours for user_id={record.user_id}, date={record.date}: {new_total}h")
                record.total_hours = new_total
                session.add(record)
                fixed_count += 1
                recalculated_count += 1
        
        if fixed_count > 0:
            session.commit()
            print(f"\n✅ Fixed {fixed_count} attendance records")
            print(f"   - {recalculated_count} recalculated from punch times")
            print(f"   - {fixed_count - recalculated_count} set to 0")
        else:
            print("\n✅ No negative or null total_hours found. Database is clean!")


if __name__ == "__main__":
    print("🔧 Fixing negative total_hours values in attendance records...")
    print("=" * 70)
    fix_negative_hours()
    print("=" * 70)
    print("✅ Migration complete!")
