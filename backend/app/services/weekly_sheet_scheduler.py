from datetime import datetime, timezone, timedelta, date as DateType
import json
import logging

from sqlmodel import Session, select
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.database import engine
from app.models import (
    User,
    Task,
    TaskSheet,
    LighthouseWeeklySheet,
    WeeklySheetStatus,
    NotificationType,
)
from app.routers.notifications import create_notification
from app.routers.weekly_sheet import monday_of_week

logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler = BackgroundScheduler()

def generate_weekly_sheets_job():
    """Background job that generates weekly sheets for all employees."""
    logger.info("Starting auto-generation of Weekly Sheets.")
    
    today = datetime.now(timezone.utc).date()
    week_start = monday_of_week(today)
    week_end = week_start + timedelta(days=6)
    
    with Session(engine) as session:
        # Get all active employees
        users = session.exec(select(User).where(User.is_active == True)).all()
        
        for user in users:
            try:
                # 1. Gather data
                tasks = session.exec(
                    select(Task).where(Task.assigned_to == user.id)
                ).all()
                
                task_data = []
                for t in tasks:
                    task_data.append({
                        "title": t.title,
                        "status": t.status,
                        "due_date": str(t.due_date) if t.due_date else None,
                        "completed": t.done_by_employee
                    })

                task_sheets = session.exec(
                    select(TaskSheet).where(
                        TaskSheet.user_id == user.id,
                        TaskSheet.date >= week_start,
                        TaskSheet.date <= week_end,
                    ).order_by(TaskSheet.date)
                ).all()

                task_sheet_data = [
                    {
                        "day": sheet.date.strftime("%A"),
                        "tasks_completed": sheet.tasks_completed,
                        "work_impact": sheet.work_impact,
                    }
                    for sheet in task_sheets
                ]

                payload_data = {
                    "week_start": str(week_start),
                    "week_end": str(week_end),
                    "task_sheets": task_sheet_data,
                }
                if not task_sheet_data:
                    payload_data["assigned_tasks"] = task_data

                payload = json.dumps(payload_data)
                
                # Check if draft already exists
                existing = session.exec(
                    select(LighthouseWeeklySheet).where(
                        LighthouseWeeklySheet.user_id == user.id,
                        LighthouseWeeklySheet.week_start_date == week_start,
                        LighthouseWeeklySheet.organization_id == user.organization_id,
                    )
                ).first()
                
                if existing:
                    continue  # Skip if already exists so we don't overwrite manual edits
                
                # Create empty sheet for manual entry - no AI generation
                now = datetime.now(timezone.utc)
                sheet = LighthouseWeeklySheet(
                    organization_id=user.organization_id,
                    user_id=user.id,
                    week_start_date=week_start,
                    status=WeeklySheetStatus.draft,
                    weekly_summary=None,
                    major_accomplishments=None,
                    tasks_completed=None,
                    pending_tasks=None,
                    blockers=None,
                    productivity_insights=None,
                    time_utilization=None,
                    suggested_priorities=None,
                    created_at=now,
                    updated_at=now
                )
                session.add(sheet)
                session.commit()
                
                # Create notification
                create_notification(
                    session=session,
                    user_id=user.id,
                    type=NotificationType.SYSTEM,
                    message="Your Weekly Sheet has been created. Please fill in all sections and submit before the deadline."
                )
                
            except Exception as e:
                logger.error(f"Error generating weekly sheet for user {user.id}: {e}")
                session.rollback()

def start_scheduler():
    # Schedule every Saturday at 18:00
    scheduler.add_job(
        generate_weekly_sheets_job,
        trigger=CronTrigger(day_of_week='sat', hour=18, minute=0),
        id='generate_weekly_sheets_job',
        replace_existing=True
    )
    scheduler.start()
    logger.info("Weekly sheet scheduler started.")

def stop_scheduler():
    scheduler.shutdown()
    logger.info("Weekly sheet scheduler stopped.")
