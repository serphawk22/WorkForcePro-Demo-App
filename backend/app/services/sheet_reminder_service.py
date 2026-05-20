"""
Daily Task Sheet and Happy Sheet reminder automation.
"""
from __future__ import annotations

import asyncio
import os
from datetime import date as DateType
from datetime import datetime, time, timedelta
from typing import Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlmodel import Session, select

from app.database import engine
from app.models import HappySheet, TaskSheet, User, UserRole
from app.services.email_service import (
    build_missing_sheet_email,
    get_employee_delivery_email,
    send_email,
)


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


def _reminder_timezone() -> ZoneInfo:
    timezone_name = os.getenv("SHEET_REMINDER_TIMEZONE", "Asia/Kolkata").strip() or "Asia/Kolkata"
    try:
        return ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError:
        print(f"[EMAIL] Unknown SHEET_REMINDER_TIMEZONE={timezone_name!r}; falling back to Asia/Kolkata")
        return ZoneInfo("Asia/Kolkata")


def _reminder_time() -> time:
    raw = os.getenv("SHEET_REMINDER_TIME", "21:00").strip() or "21:00"
    try:
        hour_text, minute_text = raw.split(":", 1)
        return time(hour=int(hour_text), minute=int(minute_text))
    except Exception:
        print(f"[EMAIL] Invalid SHEET_REMINDER_TIME={raw!r}; falling back to 21:00")
        return time(hour=21, minute=0)


def send_missing_sheet_reminders(
    session: Session,
    target_date: Optional[DateType] = None,
) -> dict:
    """Send one reminder to each active employee missing either sheet for the date."""
    reminder_date = target_date or DateType.today()
    task_user_ids = set(session.exec(select(TaskSheet.user_id).where(TaskSheet.date == reminder_date)).all())
    happy_user_ids = set(session.exec(select(HappySheet.user_id).where(HappySheet.date == reminder_date)).all())
    users = session.exec(
        select(User).where(
            User.is_active == True,  # noqa: E712
            User.role == UserRole.employee,
        )
    ).all()

    sent: list[str] = []
    failed: list[str] = []
    skipped: list[str] = []

    for user in users:
        missing_task = user.id not in task_user_ids
        missing_happy = user.id not in happy_user_ids
        if not (missing_task or missing_happy):
            skipped.append(user.email)
            continue

        recipient = get_employee_delivery_email(user)
        if not recipient:
            failed.append(f"{user.id}: no mapped or stored email")
            continue

        subject, body = build_missing_sheet_email(
            user_name=user.name,
            missing_task_sheet=missing_task,
            missing_happy_sheet=missing_happy,
        )
        try:
            send_email(recipient, subject, body)
            sent.append(recipient)
        except Exception as exc:
            failed.append(f"{recipient}: {exc}")

    return {
        "date": reminder_date.isoformat(),
        "sent_count": len(sent),
        "failed_count": len(failed),
        "skipped_count": len(skipped),
        "sent_emails": sent,
        "failures": failed,
    }


async def _sheet_reminder_loop(stop_event: asyncio.Event) -> None:
    tz = _reminder_timezone()
    reminder_clock = _reminder_time()
    last_sent_date: Optional[DateType] = None

    print(f"[EMAIL] Sheet reminder scheduler active for {reminder_clock.strftime('%H:%M')} {tz.key}")

    while not stop_event.is_set():
        now = datetime.now(tz)
        target = datetime.combine(now.date(), reminder_clock, tzinfo=tz)

        if now >= target and last_sent_date != now.date():
            try:
                with Session(engine) as session:
                    result = send_missing_sheet_reminders(session, target_date=now.date())
                last_sent_date = now.date()
                print(
                    "[EMAIL] Sheet reminders sent: "
                    f"{result['sent_count']} sent, {result['failed_count']} failed for {result['date']}"
                )
            except Exception as exc:
                print(f"[EMAIL] Sheet reminder scheduler failed: {exc}")

        next_target = target if now < target else target + timedelta(days=1)
        sleep_seconds = max(60, min((next_target - now).total_seconds(), 3600))
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=sleep_seconds)
        except asyncio.TimeoutError:
            pass


def start_sheet_reminder_scheduler() -> Optional[tuple[asyncio.Task, asyncio.Event]]:
    if not _env_bool("SHEET_REMINDER_SCHEDULER_ENABLED", True):
        print("[EMAIL] Sheet reminder scheduler disabled")
        return None

    stop_event = asyncio.Event()
    task = asyncio.create_task(_sheet_reminder_loop(stop_event))
    return task, stop_event


async def stop_sheet_reminder_scheduler(handle: Optional[tuple[asyncio.Task, asyncio.Event]]) -> None:
    if not handle:
        return

    task, stop_event = handle
    stop_event.set()
    try:
        await asyncio.wait_for(task, timeout=5)
    except asyncio.TimeoutError:
        task.cancel()
