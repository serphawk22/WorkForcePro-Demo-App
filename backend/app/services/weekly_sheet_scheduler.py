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
    Attendance,
    TaskSheet,
    LighthouseWeeklySheet,
    WeeklySheetStatus,
    NotificationType,
)
from app.routers.notifications import create_notification
from app.routers.weekly_sheet import generate_weekly_sheet_content, monday_of_week

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
                        "estimated_hours": t.estimated_hours,
                        "actual_hours": t.actual_hours,
                        "due_date": str(t.due_date) if t.due_date else None,
                        "completed": t.done_by_employee
                    })
                    
                attendances = session.exec(
                    select(Attendance).where(
                        Attendance.user_id == user.id,
                        Attendance.date >= week_start,
                        Attendance.date <= week_end
                    )
                ).all()
                
                total_hours = sum([a.total_hours for a in attendances if a.total_hours])
                attendance_data = {
                    "days_logged": len(attendances),
                    "total_hours": total_hours
                }

                task_sheets = session.exec(
                    select(TaskSheet).where(
                        TaskSheet.user_id == user.id,
                        TaskSheet.date >= week_start,
                        TaskSheet.date <= week_end,
                    ).order_by(TaskSheet.date)
                ).all()

                task_sheet_data = [
                    {
                        "date": str(sheet.date),
                        "tasks_completed": sheet.tasks_completed,
                        "work_impact": sheet.work_impact,
                        "time_taken": sheet.time_taken,
                        "repo_link": sheet.repo_link,
                    }
                    for sheet in task_sheets
                ]

                payload_data = {
                    "week_start": str(week_start),
                    "week_end": str(week_end),
                    "attendance": attendance_data,
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
                
                import asyncio

                ai_result = asyncio.run(
                    generate_weekly_sheet_content(
                        payload,
                        week_start,
                        week_end,
                        attendance_data,
                        task_data,
                        task_sheet_data,
                    )
                )
                
                # Save new sheet
                now = datetime.now(timezone.utc)
                sheet = LighthouseWeeklySheet(
                    organization_id=user.organization_id,
                    user_id=user.id,
                    week_start_date=week_start,
                    status=WeeklySheetStatus.draft,
                    weekly_summary=ai_result.get("weekly_summary"),
                    major_accomplishments=ai_result.get("major_accomplishments"),
                    tasks_completed=ai_result.get("tasks_completed"),
                    pending_tasks=ai_result.get("pending_tasks"),
                    blockers=ai_result.get("blockers"),
                    productivity_insights=ai_result.get("productivity_insights"),
                    time_utilization=ai_result.get("time_utilization"),
                    suggested_priorities=ai_result.get("suggested_priorities"),
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
                    message="Your Weekly Sheet has been auto-generated. Please review before submission."
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
