"""
Workspace action executor — runs NL intents against existing models/services.
"""
from __future__ import annotations

import json
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional

from sqlmodel import Session, select

from app.models import (
    Attendance,
    NotificationType,
    Task,
    TaskPriority,
    TaskStatus,
    User,
    UserRole,
    Workspace,
    LeaveRequest,
    LeaveStatus,
    TaskSheet,
    HappySheet,
    LearningFocus,
    PersonalProject,
    TeamsMeeting,
    AdminQuery,
    QueryStatus,
    Payroll,
    TimeLogEntry,
)
from app.routers.notifications import create_notification
from app.routers.tasks import generate_public_id
from app.services.recurring_tasks import ensure_instances_for_task
from app.services.workspace_nlu import WorkspaceIntent, STATUS_ALIASES


class WorkspaceActionResult:
    def __init__(
        self,
        success: bool,
        reply: str,
        *,
        navigate_to: Optional[str] = None,
        refresh_modules: Optional[List[str]] = None,
        action_executed: bool = False,
        task_data: Optional[dict] = None,
        is_task_intent: bool = False,
        is_leave_intent: bool = False,
        leave_data: Optional[dict] = None,
        needs_clarification: bool = False,
        clarification_question: Optional[str] = None,
        suggestions: Optional[List[str]] = None,
    ):
        self.success = success
        self.reply = reply
        self.navigate_to = navigate_to
        self.refresh_modules = refresh_modules or []
        self.action_executed = action_executed
        self.task_data = task_data
        self.is_task_intent = is_task_intent
        self.is_leave_intent = is_leave_intent
        self.leave_data = leave_data
        self.needs_clarification = needs_clarification
        self.clarification_question = clarification_question
        self.suggestions = suggestions

    def to_response_fields(self) -> dict:
        return {
            "reply": self.reply,
            "navigate_to": self.navigate_to,
            "refresh_modules": self.refresh_modules,
            "action_executed": self.action_executed,
            "task_data": self.task_data,
            "is_task_intent": self.is_task_intent,
            "is_leave_intent": self.is_leave_intent,
            "leave_data": self.leave_data,
            "needs_clarification": self.needs_clarification,
            "clarification_question": self.clarification_question,
            "suggestions": self.suggestions,
        }


def _resolve_user_by_name(name: str, employees: List[dict]) -> Optional[dict]:
    if not name:
        return None
    lower = name.lower()
    for emp in employees:
        en = emp["name"].lower()
        if en == lower or lower in en or en in lower:
            return emp
    return None


def _resolve_workspace(
    workspace_name: Optional[str],
    workspaces: List[dict],
) -> Optional[dict]:
    if workspace_name:
        lower = workspace_name.lower()
        for ws in workspaces:
            wn = ws["name"].lower()
            if wn == lower or lower in wn or wn in lower:
                return ws
    if len(workspaces) == 1:
        return workspaces[0]
    return None


def _find_tasks_by_reference(
    session: Session,
    reference: str,
    organization_id: Optional[int],
    limit: int = 5,
) -> List[Task]:
    ref = (reference or "").strip()
    stmt = select(Task)
    if organization_id is not None:
        stmt = stmt.where(Task.organization_id == organization_id)
    if ref:
        stmt = stmt.where(Task.title.ilike(f"%{ref}%"))
    else:
        stmt = stmt.order_by(Task.updated_at.desc())
    return list(session.exec(stmt.limit(limit)).all())


def _disambiguate_tasks(tasks: List[Task]) -> WorkspaceActionResult:
    if not tasks:
        return WorkspaceActionResult(
            False,
            "I couldn't find a matching task. Try including more of the task title.",
            needs_clarification=True,
            suggestions=[],
        )
    if len(tasks) == 1:
        return WorkspaceActionResult(True, "", suggestions=None)
    titles = [t.title for t in tasks[:5]]
    return WorkspaceActionResult(
        False,
        f"I found multiple tasks: {', '.join(titles)}. Which one did you mean?",
        needs_clarification=True,
        suggestions=titles,
    )


def _notify_task_activity(
    session: Session,
    task: Task,
    actor: User,
    message: str,
) -> None:
    """Activity timeline via notifications."""
    if task.assigned_to:
        create_notification(
            session=session,
            user_id=task.assigned_to,
            type=NotificationType.TASK_COMMENT,
            message=message,
            task_id=task.id,
        )
    create_notification(
        session=session,
        user_id=actor.id,
        type=NotificationType.TASK_COMMENT,
        message=message,
        task_id=task.id,
    )


def execute_create_task(
    session: Session,
    user: User,
    entities: dict,
    employees: List[dict],
    workspaces: List[dict],
) -> WorkspaceActionResult:
    title = (entities.get("title") or "").strip()
    if not title:
        return WorkspaceActionResult(
            False,
            "What should the task be called?",
            is_task_intent=True,
            task_data=_entities_to_task_data(entities),
            needs_clarification=True,
            clarification_question="Please provide a task title.",
        )

    assignee = _resolve_user_by_name(entities.get("assignee_name") or "", employees)
    workspace = _resolve_workspace(entities.get("workspace_name"), workspaces)

    missing = []
    if not workspace:
        missing.append("workspace")
    if not assignee:
        missing.append("assignee")

    task_data = _entities_to_task_data(entities)
    if assignee:
        task_data["assignee_id"] = assignee["id"]
        task_data["assignee_name"] = assignee["name"]
    if workspace:
        task_data["workspace_id"] = workspace["id"]
        task_data["workspace_name"] = workspace["name"]

    if missing:
        suggestions = None
        if "workspace" in missing:
            suggestions = [w["name"] for w in workspaces[:5]]
        elif "assignee" in missing:
            suggestions = [e["name"] for e in employees[:5]]
        return WorkspaceActionResult(
            False,
            "I still need: " + ", ".join(missing) + ".",
            is_task_intent=True,
            task_data=task_data,
            needs_clarification=True,
            clarification_question="I still need: " + ", ".join(missing) + ".",
            suggestions=suggestions,
        )

    try:
        priority = TaskPriority((entities.get("priority") or "medium").lower())
    except ValueError:
        priority = TaskPriority.medium

    due_date = None
    raw_due = entities.get("due_date") or entities.get("deadline")
    if raw_due:
        try:
            due_date = datetime.strptime(str(raw_due)[:10], "%Y-%m-%d").date()
        except ValueError:
            pass

    task = Task(
        title=title,
        description=entities.get("description") or "",
        priority=priority,
        due_date=due_date,
        workspace_id=workspace["id"],
        organization_id=user.organization_id,
        assigned_to=assignee["id"],
        assigned_by=user.id,
        public_id=generate_public_id(session, Task),
        is_recurring=bool(entities.get("is_recurring")),
    )
    session.add(task)
    session.commit()
    session.refresh(task)

    if task.is_recurring:
        ensure_instances_for_task(session, task, horizon_days=120, past_days=7)

    assignee_user = session.get(User, assignee["id"])
    if assignee_user:
        create_notification(
            session=session,
            user_id=assignee_user.id,
            type=NotificationType.TASK_ASSIGNED,
            message=f"New task assigned: Task #{task.id} - {task.title}",
            task_id=task.id,
        )

    due_phrase = f" with deadline set for {due_date.strftime('%A, %B %d')}" if due_date else ""
    return WorkspaceActionResult(
        True,
        f"**{task.title}** created and assigned to **{assignee['name']}**{due_phrase}.",
        action_executed=True,
        refresh_modules=["tasks", "project-management", "notifications"],
        navigate_to="/project-management/projects",
    )


def _entities_to_task_data(entities: dict) -> dict:
    return {
        "title": entities.get("title") or "",
        "description": entities.get("description") or "",
        "workspace_name": entities.get("workspace_name"),
        "workspace_id": entities.get("workspace_id"),
        "assignee_name": entities.get("assignee_name"),
        "assignee_id": entities.get("assignee_id"),
        "priority": entities.get("priority") or "medium",
        "deadline": entities.get("due_date") or entities.get("deadline"),
        "recurrence_preference_set": entities.get("recurrence_preference_set", True),
        "is_recurring": entities.get("is_recurring", False),
    }


def execute_assign_task(
    session: Session,
    user: User,
    entities: dict,
    employees: List[dict],
) -> WorkspaceActionResult:
    ref = entities.get("task_reference") or entities.get("title") or ""
    tasks = _find_tasks_by_reference(session, ref, user.organization_id)
    check = _disambiguate_tasks(tasks)
    if check.needs_clarification:
        check.reply = check.reply or f"I couldn't find task '{ref}'."
        return check

    task = tasks[0]
    assignee = _resolve_user_by_name(entities.get("assignee_name") or "", employees)
    if not assignee:
        return WorkspaceActionResult(
            False,
            "Who should I assign this task to?",
            needs_clarification=True,
            suggestions=[e["name"] for e in employees[:5]],
        )

    task.assigned_to = assignee["id"]
    task.updated_at = datetime.now(timezone.utc)
    session.add(task)
    session.commit()
    session.refresh(task)

    _notify_task_activity(
        session,
        task,
        user,
        f"{user.name} assigned task '{task.title}' to {assignee['name']} via AI Assistant.",
    )
    create_notification(
        session=session,
        user_id=assignee["id"],
        type=NotificationType.TASK_ASSIGNED,
        message=f"Task #{task.id} - {task.title} assigned to you",
        task_id=task.id,
    )

    return WorkspaceActionResult(
        True,
        f"**{task.title}** assigned to **{assignee['name']}**.",
        action_executed=True,
        refresh_modules=["tasks", "project-management", "notifications"],
    )


def execute_set_status(
    session: Session,
    user: User,
    entities: dict,
) -> WorkspaceActionResult:
    ref = entities.get("task_reference") or ""
    status_raw = (entities.get("status") or "").lower()
    canonical = STATUS_ALIASES.get(status_raw, status_raw)

    tasks = _find_tasks_by_reference(session, ref, user.organization_id)
    check = _disambiguate_tasks(tasks)
    if check.needs_clarification:
        return check

    task = tasks[0]
    role = user.role.value if hasattr(user.role, "value") else str(user.role)

    try:
        new_status = TaskStatus(canonical)
    except ValueError:
        return WorkspaceActionResult(
            False,
            f"I don't recognize status '{status_raw}'. Try: in progress, done, or approved.",
            needs_clarification=True,
            suggestions=["in progress", "done", "approved", "todo"],
        )

    if role == "employee":
        if task.assigned_to != user.id:
            return WorkspaceActionResult(False, "You can only update status on tasks assigned to you.")
        allowed = {TaskStatus.todo, TaskStatus.in_progress, TaskStatus.submitted, TaskStatus.rejected}
        if new_status not in allowed:
            return WorkspaceActionResult(False, "Employees can set status to: To Do, In Progress, Done, or Ignore.")
        task.status = new_status
        if new_status == TaskStatus.submitted:
            task.done_by_employee = True
    else:
        if new_status in (TaskStatus.approved, TaskStatus.rejected, TaskStatus.reviewing):
            task.status = new_status
            if new_status == TaskStatus.approved:
                task.completed_at = task.completed_at or datetime.now(timezone.utc)
        else:
            task.status = new_status

    task.updated_at = datetime.now(timezone.utc)
    session.add(task)
    session.commit()
    session.refresh(task)

    _notify_task_activity(
        session,
        task,
        user,
        f"{user.name} moved '{task.title}' to {new_status.value.replace('_', ' ')} via AI Assistant.",
    )

    return WorkspaceActionResult(
        True,
        f"**{task.title}** marked as **{new_status.value.replace('_', ' ')}**.",
        action_executed=True,
        refresh_modules=["tasks", "project-management"],
    )


def execute_set_priority(
    session: Session,
    user: User,
    entities: dict,
) -> WorkspaceActionResult:
    ref = entities.get("task_reference") or ""
    priority_raw = (entities.get("priority") or "medium").lower()
    try:
        priority = TaskPriority(priority_raw)
    except ValueError:
        return WorkspaceActionResult(False, "Priority must be low, medium, or high.")

    tasks = _find_tasks_by_reference(session, ref, user.organization_id)
    check = _disambiguate_tasks(tasks)
    if check.needs_clarification:
        return check

    task = tasks[0]
    task.priority = priority
    task.updated_at = datetime.now(timezone.utc)
    session.add(task)
    session.commit()

    _notify_task_activity(
        session,
        task,
        user,
        f"{user.name} set priority of '{task.title}' to {priority.value} via AI Assistant.",
    )

    return WorkspaceActionResult(
        True,
        f"Priority for **{task.title}** set to **{priority.value}**.",
        action_executed=True,
        refresh_modules=["tasks", "project-management"],
    )


def execute_set_deadline(
    session: Session,
    user: User,
    entities: dict,
) -> WorkspaceActionResult:
    ref = entities.get("task_reference") or ""
    raw_due = entities.get("due_date") or entities.get("deadline")
    if not raw_due:
        return WorkspaceActionResult(False, "What due date should I set?", needs_clarification=True)

    try:
        due_date = datetime.strptime(str(raw_due)[:10], "%Y-%m-%d").date()
    except ValueError:
        return WorkspaceActionResult(False, "I couldn't parse that date. Try 'Friday' or '2026-05-30'.")

    tasks = _find_tasks_by_reference(session, ref, user.organization_id)
    check = _disambiguate_tasks(tasks)
    if check.needs_clarification:
        return check

    task = tasks[0]
    task.due_date = due_date
    task.updated_at = datetime.now(timezone.utc)
    session.add(task)
    session.commit()

    _notify_task_activity(
        session,
        task,
        user,
        f"{user.name} set deadline for '{task.title}' to {due_date.isoformat()} via AI Assistant.",
    )

    return WorkspaceActionResult(
        True,
        f"Deadline for **{task.title}** set to **{due_date.strftime('%A, %B %d')}**.",
        action_executed=True,
        refresh_modules=["tasks", "project-management"],
    )


def execute_delete_task(
    session: Session,
    user: User,
    entities: dict,
) -> WorkspaceActionResult:
    ref = entities.get("task_reference") or ""
    tasks = _find_tasks_by_reference(session, ref, user.organization_id)
    check = _disambiguate_tasks(tasks)
    if check.needs_clarification:
        return check

    task = tasks[0]
    title = task.title
    session.delete(task)
    session.commit()

    return WorkspaceActionResult(
        True,
        f"Deleted task **{title}**.",
        action_executed=True,
        refresh_modules=["tasks", "project-management"],
    )


def execute_search_tasks(
    session: Session,
    user: User,
    entities: dict,
) -> WorkspaceActionResult:
    today = date.today()
    stmt = select(Task)
    if user.organization_id is not None:
        stmt = stmt.where(Task.organization_id == user.organization_id)

    if entities.get("filter") == "overdue":
        stmt = stmt.where(Task.due_date != None, Task.due_date < today)  # noqa: E711
        stmt = stmt.where(Task.status != TaskStatus.approved)

    tasks = list(session.exec(stmt.order_by(Task.due_date.asc()).limit(10)).all())

    if not tasks:
        return WorkspaceActionResult(
            True,
            "No matching tasks found.",
            navigate_to="/project-management/projects",
        )

    lines = [f"• **{t.title}** — {t.status.value}, due {t.due_date or 'no date'}" for t in tasks]
    return WorkspaceActionResult(
        True,
        "Here are the matching tasks:\n\n" + "\n".join(lines),
        navigate_to="/project-management/projects",
        refresh_modules=["tasks"],
    )


def execute_query_attendance(
    session: Session,
    user: User,
    entities: dict,
) -> WorkspaceActionResult:
    today = date.today()
    records = session.exec(
        select(Attendance).where(
            Attendance.user_id == user.id,
            Attendance.date == today,
        )
    ).all()

    if not records:
        return WorkspaceActionResult(
            True,
            "You have no attendance record for today yet.",
            navigate_to="/attendance",
        )

    rec = records[0]
    hours = rec.total_hours or 0
    punched = "Yes" if rec.punch_in else "No"
    return WorkspaceActionResult(
        True,
        f"Today's attendance: punched in = **{punched}**, total hours = **{hours:.1f}**.",
        navigate_to="/attendance",
    )


def _is_admin(user: User) -> bool:
    role = user.role.value if hasattr(user.role, "value") else str(user.role)
    return role == "admin"


def _parse_date(value: Any, fallback: Optional[date] = None) -> Optional[date]:
    if not value:
        return fallback
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    try:
        return datetime.strptime(str(value)[:10], "%Y-%m-%d").date()
    except ValueError:
        return fallback


def _resolve_ticket(
    session: Session,
    user: User,
    entities: dict,
) -> tuple[Optional[AdminQuery], Optional[WorkspaceActionResult]]:
    ticket_id = entities.get("ticket_id")
    stmt = select(AdminQuery).where(AdminQuery.organization_id == user.organization_id)
    if ticket_id:
        ticket = session.get(AdminQuery, int(ticket_id))
        if not ticket or ticket.organization_id != user.organization_id:
            return None, WorkspaceActionResult(False, "I could not find that ticket.", needs_clarification=True)
        return ticket, None

    ref = (entities.get("ticket_title") or entities.get("title") or "").strip()
    if ref:
        stmt = stmt.where(AdminQuery.title.ilike(f"%{ref}%"))
    elif not _is_admin(user):
        stmt = stmt.where((AdminQuery.raised_by == user.id) | (AdminQuery.assigned_to == user.id))
    tickets = list(session.exec(stmt.order_by(AdminQuery.updated_at.desc()).limit(5)).all())

    if not tickets:
        return None, WorkspaceActionResult(
            False,
            "I could not find a matching ticket. Try the ticket number or more of the title.",
            needs_clarification=True,
        )
    if len(tickets) > 1:
        return None, WorkspaceActionResult(
            False,
            "I found multiple tickets. Which one did you mean?",
            needs_clarification=True,
            suggestions=[f"#{t.id} {t.title}" for t in tickets],
        )
    return tickets[0], None


def execute_log_attendance(
    session: Session,
    user: User,
    entities: dict,
) -> WorkspaceActionResult:
    action = (entities.get("action") or "").lower()
    now = datetime.now(timezone.utc)
    today = date.today()

    if action not in ("punch_in", "punch_out"):
        return WorkspaceActionResult(
            False,
            "Should I punch you in or punch you out?",
            needs_clarification=True,
            suggestions=["Punch in", "Punch out"],
        )

    active = session.exec(
        select(Attendance).where(
            Attendance.user_id == user.id,
            Attendance.organization_id == user.organization_id,
            Attendance.punch_out == None,  # noqa: E711
        ).order_by(Attendance.punch_in.desc())
    ).first()

    if action == "punch_in":
        if active:
            return WorkspaceActionResult(
                True,
                "You are already punched in.",
                navigate_to="/attendance",
                refresh_modules=["attendance"],
            )
        record = Attendance(
            organization_id=user.organization_id,
            user_id=user.id,
            date=today,
            punch_in=now,
        )
        session.add(record)
        session.commit()
        return WorkspaceActionResult(
            True,
            "You are punched in. Have a focused session.",
            action_executed=True,
            navigate_to="/attendance",
            refresh_modules=["attendance"],
        )

    if not active:
        return WorkspaceActionResult(
            False,
            "I could not find an active punch-in session.",
            needs_clarification=True,
            navigate_to="/attendance",
        )

    active.punch_out = now
    if active.punch_in:
        punch_in = active.punch_in if active.punch_in.tzinfo else active.punch_in.replace(tzinfo=timezone.utc)
        active.total_hours = max(0, round((now - punch_in).total_seconds() / 3600, 2))
    session.add(active)
    session.commit()
    return WorkspaceActionResult(
        True,
        f"You are punched out. Total time: **{active.total_hours or 0:.2f} hours**.",
        action_executed=True,
        navigate_to="/attendance",
        refresh_modules=["attendance"],
    )


def execute_create_leave(
    session: Session,
    user: User,
    entities: dict,
) -> WorkspaceActionResult:
    start = _parse_date(entities.get("start_date"))
    end = _parse_date(entities.get("end_date"), fallback=start)
    if not start or not end:
        return WorkspaceActionResult(
            False,
            "What dates should I use for the leave request?",
            is_leave_intent=True,
            leave_data={
                "reason": entities.get("reason") or "Leave request",
                "start_date": entities.get("start_date"),
                "end_date": entities.get("end_date"),
                "leave_type": entities.get("leave_type") or "personal",
            },
            needs_clarification=True,
            suggestions=["Tomorrow", "Next Monday", "This Friday"],
        )
    if end < start:
        return WorkspaceActionResult(False, "The leave end date must be after the start date.", needs_clarification=True)

    leave = LeaveRequest(
        organization_id=user.organization_id,
        user_id=user.id,
        reason=entities.get("reason") or "Leave request",
        start_date=start,
        end_date=end,
        leave_type=entities.get("leave_type") or "personal",
    )
    session.add(leave)
    session.commit()
    session.refresh(leave)

    return WorkspaceActionResult(
        True,
        f"Leave request submitted for **{start.isoformat()}** to **{end.isoformat()}**.",
        action_executed=True,
        is_leave_intent=True,
        leave_data={
            "reason": leave.reason,
            "start_date": leave.start_date.isoformat(),
            "end_date": leave.end_date.isoformat(),
            "leave_type": leave.leave_type,
        },
        refresh_modules=["requests", "notifications"],
        navigate_to="/requests",
    )


def execute_review_leave(
    session: Session,
    user: User,
    entities: dict,
    status_value: LeaveStatus,
    employees: List[dict],
) -> WorkspaceActionResult:
    if not _is_admin(user):
        return WorkspaceActionResult(False, "Only admins can approve or reject leave requests.")

    leave_id = entities.get("leave_id")
    stmt = select(LeaveRequest).where(
        LeaveRequest.organization_id == user.organization_id,
        LeaveRequest.status == LeaveStatus.pending,
    )
    if leave_id:
        stmt = stmt.where(LeaveRequest.id == int(leave_id))
    else:
        employee = _resolve_user_by_name(entities.get("employee_name") or "", employees)
        if employee:
            stmt = stmt.where(LeaveRequest.user_id == employee["id"])
    leaves = list(session.exec(stmt.order_by(LeaveRequest.created_at.asc()).limit(5)).all())

    if not leaves:
        return WorkspaceActionResult(False, "I could not find a pending leave request to review.", needs_clarification=True)
    if len(leaves) > 1:
        return WorkspaceActionResult(
            False,
            "I found multiple pending leave requests. Which one should I review?",
            needs_clarification=True,
            suggestions=[f"Leave request {l.id}" for l in leaves],
        )

    leave = leaves[0]
    leave.status = status_value
    leave.admin_comment = entities.get("admin_comment")
    leave.reviewed_by = user.id
    leave.reviewed_at = datetime.now(timezone.utc)
    session.add(leave)
    session.commit()

    notif_type = NotificationType.LEAVE_APPROVED if status_value == LeaveStatus.approved else NotificationType.LEAVE_REJECTED
    create_notification(
        session=session,
        user_id=leave.user_id,
        type=notif_type,
        message=f"Your leave request #{leave.id} was {status_value.value}.",
    )

    return WorkspaceActionResult(
        True,
        f"Leave request **#{leave.id}** {status_value.value}.",
        action_executed=True,
        refresh_modules=["requests", "notifications"],
        navigate_to="/requests",
    )


def execute_log_task_sheet(session: Session, user: User, entities: dict) -> WorkspaceActionResult:
    completed = (entities.get("tasks_completed") or entities.get("description") or "").strip()
    if not completed:
        return WorkspaceActionResult(False, "What did you complete today?", needs_clarification=True)

    entry_date = _parse_date(entities.get("date"), fallback=date.today()) or date.today()
    existing = session.exec(
        select(TaskSheet).where(
            TaskSheet.user_id == user.id,
            TaskSheet.organization_id == user.organization_id,
            TaskSheet.date == entry_date,
        )
    ).first()
    sheet = existing or TaskSheet(
        organization_id=user.organization_id,
        user_id=user.id,
        date=entry_date,
        tasks_completed=completed,
        work_impact=entities.get("work_impact") or "Logged via AI assistant",
        time_taken=entities.get("time_taken") or "N/A",
        repo_link=entities.get("repo_link"),
    )
    sheet.tasks_completed = completed
    sheet.work_impact = entities.get("work_impact") or sheet.work_impact or "Logged via AI assistant"
    sheet.time_taken = entities.get("time_taken") or sheet.time_taken or "N/A"
    sheet.repo_link = entities.get("repo_link") or sheet.repo_link
    session.add(sheet)
    session.commit()
    return WorkspaceActionResult(
        True,
        "Task sheet logged.",
        action_executed=True,
        refresh_modules=["my-space"],
        navigate_to="/my-space/task-sheet",
    )


def execute_log_happy_sheet(session: Session, user: User, entities: dict) -> WorkspaceActionResult:
    main = (entities.get("what_made_you_happy") or entities.get("description") or "").strip()
    if not main:
        return WorkspaceActionResult(False, "What should I write in your happy sheet?", needs_clarification=True)

    entry_date = _parse_date(entities.get("date"), fallback=date.today()) or date.today()
    existing = session.exec(select(HappySheet).where(HappySheet.user_id == user.id, HappySheet.date == entry_date)).first()
    sheet = existing or HappySheet(
        user_id=user.id,
        date=entry_date,
        what_made_you_happy=main,
        what_made_others_happy=entities.get("what_made_others_happy") or "Shared positive progress",
        goals_without_greed=entities.get("goals_without_greed") or "Grow steadily and help the team",
        dreams_supported=entities.get("dreams_supported") or "Supported team goals",
        goals_without_greed_impossible=entities.get("goals_without_greed_impossible") or "",
    )
    sheet.what_made_you_happy = main
    sheet.what_made_others_happy = entities.get("what_made_others_happy") or sheet.what_made_others_happy
    sheet.goals_without_greed = entities.get("goals_without_greed") or sheet.goals_without_greed
    sheet.dreams_supported = entities.get("dreams_supported") or sheet.dreams_supported
    sheet.goals_without_greed_impossible = entities.get("goals_without_greed_impossible") or sheet.goals_without_greed_impossible
    session.add(sheet)
    session.commit()
    return WorkspaceActionResult(
        True,
        "Happy sheet logged.",
        action_executed=True,
        refresh_modules=["my-space"],
        navigate_to="/my-space/happy-sheet",
    )


def execute_log_learning(session: Session, user: User, entities: dict) -> WorkspaceActionResult:
    focus = (entities.get("focus") or entities.get("title") or entities.get("description") or "").strip()
    if not focus:
        return WorkspaceActionResult(False, "What learning focus should I save?", needs_clarification=True)
    entry = LearningFocus(user_id=user.id, focus=focus)
    session.add(entry)
    session.commit()
    return WorkspaceActionResult(
        True,
        f"Learning focus saved: **{focus}**.",
        action_executed=True,
        refresh_modules=["my-space"],
        navigate_to="/my-space/learning-canvas",
    )


def execute_create_meeting(session: Session, user: User, entities: dict) -> WorkspaceActionResult:
    if not _is_admin(user):
        return WorkspaceActionResult(False, "Only admins can share the active meeting link.")
    title = (entities.get("title") or "Team meeting").strip()
    link = (entities.get("meeting_link") or "").strip()
    if not link:
        return WorkspaceActionResult(False, "Please provide the meeting link.", needs_clarification=True)

    active = session.exec(select(TeamsMeeting).where(TeamsMeeting.is_active == True)).all()  # noqa: E712
    for meeting in active:
        meeting.is_active = False
        session.add(meeting)
    meeting = TeamsMeeting(title=title, meeting_link=link, created_by=user.id, is_active=True)
    session.add(meeting)
    session.commit()
    return WorkspaceActionResult(
        True,
        f"Meeting **{title}** shared with the team.",
        action_executed=True,
        refresh_modules=["teams", "notifications"],
    )


def execute_create_admin_query(
    session: Session,
    user: User,
    entities: dict,
    employees: List[dict],
    workspaces: List[dict],
) -> WorkspaceActionResult:
    title = (entities.get("title") or "").strip()
    if not title:
        return WorkspaceActionResult(False, "What should the ticket be called?", needs_clarification=True)
    workspace = _resolve_workspace(entities.get("workspace_name"), workspaces)
    if not workspace:
        return WorkspaceActionResult(
            False,
            "Which workspace should this ticket belong to?",
            needs_clarification=True,
            suggestions=[w["name"] for w in workspaces[:5]],
        )
    assignee = _resolve_user_by_name(entities.get("assignee_name") or "", employees)
    try:
        priority = TaskPriority((entities.get("priority") or "medium").lower())
    except ValueError:
        priority = TaskPriority.medium

    ticket = AdminQuery(
        organization_id=user.organization_id,
        workspace_id=workspace["id"],
        raised_by=user.id,
        assigned_to=assignee["id"] if assignee else None,
        title=title,
        description=entities.get("description"),
        priority=priority,
        estimated_hours=entities.get("estimated_hours"),
        actual_hours_logged=0.0,
    )
    session.add(ticket)
    session.commit()
    session.refresh(ticket)

    if assignee:
        create_notification(
            session=session,
            user_id=assignee["id"],
            type=NotificationType.ADMIN_QUERY_RAISED,
            message=f"Ticket #{ticket.id} - {ticket.title} assigned to you",
        )

    return WorkspaceActionResult(
        True,
        f"Ticket **#{ticket.id} {ticket.title}** created.",
        action_executed=True,
        refresh_modules=["admin-queries", "notifications"],
        navigate_to="/admin/queries" if _is_admin(user) else "/requests",
    )


def execute_comment_ticket(session: Session, user: User, entities: dict) -> WorkspaceActionResult:
    ticket, issue = _resolve_ticket(session, user, entities)
    if issue:
        return issue
    comment = (entities.get("comment") or entities.get("note") or "").strip()
    if not comment:
        return WorkspaceActionResult(False, "What comment should I add?", needs_clarification=True)

    from app.models import TicketComment

    entry = TicketComment(admin_query_id=ticket.id, user_id=user.id, content=comment)
    ticket.updated_at = datetime.now(timezone.utc)
    session.add(entry)
    session.add(ticket)
    session.commit()
    return WorkspaceActionResult(
        True,
        f"Comment added to ticket **#{ticket.id}**.",
        action_executed=True,
        refresh_modules=["admin-queries"],
        navigate_to=f"/admin/tickets/{ticket.id}" if _is_admin(user) else "/requests",
    )


def execute_log_time_ticket(session: Session, user: User, entities: dict) -> WorkspaceActionResult:
    ticket, issue = _resolve_ticket(session, user, entities)
    if issue:
        return issue
    hours = entities.get("hours_spent")
    try:
        hours_value = float(hours)
    except (TypeError, ValueError):
        return WorkspaceActionResult(False, "How many hours should I log?", needs_clarification=True)
    if hours_value <= 0 or hours_value > 24:
        return WorkspaceActionResult(False, "Hours must be between 0 and 24.", needs_clarification=True)

    entry = TimeLogEntry(
        admin_query_id=ticket.id,
        user_id=user.id,
        hours_spent=hours_value,
        note=entities.get("note"),
    )
    ticket.actual_hours_logged = (ticket.actual_hours_logged or 0) + hours_value
    ticket.updated_at = datetime.now(timezone.utc)
    session.add(entry)
    session.add(ticket)
    session.commit()
    return WorkspaceActionResult(
        True,
        f"Logged **{hours_value:g} hours** on ticket **#{ticket.id}**.",
        action_executed=True,
        refresh_modules=["admin-queries"],
        navigate_to=f"/admin/tickets/{ticket.id}" if _is_admin(user) else "/requests",
    )


def execute_pay_salary(session: Session, user: User, entities: dict, employees: List[dict]) -> WorkspaceActionResult:
    if not _is_admin(user):
        return WorkspaceActionResult(False, "Only admins can process payroll.")
    employee = _resolve_user_by_name(entities.get("employee_name") or "", employees)
    if not employee:
        return WorkspaceActionResult(
            False,
            "Which employee should I process payroll for?",
            needs_clarification=True,
            suggestions=[e["name"] for e in employees[:5]],
        )
    today = date.today()
    month = int(entities.get("month") or today.month)
    year = int(entities.get("year") or today.year)
    emp_user = session.get(User, employee["id"])
    if not emp_user:
        return WorkspaceActionResult(False, "I could not find that employee.", needs_clarification=True)

    record = session.exec(
        select(Payroll).where(
            Payroll.organization_id == user.organization_id,
            Payroll.employee_id == emp_user.id,
            Payroll.month == month,
            Payroll.year == year,
        )
    ).first()
    if not record:
        record = Payroll(
            organization_id=user.organization_id,
            employee_id=emp_user.id,
            month=month,
            year=year,
            salary=float(entities.get("salary") or emp_user.base_salary or 0.0),
        )
    record.status = "Paid"
    record.pay_date = today
    session.add(record)
    session.commit()
    create_notification(
        session=session,
        user_id=emp_user.id,
        type=NotificationType.SALARY_PAID,
        message=f"Your salary for {month}/{year} has been marked paid.",
    )
    return WorkspaceActionResult(
        True,
        f"Payroll for **{emp_user.name}** marked paid for **{month}/{year}**.",
        action_executed=True,
        refresh_modules=["payroll", "notifications"],
        navigate_to="/payroll",
    )


def execute_flag_task(session: Session, user: User, entities: dict) -> WorkspaceActionResult:
    tasks = _find_tasks_by_reference(session, entities.get("task_reference") or "", user.organization_id)
    check = _disambiguate_tasks(tasks)
    if check.needs_clarification:
        return check
    task = tasks[0]
    task.is_flagged = True
    task.flag_reason = entities.get("reason") or "Flagged via AI assistant"
    task.flagged_by = user.id
    task.flagged_at = datetime.now(timezone.utc)
    task.updated_at = datetime.now(timezone.utc)
    session.add(task)
    session.commit()
    _notify_task_activity(session, task, user, f"{user.name} flagged '{task.title}': {task.flag_reason}")
    return WorkspaceActionResult(
        True,
        f"Flagged **{task.title}** for review.",
        action_executed=True,
        refresh_modules=["tasks", "project-management", "notifications"],
        navigate_to="/project-management/projects",
    )


def execute_workspace_intent(
    intent: WorkspaceIntent,
    session: Session,
    user: User,
    employees: List[dict],
    workspaces: List[dict],
    *,
    resolve_nav,
) -> Optional[WorkspaceActionResult]:
    """Run a workspace intent. Returns None if intent should fall through to legacy chatbot."""
    if not intent or intent.intent in ("none", "unknown_slash", "help"):
        if intent and intent.intent == "help":
            return WorkspaceActionResult(
                True,
                "Try commands like: **Create login task, assign Sai, due Friday**, **Show overdue tasks**, **Open attendance**, or slash commands: `/nav payroll`, `/task show overdue`.",
            )
        return None

    if not intent.auto_execute and intent.intent == "create_task":
        return WorkspaceActionResult(
            True,
            "I drafted this task for you — review and confirm below.",
            is_task_intent=True,
            task_data=_entities_to_task_data(intent.entities),
        )

    handlers = {
        "create_task": lambda: execute_create_task(session, user, intent.entities, employees, workspaces),
        "assign_task": lambda: execute_assign_task(session, user, intent.entities, employees),
        "set_status": lambda: execute_set_status(session, user, intent.entities),
        "set_priority": lambda: execute_set_priority(session, user, intent.entities),
        "set_deadline": lambda: execute_set_deadline(session, user, intent.entities),
        "delete_task": lambda: execute_delete_task(session, user, intent.entities),
        "search_tasks": lambda: execute_search_tasks(session, user, intent.entities),
        "query_attendance": lambda: execute_query_attendance(session, user, intent.entities),
        "log_attendance": lambda: execute_log_attendance(session, user, intent.entities),
        "create_leave": lambda: execute_create_leave(session, user, intent.entities),
        "approve_leave": lambda: execute_review_leave(session, user, intent.entities, LeaveStatus.approved, employees),
        "reject_leave": lambda: execute_review_leave(session, user, intent.entities, LeaveStatus.rejected, employees),
        "log_task_sheet": lambda: execute_log_task_sheet(session, user, intent.entities),
        "log_happy_sheet": lambda: execute_log_happy_sheet(session, user, intent.entities),
        "log_learning": lambda: execute_log_learning(session, user, intent.entities),
        "create_meeting": lambda: execute_create_meeting(session, user, intent.entities),
        "create_admin_query": lambda: execute_create_admin_query(session, user, intent.entities, employees, workspaces),
        "comment_ticket": lambda: execute_comment_ticket(session, user, intent.entities),
        "log_time_ticket": lambda: execute_log_time_ticket(session, user, intent.entities),
        "pay_salary": lambda: execute_pay_salary(session, user, intent.entities, employees),
        "flag_task": lambda: execute_flag_task(session, user, intent.entities),
        "navigate": lambda: _execute_navigate(intent, user, resolve_nav),
    }

    handler = handlers.get(intent.intent)
    if not handler:
        return None

    if not intent.auto_execute and intent.intent not in ("search_tasks", "query_attendance", "navigate"):
        return None

    return handler()


def _execute_navigate(intent: WorkspaceIntent, user: User, resolve_nav) -> WorkspaceActionResult:
    target = intent.entities.get("target") or ""
    route = resolve_nav(target)
    if not route:
        return WorkspaceActionResult(
            False,
            f"I couldn't find a page matching '{target}'.",
            needs_clarification=True,
        )
    return WorkspaceActionResult(
        True,
        f"Opening {target or 'that section'} for you.",
        navigate_to=route,
        action_executed=True,
    )
