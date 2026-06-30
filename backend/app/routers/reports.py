"""
Reports & Analytics: auto-aggregated weekly/monthly workforce reports + CSV.
Everything is generated from live task/attendance/leave data (admin only).
"""
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Response
from sqlmodel import Session

from app.auth import get_current_admin_user
from app.database import get_session
from app.models import User
from app.services.report_service import build_report, to_csv

router = APIRouter(prefix="/reports", tags=["Reports"])


def _default_range(from_date: Optional[date], to_date: Optional[date]):
    end = to_date or date.today()
    start = from_date or (end - timedelta(days=6))
    return start, end


def _totals(rows):
    return {
        "employees": len(rows),
        "completed_tasks": sum(r["completed_tasks"] for r in rows),
        "pending_tasks": sum(r["pending_tasks"] for r in rows),
        "blocked_tasks": sum(r["blocked_tasks"] for r in rows),
        "hours_worked": round(sum(r["hours_worked"] for r in rows), 1),
        "leave_days": sum(r["leave_days"] for r in rows),
    }


@router.get("")
@router.get("/", include_in_schema=False)
async def get_report(
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    workspace_id: Optional[int] = None,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user),
):
    start, end = _default_range(from_date, to_date)
    rows = build_report(session, admin.organization_id, start, end, workspace_id)
    return {"from_date": start, "to_date": end, "workspace_id": workspace_id, "rows": rows, "totals": _totals(rows)}


@router.get("/weekly")
async def weekly_report(
    week_start: Optional[date] = None,
    workspace_id: Optional[int] = None,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user),
):
    if week_start is None:
        today = date.today()
        week_start = today - timedelta(days=today.weekday())  # Monday
    end = week_start + timedelta(days=6)
    rows = build_report(session, admin.organization_id, week_start, end, workspace_id)
    return {"from_date": week_start, "to_date": end, "workspace_id": workspace_id, "rows": rows, "totals": _totals(rows)}


@router.get("/monthly")
async def monthly_report(
    year: Optional[int] = None,
    month: Optional[int] = None,
    workspace_id: Optional[int] = None,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user),
):
    today = date.today()
    y = year or today.year
    m = month or today.month
    start = date(y, m, 1)
    end = date(y + (m // 12), (m % 12) + 1, 1) - timedelta(days=1)
    rows = build_report(session, admin.organization_id, start, end, workspace_id)
    return {"from_date": start, "to_date": end, "workspace_id": workspace_id, "rows": rows, "totals": _totals(rows)}


@router.get("/export")
async def export_csv(
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    workspace_id: Optional[int] = None,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user),
):
    start, end = _default_range(from_date, to_date)
    rows = build_report(session, admin.organization_id, start, end, workspace_id)
    csv_text = to_csv(rows)
    filename = f"workforce-report-{start}-to-{end}.csv"
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
