"""
Weekly Sheet AI Generator for Lighthouse.
"""
import os
import json
from datetime import datetime, timezone, timedelta, date as DateType
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from app.database import get_session
from app.models import (
    User,
    UserRole,
    Task,
    TaskInstance,
    TaskInstanceStatus,
    Attendance,
    LighthouseWeeklySheet,
    LighthouseWeeklySheetCreate,
    LighthouseWeeklySheetRead,
    LighthouseWeeklySheetUpdate,
    WeeklySheetStatus,
)
from app.auth import get_current_user

router = APIRouter(prefix="/my-space/weekly-sheet", tags=["Lighthouse Weekly Sheet"])

def monday_of_week(d: DateType) -> DateType:
    return d - timedelta(days=d.weekday())

# ─── OpenAI helper ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an AI assistant for a workforce management system called WorkForce Pro.
Your job is to generate a professional Weekly Work Summary Sheet based on the provided data of a single employee.

Given the JSON data of tasks, attendances, and logs for the week, generate a JSON response summarizing their work.
Do not hallucinate any accomplishments not present in the provided data.

Return ONLY a valid JSON object matching exactly this schema, without markdown formatting or code blocks:
{
    "weekly_summary": "A 2-4 sentence high-level summary of the week's overall performance.",
    "major_accomplishments": "List major wins or deliverables completed. Use bullet points (text based, e.g., •).",
    "tasks_completed": "List of the tasks completed this week.",
    "pending_tasks": "List of tasks still in progress or not started.",
    "blockers": "Any blockers or issues faced (infer from incomplete tasks or low productivity, or leave empty/None if none).",
    "productivity_insights": "A short insight on time utilization and productivity based on hours tracked vs estimated.",
    "time_utilization": "A short sentence about the total hours logged vs total tasks completed.",
    "suggested_priorities": "1-3 suggested priorities for next week based on what is pending."
}
"""

def _parse_week_payload(data_payload: str | dict) -> dict:
    if isinstance(data_payload, dict):
        return data_payload
    return json.loads(data_payload)


def build_weekly_sheet_fallback(data_payload: str | dict) -> dict:
    """Build a weekly sheet from task/attendance data when OpenAI is unavailable."""
    payload = _parse_week_payload(data_payload)
    week_start = payload.get("week_start", "")
    week_end = payload.get("week_end", "")
    attendance = payload.get("attendance") or {}
    tasks = payload.get("tasks") or []

    completed_statuses = {"approved", "submitted", "reviewing"}
    completed = [
        t for t in tasks
        if t.get("completed") or str(t.get("status", "")).lower() in completed_statuses
    ]
    pending = [t for t in tasks if t not in completed]

    def bullet_lines(items: list, key: str = "title") -> str:
        if not items:
            return "• None recorded for this week."
        return "\n".join(f"• {item.get(key) or 'Untitled task'}" for item in items)

    days_logged = attendance.get("days_logged") or 0
    total_hours = attendance.get("total_hours") or 0
    total_tasks = len(tasks)

    return {
        "weekly_summary": (
            f"Summary for {week_start} to {week_end}: {len(completed)} of {total_tasks} "
            f"assigned task(s) marked complete. Attendance logged on {days_logged} day(s) "
            f"({total_hours:.1f} total hours). "
            "(Generated from your task and attendance data — AI was unavailable.)"
        ),
        "major_accomplishments": bullet_lines(completed),
        "tasks_completed": bullet_lines(completed),
        "pending_tasks": bullet_lines(pending),
        "blockers": (
            "• No blockers recorded."
            if not pending
            else "• Review pending tasks below and update status or due dates as needed."
        ),
        "productivity_insights": (
            f"You logged {total_hours:.1f} hours across {days_logged} day(s) while tracking "
            f"{total_tasks} assigned task(s)."
        ),
        "time_utilization": (
            f"Total hours logged: {total_hours:.1f}. Completed tasks: {len(completed)}. "
            f"Pending tasks: {len(pending)}."
        ),
        "suggested_priorities": bullet_lines(pending[:3]),
    }


def _should_use_ai_fallback(exc: Exception) -> bool:
    message = str(exc).lower()
    return any(
        token in message
        for token in (
            "insufficient_quota",
            "rate limit",
            "429",
            "quota",
            "api key",
            "authentication",
            "401",
            "503",
            "connection",
            "timeout",
        )
    )


async def call_openai_for_weekly_sheet(data_payload: str | dict) -> dict:
    api_key = (os.getenv("OPENAI_API_KEY", "") or "").strip()
    if not api_key or "REDACTED" in api_key.upper():
        return build_weekly_sheet_fallback(data_payload)

    from openai import OpenAI
    client = OpenAI(api_key=api_key)
    payload_text = (
        data_payload
        if isinstance(data_payload, str)
        else json.dumps(data_payload)
    )

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Here is the employee's week data:\n{payload_text}"},
            ],
            temperature=0.3,
            max_tokens=1000,
        )

        content = response.choices[0].message.content.strip()

        # Strip markdown code fences if present
        if content.startswith("```"):
            content = content.split("\n", 1)[1] if "\n" in content else content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

        return json.loads(content)

    except json.JSONDecodeError:
        return build_weekly_sheet_fallback(data_payload)
    except Exception as e:
        if _should_use_ai_fallback(e):
            return build_weekly_sheet_fallback(data_payload)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI service error: {str(e)}",
        )

# ─── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/current", response_model=LighthouseWeeklySheetRead)
async def get_current_weekly_sheet(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Fetch the weekly sheet for the current week (Monday-Sunday)."""
    week_start = monday_of_week(datetime.now(timezone.utc).date())
    sheet = session.exec(
        select(LighthouseWeeklySheet).where(
            LighthouseWeeklySheet.user_id == current_user.id,
            LighthouseWeeklySheet.week_start_date == week_start,
            LighthouseWeeklySheet.organization_id == current_user.organization_id,
        )
    ).first()
    
    if not sheet:
        raise HTTPException(status_code=404, detail="Weekly sheet not found for current week.")
    
    return sheet


@router.post("/generate", response_model=LighthouseWeeklySheetRead)
async def generate_weekly_sheet(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Generate the AI weekly sheet based on tasks and attendance."""
    today = datetime.now(timezone.utc).date()
    week_start = monday_of_week(today)
    week_end = week_start + timedelta(days=6)
    
    # 1. Get Tasks and Subtasks updated this week or due this week
    tasks = session.exec(
        select(Task).where(
            Task.assigned_to == current_user.id,
        )
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
        
    # Get attendance for the week
    attendances = session.exec(
        select(Attendance).where(
            Attendance.user_id == current_user.id,
            Attendance.date >= week_start,
            Attendance.date <= week_end
        )
    ).all()
    
    total_hours = sum([a.total_hours for a in attendances if a.total_hours])
    attendance_data = {
        "days_logged": len(attendances),
        "total_hours": total_hours
    }
    
    payload = json.dumps({
        "week_start": str(week_start),
        "week_end": str(week_end),
        "attendance": attendance_data,
        "tasks": task_data
    })
    
    ai_result = await call_openai_for_weekly_sheet(payload)
    
    # Check if a draft exists
    existing = session.exec(
        select(LighthouseWeeklySheet).where(
            LighthouseWeeklySheet.user_id == current_user.id,
            LighthouseWeeklySheet.week_start_date == week_start,
            LighthouseWeeklySheet.organization_id == current_user.organization_id,
        )
    ).first()
    
    now = datetime.now(timezone.utc)
    if existing:
        existing.weekly_summary = ai_result.get("weekly_summary")
        existing.major_accomplishments = ai_result.get("major_accomplishments")
        existing.tasks_completed = ai_result.get("tasks_completed")
        existing.pending_tasks = ai_result.get("pending_tasks")
        existing.blockers = ai_result.get("blockers")
        existing.productivity_insights = ai_result.get("productivity_insights")
        existing.time_utilization = ai_result.get("time_utilization")
        existing.suggested_priorities = ai_result.get("suggested_priorities")
        existing.updated_at = now
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing
        
    # Create new
    sheet = LighthouseWeeklySheet(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
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
    session.refresh(sheet)
    return sheet


@router.post("/save", response_model=LighthouseWeeklySheetRead)
async def save_weekly_sheet(
    body: LighthouseWeeklySheetUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Save or submit the edited weekly sheet."""
    week_start = monday_of_week(datetime.now(timezone.utc).date())
    sheet = session.exec(
        select(LighthouseWeeklySheet).where(
            LighthouseWeeklySheet.user_id == current_user.id,
            LighthouseWeeklySheet.week_start_date == week_start,
            LighthouseWeeklySheet.organization_id == current_user.organization_id,
        )
    ).first()
    
    if not sheet:
        raise HTTPException(status_code=404, detail="Weekly sheet not found.")
        
    data = body.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(sheet, key, value)
        
    sheet.updated_at = datetime.now(timezone.utc)
    session.add(sheet)
    session.commit()
    session.refresh(sheet)
    return sheet
