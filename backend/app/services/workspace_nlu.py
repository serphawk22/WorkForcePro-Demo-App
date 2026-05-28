"""
Natural Language Workspace Engine — intent recognition and entity extraction.
Extends the existing chatbot without replacing its architecture.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional


STATUS_ALIASES: dict[str, str] = {
    "todo": "todo",
    "to do": "todo",
    "not started": "todo",
    "in progress": "in_progress",
    "in-progress": "in_progress",
    "progress": "in_progress",
    "working": "in_progress",
    "testing": "in_progress",
    "review": "reviewing",
    "reviewing": "reviewing",
    "done": "submitted",
    "complete": "submitted",
    "completed": "approved",
    "approved": "approved",
    "submitted": "submitted",
    "blocked": "rejected",
    "ignore": "rejected",
    "rejected": "rejected",
}

PRIORITY_ALIASES: dict[str, str] = {
    "low": "low",
    "medium": "medium",
    "normal": "medium",
    "high": "high",
    "urgent": "high",
    "critical": "high",
}


@dataclass
class WorkspaceIntent:
    intent: str
    entities: Dict[str, Any] = field(default_factory=dict)
    confidence: float = 0.0
    auto_execute: bool = False
    source: str = "deterministic"


def _normalize(msg: str) -> str:
    return re.sub(r"\s+", " ", (msg or "").strip().lower())


def parse_relative_date(text: str, today: Optional[date] = None) -> Optional[str]:
    """Return YYYY-MM-DD from phrases like 'friday', 'tomorrow', 'next monday'."""
    if not text:
        return None
    ref = today or date.today()
    t = text.strip().lower()

    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", t):
        return t

    if t in ("today",):
        return ref.isoformat()
    if t in ("tomorrow",):
        return (ref + timedelta(days=1)).isoformat()
    if t in ("yesterday",):
        return (ref - timedelta(days=1)).isoformat()

    weekdays = {
        "monday": 0, "mon": 0,
        "tuesday": 1, "tue": 1, "tues": 1,
        "wednesday": 2, "wed": 2,
        "thursday": 3, "thu": 3, "thur": 3, "thurs": 3,
        "friday": 4, "fri": 4,
        "saturday": 5, "sat": 5,
        "sunday": 6, "sun": 6,
    }
    for name, target in weekdays.items():
        if name in t:
            days_ahead = (target - ref.weekday()) % 7
            if days_ahead == 0 and "next" in t:
                days_ahead = 7
            elif "next" in t and days_ahead <= 0:
                days_ahead += 7
            return (ref + timedelta(days=days_ahead)).isoformat()

    m = re.search(r"in\s+(\d+)\s+days?", t)
    if m:
        return (ref + timedelta(days=int(m.group(1)))).isoformat()

    return None


def _extract_task_title(msg: str) -> Optional[str]:
    patterns = [
        r"(?:create|add|make|open)\s+(?:a\s+)?(?:new\s+)?(.+?)\s+task\b",
        r"\btask\s+(?:called|named|titled)\s+['\"]?(.+?)['\"]?(?:\s+assign|\s+due|\s+for|$)",
        r"(?:create|add)\s+['\"]?(.+?)['\"]?\s+(?:and\s+)?assign",
        r"(?:create|add)\s+(.+?)\s*,\s*assign",
    ]
    for pat in patterns:
        m = re.search(pat, msg, re.I)
        if m:
            title = m.group(1).strip(" ,.")
            title = re.sub(r"^(the|a|an)\s+", "", title, flags=re.I)
            if title and len(title) > 1:
                return title[:200]
    return None


def _extract_assignee(msg: str) -> Optional[str]:
    patterns = [
        r"assign(?:ed)?\s+(?:to\s+)?([A-Za-z][A-Za-z\s'.-]{1,40})",
        r"for\s+([A-Za-z][A-Za-z\s'.-]{1,40})\s+(?:by|due|before)",
        r"give\s+(?:it\s+)?to\s+([A-Za-z][A-Za-z\s'.-]{1,40})",
    ]
    for pat in patterns:
        m = re.search(pat, msg, re.I)
        if m:
            name = m.group(1).strip(" ,.")
            name = re.sub(r"\s+(due|by|on|before|friday|monday|tuesday|wednesday|thursday|saturday|sunday).*$", "", name, flags=re.I)
            if name:
                return name
    return None


def _extract_due_date(msg: str) -> Optional[str]:
    m = re.search(
        r"(?:due|deadline|by)\s+(.+?)(?:\s+assign|\s+in\s+|\s+for\s+|$)",
        msg,
        re.I,
    )
    if m:
        return parse_relative_date(m.group(1).strip(" ,."))
    m = re.search(
        r"\b(on|by)\s+(today|tomorrow|yesterday|next\s+\w+|this\s+\w+|\w+day)\b",
        msg,
        re.I,
    )
    if m:
        return parse_relative_date(m.group(2))
    return None


def _extract_task_reference(msg: str) -> Optional[str]:
    m = re.search(r"task\s+['\"]?([^'\"]+?)['\"]?(?:\s+to|\s+as|\s+for|$)", msg, re.I)
    if m:
        return m.group(1).strip()
    m = re.search(
        r"(?:move|mark|assign|update|delete|remove)\s+(.+?)\s+(?:to|as|for|from)\b",
        msg,
        re.I,
    )
    if m:
        ref = m.group(1).strip()
        if ref and not re.fullmatch(r"(it|this|that|the task)", ref, re.I):
            return ref
    return None


def _extract_status(msg: str) -> Optional[str]:
    for alias, canonical in STATUS_ALIASES.items():
        if re.search(rf"\b{re.escape(alias)}\b", msg, re.I):
            return canonical
    return None


def _extract_priority(msg: str) -> Optional[str]:
    m = re.search(r"\b(low|medium|high|urgent|critical)\s+priority\b", msg, re.I)
    if m:
        return PRIORITY_ALIASES.get(m.group(1).lower(), m.group(1).lower())
    m = re.search(r"\bpriority\s+(low|medium|high|urgent|critical)\b", msg, re.I)
    if m:
        return PRIORITY_ALIASES.get(m.group(1).lower(), m.group(1).lower())
    if re.search(r"\bhigh\s+priority\b", msg, re.I):
        return "high"
    return None


def parse_slash_command(message: str) -> Optional[WorkspaceIntent]:
    """Parse /command style input. Returns None if not a slash command."""
    raw = (message or "").strip()
    if not raw.startswith("/"):
        return None

    parts = raw[1:].split()
    if not parts:
        return None

    cmd = parts[0].lower()
    rest = " ".join(parts[1:]).strip()

    if cmd in ("nav", "go", "open"):
        return WorkspaceIntent("navigate", {"target": rest}, confidence=0.95, auto_execute=True, source="slash")
    if cmd in ("task", "tasks"):
        return parse_workspace_message(rest or "show tasks", allow_partial=True)
    if cmd in ("leave",):
        return WorkspaceIntent("create_leave", {"raw": rest}, confidence=0.8, source="slash")
    if cmd in ("attendance", "att"):
        return WorkspaceIntent("query_attendance", {"raw": rest}, confidence=0.9, auto_execute=True, source="slash")
    if cmd in ("help", "?"):
        return WorkspaceIntent("help", {}, confidence=1.0, auto_execute=True, source="slash")
    if cmd in ("report", "weekly"):
        return WorkspaceIntent("navigate", {"target": "weekly sheet"}, confidence=0.9, auto_execute=True, source="slash")

    return WorkspaceIntent("unknown_slash", {"command": cmd, "args": rest}, confidence=0.5, source="slash")
def parse_workspace_message(message: str, role: str = "admin", allow_partial: bool = False) -> Optional[WorkspaceIntent]:
    """
    Deterministic NLU for workspace commands.
    Returns None when the message doesn't look like an actionable workspace command.
    """
    msg = _normalize(message)
    if not msg:
        return None

    slash = parse_slash_command(message)
    if slash:
        return slash

    # --- Attendance punches ---
    if re.search(r"\b(punch\s*in|clock\s*in|log\s*in|start\s*work)\b", msg):
        return WorkspaceIntent("log_attendance", {"action": "punch_in"}, confidence=0.92, auto_execute=True)
    if re.search(r"\b(punch\s*out|clock\s*out|log\s*out|stop\s*work)\b", msg):
        return WorkspaceIntent("log_attendance", {"action": "punch_out"}, confidence=0.92, auto_execute=True)

    # --- Leave requests ---
    if re.search(r"\b(leave|time\s*off|vacation|sick\s*leave)\b", msg) and re.search(r"\b(apply|request|take|need|draft)\b", msg):
        reason_found = _extract_task_title(message) or "Leave request"
        ltype = "sick" if "sick" in msg else "vacation" if "vacation" in msg else "personal"
        due = _extract_due_date(message)
        return WorkspaceIntent(
            "create_leave",
            {
                "reason": reason_found,
                "leave_type": ltype,
                "start_date": due or date.today().isoformat(),
                "end_date": due or date.today().isoformat()
            },
            confidence=0.85,
            auto_execute=True if due else False
        )

    if re.search(r"\b(approve|accept)\b", msg) and "leave" in msg:
        leave_id_match = re.search(r"\b(?:leave\s*)?(?:request\s*)?#?(\d+)\b", msg)
        return WorkspaceIntent(
            "approve_leave",
            {
                "leave_id": int(leave_id_match.group(1)) if leave_id_match else None,
                "employee_name": _extract_assignee(message) or "",
                "admin_comment": "Approved via AI assistant",
            },
            confidence=0.84,
            auto_execute=role == "admin",
        )

    if re.search(r"\b(reject|decline)\b", msg) and "leave" in msg:
        leave_id_match = re.search(r"\b(?:leave\s*)?(?:request\s*)?#?(\d+)\b", msg)
        return WorkspaceIntent(
            "reject_leave",
            {
                "leave_id": int(leave_id_match.group(1)) if leave_id_match else None,
                "employee_name": _extract_assignee(message) or "",
                "admin_comment": "Rejected via AI assistant",
            },
            confidence=0.84,
            auto_execute=role == "admin",
        )

    # --- My Space logs ---
    if re.search(r"\b(log|submit|write|save)\b", msg) and re.search(r"\b(task\s*sheet|daily\s*work|work\s*log)\b", msg):
        body = re.sub(r"^.*?(?:task\s*sheet|daily\s*work|work\s*log)\s*:?", "", message, flags=re.I).strip(" .:-")
        hours = re.search(r"(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)", msg)
        return WorkspaceIntent(
            "log_task_sheet",
            {
                "tasks_completed": body or message,
                "work_impact": "Logged via AI assistant",
                "time_taken": f"{hours.group(1)} hours" if hours else "N/A",
            },
            confidence=0.82,
            auto_execute=True,
        )

    if re.search(r"\b(log|submit|write|save)\b", msg) and re.search(r"\b(happy\s*sheet|happiness|well-being|wellbeing)\b", msg):
        body = re.sub(r"^.*?(?:happy\s*sheet|happiness|well-being|wellbeing)\s*:?", "", message, flags=re.I).strip(" .:-")
        return WorkspaceIntent(
            "log_happy_sheet",
            {"what_made_you_happy": body or message},
            confidence=0.82,
            auto_execute=True,
        )

    if re.search(r"\b(log|save|add)\b", msg) and re.search(r"\b(learning|focus|study)\b", msg):
        focus = re.sub(r"^.*?\b(?:learning|focus|study)\b\s*:?", "", message, flags=re.I).strip(" .:-")
        return WorkspaceIntent(
            "log_learning",
            {"focus": focus or message},
            confidence=0.78,
            auto_execute=True,
        )

    # --- Meetings, tickets, payroll ---
    if re.search(r"\b(schedule|share|create)\b", msg) and re.search(r"\b(meeting|teams)\b", msg):
        link = re.search(r"https?://\S+", message)
        title_match = re.search(r"(?:called|named|title(?:d)?|meeting)\s+['\"]?(.+?)['\"]?(?:\s+with|\s+http|$)", message, re.I)
        return WorkspaceIntent(
            "create_meeting",
            {
                "title": title_match.group(1).strip(" '\".") if title_match else "Team meeting",
                "meeting_link": link.group(0).rstrip(").,;") if link else "",
            },
            confidence=0.82,
            auto_execute=role == "admin" and bool(link),
        )

    if re.search(r"\b(raise|create|open)\b", msg) and re.search(r"\b(ticket|query|issue)\b", msg):
        title_match = re.search(r"['\"]([^'\"]+)['\"]", message)
        return WorkspaceIntent(
            "create_admin_query",
            {
                "title": title_match.group(1) if title_match else _extract_task_title(message) or message,
                "description": message,
                "assignee_name": _extract_assignee(message) or "",
                "priority": _extract_priority(msg) or "medium",
            },
            confidence=0.8,
            auto_execute=True,
        )

    if re.search(r"\b(process|pay|mark)\b", msg) and "payroll" in msg:
        month_match = re.search(r"\b(1[0-2]|0?[1-9])\b", msg)
        year_match = re.search(r"\b(20\d{2})\b", msg)
        return WorkspaceIntent(
            "pay_salary",
            {
                "employee_name": _extract_assignee(message) or "",
                "month": int(month_match.group(1)) if month_match else None,
                "year": int(year_match.group(1)) if year_match else None,
            },
            confidence=0.78,
            auto_execute=role == "admin",
        )

    # --- Flag task ---
    if re.search(r"\b(flag|block|needs?\s*help)\b", msg) and "task" in msg:
        return WorkspaceIntent(
            "flag_task",
            {
                "task_reference": _extract_task_reference(message) or "",
                "reason": "Flagged as blocked/needing help via AI assistant"
            },
            confidence=0.85,
            auto_execute=True
        )

    # Search / filter tasks (before generic navigation — "show overdue tasks" is not nav)
    if re.search(r"\b(overdue|pending|open)\s+tasks?\b", msg) or re.search(
        r"\bshow\s+(my\s+)?(overdue\s+)?tasks?\b", msg
    ):
        overdue = "overdue" in msg
        return WorkspaceIntent(
            "search_tasks",
            {"filter": "overdue" if overdue else "all"},
            confidence=0.88,
            auto_execute=True,
        )

    # Navigation
    nav_triggers = (
        "open ", "go to ", "take me to ", "show ", "navigate to ", "bring me to ",
    )
    if any(msg.startswith(t) for t in nav_triggers) or msg in ("attendance", "payroll", "dashboard", "tasks", "requests"):
        if not re.search(r"\b(task|assign|create|delete|update|overdue)\b", msg):
            return WorkspaceIntent("navigate", {"target": message.strip()}, confidence=0.85, auto_execute=True)

    # Attendance queries
    if re.search(r"\b(attendance|punch|clocked|hours?\s+logged)\b", msg) and not re.search(r"\b(create|assign)\s+task\b", msg):
        return WorkspaceIntent("query_attendance", {"raw": message}, confidence=0.82, auto_execute=True)

    # Delete task
    if re.search(r"\b(delete|remove)\b", msg) and "task" in msg:
        return WorkspaceIntent(
            "delete_task",
            {"task_reference": _extract_task_reference(message) or ""},
            confidence=0.8,
            auto_execute=role == "admin",
        )

    # Update status / move kanban stage
    if re.search(r"\b(move|mark|set)\b", msg) and (_extract_status(msg) or re.search(r"\bto\s+(testing|done|review)\b", msg)):
        status = _extract_status(msg)
        if not status and "testing" in msg:
            status = "in_progress"
        return WorkspaceIntent(
            "set_status",
            {"task_reference": _extract_task_reference(message) or "", "status": status},
            confidence=0.84,
            auto_execute=True,
        )

    # Assign
    if re.search(r"\bassign\b", msg) and not re.search(r"\bcreate\b", msg):
        return WorkspaceIntent(
            "assign_task",
            {
                "task_reference": _extract_task_reference(message) or "",
                "assignee_name": _extract_assignee(message) or "",
            },
            confidence=0.83,
            auto_execute=role == "admin",
        )

    # Create task (compound commands) — before deadline/priority so "create X due Friday" wins
    if re.search(r"\b(create|add|make)\b", msg) and "task" in msg and "subtask" not in msg:
        title = _extract_task_title(message) or ""
        entities = {
            "title": title,
            "assignee_name": _extract_assignee(message),
            "due_date": _extract_due_date(message),
            "priority": _extract_priority(msg) or "medium",
            "is_recurring": False,
            "recurrence_preference_set": True,
        }
        complete = bool(title and (entities["assignee_name"] or allow_partial))
        return WorkspaceIntent(
            "create_task",
            entities,
            confidence=0.9 if complete else 0.7,
            auto_execute=role == "admin" and bool(title),
        )

    # Priority
    priority = _extract_priority(msg)
    if priority and re.search(r"\b(task|priority)\b", msg):
        return WorkspaceIntent(
            "set_priority",
            {"task_reference": _extract_task_reference(message) or "", "priority": priority},
            confidence=0.8,
            auto_execute=role == "admin",
        )

    # Deadline (existing tasks only — not create flows)
    due = _extract_due_date(message)
    if due and re.search(r"\b(due|deadline|by)\b", msg) and not re.search(r"\b(create|add|make)\b", msg):
        return WorkspaceIntent(
            "set_deadline",
            {"task_reference": _extract_task_reference(message) or "", "due_date": due},
            confidence=0.8,
            auto_execute=role == "admin",
        )

    # Update task generic
    if re.search(r"\b(update|edit|change)\b", msg) and "task" in msg:
        return WorkspaceIntent(
            "update_task",
            {
                "task_reference": _extract_task_reference(message) or "",
                "title": _extract_task_title(message),
                "assignee_name": _extract_assignee(message),
                "due_date": _extract_due_date(message),
                "priority": _extract_priority(msg),
            },
            confidence=0.75,
            auto_execute=False,
        )

    return None


def merge_ai_workspace_action(ai_response: Optional[dict], message: str, role: str) -> Optional[WorkspaceIntent]:
    """Merge OpenAI workspace_action block with deterministic parse."""
    deterministic = parse_workspace_message(message, role=role)
    if not ai_response:
        return deterministic

    block = ai_response.get("workspace_action") or {}
    intent_name = (block.get("intent") or "none").strip().lower()
    if intent_name in ("", "none", "null"):
        return deterministic

    entities = block.get("entities") or {}
    confidence = float(block.get("confidence") or 0.75)
    auto_execute = bool(block.get("auto_execute", False))

    ai_intent = WorkspaceIntent(
        intent=intent_name,
        entities=entities,
        confidence=confidence,
        auto_execute=auto_execute,
        source="openai",
    )

    if deterministic and deterministic.confidence > ai_intent.confidence:
        merged_entities = {**entities, **deterministic.entities}
        deterministic.entities = merged_entities
        return deterministic

    return ai_intent


def get_command_suggestions(role: str) -> List[str]:
    """Suggested natural-language commands for the chatbot UI."""
    common = [
        "Clock me in",
        "Open attendance",
        "Show overdue tasks",
        "Apply for leave tomorrow",
        "Log my happy sheet",
    ]
    if role == "admin":
        return common + [
            "Create login task, assign Sai, due Friday",
            "Process payroll for Sai for May 2026",
            "Raise high priority ticket 'DB Slow' assigned to Sai",
            "Approve leave request 1",
            "Schedule meeting 'Board Update' with link 'https://teams.com/l/1'",
            "/nav payroll",
        ]
    return common + [
        "Create subtask for authentication project",
        "Show my tasks",
        "Log my task sheet: Completed API design",
        "Flag task 'API Fixes' as blocked",
    ]


WORKSPACE_PROMPT_EXTENSION = """
─── NATURAL LANGUAGE WORKSPACE OPERATING SYSTEM ──────────────
You are equipped with a dynamic intent execution router that runs actions against all Workforce Pro databases.
Always output the correct "workspace_action" metadata in the JSON response when the user expresses an intent to fetch, create, update, delete, or manage records.

Additional JSON fields (always include):
"workspace_action": {
  "intent": "create_task|update_task|delete_task|assign_task|set_priority|set_status|set_deadline|search_tasks|query_attendance|create_leave|approve_leave|reject_leave|log_attendance|log_task_sheet|log_happy_sheet|log_learning|create_meeting|create_admin_query|comment_ticket|log_time_ticket|pay_salary|flag_task|navigate|none",
  "confidence": 0.0-1.0,
  "auto_execute": true/false,
  "entities": {
    "title": "Task/Meeting/Ticket title",
    "task_reference": "Task title or public ID",
    "assignee_name": "Name of assigned employee",
    "employee_name": "Name of employee to process payroll or leave",
    "due_date": "YYYY-MM-DD",
    "priority": "low|medium|high",
    "status": "todo|in_progress|submitted|approved|reviewing|rejected",
    "workspace_name": "Target workspace",
    "filter": "overdue|all",
    "target": "Navigation route key",
    
    # Extended workflow entities:
    "reason": "Reason for leave or flag",
    "start_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD",
    "leave_type": "sick|personal|vacation|other",
    "leave_id": 123,
    "admin_comment": "Admin review comments",
    "action": "punch_in|punch_out",
    "hours": 8.5,
    "tasks_completed": "List of completed tasks for timesheet",
    "work_impact": "Impact of today's work",
    "time_taken": "Hours or duration spent logging task sheet",
    "repo_link": "Github repository link",
    "what_made_you_happy": "What made you happy (for well-being sheet)",
    "what_made_others_happy": "What made others happy (for well-being sheet)",
    "goals_without_greed": "Goals without greed",
    "dreams_supported": "Dreams supported",
    "goals_without_greed_impossible": "Obstacles encountered",
    "focus": "Learning Focus key phrase",
    "meeting_link": "Microsoft Teams or external meeting link URL",
    "description": "Detailed description of a ticket or task",
    "estimated_hours": 4.0,
    "ticket_id": 123,
    "ticket_title": "Fuzzy support ticket name",
    "comment": "Ticket comment string",
    "hours_spent": 2.5,
    "note": "Work logging description note",
    "month": 1-12,
    "year": 2026,
    "salary": 4500.0
  }
}

Guidelines for Intent Routing:
- "punch in", "clock me in" → log_attendance, action=punch_in, auto_execute=true.
- "punch out", "clock me out" → log_attendance, action=punch_out, auto_execute=true.
- "Apply for sick leave tomorrow" → create_leave, leave_type=sick, start_date=tomorrow, end_date=tomorrow, reason="Feeling unwell", auto_execute=true.
- "Approve leave for Sai" or "Approve leave request 12" → approve_leave, employee_name=Sai, leave_id=12, auto_execute=true.
- "Log my task sheet: Completed API design, took 4 hours" → log_task_sheet, tasks_completed="Completed API design", time_taken="4 hours", auto_execute=true.
- "Log my happy sheet: motivatd by progress, supported Rahul" → log_happy_sheet, what_made_you_happy="motivated by progress", dreams_supported="supported Rahul", auto_execute=true.
- "Schedule a meeting called 'Retro' with link 'http://teams...'" → create_meeting, title="Retro", meeting_link="http://teams...", auto_execute=true.
- "Raise high priority ticket 'database connection slow' assigned to Sai" → create_admin_query, title="database connection slow", assignee_name="Sai", priority="high", auto_execute=true.
- "Process payroll for Sai for May 2026" → pay_salary, employee_name="Sai", month=5, year=2026, auto_execute=true.
- "Flag task 'Auth bug' as blocked because key is invalid" → flag_task, task_reference="Auth bug", reason="key is invalid", auto_execute=true.

Always use Today's Date in context to resolve relative date descriptions (e.g. 'tomorrow', 'next Monday', 'last week').
Prefill defaults if confident (e.g. priority to 'medium', leave_type to 'personal' if not specified).
Set auto_execute=true when all essential fields for that action are present. If some are missing, set needs_clarification=true and ask the user conversationally.
"""
