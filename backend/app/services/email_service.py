"""
Email sending utilities for WorkForce Pro.
"""
from __future__ import annotations

import os
import smtplib
from email.message import EmailMessage
from typing import Optional, Tuple

DEFAULT_SMTP_HOST = "smtp.gmail.com"
DEFAULT_SMTP_PORT = 587


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
) -> Tuple[str, str]:
    name = user_name or "there"
    subject = f"New task assigned: #{task_id} - {task_title}"
    body = (
        f"Hey {name},\n\n"
        f"A fresh task has landed on your desk:\n"
        f"Task #{task_id}: {task_title}\n"
        f"Assigned by: {assigner_name or 'your team'}\n\n"
        "Fire up WorkForce Pro and take the first step. A little progress today keeps the weekend guilt away.\n\n"
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
    subject = "Uh-oh — your work journal needs some love!"
    body = (
        f"Hey {name},\n\n"
        f"This is your friendly digital cheerleader. You still need to fill {missing_text} for today.\n\n"
        "If you leave it empty, your task will feel ignored and your Happy Sheet will get jealous.\n"
        "Take two minutes, share what you did, and give the week a little extra sparkle.\n\n"
        "P.S. The app is waiting patiently for your update.\n\n"
        "Stay awesome,\n"
        "WorkForce Pro"
    )
    return subject, body
