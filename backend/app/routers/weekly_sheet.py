"""
Weekly Sheet AI Generator for Lighthouse.
"""
import os
import json
import logging
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
    TaskSheet,
    LighthouseWeeklySheet,
    LighthouseWeeklySheetCreate,
    LighthouseWeeklySheetRead,
    LighthouseWeeklySheetUpdate,
    WeeklySheetStatus,
)
from app.auth import get_current_user

router = APIRouter(prefix="/api/my-space/weekly-sheet", tags=["Lighthouse Weekly Sheet"])
logger = logging.getLogger(__name__)

def monday_of_week(d: DateType) -> DateType:
    return d - timedelta(days=d.weekday())


def _format_task_lines(tasks: List[dict], empty_message: str) -> str:
    if not tasks:
        return empty_message
    return "\n".join(f"- {task.get('title') or 'Untitled task'}" for task in tasks)


def _task_status_value(task: dict) -> str:
    status_value = task.get("status")
    return str(getattr(status_value, "value", status_value) or "").lower()


def _sheet_day_label(sheet_date: DateType) -> str:
    return sheet_date.strftime("%A")


def _format_sheet_lines(sheets: List[dict], field: str, empty_message: str) -> str:
    lines = []
    for sheet in sheets:
        value = (sheet.get(field) or "").strip()
        if value:
            lines.append(f"- {sheet.get('day')}: {value}")
    return "\n".join(lines) if lines else empty_message


def _join_sheet_details(sheets: List[dict], field: str) -> str:
    details = [
        f"{sheet.get('day')}: {(sheet.get(field) or '').strip()}"
        for sheet in sheets
        if (sheet.get(field) or "").strip()
    ]
    return "; ".join(details) if details else "not specified"


def build_weekly_sheet_fallback(
    week_start: DateType,
    week_end: DateType,
    task_data: List[dict],
    task_sheet_data: Optional[List[dict]] = None,
) -> dict:
    """Build a useful weekly sheet when the AI provider is unavailable."""
    task_sheet_data = task_sheet_data or []
    if task_sheet_data:
        days = ", ".join(sheet["day"] for sheet in task_sheet_data)
        completed_details = _join_sheet_details(task_sheet_data, "tasks_completed")
        impact_details = _join_sheet_details(task_sheet_data, "work_impact")

        return {
            "weekly_summary": (
                f"For the week of {week_start} to {week_end}, this summary is based on "
                f"{len(task_sheet_data)} submitted daily task sheet(s) covering {days}. "
                f"The reported work for the week included {completed_details}. "
                f"The stated impact of this work was {impact_details}. "
                "Overall, the week reflects the employee's submitted daily progress and the value they reported creating, "
                "with each point tied back to the day it was entered."
            ),
            "major_accomplishments": _format_sheet_lines(
                task_sheet_data,
                "work_impact",
                "No work impact was recorded in this week's task sheets."
            ),
            "tasks_completed": _format_sheet_lines(
                task_sheet_data,
                "tasks_completed",
                "No completed task details were recorded in this week's task sheets."
            ),
            "pending_tasks": (
                "No pending tasks were recorded in this week's task sheets. "
                "Add pending items to the daily task sheet if they should appear here."
            ),
            "blockers": "No blockers were recorded in this week's task sheets.",
            "productivity_insights": (
                f"The submitted task sheets cover {len(task_sheet_data)} day(s): {days}. "
                "The weekly output should be understood from the day-wise completed work and impact statements."
            ),
            "time_utilization": (
                f"Day-wise task sheet entries were submitted for: {days}."
            ),
            "suggested_priorities": (
                "Review the completed task sheet entries, carry forward any unfinished follow-ups, "
                "and keep daily task sheets updated for the next reporting week."
            ),
        }

    completed_tasks = [
        task for task in task_data
        if task.get("completed") or _task_status_value(task) in {"submitted", "reviewing", "approved", "done", "completed"}
    ]
    pending_tasks = [task for task in task_data if task not in completed_tasks]
    overdue_tasks = [
        task for task in pending_tasks
        if task.get("due_date") and str(task.get("due_date")) < str(week_end)
    ]

    if task_data:
        summary = (
            f"For the week of {week_start} to {week_end}, no daily task sheet entries were found, "
            "so this draft was prepared from assigned task records. "
            f"{len(completed_tasks)} of {len(task_data)} assigned task(s) are marked complete, "
            f"with {len(pending_tasks)} still pending. "
            "The summary should be reviewed and edited with any missing context from the employee's actual daily work."
        )
    else:
        summary = (
            f"For the week of {week_start} to {week_end}, no assigned task records were found. "
            "This draft should be completed with the employee's "
            "actual weekly work details before submission."
        )

    blockers = (
        _format_task_lines(overdue_tasks, "")
        if overdue_tasks
        else "No blockers were identified from the available task records."
    )

    priorities = pending_tasks[:3]

    return {
        "weekly_summary": summary,
        "major_accomplishments": _format_task_lines(
            completed_tasks,
            "No completed tasks were recorded for this week."
        ),
        "tasks_completed": _format_task_lines(
            completed_tasks,
            "No completed tasks were recorded for this week."
        ),
        "pending_tasks": _format_task_lines(
            pending_tasks,
            "No pending tasks were found in the assigned task list."
        ),
        "blockers": blockers,
        "productivity_insights": (
            "No daily task sheet entries were available, so this section is based only on assigned task status."
        ),
        "time_utilization": (
            "No day-wise task sheet entries were available for this week."
        ),
        "suggested_priorities": _format_task_lines(
            priorities,
            "Set clear priorities for next week and keep task records updated."
        ),
    }


async def generate_weekly_sheet_content(
    payload: str,
    week_start: DateType,
    week_end: DateType,
    task_data: List[dict],
    task_sheet_data: Optional[List[dict]] = None,
) -> dict:
    try:
        ai_result = await call_openai_for_weekly_sheet(payload)
        return {
            **build_weekly_sheet_fallback(week_start, week_end, task_data, task_sheet_data),
            **{key: value for key, value in ai_result.items() if value},
        }
    except HTTPException as exc:
        logger.warning("Weekly sheet AI generation failed; using fallback content: %s", exc.detail)
    except Exception as exc:
        logger.warning("Weekly sheet AI generation failed; using fallback content: %s", exc)

    return build_weekly_sheet_fallback(week_start, week_end, task_data, task_sheet_data)

# ─── OpenAI helper ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an AI assistant for a workforce management system called WorkForce Pro.
Your job is to generate a professional Weekly Work Summary Sheet based on the provided data of a single employee.

Given the JSON data of daily task sheets and optional assigned tasks for the week, generate a JSON response summarizing their work.
Daily task sheets are the primary source of truth for what the employee actually reported on each date.
When daily task sheets are present, use them instead of assigned task names for completed work, accomplishments, insights, and priorities.
Do not mention hours, time taken, attendance, estimates, durations, or logged time anywhere in the response.
Use only the day label and the text provided in task sheet fields, then elaborate that text professionally.
Do not hallucinate any accomplishments not present in the provided data.

Return ONLY a valid JSON object matching exactly this schema, without markdown formatting or code blocks:
{
    "weekly_summary": "A detailed 4-6 sentence narrative summary of the week. Mention the covered day labels, the main reported work, and the value or impact created. Do not mention time, hours, attendance, estimates, or durations. Keep it factual and based only on the supplied data.",
    "major_accomplishments": "List major wins or deliverables completed. Use bullet points (text based, e.g., •).",
    "tasks_completed": "List of the tasks completed this week.",
    "pending_tasks": "List of tasks still in progress or not started.",
    "blockers": "Any blockers or issues faced (infer from incomplete tasks or low productivity, or leave empty/None if none).",
    "productivity_insights": "A short qualitative insight based only on the day-wise task sheet work and impact. Do not mention time, hours, attendance, estimates, or durations.",
    "time_utilization": "List only the day labels covered by task sheet entries. Do not mention time, hours, attendance, estimates, or durations.",
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
    client = OpenAI(api_key=api_key, timeout=20.0)

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
    """Generate the weekly sheet from day-wise task sheet entries."""
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
            "due_date": str(t.due_date) if t.due_date else None,
            "completed": t.done_by_employee
        })

    task_sheets = session.exec(
        select(TaskSheet).where(
            TaskSheet.user_id == current_user.id,
            TaskSheet.date >= week_start,
            TaskSheet.date <= week_end,
        ).order_by(TaskSheet.date)
    ).all()

    task_sheet_data = [
        {
            "day": _sheet_day_label(sheet.date),
            "tasks_completed": sheet.tasks_completed,
            "work_impact": sheet.work_impact,
        }
        for sheet in task_sheets
    ]
    
    # Create empty sheet for manual entry - no AI generation
    ai_result = {
        "weekly_summary": None,
        "major_accomplishments": None,
        "tasks_completed": None,
        "pending_tasks": None,
        "blockers": None,
        "productivity_insights": None,
        "time_utilization": None,
        "suggested_priorities": None,
    }
    
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
