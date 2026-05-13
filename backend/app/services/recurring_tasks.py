"""
Generate and manage recurring task instances (Jira / Task Scheduler style).
"""
from __future__ import annotations

import json
from calendar import monthrange
from datetime import date, timedelta, datetime, timezone
from typing import Generator, List, Optional, Set

from sqlmodel import Session, select

from app.models import Task, TaskInstance, TaskInstanceStatus


def _parse_repeat_days(task: Task) -> Set[int]:
    if not task.repeat_days:
        return set()
    try:
        data = json.loads(task.repeat_days)
        if isinstance(data, list):
            return {int(x) for x in data if 0 <= int(x) <= 6}
    except (json.JSONDecodeError, ValueError, TypeError):
        pass
    return set()


def _monthly_occurrence(year: int, month: int, day: int) -> date:
    """Clamp day to last day of month if needed."""
    last = monthrange(year, month)[1]
    d = min(day, last)
    return date(year, month, d)


def _add_months(d: date, months: int) -> date:
    y, m = d.year, d.month + months
    while m > 12:
        m -= 12
        y += 1
    while m < 1:
        m += 12
        y -= 1
    day = d.day
    last = monthrange(y, m)[1]
    return date(y, m, min(day, last))


def iter_occurrence_dates(
    task: Task,
    range_start: date,
    range_end: date,
) -> Generator[date, None, None]:
    """
    Yield occurrence dates for a recurring task within [range_start, range_end].
    """
    if not task.is_recurring or not task.recurrence_type:
        return

    rtype = task.recurrence_type
    interval = max(1, task.recurrence_interval or 1)
    series_start = task.recurrence_start_date or (task.due_date or date.today())
    series_end = task.recurrence_end_date

    hard_end = range_end
    if series_end:
        hard_end = min(hard_end, series_end)

    if range_start > hard_end:
        return

    if rtype == "daily":
        cur = series_start
        while cur < range_start:
            cur += timedelta(days=interval)
        while cur <= hard_end:
            yield cur
            cur += timedelta(days=interval)

    elif rtype == "weekly":
        weekdays = _parse_repeat_days(task)
        if not weekdays:
            weekdays = {series_start.weekday()}
        first_monday = series_start - timedelta(days=series_start.weekday())
        anchor_week_index = (series_start - first_monday).days // 7
        d = max(range_start, series_start)
        while d <= hard_end:
            if d.weekday() in weekdays:
                week_index = (d - first_monday).days // 7
                if week_index >= anchor_week_index and (week_index - anchor_week_index) % interval == 0:
                    yield d
            d += timedelta(days=1)

    elif rtype == "monthly":
        day = task.monthly_day or series_start.day
        cur = _monthly_occurrence(series_start.year, series_start.month, day)
        while cur < series_start:
            cur = _add_months(cur, interval)
            cur = _monthly_occurrence(cur.year, cur.month, day)
        while cur <= hard_end:
            if cur >= range_start:
                yield cur
            cur = _add_months(cur, interval)
            cur = _monthly_occurrence(cur.year, cur.month, day)


def ensure_instances_for_task(
    session: Session,
    task: Task,
    horizon_days: int = 120,
    past_days: int = 7,
) -> int:
    """
    Insert missing TaskInstance rows from (today - past_days) through (today + horizon_days).
    Returns count of newly created rows.
    """
    if not task.is_recurring:
        return 0

    today = date.today()
    rs = today - timedelta(days=past_days)
    re = today + timedelta(days=horizon_days)

    created = 0
    for d in iter_occurrence_dates(task, rs, re):
        existing = session.exec(
            select(TaskInstance).where(
                TaskInstance.task_id == task.id,
                TaskInstance.instance_date == d,
            )
        ).first()
        if existing:
            continue
        inst = TaskInstance(
            task_id=task.id,
            instance_date=d,
            status=TaskInstanceStatus.todo,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        session.add(inst)
        created += 1
    if created:
        session.commit()
    return created


def materialize_all_recurring_tasks(session: Session, horizon_days: int = 120) -> int:
    """Ensure instances exist for every recurring task. For cron / admin."""
    stmt = select(Task).where(Task.is_recurring == True)  # noqa: E712
    tasks = session.exec(stmt).all()
    total = 0
    for t in tasks:
        total += ensure_instances_for_task(session, t, horizon_days=horizon_days)
    return total
