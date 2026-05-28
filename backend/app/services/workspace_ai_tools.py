"""
OpenAI tool schema and adapters for the Natural Language Workspace engine.

The chatbot keeps returning the existing JSON response shape, while tool calls
feed a normalized workspace_action block into the executor.
"""
from __future__ import annotations

import json
from typing import Any, Dict, Optional


WORKSPACE_TOOL_INTENTS = [
    "create_task",
    "update_task",
    "delete_task",
    "assign_task",
    "set_priority",
    "set_status",
    "set_deadline",
    "search_tasks",
    "query_attendance",
    "create_leave",
    "approve_leave",
    "reject_leave",
    "log_attendance",
    "log_task_sheet",
    "log_happy_sheet",
    "log_learning",
    "create_meeting",
    "create_admin_query",
    "comment_ticket",
    "log_time_ticket",
    "pay_salary",
    "flag_task",
    "navigate",
    "answer_from_context",
    "none",
]


WORKSPACE_ACTION_TOOL: Dict[str, Any] = {
    "type": "function",
    "function": {
        "name": "run_workspace_action",
        "description": (
            "Route a Workforce Pro natural-language request to the best workspace "
            "intent. Use this for actions, data lookups, semantic Q&A over RAG "
            "context, navigation, and multi-step clarifications."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "intent": {
                    "type": "string",
                    "enum": WORKSPACE_TOOL_INTENTS,
                    "description": "The normalized workspace intent to execute.",
                },
                "confidence": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 1,
                    "description": "Model confidence in the selected intent.",
                },
                "auto_execute": {
                    "type": "boolean",
                    "description": (
                        "True only when the request has enough required fields and "
                        "is safe to run immediately."
                    ),
                },
                "reply": {
                    "type": "string",
                    "description": "Concise conversational response or clarification.",
                },
                "needs_clarification": {"type": "boolean"},
                "clarification_question": {"type": ["string", "null"]},
                "suggestions": {
                    "type": ["array", "null"],
                    "items": {"type": "string"},
                },
                "entities": {
                    "type": "object",
                    "description": "Extracted entities needed by the selected intent.",
                    "properties": {
                        "title": {"type": ["string", "null"]},
                        "description": {"type": ["string", "null"]},
                        "task_reference": {"type": ["string", "null"]},
                        "assignee_name": {"type": ["string", "null"]},
                        "employee_name": {"type": ["string", "null"]},
                        "due_date": {"type": ["string", "null"]},
                        "deadline": {"type": ["string", "null"]},
                        "priority": {"type": ["string", "null"], "enum": ["low", "medium", "high", None]},
                        "status": {"type": ["string", "null"]},
                        "workspace_name": {"type": ["string", "null"]},
                        "filter": {"type": ["string", "null"]},
                        "target": {"type": ["string", "null"]},
                        "reason": {"type": ["string", "null"]},
                        "start_date": {"type": ["string", "null"]},
                        "end_date": {"type": ["string", "null"]},
                        "leave_type": {"type": ["string", "null"]},
                        "leave_id": {"type": ["integer", "null"]},
                        "admin_comment": {"type": ["string", "null"]},
                        "action": {"type": ["string", "null"]},
                        "tasks_completed": {"type": ["string", "null"]},
                        "work_impact": {"type": ["string", "null"]},
                        "time_taken": {"type": ["string", "null"]},
                        "repo_link": {"type": ["string", "null"]},
                        "what_made_you_happy": {"type": ["string", "null"]},
                        "what_made_others_happy": {"type": ["string", "null"]},
                        "goals_without_greed": {"type": ["string", "null"]},
                        "dreams_supported": {"type": ["string", "null"]},
                        "goals_without_greed_impossible": {"type": ["string", "null"]},
                        "focus": {"type": ["string", "null"]},
                        "meeting_link": {"type": ["string", "null"]},
                        "estimated_hours": {"type": ["number", "null"]},
                        "ticket_id": {"type": ["integer", "null"]},
                        "ticket_title": {"type": ["string", "null"]},
                        "comment": {"type": ["string", "null"]},
                        "hours_spent": {"type": ["number", "null"]},
                        "note": {"type": ["string", "null"]},
                        "month": {"type": ["integer", "null"]},
                        "year": {"type": ["integer", "null"]},
                        "salary": {"type": ["number", "null"]},
                        "answer": {"type": ["string", "null"]},
                    },
                    "additionalProperties": True,
                },
            },
            "required": ["intent", "confidence", "auto_execute", "reply", "entities"],
            "additionalProperties": False,
        },
    },
}


def tool_call_to_chatbot_response(tool_call: Any) -> Optional[dict]:
    """Convert an OpenAI tool call into the chatbot response schema."""
    if not tool_call:
        return None

    function = getattr(tool_call, "function", None)
    if not function or getattr(function, "name", "") != "run_workspace_action":
        return None

    try:
        args = json.loads(function.arguments or "{}")
    except Exception:
        return None

    intent = (args.get("intent") or "none").strip()
    entities = args.get("entities") or {}
    reply = args.get("reply") or "I'll take care of that."

    response = {
        "reply": reply,
        "navigate_to": None,
        "is_task_intent": intent == "create_task",
        "is_subtask_intent": False,
        "is_leave_intent": intent == "create_leave",
        "task_data": None,
        "leave_data": None,
        "needs_clarification": bool(args.get("needs_clarification", False)),
        "clarification_question": args.get("clarification_question"),
        "suggestions": args.get("suggestions"),
        "workspace_action": {
            "intent": intent,
            "confidence": float(args.get("confidence") or 0.75),
            "auto_execute": bool(args.get("auto_execute", False)),
            "entities": entities,
        },
    }

    if intent == "navigate" and entities.get("target"):
        response["navigate_to"] = entities.get("target")

    if intent == "create_task":
        response["task_data"] = {
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

    if intent == "create_leave":
        response["leave_data"] = {
            "reason": entities.get("reason") or "Leave request",
            "start_date": entities.get("start_date"),
            "end_date": entities.get("end_date"),
            "leave_type": entities.get("leave_type") or "personal",
        }

    if intent == "answer_from_context":
        response["workspace_action"]["intent"] = "none"

    return response
