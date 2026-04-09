from typing import List
from datetime import date as DateType, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlmodel import Session, select
from sqlalchemy import and_

from app.database import get_session
from app.models import (
    User,
    TaskSheet,
    TaskSheetCreate,
    TaskSheetRead,
    TaskSheetWithUser,
    HappySheet,
    HappySheetCreate,
    HappySheetRead,
    HappySheetWithUser,
    HappySheetReaction,
    HappySheetReactionToggle,
    HappySheetReactionSummary,
    HappySheetComment,
    HappySheetCommentCreate,
    HappySheetCommentRead,
    HappySheetAppreciation,
    HappySheetAppreciationCreate,
    HappySheetAppreciationRead,
    HappySheetStreak,
    HappySheetStreakRead,
    HappySheetWeeklyHighlight,
    HappySheetLeaderboardItem,
    HappySheetAiInsights,
    DailyHappySheetReportRow,
    DailyTaskSheetReportRow,
    WeeklyProgressReportRow,
    WeeklyProgress,
    DreamProject,
    DreamProjectCreate,
    DreamProjectWithUser,
    LearningFocus,
    LearningFocusCreate,
    LearningFocusWithUser,
    PersonalProject,
    PersonalProjectCreate,
    PersonalProjectRead,
)
from app.auth import get_current_user, get_current_admin_user

router = APIRouter(prefix="/my-space", tags=["My Space"])


def _recompute_user_streak(session: Session, user_id: int) -> HappySheetStreak:
    dates = session.exec(
        select(HappySheet.date)
        .where(HappySheet.user_id == user_id)
        .order_by(HappySheet.date.desc())
    ).all()
    unique_dates = sorted(set(dates), reverse=True)
    date_set = set(unique_dates)

    today = DateType.today()
    yesterday = today - timedelta(days=1)

    current_streak = 0
    start = today if today in date_set else (yesterday if yesterday in date_set else None)
    if start:
        cursor = start
        while cursor in date_set:
            current_streak += 1
            cursor = cursor - timedelta(days=1)

    longest_streak = 0
    if unique_dates:
        asc = sorted(unique_dates)
        run = 1
        longest_streak = 1
        for i in range(1, len(asc)):
            if asc[i] == asc[i - 1] + timedelta(days=1):
                run += 1
            else:
                run = 1
            if run > longest_streak:
                longest_streak = run

    streak = session.get(HappySheetStreak, user_id)
    if not streak:
        streak = HappySheetStreak(user_id=user_id)

    streak.current_streak = current_streak
    streak.longest_streak = longest_streak
    streak.last_entry_date = unique_dates[0] if unique_dates else None
    session.add(streak)
    session.commit()
    session.refresh(streak)
    return streak

# ==================== TASK SHEET ROUTES ====================

@router.post("/task-sheet", response_model=TaskSheetWithUser, status_code=status.HTTP_200_OK)
async def create_task_sheet(
    sheet_data: TaskSheetCreate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Submit or update a task sheet for the given date (upsert). Defaults to today."""
    target_date = sheet_data.date if sheet_data.date else DateType.today()
    existing = session.exec(
        select(TaskSheet).where(TaskSheet.user_id == current_user.id, TaskSheet.date == target_date)
    ).first()
    if existing:
        existing.achievements = sheet_data.achievements
        existing.repo_link = sheet_data.repo_link
        session.add(existing)
        session.commit()
        session.refresh(existing)
        # Fetch user information
        user = session.get(User, current_user.id)
        return TaskSheetWithUser(
            **existing.model_dump(),
            user_name=user.name,
            user_email=user.email,
            profile_picture=user.profile_picture
        )
    task_sheet = TaskSheet(
        user_id=current_user.id,
        date=target_date,
        achievements=sheet_data.achievements,
        repo_link=sheet_data.repo_link,
    )
    session.add(task_sheet)
    session.commit()
    session.refresh(task_sheet)
    # Fetch user information
    user = session.get(User, current_user.id)
    return TaskSheetWithUser(
        **task_sheet.model_dump(),
        user_name=user.name,
        user_email=user.email,
        profile_picture=user.profile_picture
    )


@router.get("/task-sheet/me", response_model=List[TaskSheetWithUser])
async def get_my_task_sheets(
    limit: int = 30,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get the current user's task sheets with user information."""
    stmt = (
        select(TaskSheet, User)
        .join(User)
        .where(TaskSheet.user_id == current_user.id)
        .order_by(TaskSheet.date.desc())
        .limit(limit)
    )
    results = session.exec(stmt).all()
    return [
        TaskSheetWithUser(
            **sheet.model_dump(),
            user_name=user.name,
            user_email=user.email,
            profile_picture=user.profile_picture
        )
        for sheet, user in results
    ]


@router.put("/task-sheet/{entry_id}", response_model=TaskSheetWithUser)
async def update_task_sheet_entry(
    entry_id: int,
    sheet_data: TaskSheetCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    entry = session.get(TaskSheet, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Task sheet entry not found")
    if entry.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this entry")

    target_date = sheet_data.date if sheet_data.date else entry.date
    duplicate = session.exec(
        select(TaskSheet).where(
            TaskSheet.user_id == current_user.id,
            TaskSheet.date == target_date,
            TaskSheet.id != entry_id,
        )
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="Task sheet already exists for this date")

    entry.date = target_date
    entry.achievements = sheet_data.achievements
    entry.repo_link = sheet_data.repo_link
    session.add(entry)
    session.commit()
    session.refresh(entry)
    # Fetch user information
    user = session.get(User, current_user.id)
    return TaskSheetWithUser(
        **entry.model_dump(),
        user_name=user.name,
        user_email=user.email,
        profile_picture=user.profile_picture
    )


@router.delete("/task-sheet/{entry_id}")
async def delete_task_sheet_entry(
    entry_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    entry = session.get(TaskSheet, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Task sheet entry not found")
    if entry.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this entry")

    session.delete(entry)
    session.commit()
    return {"message": "Task sheet entry deleted"}


@router.get("/task-sheet/all", response_model=List[TaskSheetWithUser])
async def get_all_task_sheets(
    limit: int = 50,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user),
):
    """Get all task sheets (admin only)."""
    results = session.exec(
        select(TaskSheet, User).join(User).order_by(TaskSheet.date.desc()).limit(limit)
    ).all()
    return [
        TaskSheetWithUser(**sheet.model_dump(), user_name=user.name, user_email=user.email)
        for sheet, user in results
    ]


# ==================== HAPPY SHEET ROUTES ====================

@router.post("/happy-sheet", response_model=HappySheetRead, status_code=status.HTTP_200_OK)
async def create_happy_sheet(
    sheet_data: HappySheetCreate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Submit or update a happy sheet for the given date (upsert). Defaults to today."""
    try:
        target_date = sheet_data.date if sheet_data.date else DateType.today()
        existing = session.exec(
            select(HappySheet).where(HappySheet.user_id == current_user.id, HappySheet.date == target_date)
        ).first()
        if existing:
            existing.what_made_you_happy = sheet_data.what_made_you_happy
            existing.what_made_others_happy = sheet_data.what_made_others_happy
            existing.goals_without_greed = sheet_data.goals_without_greed
            existing.dreams_supported = sheet_data.dreams_supported
            existing.goals_without_greed_impossible = sheet_data.goals_without_greed_impossible
            session.add(existing)
            session.commit()
            session.refresh(existing)
            _recompute_user_streak(session, current_user.id)
            return existing
        happy_sheet = HappySheet(
            user_id=current_user.id,
            date=target_date,
            what_made_you_happy=sheet_data.what_made_you_happy,
            what_made_others_happy=sheet_data.what_made_others_happy,
            goals_without_greed=sheet_data.goals_without_greed,
            dreams_supported=sheet_data.dreams_supported,
            goals_without_greed_impossible=sheet_data.goals_without_greed_impossible,
        )
        session.add(happy_sheet)
        session.commit()
        session.refresh(happy_sheet)
        _recompute_user_streak(session, current_user.id)
        return happy_sheet
    except Exception as e:
        print(f"[ERROR] Happy Sheet POST failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save happy sheet: {str(e)}")


@router.get("/happy-sheet/me", response_model=List[HappySheetRead])
async def get_my_happy_sheets(
    limit: int = 30,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get the current user's happy sheets."""
    stmt = (
        select(HappySheet)
        .where(HappySheet.user_id == current_user.id)
        .order_by(HappySheet.date.desc())
        .limit(limit)
    )
    return session.exec(stmt).all()


@router.put("/happy-sheet/{entry_id}", response_model=HappySheetRead)
async def update_happy_sheet_entry(
    entry_id: int,
    sheet_data: HappySheetCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    entry = session.get(HappySheet, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Happy sheet entry not found")
    if entry.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this entry")

    target_date = sheet_data.date if sheet_data.date else entry.date
    duplicate = session.exec(
        select(HappySheet).where(
            HappySheet.user_id == current_user.id,
            HappySheet.date == target_date,
            HappySheet.id != entry_id,
        )
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="Happy sheet already exists for this date")

    entry.date = target_date
    entry.what_made_you_happy = sheet_data.what_made_you_happy
    entry.what_made_others_happy = sheet_data.what_made_others_happy
    entry.goals_without_greed = sheet_data.goals_without_greed
    entry.dreams_supported = sheet_data.dreams_supported
    entry.goals_without_greed_impossible = sheet_data.goals_without_greed_impossible
    session.add(entry)
    session.commit()
    session.refresh(entry)
    _recompute_user_streak(session, current_user.id)
    return entry


@router.delete("/happy-sheet/{entry_id}")
async def delete_happy_sheet_entry(
    entry_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    entry = session.get(HappySheet, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Happy sheet entry not found")
    if entry.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this entry")

    session.delete(entry)
    session.commit()
    _recompute_user_streak(session, current_user.id)
    return {"message": "Happy sheet entry deleted"}


@router.get("/happy-sheet/team/by-date", response_model=List[HappySheetWithUser])
async def get_team_happy_sheets_by_date(
    date: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get all team happy sheet entries for a specific date."""
    try:
        target_date = DateType.fromisoformat(date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
    results = session.exec(
        select(HappySheet, User).join(User)
        .where(HappySheet.date == target_date)
        .order_by(HappySheet.created_at.desc())
    ).all()
    return [
        HappySheetWithUser(**sheet.model_dump(), user_name=user.name, user_email=user.email)
        for sheet, user in results
    ]


@router.get("/happy-sheet/team", response_model=List[HappySheetWithUser])
async def get_team_happy_sheets(
    limit: int = 100,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get the latest happy sheet entry per user (visible to all authenticated users)."""
    results = session.exec(
        select(HappySheet, User).join(User).order_by(HappySheet.date.desc()).limit(limit)
    ).all()
    # Return latest entry per user
    seen: set[int] = set()
    latest_per_user = []
    for sheet, user in results:
        if user.id not in seen:
            seen.add(user.id)
            entry = sheet.model_dump()
            entry["user_name"] = user.name
            entry["user_email"] = user.email
            latest_per_user.append(HappySheetWithUser(**entry))
    return latest_per_user


@router.get("/happy-sheet/all", response_model=List[HappySheetWithUser])
async def get_all_happy_sheets(
    limit: int = 50,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get all happy sheets (admin only)."""
    results = session.exec(
        select(HappySheet, User).join(User).order_by(HappySheet.date.desc()).limit(limit)
    ).all()
    return [
        HappySheetWithUser(**sheet.model_dump(), user_name=user.name, user_email=user.email)
        for sheet, user in results
    ]


@router.get("/happy-sheet/admin/daily-report", response_model=List[DailyHappySheetReportRow])
async def get_daily_happy_sheet_report(
    date: str,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user),
):
    """Get all employees with their happy sheet entry for the selected date (admin only)."""
    try:
        target_date = DateType.fromisoformat(date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    results = session.exec(
        select(User, HappySheet)
        .outerjoin(
            HappySheet,
            and_(HappySheet.user_id == User.id, HappySheet.date == target_date),
        )
        .order_by(User.name.asc())
    ).all()

    return [
        DailyHappySheetReportRow(
            user_id=user.id,
            user_name=user.name,
            user_email=user.email,
            date=target_date,
            what_made_you_happy=sheet.what_made_you_happy if sheet else None,
            what_made_others_happy=sheet.what_made_others_happy if sheet else None,
            goals_without_greed=sheet.goals_without_greed if sheet else None,
            dreams_supported=sheet.dreams_supported if sheet else None,
            goals_without_greed_impossible=sheet.goals_without_greed_impossible if sheet else None,
        )
        for user, sheet in results
    ]


@router.get("/happy-sheet/entry/{entry_id}/reactions", response_model=List[HappySheetReactionSummary])
async def get_happy_sheet_reactions(
    entry_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    entry = session.get(HappySheet, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Happy Sheet entry not found")

    rows = session.exec(
        select(HappySheetReaction, User)
        .join(User, User.id == HappySheetReaction.user_id)
        .where(HappySheetReaction.entry_id == entry_id)
        .order_by(HappySheetReaction.created_at.asc())
    ).all()

    grouped: dict[str, dict] = {}
    for reaction, user in rows:
        bucket = grouped.setdefault(
            reaction.emoji,
            {"emoji": reaction.emoji, "count": 0, "users": [], "reacted_by_me": False},
        )
        bucket["count"] += 1
        bucket["users"].append(user.name or user.email)
        if reaction.user_id == current_user.id:
            bucket["reacted_by_me"] = True

    result = [HappySheetReactionSummary(**data) for data in grouped.values()]
    result.sort(key=lambda r: (-r.count, r.emoji))
    return result


@router.post("/happy-sheet/entry/{entry_id}/reactions")
async def toggle_happy_sheet_reaction(
    entry_id: int,
    payload: HappySheetReactionToggle,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    entry = session.get(HappySheet, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Happy Sheet entry not found")

    emoji = (payload.emoji or "").strip()
    if not emoji:
        raise HTTPException(status_code=400, detail="Emoji is required")

    existing = session.exec(
        select(HappySheetReaction).where(
            HappySheetReaction.entry_id == entry_id,
            HappySheetReaction.user_id == current_user.id,
            HappySheetReaction.emoji == emoji,
        )
    ).first()

    if existing:
        session.delete(existing)
        session.commit()
        return {"active": False}

    reaction = HappySheetReaction(entry_id=entry_id, user_id=current_user.id, emoji=emoji)
    session.add(reaction)
    session.commit()
    return {"active": True}


@router.get("/happy-sheet/entry/{entry_id}/comments", response_model=List[HappySheetCommentRead])
async def get_happy_sheet_comments(
    entry_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    entry = session.get(HappySheet, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Happy Sheet entry not found")

    rows = session.exec(
        select(HappySheetComment, User)
        .join(User, User.id == HappySheetComment.user_id)
        .where(HappySheetComment.entry_id == entry_id)
        .order_by(HappySheetComment.created_at.asc())
    ).all()

    return [
        HappySheetCommentRead(
            **comment.model_dump(),
            user_name=user.name,
            user_email=user.email,
            profile_picture=user.profile_picture,
        )
        for comment, user in rows
    ]


@router.post("/happy-sheet/entry/{entry_id}/comments", response_model=HappySheetCommentRead, status_code=status.HTTP_201_CREATED)
async def add_happy_sheet_comment(
    entry_id: int,
    payload: HappySheetCommentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    entry = session.get(HappySheet, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Happy Sheet entry not found")

    text = (payload.comment_text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Comment text is required")

    if payload.parent_comment_id:
        parent = session.get(HappySheetComment, payload.parent_comment_id)
        if not parent or parent.entry_id != entry_id:
            raise HTTPException(status_code=400, detail="Invalid parent comment")

    comment = HappySheetComment(
        entry_id=entry_id,
        user_id=current_user.id,
        comment_text=text,
        parent_comment_id=payload.parent_comment_id,
    )
    session.add(comment)
    session.commit()
    session.refresh(comment)

    return HappySheetCommentRead(
        **comment.model_dump(),
        user_name=current_user.name,
        user_email=current_user.email,
        profile_picture=current_user.profile_picture,
    )


@router.get("/happy-sheet/entry/{entry_id}/appreciations", response_model=List[HappySheetAppreciationRead])
async def get_happy_sheet_appreciations(
    entry_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    entry = session.get(HappySheet, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Happy Sheet entry not found")

    rows = session.exec(
        select(HappySheetAppreciation, User)
        .join(User, User.id == HappySheetAppreciation.from_user_id)
        .where(HappySheetAppreciation.entry_id == entry_id)
        .order_by(HappySheetAppreciation.created_at.desc())
    ).all()

    return [
        HappySheetAppreciationRead(
            **app.model_dump(),
            from_user_name=user.name,
            from_user_email=user.email,
        )
        for app, user in rows
    ]


@router.post("/happy-sheet/entry/{entry_id}/appreciations", response_model=HappySheetAppreciationRead, status_code=status.HTTP_201_CREATED)
async def upsert_happy_sheet_appreciation(
    entry_id: int,
    payload: HappySheetAppreciationCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    entry = session.get(HappySheet, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Happy Sheet entry not found")

    text = (payload.message or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Appreciation message is required")

    existing = session.exec(
        select(HappySheetAppreciation).where(
            HappySheetAppreciation.entry_id == entry_id,
            HappySheetAppreciation.from_user_id == current_user.id,
        )
    ).first()

    if existing:
        existing.message = text
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return HappySheetAppreciationRead(
            **existing.model_dump(),
            from_user_name=current_user.name,
            from_user_email=current_user.email,
        )

    app = HappySheetAppreciation(entry_id=entry_id, from_user_id=current_user.id, message=text)
    session.add(app)
    session.commit()
    session.refresh(app)
    return HappySheetAppreciationRead(
        **app.model_dump(),
        from_user_name=current_user.name,
        from_user_email=current_user.email,
    )


@router.get("/happy-sheet/streaks", response_model=List[HappySheetStreakRead])
async def get_happy_sheet_streaks(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    rows = session.exec(
        select(HappySheetStreak, User)
        .join(User, User.id == HappySheetStreak.user_id)
        .order_by(HappySheetStreak.current_streak.desc())
    ).all()
    return [
        HappySheetStreakRead(
            **streak.model_dump(),
            user_name=user.name,
        )
        for streak, user in rows
    ]


@router.get("/happy-sheet/weekly/highlights", response_model=List[HappySheetWeeklyHighlight])
async def get_happy_sheet_weekly_highlights(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    today = DateType.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    entries = session.exec(
        select(HappySheet, User)
        .join(User, User.id == HappySheet.user_id)
        .where(HappySheet.date >= week_start, HappySheet.date <= week_end)
    ).all()

    entry_ids = [entry.id for entry, _ in entries]
    if not entry_ids:
        return []

    apps = session.exec(
        select(HappySheetAppreciation)
        .where(HappySheetAppreciation.entry_id.in_(entry_ids))
    ).all()

    counts: dict[int, int] = {}
    for app in apps:
        counts[app.entry_id] = counts.get(app.entry_id, 0) + 1

    highlights = []
    for entry, user in entries:
        highlights.append(
            HappySheetWeeklyHighlight(
                entry_id=entry.id,
                user_id=user.id,
                user_name=user.name,
                date=entry.date,
                excerpt=(entry.what_made_you_happy or "")[:120],
                appreciation_count=counts.get(entry.id, 0),
            )
        )

    highlights.sort(key=lambda h: (-h.appreciation_count, h.date), reverse=False)
    return highlights[:3]


@router.get("/happy-sheet/weekly/leaderboard", response_model=List[HappySheetLeaderboardItem])
async def get_happy_sheet_weekly_leaderboard(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    today = DateType.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    entries = session.exec(
        select(HappySheet)
        .where(HappySheet.date >= week_start, HappySheet.date <= week_end)
    ).all()
    if not entries:
        return []

    entry_owner = {entry.id: entry.user_id for entry in entries}
    apps = session.exec(
        select(HappySheetAppreciation)
        .where(HappySheetAppreciation.entry_id.in_(list(entry_owner.keys())))
    ).all()

    counts: dict[int, int] = {}
    for app in apps:
        owner_id = entry_owner.get(app.entry_id)
        if owner_id:
            counts[owner_id] = counts.get(owner_id, 0) + 1

    if not counts:
        return []

    users = session.exec(select(User).where(User.id.in_(list(counts.keys())))).all()
    user_names = {u.id: u.name for u in users}
    rows = [
        HappySheetLeaderboardItem(
            user_id=user_id,
            user_name=user_names.get(user_id, f"User #{user_id}"),
            appreciation_count=count,
        )
        for user_id, count in counts.items()
    ]
    rows.sort(key=lambda r: (-r.appreciation_count, r.user_name.lower()))
    return rows[:3]


@router.get("/happy-sheet/weekly/ai-insights", response_model=HappySheetAiInsights)
async def get_happy_sheet_weekly_ai_insights(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    today = DateType.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    entries = session.exec(
        select(HappySheet)
        .where(HappySheet.date >= week_start, HappySheet.date <= week_end)
    ).all()

    text = " ".join([
        f"{e.what_made_you_happy} {e.what_made_others_happy} {e.goals_without_greed} {e.dreams_supported} {e.goals_without_greed_impossible}"
        for e in entries
    ]).lower()

    positive_words = ["happy", "great", "help", "thanks", "good", "support", "learn", "team", "collaborat", "positive"]
    negative_words = ["stress", "blocked", "sad", "delay", "issue", "problem", "difficult"]
    pos = sum(text.count(w) for w in positive_words)
    neg = sum(text.count(w) for w in negative_words)

    sentiment = "Positive" if pos >= neg else "Needs Attention"

    themes = []
    if any(k in text for k in ["team", "collaborat", "help", "support"]):
        themes.append("teamwork")
    if any(k in text for k in ["learn", "training", "study", "mentor"]):
        themes.append("learning")
    if any(k in text for k in ["onboard", "intern", "new member"]):
        themes.append("onboarding")
    if not themes:
        themes.append("general positivity")

    bullets = [
        f"Team sentiment this week is {sentiment.lower()}.",
        f"Most common themes: {', '.join(themes)}.",
        "Strong collaboration signals detected." if "teamwork" in themes else "Keep encouraging peer recognition and support.",
    ]

    return HappySheetAiInsights(sentiment=sentiment, themes=themes, bullets=bullets)


# ==================== VISIONARY CANVAS ROUTES ====================

@router.post("/dream-project", response_model=DreamProjectWithUser, status_code=status.HTTP_201_CREATED)
async def create_dream_project(
    data: DreamProjectCreate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Submit a dream project aspiration."""
    project = DreamProject(user_id=current_user.id, description=data.description)
    session.add(project)
    session.commit()
    session.refresh(project)
    return DreamProjectWithUser(
        **project.model_dump(),
        user_name=current_user.name,
        user_email=current_user.email,
        profile_picture=current_user.profile_picture,
    )


@router.get("/dream-project/all", response_model=List[DreamProjectWithUser])
async def get_all_dream_projects(
    limit: int = 50,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get all team dream projects (any authenticated user)."""
    results = session.exec(
        select(DreamProject, User).join(User).order_by(DreamProject.created_at.desc()).limit(limit)
    ).all()
    return [
        DreamProjectWithUser(
            **proj.model_dump(),
            user_name=user.name,
            user_email=user.email,
            profile_picture=user.profile_picture,
        )
        for proj, user in results
    ]


@router.put("/dream-project/{entry_id}", response_model=DreamProjectWithUser)
async def update_dream_project(
    entry_id: int,
    data: DreamProjectCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    project = session.get(DreamProject, entry_id)
    if not project:
        raise HTTPException(status_code=404, detail="Dream project entry not found")
    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this entry")

    project.description = data.description
    session.add(project)
    session.commit()
    session.refresh(project)
    return DreamProjectWithUser(
        **project.model_dump(),
        user_name=current_user.name,
        user_email=current_user.email,
        profile_picture=current_user.profile_picture,
    )


@router.delete("/dream-project/{entry_id}")
async def delete_dream_project(
    entry_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    project = session.get(DreamProject, entry_id)
    if not project:
        raise HTTPException(status_code=404, detail="Dream project entry not found")
    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this entry")

    session.delete(project)
    session.commit()
    return {"message": "Dream project entry deleted"}


# ==================== LEARNING CANVAS ROUTES ====================

@router.post("/learning-focus", response_model=LearningFocusWithUser, status_code=status.HTTP_201_CREATED)
async def create_learning_focus(
    data: LearningFocusCreate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Submit what the user is currently learning."""
    focus = LearningFocus(user_id=current_user.id, focus=data.focus)
    session.add(focus)
    session.commit()
    session.refresh(focus)
    return LearningFocusWithUser(
        **focus.model_dump(),
        user_name=current_user.name,
        user_email=current_user.email,
        profile_picture=current_user.profile_picture,
    )


@router.get("/learning-focus/all", response_model=List[LearningFocusWithUser])
async def get_all_learning_focuses(
    limit: int = 50,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get all team learning focuses."""
    results = session.exec(
        select(LearningFocus, User).join(User).order_by(LearningFocus.created_at.desc()).limit(limit)
    ).all()
    return [
        LearningFocusWithUser(
            **focus.model_dump(),
            user_name=user.name,
            user_email=user.email,
            profile_picture=user.profile_picture,
        )
        for focus, user in results
    ]


@router.put("/learning-focus/{entry_id}", response_model=LearningFocusWithUser)
async def update_learning_focus(
    entry_id: int,
    data: LearningFocusCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    focus = session.get(LearningFocus, entry_id)
    if not focus:
        raise HTTPException(status_code=404, detail="Learning focus entry not found")
    if focus.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this entry")

    focus.focus = data.focus
    session.add(focus)
    session.commit()
    session.refresh(focus)
    return LearningFocusWithUser(
        **focus.model_dump(),
        user_name=current_user.name,
        user_email=current_user.email,
        profile_picture=current_user.profile_picture,
    )


@router.delete("/learning-focus/{entry_id}")
async def delete_learning_focus(
    entry_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    focus = session.get(LearningFocus, entry_id)
    if not focus:
        raise HTTPException(status_code=404, detail="Learning focus entry not found")
    if focus.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this entry")

    session.delete(focus)
    session.commit()
    return {"message": "Learning focus entry deleted"}


@router.post("/personal-project", response_model=PersonalProjectRead, status_code=status.HTTP_201_CREATED)
async def create_personal_project(
    data: PersonalProjectCreate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new personal project folder/tag."""
    stage = (data.stage or "current").strip().lower()
    if stage not in {"old", "current", "future"}:
        raise HTTPException(status_code=400, detail="stage must be one of: old, current, future")
    project = PersonalProject(
        user_id=current_user.id,
        title=data.title,
        stage=stage,
        tag=data.tag,
        github_link=data.github_link,
        demo_link=data.demo_link,
        image_url=data.image_url,
        writeup=data.writeup,
    )
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


@router.get("/personal-project/me", response_model=List[PersonalProjectRead])
async def get_my_personal_projects(
    limit: int = 30,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get current user's personal projects."""
    stmt = (
        select(PersonalProject)
        .where(PersonalProject.user_id == current_user.id)
        .order_by(PersonalProject.created_at.desc())
        .limit(limit)
    )
    return session.exec(stmt).all()


@router.put("/personal-project/{entry_id}", response_model=PersonalProjectRead)
async def update_personal_project(
    entry_id: int,
    data: PersonalProjectCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    project = session.get(PersonalProject, entry_id)
    if not project:
        raise HTTPException(status_code=404, detail="Personal project entry not found")
    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this entry")

    stage = (data.stage or "current").strip().lower()
    if stage not in {"old", "current", "future"}:
        raise HTTPException(status_code=400, detail="stage must be one of: old, current, future")

    project.title = data.title
    project.stage = stage
    project.tag = data.tag
    project.github_link = data.github_link
    project.demo_link = data.demo_link
    project.image_url = data.image_url
    project.writeup = data.writeup
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


@router.delete("/personal-project/{entry_id}")
async def delete_personal_project(
    entry_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    project = session.get(PersonalProject, entry_id)
    if not project:
        raise HTTPException(status_code=404, detail="Personal project entry not found")
    if project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this entry")

    session.delete(project)
    session.commit()
    return {"message": "Personal project entry deleted"}


@router.get("/task-sheet/admin/daily-report", response_model=List[DailyTaskSheetReportRow])
async def get_daily_task_sheet_report(
    date: str,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user),
):
    """Get all employees with their task sheet entry for the selected date (admin only)."""
    try:
        target_date = DateType.fromisoformat(date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    results = session.exec(
        select(User, TaskSheet)
        .outerjoin(
            TaskSheet,
            and_(TaskSheet.user_id == User.id, TaskSheet.date == target_date),
        )
        .order_by(User.name.asc())
    ).all()

    return [
        DailyTaskSheetReportRow(
            user_id=user.id,
            user_name=user.name,
            user_email=user.email,
            date=target_date,
            achievements=sheet.achievements if sheet else None,
            repo_link=sheet.repo_link if sheet else None,
        )
        for user, sheet in results
    ]


@router.get("/weekly-progress/admin/report", response_model=List[WeeklyProgressReportRow])
async def get_weekly_progress_report(
    week_start_date: str,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user),
):
    """Get all employees with their weekly progress entry for the selected week (admin only)."""
    try:
        target_week = DateType.fromisoformat(week_start_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    results = session.exec(
        select(User, WeeklyProgress)
        .outerjoin(
            WeeklyProgress,
            and_(WeeklyProgress.user_id == User.id, WeeklyProgress.week_start_date == target_week),
        )
        .order_by(User.name.asc())
    ).all()

    return [
        WeeklyProgressReportRow(
            user_id=user.id,
            user_name=user.name,
            user_email=user.email,
            week_start_date=target_week,
            description=progress.description if progress else None,
            github_link=progress.github_link if progress else None,
            deployed_link=progress.deployed_link if progress else None,
        )
        for user, progress in results
    ]
