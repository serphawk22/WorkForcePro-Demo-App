import os
import sys
import random
from datetime import datetime, timedelta, date
from sqlmodel import Session, select
from app.database import engine
from app.models import (
    User, UserRole, UserStatus, Organization, Workspace,
    Attendance, Task, Subtask, LeaveRequest, LeaveStatus,
    Payroll, TaskSheet, HappySheet, WeeklyProgress,
    DreamProject, LearningFocus, PersonalProject,
    TaskStatus, SubtaskStatus, TaskPriority
)
from app.auth import get_password_hash

def seed_data():
    with Session(engine) as session:
        # 1. Get default Organization and Admin
        org = session.exec(select(Organization).where(Organization.name == "Default Organization")).first()
        if not org:
            org = Organization(name="Default Organization")
            session.add(org)
            session.commit()
            session.refresh(org)
            
        admin = session.exec(select(User).where(User.email == "admin@gmail.com")).first()
        if not admin:
            admin = User(
                name="Admin",
                email="admin@gmail.com",
                hashed_password=get_password_hash("admin"),
                role=UserRole.admin,
                status=UserStatus.APPROVED,
                organization_id=org.id,
                is_active=True
            )
            session.add(admin)
            session.commit()
            session.refresh(admin)

        # 2. Create Workspaces (Sections)
        workspaces_data = [
            {"name": "Core Platform", "description": "Backend and infrastructure development", "icon": "⚙️", "color": "#7C3AED"},
            {"name": "Mobile App", "description": "iOS and Android app development", "icon": "📱", "color": "#2563EB"},
            {"name": "Marketing Site", "description": "Public facing website and SEO", "icon": "🌐", "color": "#EA580C"},
            {"name": "Internal Tools", "description": "Employee portals and automation", "icon": "🛠️", "color": "#16A34A"},
        ]
        
        workspaces = []
        for wd in workspaces_data:
            ws = session.exec(select(Workspace).where(Workspace.name == wd["name"])).first()
            if not ws:
                ws = Workspace(
                    name=wd["name"],
                    description=wd["description"],
                    icon=wd["icon"],
                    color=wd["color"],
                    created_by=admin.id,
                    organization_id=org.id
                )
                session.add(ws)
                session.commit()
                session.refresh(ws)
            workspaces.append(ws)

        # 3. Create 4 Employees
        employees_data = [
            {"name": "Sai Varsha", "email": "sai@example.com", "dept": "Engineering", "role": "Senior Developer"},
            {"name": "John Doe", "email": "john@example.com", "dept": "Design", "role": "UI/UX Designer"},
            {"name": "Jane Smith", "email": "jane@example.com", "dept": "Marketing", "role": "Marketing Head"},
            {"name": "Raj Kumar", "email": "raj@example.com", "dept": "HR", "role": "HR Manager"},
        ]
        
        employees = []
        for ed in employees_data:
            emp = session.exec(select(User).where(User.email == ed["email"])).first()
            if not emp:
                emp = User(
                    name=ed["name"],
                    email=ed["email"],
                    hashed_password=get_password_hash("password123"),
                    role=UserRole.employee,
                    status=UserStatus.APPROVED,
                    organization_id=org.id,
                    department=ed["dept"],
                    is_active=True,
                    date_joined=date.today() - timedelta(days=60),
                    base_salary=75000.0
                )
                session.add(emp)
                session.commit()
                session.refresh(emp)
            employees.append(emp)

        print(f"Verified {len(employees)} employees.")

        # 4. Seed Attendance (Last 14 days)
        print("Seeding Attendance...")
        for emp in employees:
            for i in range(14):
                day = date.today() - timedelta(days=i)
                if day.weekday() >= 5: continue
                
                exists = session.exec(select(Attendance).where(Attendance.user_id == emp.id, Attendance.date == day)).first()
                if not exists:
                    punch_in = datetime.combine(day, datetime.min.time()) + timedelta(hours=9, minutes=10)
                    punch_out = punch_in + timedelta(hours=8, minutes=30)
                    att = Attendance(
                        user_id=emp.id, date=day, punch_in=punch_in, punch_out=punch_out,
                        total_hours=8.5, organization_id=org.id
                    )
                    session.add(att)

        # 5. Seed Tasks
        print("Seeding Tasks...")
        tasks_pool = [
            "Implement Login Flow", "Design System Review", "Market Research - Q3", 
            "API Documentation", "Database Optimization", "Mobile App UI Fixes",
            "SEO Audit", "Payroll System Update"
        ]
        
        for i, task_title in enumerate(tasks_pool):
            assigned_to = employees[i % len(employees)]
            ws = workspaces[i % len(workspaces)]
            
            exists = session.exec(select(Task).where(Task.title == task_title, Task.workspace_id == ws.id)).first()
            if not exists:
                new_task = Task(
                    title=task_title,
                    description=f"Task description for {task_title}",
                    status=TaskStatus.in_progress if i % 2 == 0 else TaskStatus.todo,
                    priority=TaskPriority.medium,
                    assigned_to=assigned_to.id,
                    assigned_by=admin.id,
                    workspace_id=ws.id,
                    organization_id=org.id,
                    due_date=date.today() + timedelta(days=7)
                )
                session.add(new_task)
                session.commit()
                session.refresh(new_task)
                
                # Add subtask
                sub = Subtask(
                    title=f"Subtask for {task_title}",
                    parent_task_id=new_task.id,
                    assigned_to=assigned_to.id,
                    assigned_by=admin.id,
                    status=SubtaskStatus.todo,
                    organization_id=org.id
                )
                session.add(sub)

        # 6. Seed Leave Requests
        print("Seeding Leave Requests...")
        for i, emp in enumerate(employees):
            start = date.today() + timedelta(days=10 + i)
            exists = session.exec(select(LeaveRequest).where(LeaveRequest.user_id == emp.id, LeaveRequest.start_date == start)).first()
            if not exists:
                lr = LeaveRequest(
                    user_id=emp.id, reason="Personal Leave", start_date=start,
                    end_date=start + timedelta(days=1), status=LeaveStatus.pending,
                    organization_id=org.id
                )
                session.add(lr)

        # 7. Seed Payroll
        print("Seeding Payroll...")
        for emp in employees:
            for m in [3, 4]:
                exists = session.exec(select(Payroll).where(Payroll.employee_id == emp.id, Payroll.month == m, Payroll.year == 2026)).first()
                if not exists:
                    p = Payroll(
                        employee_id=emp.id, month=m, year=2026, salary=75000.0,
                        status="Paid", pay_date=date(2026, m, 28), organization_id=org.id
                    )
                    session.add(p)

        # 8. Seed My Space data
        print("Seeding My Space data...")
        for emp in employees:
            day = date.today()
            if not session.exec(select(HappySheet).where(HappySheet.user_id == emp.id, HappySheet.date == day)).first():
                session.add(HappySheet(
                    user_id=emp.id, date=day, what_made_you_happy="Great progress!",
                    what_made_others_happy="Team support", goals_without_greed="Quality work",
                    dreams_supported="Learning", goals_without_greed_impossible="None"
                ))
            
            if not session.exec(select(TaskSheet).where(TaskSheet.user_id == emp.id, TaskSheet.date == day)).first():
                session.add(TaskSheet(user_id=emp.id, date=day, achievements="Completed major tasks", organization_id=org.id))

            monday = date.today() - timedelta(days=date.today().weekday())
            if not session.exec(select(WeeklyProgress).where(WeeklyProgress.user_id == emp.id, WeeklyProgress.week_start_date == monday)).first():
                session.add(WeeklyProgress(user_id=emp.id, week_start_date=monday, description="Solid week of work.", organization_id=org.id))

        session.commit()
        print("All dummy data for 4 employees seeded successfully!")

if __name__ == "__main__":
    seed_data()
