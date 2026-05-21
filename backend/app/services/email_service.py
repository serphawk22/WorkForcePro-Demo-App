"""
Email sending utilities for WorkForce Pro.
"""
from __future__ import annotations

import json
import os
import re
import smtplib
from email.message import EmailMessage
from html import escape
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
    support_address = os.getenv("EMAIL_SUPPORT_ADDRESS", from_address).strip() or from_address
    frontend_url = os.getenv("FRONTEND_URL", "").strip().rstrip("/")

    return {
        "email_user": email_user,
        "email_password": email_password,
        "email_host": email_host,
        "email_port": email_port,
        "use_tls": use_tls,
        "from_address": from_address,
        "support_address": support_address,
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


def _plain_footer(support_address: Optional[str]) -> str:
    support_line = f"Contact support for any queries: {support_address}" if support_address else "Contact support for any queries."
    return (
        "Serphawk Pvt Ltd\n"
        "WorkForce Pro\n"
        "This is an automated email. "
        f"{support_line}"
    )


def _ensure_plain_footer(body: str, support_address: Optional[str]) -> str:
    clean_body = body.rstrip()
    if "Serphawk Pvt Ltd" in clean_body and "WorkForce Pro" in clean_body:
        return clean_body
    return f"{clean_body}\n\n--\n{_plain_footer(support_address)}"


def _linkify(text: str) -> str:
    escaped = escape(text)
    url_pattern = re.compile(r"(https?://[^\s<]+)")
    return url_pattern.sub(
        lambda match: (
            f'<a href="{match.group(1)}" '
            'style="color:#2563eb;text-decoration:none;font-weight:700;">'
            f"{escape(match.group(1))}</a>"
        ),
        escaped,
    )


def _first_url(body: str) -> Optional[str]:
    match = re.search(r"https?://[^\s]+", body)
    if not match:
        return None
    return match.group(0).rstrip(").,;]")


def _body_to_html(body: str) -> str:
    blocks = []
    for paragraph in body.strip().split("\n\n"):
        lines = [line.strip() for line in paragraph.splitlines() if line.strip()]
        if not lines:
            continue
        if len(lines) > 1:
            items = "".join(
                f'<li style="margin:8px 0;color:#1f2937;line-height:1.55;">{_linkify(line)}</li>'
                for line in lines
            )
            blocks.append(
                '<ul style="padding-left:20px;margin:0 0 18px 0;">'
                f"{items}"
                "</ul>"
            )
        else:
            blocks.append(
                '<p style="margin:0 0 18px 0;color:#1f2937;font-size:15px;line-height:1.65;">'
                f"{_linkify(lines[0])}"
                "</p>"
            )
    return "".join(blocks)


def _render_default_html_email(subject: str, body: str, support_address: Optional[str]) -> str:
    cta_url = _first_url(body)
    cta = ""
    if cta_url:
        cta = (
            '<div style="margin:28px 0 8px 0;">'
            f'<a href="{escape(cta_url)}" '
            'style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;'
            'font-weight:800;font-size:14px;padding:13px 20px;border-radius:10px;'
            'box-shadow:0 10px 22px rgba(17,24,39,0.18);">'
            "Open in WorkForce Pro"
            "</a>"
            "</div>"
        )

    support_html = (
        f'Contact support for any queries: <a href="mailto:{escape(support_address)}" '
        'style="color:#2563eb;text-decoration:none;font-weight:700;">'
        f"{escape(support_address)}</a>"
        if support_address
        else "Contact support for any queries."
    )

    return f"""<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <div style="display:none;max-height:0;overflow:hidden;color:transparent;">
      WorkForce Pro update from Serphawk Pvt Ltd.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2f7;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #dbe3ef;box-shadow:0 18px 50px rgba(15,23,42,0.10);">
            <tr>
              <td style="background:#0f172a;padding:28px 30px;">
                <div style="font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:#93c5fd;font-weight:800;">Serphawk Pvt Ltd</div>
                <div style="font-size:26px;line-height:1.2;color:#ffffff;font-weight:900;margin-top:8px;">WorkForce Pro</div>
                <div style="font-size:14px;line-height:1.5;color:#cbd5e1;margin-top:8px;">Momentum update for your workday</div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px;">
                <h1 style="margin:0 0 18px 0;font-size:24px;line-height:1.25;color:#111827;font-weight:900;">{escape(subject)}</h1>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:22px 22px 6px 22px;">
                  {_body_to_html(body)}
                  {cta}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 30px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                <div style="font-size:13px;line-height:1.7;color:#475569;">
                  <strong style="color:#111827;">Serphawk Pvt Ltd</strong><br>
                  <strong style="color:#111827;">WorkForce Pro</strong><br>
                  This is an automated email. {support_html}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""


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

    support_address = config["support_address"]
    plain_body = _ensure_plain_footer(body, support_address)
    rendered_html = html_body or _render_default_html_email(subject, body, support_address)

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = sender
    message["To"] = recipient
    message.set_content(plain_body)
    message.add_alternative(rendered_html, subtype="html")

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
    subject = f"New mission assigned: #{task_id} - {task_title}"
    due_line = f"Due date: {due_date}\n" if due_date else ""
    link = _task_link(task_id)
    link_line = f"Open it here: {link}\n" if link else ""
    body = (
        f"Hey {name},\n\n"
        "You have a fresh mission in WorkForce Pro. Time to turn this into visible progress.\n\n"
        f"Task: #{task_id} - {task_title}\n"
        f"Assigned by: {assigner_name or 'your team'}\n"
        f"{due_line}"
        f"{link_line}\n"
        "Start with one clear step, add updates as you move, and keep the momentum alive."
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
    subject = f"New subtask ready for action: #{subtask_id} - {subtask_title}"
    parent_title = f" - {parent_task_title}" if parent_task_title else ""
    due_line = f"Due date: {due_date}\n" if due_date else ""
    link = _task_link(parent_task_id)
    link_line = f"Open the parent task here: {link}\n" if link else ""
    body = (
        f"Hey {name},\n\n"
        "A new subtask just landed in your lane. Small move, real impact.\n\n"
        f"Subtask: #{subtask_id} - {subtask_title}\n"
        f"Parent task: #{parent_task_id}{parent_title}\n"
        f"Assigned by: {assigner_name or 'your team'}\n"
        f"{due_line}"
        f"{link_line}\n"
        "Jump in, make the next move, and keep the project energy moving forward."
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
    subject = "Quick 9 PM nudge: your WorkForce Pro update is waiting"
    body = (
        f"Hey {name},\n\n"
        f"It is past 9 PM, and {missing_text} is still waiting for your victory lap.\n\n"
        "Take two focused minutes to log what moved today. Your future self gets clarity, "
        "your team gets context, and tomorrow starts with less fog.\n\n"
        "Tiny update. Big accountability. You have got this."
    )
    return subject, body
