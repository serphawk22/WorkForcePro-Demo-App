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
    Attendance,
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


def _format_sheet_lines(sheets: List[dict], field: str, empty_message: str) -> str:
    lines = []
    for sheet in sheets:
        value = (sheet.get(field) or "").strip()
        if value:
            lines.append(f"- {sheet.get('date')}: {value}")
    return "\n".join(lines) if lines else empty_message


def build_weekly_sheet_fallback(
    week_start: DateType,
    week_end: DateType,
    attendance_data: dict,
    task_data: List[dict],
    task_sheet_data: Optional[List[dict]] = None,
) -> dict:
    """Build a useful weekly sheet when the AI provider is unavailable."""
    task_sheet_data = task_sheet_data or []
    if task_sheet_data:
        total_attendance_hours = attendance_data.get("total_hours") or 0
        days_logged = attendance_data.get("days_logged") or 0
        dates = ", ".join(sheet["date"] for sheet in task_sheet_data)
        time_entries = [
            f"{sheet['date']}: {sheet['time_taken']}"
            for sheet in task_sheet_data
            if (sheet.get("time_taken") or "").strip()
        ]
        repo_links = [
            f"{sheet['date']}: {sheet['repo_link']}"
            for sheet in task_sheet_data
            if (sheet.get("repo_link") or "").strip()
        ]

        return {
            "weekly_summary": (
                f"For the week of {week_start} to {week_end}, this sheet was generated from "
                f"{len(task_sheet_data)} submitted daily task sheet(s): {dates}. The work summary "
                "below reflects the tasks, impact, and time entered in those task sheets."
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
                f"The submitted task sheets cover {len(task_sheet_data)} day(s), with attendance showing "
                f"{total_attendance_hours:.2f} logged hours across {days_logged} day(s). "
                f"Recorded task-sheet time: {'; '.join(time_entries) if time_entries else 'not specified'}."
            ),
            "time_utilization": (
                f"Attendance logged this week: {total_attendance_hours:.2f} hours. "
                f"Task sheet time entries: {'; '.join(time_entries) if time_entries else 'not specified'}."
            ),
            "suggested_priorities": (
                "Review the completed task sheet entries, carry forward any unfinished follow-ups, "
                "and keep daily task sheets updated for the next reporting week."
                + (f"\nRepository references: {'; '.join(repo_links)}" if repo_links else "")
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

    total_attendance_hours = attendance_data.get("total_hours") or 0
    days_logged = attendance_data.get("days_logged") or 0
    estimated_hours = sum(task.get("estimated_hours") or 0 for task in task_data)
    actual_task_hours = sum(task.get("actual_hours") or 0 for task in task_data)

    if task_data:
        summary = (
            f"For the week of {week_start} to {week_end}, this sheet was prepared from the "
            f"available task and attendance records. {len(completed_tasks)} of {len(task_data)} "
            f"assigned tasks are marked complete, with {len(pending_tasks)} still pending."
        )
    else:
        summary = (
            f"For the week of {week_start} to {week_end}, no assigned task records were found. "
            "This draft was created from the available attendance data and can be edited before submission."
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
            f"Attendance shows {total_attendance_hours:.2f} logged hours across {days_logged} day(s). "
            f"Assigned tasks have {estimated_hours:.2f} estimated hours and {actual_task_hours:.2f} recorded actual hours."
        ),
        "time_utilization": (
            f"Total attendance time logged this week is {total_attendance_hours:.2f} hours."
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
    attendance_data: dict,
    task_data: List[dict],
    task_sheet_data: Optional[List[dict]] = None,
) -> dict:
    try:
        ai_result = await call_openai_for_weekly_sheet(payload)
        return {
            **build_weekly_sheet_fallback(week_start, week_end, attendance_data, task_data, task_sheet_data),
            **{key: value for key, value in ai_result.items() if value},
        }
    except HTTPException as exc:
        logger.warning("Weekly sheet AI generation failed; using fallback content: %s", exc.detail)
    except Exception as exc:
        logger.warning("Weekly sheet AI generation failed; using fallback content: %s", exc)

    return build_weekly_sheet_fallback(week_start, week_end, attendance_data, task_data, task_sheet_data)

# ─── OpenAI helper ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an AI assistant for a workforce management system called WorkForce Pro.
Your job is to generate a professional Weekly Work Summary Sheet based on the provided data of a single employee.

Given the JSON data of daily task sheets, optional assigned tasks, attendances, and logs for the week, generate a JSON response summarizing their work.
Daily task sheets are the primary source of truth for what the employee actually reported on each date.
When daily task sheets are present, use them instead of assigned task names for completed work, accomplishments, insights, and priorities.
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

async def call_openai_for_weekly_sheet(data_payload: str) -> dict:
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OpenAI API key not configured.",
        )
    
    from openai import OpenAI
    client = OpenAI(api_key=api_key, timeout=20.0)

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Here is the employee's week data:\n{data_payload}"},
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

        data = json.loads(content)
        return data

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI returned an invalid response.",
        )
    except Exception as e:
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

    task_sheets = session.exec(
        select(TaskSheet).where(
            TaskSheet.user_id == current_user.id,
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
    
    ai_result = await generate_weekly_sheet_content(
        payload,
        week_start,
        week_end,
        attendance_data,
        task_data,
        task_sheet_data,
    )
    
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
