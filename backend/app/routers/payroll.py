"""
Payroll management routes (admin only).
Fixed salary model — no attendance-based deductions.
"""
from datetime import date, datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from app.database import get_session
from app.models import User, UserRole, Payroll, PayrollRead, Notification, NotificationType
from app.auth import get_current_admin_user, get_current_user

router = APIRouter(prefix="/payroll", tags=["Payroll"])


def _build_payroll_read(record: Payroll, user: User) -> dict:
    """Convert a Payroll + User to the PayrollRead shape."""
    return {
        "id": record.id,
        "employee_id": record.employee_id,
        "name": user.name,
        "department": user.department,
        "month": record.month,
        "year": record.year,
        "salary": record.salary,
        "status": record.status,
        "pay_date": record.pay_date,
    }


@router.get("/", response_model=List[dict])
async def get_payroll(
    month: Optional[int] = None,
    year: Optional[int] = None,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user),
):
    """
    Get payroll records for all employees.

    - Defaults to the current month/year if not specified.
    - Auto-generates records (using employee base_salary) for employees
      that don't yet have a record for the requested period.
    """
    today = date.today()
    target_month = month or today.month
    target_year = year or today.year

    # Get all active employees
    employees = session.exec(
        select(User).where(User.role == UserRole.employee, User.is_active == True)
    ).all()

    result = []
    for emp in employees:
        # Look for existing payroll record
        record = session.exec(
            select(Payroll).where(
                Payroll.employee_id == emp.id,
                Payroll.month == target_month,
                Payroll.year == target_year,
            )
        ).first()

        if not record:
            # Auto-create with employee's base_salary (or 0 as fallback)
            record = Payroll(
                employee_id=emp.id,
                month=target_month,
                year=target_year,
                salary=emp.base_salary or 0.0,
                status="Pending",
            )
            session.add(record)
            session.commit()
            session.refresh(record)
        else:
            # Sync salary from base_salary if the record is stale (salary=0 but employee now has one)
            if record.salary == 0 and emp.base_salary:
                record.salary = emp.base_salary
                session.add(record)
                session.commit()
                session.refresh(record)

        result.append(_build_payroll_read(record, emp))

    return result


@router.put("/{payroll_id}/mark-paid", response_model=dict)
async def mark_paid(
    payroll_id: int,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user),
):
    """Mark a payroll record as Paid with today's date."""
    record = session.get(Payroll, payroll_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payroll record not found")

    record.status = "Paid"
    record.pay_date = date.today()
    session.add(record)
    session.commit()
    session.refresh(record)

    user = session.get(User, record.employee_id)

    # Create in-app notification for the employee
    from calendar import month_name
    month_label = month_name[record.month]
    salary_inr = f"\u20b9{record.salary:,.0f}"
    notification = Notification(
        user_id=record.employee_id,
        type=NotificationType.SALARY_PAID,
        message=f"Your salary of {salary_inr} for {month_label} {record.year} has been credited. Payment Date: {record.pay_date.strftime('%d %b %Y')}.",
    )
    session.add(notification)
    session.commit()

    return _build_payroll_read(record, user)


class StatusUpdateBody(BaseModel):
    status: str  # "Paid" | "Pending"


@router.put("/{payroll_id}/status", response_model=dict)
async def update_payroll_status(
    payroll_id: int,
    body: StatusUpdateBody,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user),
):
    """Update a payroll record's status (Paid or Pending)."""
    allowed = {"Paid", "Pending"}
    if body.status not in allowed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Status must be one of: {allowed}")

    record = session.get(Payroll, payroll_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payroll record not found")

    record.status = body.status
    if body.status == "Paid":
        record.pay_date = date.today()
    else:
        record.pay_date = None

    session.add(record)
    session.commit()
    session.refresh(record)

    user = session.get(User, record.employee_id)

    if body.status == "Paid":
        from calendar import month_name
        month_label = month_name[record.month]
        salary_inr = f"\u20b9{record.salary:,.0f}"
        notification = Notification(
            user_id=record.employee_id,
            type=NotificationType.SALARY_PAID,
            message=f"Your salary of {salary_inr} for {month_label} {record.year} has been credited. Payment Date: {record.pay_date.strftime('%d %b %Y')}.",
        )
        session.add(notification)
        session.commit()

    return _build_payroll_read(record, user)


@router.get("/me", response_model=dict)
async def get_my_payroll(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get the current employee's most recent payroll record (employee-accessible)."""
    record = session.exec(
        select(Payroll)
        .where(Payroll.employee_id == current_user.id)
        .order_by(Payroll.year.desc(), Payroll.month.desc())
    ).first()

    if not record:
        return {
            "id": None,
            "employee_id": current_user.id,
            "name": current_user.name,
            "department": current_user.department,
            "month": None,
            "year": None,
            "salary": current_user.base_salary or 0.0,
            "status": "No records",
            "pay_date": None,
        }

    return _build_payroll_read(record, current_user)


@router.get("/latest/{employee_id}", response_model=dict)
async def get_latest_payroll(
    employee_id: int,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user),
):
    """Get the most recent payroll record for a specific employee."""
    user = session.get(User, employee_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    record = session.exec(
        select(Payroll)
        .where(Payroll.employee_id == employee_id)
        .order_by(Payroll.year.desc(), Payroll.month.desc())
    ).first()

    if not record:
        return {
            "id": None,
            "employee_id": employee_id,
            "name": user.name,
            "department": user.department,
            "month": None,
            "year": None,
            "salary": user.base_salary or 0.0,
            "status": "No records",
            "pay_date": None,
        }

    return _build_payroll_read(record, user)


@router.patch("/{payroll_id}/salary", response_model=dict)
async def update_salary(
    payroll_id: int,
    salary: float,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user),
):
    """Update salary amount for a payroll record."""
    record = session.get(Payroll, payroll_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payroll record not found")

    record.salary = salary
    session.add(record)
    session.commit()
    session.refresh(record)

    user = session.get(User, record.employee_id)
    return _build_payroll_read(record, user)


@router.patch("/employee/{employee_id}/base-salary", response_model=dict)
async def update_employee_base_salary(
    employee_id: int,
    base_salary: float,
    department: Optional[str] = None,
    session: Session = Depends(get_session),
    admin: User = Depends(get_current_admin_user),
):
    """Update an employee's base salary (and optionally department)."""
    user = session.get(User, employee_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    user.base_salary = base_salary
    # Always update department when param is present (allows clearing to empty)
    user.department = department if department else None
    session.add(user)
    session.commit()

    # Also update the current month's payroll record so the table reflects immediately
    today = date.today()
    current_record = session.exec(
        select(Payroll).where(
            Payroll.employee_id == employee_id,
            Payroll.month == today.month,
            Payroll.year == today.year,
        )
    ).first()
    if current_record:
        current_record.salary = base_salary
        session.add(current_record)
        session.commit()

    session.refresh(user)

    return {
        "id": user.id,
        "name": user.name,
        "department": user.department,
        "base_salary": user.base_salary,
    }
