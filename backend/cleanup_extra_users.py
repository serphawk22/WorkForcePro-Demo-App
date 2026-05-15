from sqlmodel import Session, select
from app.database import engine
from app.models import (
    User, Attendance, Task, Subtask, LeaveRequest, 
    Payroll, TaskSheet, HappySheet, WeeklyProgress,
    DreamProject, LearningFocus, PersonalProject,
    TaskComment, Notification, HappySheetStreak
)

def cleanup_extra_users():
    keep_emails = [
        "admin@gmail.com",
        "sai@example.com",
        "john@example.com",
        "jane@example.com"
    ]
    
    with Session(engine) as session:
        # Find users to delete
        all_users = session.exec(select(User)).all()
        users_to_delete = [u for u in all_users if u.email not in keep_emails]
        
        if not users_to_delete:
            print("No extra users to delete.")
            return

        print(f"Deleting {len(users_to_delete)} extra users and their data...")
        
        for user in users_to_delete:
            user_id = user.id
            email = user.email
            
            # 1. Delete Subtasks
            subtasks = session.exec(select(Subtask).where((Subtask.assigned_to == user_id) | (Subtask.assigned_by == user_id))).all()
            for st in subtasks: session.delete(st)
            
            # 2. Delete Task Comments
            comments = session.exec(select(TaskComment).where(TaskComment.user_id == user_id)).all()
            for c in comments: session.delete(c)
            
            # 3. Delete Tasks
            tasks = session.exec(select(Task).where((Task.assigned_to == user_id) | (Task.assigned_by == user_id))).all()
            for t in tasks:
                # Delete subtasks and comments for these tasks too
                st_inner = session.exec(select(Subtask).where(Subtask.parent_task_id == t.id)).all()
                for sti in st_inner: session.delete(sti)
                tc_inner = session.exec(select(TaskComment).where(TaskComment.task_id == t.id)).all()
                for tci in tc_inner: session.delete(tci)
                session.delete(t)
            
            # 4. Attendance
            attendance = session.exec(select(Attendance).where(Attendance.user_id == user_id)).all()
            for a in attendance: session.delete(a)
            
            # 5. Leave Requests
            leaves = session.exec(select(LeaveRequest).where(LeaveRequest.user_id == user_id)).all()
            for l in leaves: session.delete(l)
            
            # 6. Notifications
            notifications = session.exec(select(Notification).where(Notification.user_id == user_id)).all()
            for n in notifications: session.delete(n)
            
            # 7. Payroll
            payrolls = session.exec(select(Payroll).where(Payroll.employee_id == user_id)).all()
            for p in payrolls: session.delete(p)

            # 8. Weekly Progress
            progress_entries = session.exec(select(WeeklyProgress).where(WeeklyProgress.user_id == user_id)).all()
            for wp in progress_entries:
                # Also delete comments on this progress
                from app.models import WeeklyComment
                wp_comments = session.exec(select(WeeklyComment).where(WeeklyComment.weekly_progress_id == wp.id)).all()
                for wpc in wp_comments: session.delete(wpc)
                session.delete(wp)
            
            # 9. My Space
            task_sheets = session.exec(select(TaskSheet).where(TaskSheet.user_id == user_id)).all()
            for ts in task_sheets: session.delete(ts)
            
            happy_sheets = session.exec(select(HappySheet).where(HappySheet.user_id == user_id)).all()
            for hs in happy_sheets: session.delete(hs)
            
            streaks = session.exec(select(HappySheetStreak).where(HappySheetStreak.user_id == user_id)).all()
            for s in streaks: session.delete(s)
            
            dreams = session.exec(select(DreamProject).where(DreamProject.user_id == user_id)).all()
            for d in dreams: session.delete(d)
            
            focuses = session.exec(select(LearningFocus).where(LearningFocus.user_id == user_id)).all()
            for f in focuses: session.delete(f)
            
            projects = session.exec(select(PersonalProject).where(PersonalProject.user_id == user_id)).all()
            for pp in projects: session.delete(pp)
            
            # Finally, delete user
            session.delete(user)
            print(f"Deleted user: {email}")

        session.commit()
        print("Cleanup completed successfully!")

if __name__ == "__main__":
    cleanup_extra_users()
