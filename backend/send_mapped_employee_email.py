"""
Manual helper for sending a one-off email to a mapped employee name.

Examples:
  python send_mapped_employee_email.py --name "Anjali" --subject "Test" --body "Hello"
  python send_mapped_employee_email.py --list
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.services.email_service import (  # noqa: E402
    DEFAULT_EMPLOYEE_EMAILS,
    get_employee_email_for_name,
    send_email,
)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Send email only to manually mapped employee names.")
    parser.add_argument("--name", help="Employee name exactly as shown in the app dropdown.")
    parser.add_argument("--subject", default="WorkForce Pro reminder", help="Email subject.")
    parser.add_argument("--body", default="", help="Plain text email body.")
    parser.add_argument("--list", action="store_true", help="List mapped names and exit.")
    parser.add_argument("--dry-run", action="store_true", help="Show who would receive the email without sending.")
    return parser


def main() -> int:
    load_dotenv(BACKEND_DIR / ".env")
    args = _build_parser().parse_args()

    if args.list:
        print("Mapped employee emails:")
        for name, email in DEFAULT_EMPLOYEE_EMAILS.items():
            print(f"- {name}: {email}")
        return 0

    if not args.name:
        print("Missing --name. Use --list to see mapped names.")
        return 2

    recipient = get_employee_email_for_name(args.name)
    if not recipient:
        print(f"Skipped: {args.name!r} is not in the manual email map.")
        return 0

    body = args.body.strip() or (
        f"Hey {args.name},\n\n"
        "This is a quick WorkForce Pro reminder.\n\n"
        "Cheers,\n"
        "WorkForce Pro"
    )

    if args.dry_run:
        print(f"Dry run: would send to {args.name} <{recipient}>")
        print(f"Subject: {args.subject}")
        print(body)
        return 0

    send_email(recipient, args.subject, body)
    print(f"Sent email to {args.name} <{recipient}>")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
