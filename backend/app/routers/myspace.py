from typing import List
from datetime import date as DateType
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
    DailyHappySheetReportRow,
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

# ==================== TASK SHEET ROUTES ====================

@router.post("/task-sheet", response_model=TaskSheetRead, status_code=status.HTTP_200_OK)
async def create_task_sheet(
    sheet_data: TaskSheetCreate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Submit or update today's task sheet log (upsert)."""
    today = DateType.today()
    existing = session.exec(
        select(TaskSheet).where(TaskSheet.user_id == current_user.id, TaskSheet.date == today)
    ).first()
    if existing:
        existing.achievements = sheet_data.achievements
        existing.repo_link = sheet_data.repo_link
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing
    task_sheet = TaskSheet(
        user_id=current_user.id,
        date=today,
        achievements=sheet_data.achievements,
        repo_link=sheet_data.repo_link,
    )
    session.add(task_sheet)
    session.commit()
    session.refresh(task_sheet)
    return task_sheet


@router.get("/task-sheet/me", response_model=List[TaskSheetRead])
async def get_my_task_sheets(
    limit: int = 30,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get the current user's task sheets."""
    stmt = (
        select(TaskSheet)
        .where(TaskSheet.user_id == current_user.id)
        .order_by(TaskSheet.date.desc())
        .limit(limit)
    )
    return session.exec(stmt).all()


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
    target_date = sheet_data.date if sheet_data.date else DateType.today()
    existing = session.exec(
        select(HappySheet).where(HappySheet.user_id == current_user.id, HappySheet.date == target_date)
    ).first()
    if existing:
        existing.what_made_you_happy = sheet_data.what_made_you_happy
        existing.what_made_others_happy = sheet_data.what_made_others_happy
        existing.goals_without_greed = sheet_data.goals_without_greed
        existing.dreams_supported = sheet_data.dreams_supported
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing
    happy_sheet = HappySheet(
        user_id=current_user.id,
        date=target_date,
        what_made_you_happy=sheet_data.what_made_you_happy,
        what_made_others_happy=sheet_data.what_made_others_happy,
        goals_without_greed=sheet_data.goals_without_greed,
        dreams_supported=sheet_data.dreams_supported,
    )
    session.add(happy_sheet)
    session.commit()
    session.refresh(happy_sheet)
    return happy_sheet


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
    admin: User = Depends(get_current_admin_user),
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
        )
        for user, sheet in results
    ]


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


@router.post("/personal-project", response_model=PersonalProjectRead, status_code=status.HTTP_201_CREATED)
async def create_personal_project(
    data: PersonalProjectCreate,
    request: Request,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new personal project folder/tag."""
    project = PersonalProject(user_id=current_user.id, title=data.title, tag=data.tag)
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
