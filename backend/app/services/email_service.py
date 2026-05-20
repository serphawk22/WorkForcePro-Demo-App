"""
Email sending utilities for WorkForce Pro.
"""
from __future__ import annotations

import json
import os
import re
import smtplib
from email.message import EmailMessage
from typing import Any, Optional, Tuple

DEFAULT_SMTP_HOST = "smtp.gmail.com"
DEFAULT_SMTP_PORT = 587

DEFAULT_EMPLOYEE_EMAILS = {
    "anjali": "vkanjali@serphawk.com",
    "bhavani prasanth anupoju": "anupojubhavani9849@gmail.com",
    "kruti jadav": "krutipankajkumar@gmail.com",
    "n b rachana": "nbrachana26@gmail.com",
    "paardhiv reddy tumma": "pardivreddy22@gmail.com",
    "ragavan e": "eragavan573@gmail.com",
    "rinu george": "rinugeorgep@gmail.com",
    "varshith": "varshivarshith4@gmail.com",
    "vijay": "lvijay1720@gmail.com",
}


def _get_email_config() -> dict[str, Optional[str]]:
    email_user = os.getenv("EMAIL_USER", "").strip()
    email_password = os.getenv("EMAIL_PASSWORD", "").strip()
    email_host = os.getenv("EMAIL_HOST", DEFAULT_SMTP_HOST).strip()
    email_port = int(os.getenv("EMAIL_PORT", str(DEFAULT_SMTP_PORT)).strip() or DEFAULT_SMTP_PORT)
    use_tls = os.getenv("EMAIL_USE_TLS", "true").strip().lower() in ("1", "true", "yes")
    from_address = os.getenv("EMAIL_FROM_ADDRESS", email_user).strip() or email_user
    frontend_url = os.getenv("FRONTEND_URL", "").strip().rstrip("/")

    return {
        "email_user": email_user,
        "email_password": email_password,
        "email_host": email_host,
        "email_port": email_port,
        "use_tls": use_tls,
        "from_address": from_address,
        "frontend_url": frontend_url,
    }


def _normalize_person_name(value: Optional[str]) -> str:
    lowered = (value or "").lower()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", lowered)).strip()


def _load_employee_email_overrides() -> dict[str, str]:
    raw = os.getenv("EMPLOYEE_EMAIL_MAP", "").strip()
    if not raw:
        return {}

    parsed: dict[str, str] = {}
    try:
        data = json.loads(raw)
        items = data.items() if isinstance(data, dict) else []
    except json.JSONDecodeError:
        items = []
        for piece in re.split(r"[;,]\s*", raw):
            if not piece or "=" not in piece:
                continue
            name, email = piece.split("=", 1)
            items.append((name, email))

    for name, email in items:
        normalized = _normalize_person_name(str(name))
        clean_email = str(email).strip()
        if normalized and "@" in clean_email:
            parsed[normalized] = clean_email
    return parsed


def get_employee_email_for_name(name: Optional[str]) -> Optional[str]:
    """Return an email only when the employee's name is explicitly mapped."""
    default_emails = {
        _normalize_person_name(employee_name): email
        for employee_name, email in DEFAULT_EMPLOYEE_EMAILS.items()
    }
    return {
        **default_emails,
        **_load_employee_email_overrides(),
    }.get(_normalize_person_name(name))


def get_employee_delivery_email(user: Any) -> Optional[str]:
    """Return an email only for employees present in the manual name-to-email map."""
    return get_employee_email_for_name(getattr(user, "name", None))


def _task_link(task_id: int) -> Optional[str]:
    frontend_url = (_get_email_config().get("frontend_url") or "").rstrip("/")
    if not frontend_url:
        return None
    return f"{frontend_url}/project-management/{task_id}"


def send_email(
    recipient: str,
    subject: str,
    body: str,
    html_body: Optional[str] = None,
    from_address: Optional[str] = None,
) -> None:
    config = _get_email_config()
    sender = from_address or config["from_address"]

    if not (config["email_user"] and config["email_password"]):
        raise ValueError("Email sender is not configured. Set EMAIL_USER and EMAIL_PASSWORD.")
    if not recipient or "@" not in recipient:
        raise ValueError("Invalid recipient email address")

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = sender
    message["To"] = recipient
    message.set_content(body)
    if html_body:
        message.add_alternative(html_body, subtype="html")

    with smtplib.SMTP(config["email_host"], config["email_port"], timeout=30) as smtp:
        if config["use_tls"]:
            smtp.ehlo()
            smtp.starttls()
            smtp.ehlo()
        smtp.login(config["email_user"], config["email_password"])
        smtp.send_message(message)


def build_task_assignment_email(
    user_name: Optional[str],
    task_id: int,
    task_title: str,
    assigner_name: Optional[str],
    due_date: Optional[Any] = None,
) -> Tuple[str, str]:
    name = user_name or "there"
    subject = f"New task assigned: #{task_id} - {task_title}"
    due_line = f"Due date: {due_date}\n" if due_date else ""
    link = _task_link(task_id)
    link_line = f"Open it here: {link}\n" if link else ""
    body = (
        f"Hey {name},\n\n"
        f"A fresh task has landed on your desk:\n"
        f"Task #{task_id}: {task_title}\n"
        f"Assigned by: {assigner_name or 'your team'}\n"
        f"{due_line}"
        f"{link_line}\n"
        "Fire up WorkForce Pro and take the first step. A little progress today keeps the weekend guilt away.\n\n"
        "Cheers,\n"
        "WorkForce Pro"
    )
    return subject, body


def build_subtask_assignment_email(
    user_name: Optional[str],
    subtask_id: int,
    subtask_title: str,
    parent_task_id: int,
    parent_task_title: Optional[str],
    assigner_name: Optional[str],
    due_date: Optional[Any] = None,
) -> Tuple[str, str]:
    name = user_name or "there"
    subject = f"New subtask assigned: #{subtask_id} - {subtask_title}"
    parent_title = f" - {parent_task_title}" if parent_task_title else ""
    due_line = f"Due date: {due_date}\n" if due_date else ""
    link = _task_link(parent_task_id)
    link_line = f"Open the parent task here: {link}\n" if link else ""
    body = (
        f"Hey {name},\n\n"
        "A fresh subtask has joined your queue:\n"
        f"Subtask #{subtask_id}: {subtask_title}\n"
        f"Parent task #{parent_task_id}{parent_title}\n"
        f"Assigned by: {assigner_name or 'your team'}\n"
        f"{due_line}"
        f"{link_line}\n"
        "Tiny task, mighty impact. Knock it out before it starts developing a personality.\n\n"
        "Cheers,\n"
        "WorkForce Pro"
    )
    return subject, body


def build_missing_sheet_email(
    user_name: Optional[str],
    missing_task_sheet: bool,
    missing_happy_sheet: bool,
) -> Tuple[str, str]:
    name = user_name or "friend"
    parts: list[str] = []
    if missing_task_sheet:
        parts.append("your daily Task Sheet")
    if missing_happy_sheet:
        parts.append("your Happy Sheet")

    missing_text = " and ".join(parts)
    subject = "Uh-oh - your work journal needs some love!"
    body = (
        f"Hey {name},\n\n"
        f"It is past 9 PM and {missing_text} is still looking at me like, 'So... are we doing this or what?'\n\n"
        "Please take two minutes to fill it in. Your future self gets clarity, your manager gets context, "
        "and the Happy Sheet stops making dramatic eye contact from the corner.\n\n"
        "P.S. This reminder is legally classified as a gentle nudge, not a jump scare.\n\n"
        "Stay awesome,\n"
        "WorkForce Pro"
    )
    return subject, body
