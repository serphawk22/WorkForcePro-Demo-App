"""
Auto-aggregated workforce reporting.

Builds per-employee summaries straight from live data (tasks, attendance,
leave, nodes) for any date range — no manual entry, no AI generation.
Powers the Weekly/Monthly reports and the CSV export.
"""
from datetime import date, datetime
from typing import List, Optional

from sqlmodel import Session, select

from app.models import (
    Attendance,
    LeaveRequest,
    LeaveStatus,
    Task,
    TaskStatus,
    User,
    UserRole,
)

_PENDING_STATUSES = {
    TaskStatus.todo,
    TaskStatus.in_progress,
    TaskStatus.submitted,
    TaskStatus.reviewing,
    TaskStatus.rejected,
}
_BLOCKED_STATUSES = {TaskStatus.rejected}


def _as_date(value) -> Optional[date]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    return value


def _in_range(value, start: date, end: date) -> bool:
    d = _as_date(value)
    return d is not None and start <= d <= end


def build_report(
    session: Session,
    organization_id: int,
    start: date,
    end: date,
    workspace_id: Optional[int] = None,
) -> List[dict]:
    """Return one aggregated row per employee for the [start, end] window."""
    users = session.exec(
        select(User).where(
            User.organization_id == organization_id,
            User.is_active == True,  # noqa: E712
        )
    ).all()

    rows: List[dict] = []
    for u in users:
        if u.role == UserRole.admin:
            continue

        task_stmt = select(Task).where(Task.assigned_to == u.id, Task.organization_id == organization_id)
        if workspace_id:
            task_stmt = task_stmt.where(Task.workspace_id == workspace_id)
        tasks = session.exec(task_stmt).all()

        completed = [
            t for t in tasks
            if t.status == TaskStatus.approved and _in_range(t.completed_at or t.updated_at, start, end)
        ]
        pending = [t for t in tasks if t.status in _PENDING_STATUSES]
        blocked = [t for t in tasks if t.status in _BLOCKED_STATUSES]
        active_nodes = {t.node_id for t in tasks if t.node_id}

        attendance = session.exec(
            select(Attendance).where(
                Attendance.user_id == u.id,
                Attendance.date >= start,
                Attendance.date <= end,
            )
        ).all()
        hours_worked = round(sum((a.total_hours or 0) for a in attendance), 1)
        days_present = len({a.date for a in attendance if a.total_hours})

        leaves = session.exec(
            select(LeaveRequest).where(
                LeaveRequest.user_id == u.id,
                LeaveRequest.status == LeaveStatus.approved,
            )
        ).all()
        leave_days = sum(
            (min(l.end_date, end) - max(l.start_date, start)).days + 1
            for l in leaves
            if not (l.end_date < start or l.start_date > end)
        )

        rows.append({
            "user_id": u.id,
            "employee": u.name,
            "email": u.email,
            "department": u.department or "",
            "completed_tasks": len(completed),
            "pending_tasks": len(pending),
            "blocked_tasks": len(blocked),
            "projects_worked_on": len(active_nodes),
            "hours_worked": hours_worked,
            "days_present": days_present,
            "leave_days": max(0, leave_days),
        })

    rows.sort(key=lambda r: r["completed_tasks"], reverse=True)
    return rows


CSV_COLUMNS = [
    ("employee", "Employee"),
    ("email", "Email"),
    ("department", "Department"),
    ("completed_tasks", "Completed Tasks"),
    ("pending_tasks", "Pending Tasks"),
    ("blocked_tasks", "Blocked Tasks"),
    ("projects_worked_on", "Projects Worked On"),
    ("hours_worked", "Hours Worked"),
    ("days_present", "Days Present"),
    ("leave_days", "Leave Days"),
]


def to_csv(rows: List[dict]) -> str:
    import csv
    import io

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([label for _, label in CSV_COLUMNS])
    for r in rows:
        writer.writerow([r.get(key, "") for key, _ in CSV_COLUMNS])
    return buf.getvalue()
