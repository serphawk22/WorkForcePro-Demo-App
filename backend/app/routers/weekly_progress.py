"""
Weekly progress submissions (employee) and admin review/comments.
"""
from datetime import date, datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from app.models import (
    User,
    UserRole,
    Organization,
    WeeklyProgress,
    WeeklyComment,
    WeeklyProgressCreate,
    WeeklyProgressUpdate,
    WeeklyCommentCreate,
    WeeklyProgressRead,
    WeeklyCommentRead,
    NotificationType,
)
from app.auth import get_current_user, get_current_admin_user
from app.routers.notifications import create_notification

router = APIRouter(prefix="/weekly-progress", tags=["Weekly Progress"])


def monday_of_week(d: date) -> date:
    """Return the Monday of the calendar week containing d."""
    return d - timedelta(days=d.weekday())


def _validate_http_url(url: Optional[str], field: str) -> None:
    if url is None or (isinstance(url, str) and not url.strip()):
        return
    u = url.strip()
    if not (u.startswith("http://") or u.startswith("https://")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field} must start with http:// or https://",
        )


def _comments_unread(progress: WeeklyProgress, session: Session) -> bool:
    stmt = select(WeeklyComment).where(WeeklyComment.weekly_progress_id == progress.id)
    comments = session.exec(stmt).all()
    if not comments:
        return False
    latest = max(c.created_at for c in comments)
    if progress.last_seen_comments_at is None:
        return True
    return latest > progress.last_seen_comments_at


def _assert_weekly_progress_enabled_for_user(session: Session, current_user: User) -> None:
    org = session.exec(select(Organization).where(Organization.id == current_user.organization_id)).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    if current_user.role == UserRole.admin and not org.weekly_progress_enabled_for_admin:
        raise HTTPException(status_code=403, detail="Weekly progress is disabled for admins by organization settings")
    if current_user.role == UserRole.employee and not org.weekly_progress_enabled_for_employee:
        raise HTTPException(status_code=403, detail="Weekly progress is disabled for employees by organization settings")


def _to_read(
    progress: WeeklyProgress,
    session: Session,
    include_comments: bool = True,
    employee_name: Optional[str] = None,
    employee_email: Optional[str] = None,
) -> WeeklyProgressRead:
    comments_list: List[WeeklyCommentRead] = []
    if include_comments:
        c_stmt = (
            select(WeeklyComment)
            .where(WeeklyComment.weekly_progress_id == progress.id)
            .order_by(WeeklyComment.created_at.asc())
        )
        for c in session.exec(c_stmt).all():
            admin = session.exec(select(User).where(User.id == c.admin_id)).first()
            comments_list.append(
                WeeklyCommentRead(
                    id=c.id,
                    weekly_progress_id=c.weekly_progress_id,
                    admin_id=c.admin_id,
                    comment=c.comment,
                    created_at=c.created_at,
                    admin_name=admin.name if admin else None,
                )
            )
    return WeeklyProgressRead(
        id=progress.id,
        user_id=progress.user_id,
        week_start_date=progress.week_start_date,
        description=progress.description,
        github_link=progress.github_link,
        deployed_link=progress.deployed_link,
        last_seen_comments_at=progress.last_seen_comments_at,
        created_at=progress.created_at,
        updated_at=progress.updated_at,
        comments=comments_list,
        has_unread_comments=_comments_unread(progress, session),
        employee_name=employee_name,
        employee_email=employee_email,
    )


# --- Employee ---


@router.get("/me", response_model=List[WeeklyProgressRead])
async def list_my_weekly_progress(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """All weekly entries for the current employee, newest first."""
    _assert_weekly_progress_enabled_for_user(session, current_user)
    stmt = (
        select(WeeklyProgress)
        .where(
            WeeklyProgress.user_id == current_user.id,
            WeeklyProgress.organization_id == current_user.organization_id,
        )
        .order_by(WeeklyProgress.week_start_date.desc())
    )
    rows = session.exec(stmt).all()
    return [_to_read(p, session) for p in rows]


@router.post("/me", response_model=WeeklyProgressRead, status_code=status.HTTP_201_CREATED)
async def create_or_replace_my_weekly_progress(
    body: WeeklyProgressCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create or replace the entry for this employee for the given week (one per week)."""
    _assert_weekly_progress_enabled_for_user(session, current_user)

    week_start = monday_of_week(body.week_start_date)
    _validate_http_url(body.github_link, "GitHub link")
    _validate_http_url(body.deployed_link, "Deployed link")

    existing = session.exec(
        select(WeeklyProgress).where(
            WeeklyProgress.user_id == current_user.id,
            WeeklyProgress.week_start_date == week_start,
            WeeklyProgress.organization_id == current_user.organization_id,
        )
    ).first()

    now = datetime.now(timezone.utc)
    if existing:
        existing.description = body.description
        existing.github_link = body.github_link.strip() if body.github_link else None
        existing.deployed_link = body.deployed_link.strip() if body.deployed_link else None
        existing.updated_at = now
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return _to_read(existing, session)

    row = WeeklyProgress(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        week_start_date=week_start,
        description=body.description,
        github_link=body.github_link.strip() if body.github_link else None,
        deployed_link=body.deployed_link.strip() if body.deployed_link else None,
        created_at=now,
        updated_at=now,
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return _to_read(row, session)


@router.put("/me/{entry_id}", response_model=WeeklyProgressRead)
async def update_my_weekly_progress(
    entry_id: int,
    body: WeeklyProgressUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update own entry (same week rules: must be owner)."""
    _assert_weekly_progress_enabled_for_user(session, current_user)
    row = session.exec(
        select(WeeklyProgress).where(
            WeeklyProgress.id == entry_id,
            WeeklyProgress.organization_id == current_user.organization_id,
        )
    ).first()
    if not row or row.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Entry not found")

    data = body.model_dump(exclude_unset=True)
    if "github_link" in data:
        _validate_http_url(data.get("github_link"), "GitHub link")
        row.github_link = data["github_link"].strip() if data.get("github_link") else None
        data.pop("github_link", None)
    if "deployed_link" in data:
        _validate_http_url(data.get("deployed_link"), "Deployed link")
        row.deployed_link = data["deployed_link"].strip() if data.get("deployed_link") else None
        data.pop("deployed_link", None)
    if "description" in data and data["description"] is not None:
        row.description = data["description"]

    row.updated_at = datetime.now(timezone.utc)
    session.add(row)
    session.commit()
    session.refresh(row)
    return _to_read(row, session)


@router.patch("/me/{entry_id}/seen-comments", response_model=WeeklyProgressRead)
async def mark_comments_seen(
    entry_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    _assert_weekly_progress_enabled_for_user(session, current_user)
    row = session.exec(
        select(WeeklyProgress).where(
            WeeklyProgress.id == entry_id,
            WeeklyProgress.organization_id == current_user.organization_id,
        )
    ).first()
    if not row or row.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Entry not found")
    row.last_seen_comments_at = datetime.now(timezone.utc)
    session.add(row)
    session.commit()
    session.refresh(row)
    return _to_read(row, session)


# --- Admin ---


@router.get("/admin", response_model=List[WeeklyProgressRead])
async def admin_list_weekly_progress(
    week_start: Optional[date] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    employee_id: Optional[int] = None,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user),
):
    """All entries, optional filters by week, date range, or employee."""
    stmt = select(WeeklyProgress).where(WeeklyProgress.organization_id == admin.organization_id)
    if week_start:
        mon = monday_of_week(week_start)
        stmt = stmt.where(WeeklyProgress.week_start_date == mon)
    if start_date:
        stmt = stmt.where(WeeklyProgress.week_start_date >= monday_of_week(start_date))
    if end_date:
        stmt = stmt.where(WeeklyProgress.week_start_date <= monday_of_week(end_date))
    if employee_id is not None:
        stmt = stmt.where(WeeklyProgress.user_id == employee_id)
    stmt = stmt.order_by(WeeklyProgress.week_start_date.desc(), WeeklyProgress.user_id.asc())
    rows = session.exec(stmt).all()
    out: List[WeeklyProgressRead] = []
    for p in rows:
        emp = session.exec(
            select(User).where(
                User.id == p.user_id,
                User.organization_id == admin.organization_id,
            )
        ).first()
        out.append(
            _to_read(
                p,
                session,
                employee_name=emp.name if emp else None,
                employee_email=emp.email if emp else None,
            )
        )
    return out


@router.get("/admin/employee/{user_id}", response_model=List[WeeklyProgressRead])
async def admin_list_employee_history(
    user_id: int,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user),
):
    emp = session.exec(
        select(User).where(
            User.id == user_id,
            User.organization_id == admin.organization_id,
        )
    ).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    stmt = (
        select(WeeklyProgress)
        .where(
            WeeklyProgress.user_id == user_id,
            WeeklyProgress.organization_id == admin.organization_id,
        )
        .order_by(WeeklyProgress.week_start_date.desc())
    )
    rows = session.exec(stmt).all()
    return [
        _to_read(
            p,
            session,
            employee_name=emp.name,
            employee_email=emp.email,
        )
        for p in rows
    ]


@router.post("/admin/{entry_id}/comments", response_model=WeeklyCommentRead, status_code=status.HTTP_201_CREATED)
async def admin_add_comment(
    entry_id: int,
    body: WeeklyCommentCreate,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user),
):
    row = session.exec(
        select(WeeklyProgress).where(
            WeeklyProgress.id == entry_id,
            WeeklyProgress.organization_id == admin.organization_id,
        )
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Weekly entry not found")

    comment = WeeklyComment(
        weekly_progress_id=row.id,
        admin_id=admin.id,
        comment=body.comment.strip(),
    )
    session.add(comment)
    session.commit()
    session.refresh(comment)

    preview = body.comment.strip()[:120] + ("…" if len(body.comment.strip()) > 120 else "")
    create_notification(
        session=session,
        user_id=row.user_id,
        type=NotificationType.WEEKLY_PROGRESS_COMMENT,
        message=f"{admin.name} commented on your week of {row.week_start_date}: {preview}",
        weekly_progress_id=row.id,
    )

    return WeeklyCommentRead(
        id=comment.id,
        weekly_progress_id=comment.weekly_progress_id,
        admin_id=comment.admin_id,
        comment=comment.comment,
        created_at=comment.created_at,
        admin_name=admin.name,
    )


@router.post("/me/{entry_id}/comments", response_model=WeeklyCommentRead, status_code=status.HTTP_201_CREATED)
async def employee_add_comment(
    entry_id: int,
    body: WeeklyCommentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Allow employees to add comments on their own weekly entry for two-way discussion."""
    _assert_weekly_progress_enabled_for_user(session, current_user)
    row = session.exec(
        select(WeeklyProgress).where(
            WeeklyProgress.id == entry_id,
            WeeklyProgress.organization_id == current_user.organization_id,
        )
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Weekly entry not found")
    if current_user.role != UserRole.employee:
        raise HTTPException(status_code=403, detail="Only employees can use this endpoint")
    if row.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only comment on your own weekly entry")

    comment = WeeklyComment(
        weekly_progress_id=row.id,
        admin_id=current_user.id,
        comment=body.comment.strip(),
    )
    session.add(comment)
    session.commit()
    session.refresh(comment)

    preview = body.comment.strip()[:120] + ("…" if len(body.comment.strip()) > 120 else "")
    admins = session.exec(
        select(User).where(
            User.role == UserRole.admin,
            User.organization_id == current_user.organization_id,
        )
    ).all()
    for admin in admins:
        create_notification(
            session=session,
            user_id=admin.id,
            type=NotificationType.WEEKLY_PROGRESS_COMMENT,
            message=f"{current_user.name} commented on week of {row.week_start_date}: {preview}",
            weekly_progress_id=row.id,
        )

    return WeeklyCommentRead(
        id=comment.id,
        weekly_progress_id=comment.weekly_progress_id,
        admin_id=comment.admin_id,
        comment=comment.comment,
        created_at=comment.created_at,
        admin_name=current_user.name,
    )
