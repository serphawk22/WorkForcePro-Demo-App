"""
Vector Indexing Service — Index WorkForcePro content into vector embeddings for RAG.
Handles content from tasks, projects, users, and documentation.
"""
import json
import os
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlmodel import Session, select
from app.models import (
    VectorEmbedding, Task, Subtask, User, Workspace, 
    LeaveRequest, Attendance, TaskSheet, AdminQuery
)
from app.services.rag_service import get_embeddings_batch


class VectorIndexer:
    """Indexes WorkForcePro content into vector embeddings."""
    
    def __init__(self, session: Session):
        self.session = session
    
    def index_task(self, task: Task, organization_id: Optional[int] = None) -> VectorEmbedding:
        """Index a single task."""
        text_content = f"""
Task: {task.title}
Status: {task.status}
Priority: {task.priority}
Description: {task.description or ''}
Project: {task.project_name or ''}
Assigned to: User {task.assigned_to}
Created: {task.created_at}
Due: {task.due_date}
"""
        
        # Get embedding from OpenAI
        embedding = get_embeddings_batch([text_content.strip()])[0]
        
        # Check if already exists
        existing = self.session.exec(
            select(VectorEmbedding).where(
                (VectorEmbedding.content_id == str(task.id)) &
                (VectorEmbedding.content_type == "task")
            )
        ).first()
        
        if existing:
            existing.text_content = text_content.strip()
            existing.embedding_json = json.dumps(embedding)
            existing.updated_at = datetime.now(timezone.utc)
            self.session.add(existing)
        else:
            vec = VectorEmbedding(
                organization_id=organization_id or task.organization_id,
                content_id=str(task.id),
                content_type="task",
                text_content=text_content.strip(),
                embedding_json=json.dumps(embedding),
            )
            self.session.add(vec)
        
        self.session.commit()
        return existing or vec
    
    def index_workspace(self, workspace: Workspace) -> VectorEmbedding:
        """Index workspace information."""
        text_content = f"""
Workspace: {workspace.name}
Description: {workspace.description or ''}
Icon: {workspace.icon or ''}
Color: {workspace.color or ''}
Created: {workspace.created_at}
Members: Multiple users in this workspace
"""
        
        embedding = get_embeddings_batch([text_content.strip()])[0]
        
        existing = self.session.exec(
            select(VectorEmbedding).where(
                (VectorEmbedding.content_id == str(workspace.id)) &
                (VectorEmbedding.content_type == "workspace")
            )
        ).first()
        
        if existing:
            existing.text_content = text_content.strip()
            existing.embedding_json = json.dumps(embedding)
            existing.updated_at = datetime.now(timezone.utc)
            self.session.add(existing)
        else:
            vec = VectorEmbedding(
                organization_id=workspace.organization_id,
                content_id=str(workspace.id),
                content_type="workspace",
                text_content=text_content.strip(),
                embedding_json=json.dumps(embedding),
            )
            self.session.add(vec)
        
        self.session.commit()
        return existing or vec
    
    def index_user(self, user: User) -> VectorEmbedding:
        """Index user profile information."""
        text_content = f"""
User: {user.name}
Email: {user.email}
Role: {user.role}
Department: {user.department or ''}
Phone: {user.phone_number or ''}
Location: {user.location or ''}
Status: {user.status}
Active: {user.is_active}
"""
        
        embedding = get_embeddings_batch([text_content.strip()])[0]
        
        existing = self.session.exec(
            select(VectorEmbedding).where(
                (VectorEmbedding.content_id == str(user.id)) &
                (VectorEmbedding.content_type == "user")
            )
        ).first()
        
        if existing:
            existing.text_content = text_content.strip()
            existing.embedding_json = json.dumps(embedding)
            existing.updated_at = datetime.now(timezone.utc)
            self.session.add(existing)
        else:
            vec = VectorEmbedding(
                organization_id=user.organization_id,
                content_id=str(user.id),
                content_type="user",
                text_content=text_content.strip(),
                embedding_json=json.dumps(embedding),
            )
            self.session.add(vec)
        
        self.session.commit()
        return existing or vec
    
    def index_leave_request(self, leave: LeaveRequest) -> VectorEmbedding:
        """Index leave request information."""
        text_content = f"""
Leave Request
User: {leave.user_id}
Type: {leave.leave_type}
Start: {leave.start_date}
End: {leave.end_date}
Status: {leave.status}
Reason: {leave.reason or ''}
Days: {leave.number_of_days}
"""
        
        embedding = get_embeddings_batch([text_content.strip()])[0]
        
        existing = self.session.exec(
            select(VectorEmbedding).where(
                (VectorEmbedding.content_id == str(leave.id)) &
                (VectorEmbedding.content_type == "leave_request")
            )
        ).first()
        
        if existing:
            existing.text_content = text_content.strip()
            existing.embedding_json = json.dumps(embedding)
            existing.updated_at = datetime.now(timezone.utc)
            self.session.add(existing)
        else:
            vec = VectorEmbedding(
                organization_id=leave.organization_id,
                content_id=str(leave.id),
                content_type="leave_request",
                text_content=text_content.strip(),
                embedding_json=json.dumps(embedding),
            )
            self.session.add(vec)
        
        self.session.commit()
        return existing or vec
    
    def index_documentation(self, doc_id: str, title: str, content: str, 
                           category: str = "general") -> VectorEmbedding:
        """Index documentation/help content."""
        text_content = f"""
Documentation: {title}
Category: {category}
Content: {content}
"""
        
        embedding = get_embeddings_batch([text_content.strip()])[0]
        
        existing = self.session.exec(
            select(VectorEmbedding).where(
                (VectorEmbedding.content_id == doc_id) &
                (VectorEmbedding.content_type == "documentation")
            )
        ).first()
        
        if existing:
            existing.text_content = text_content.strip()
            existing.embedding_json = json.dumps(embedding)
            existing.updated_at = datetime.now(timezone.utc)
            self.session.add(existing)
        else:
            vec = VectorEmbedding(
                content_id=doc_id,
                content_type="documentation",
                text_content=text_content.strip(),
                embedding_json=json.dumps(embedding),
            )
            self.session.add(vec)
        
        self.session.commit()
        return existing or vec
    
    def bulk_index_tasks(self, org_id: int) -> int:
        """Bulk index all tasks for an organization."""
        tasks = self.session.exec(
            select(Task).where(Task.organization_id == org_id)
        ).all()
        
        for task in tasks:
            try:
                self.index_task(task, org_id)
            except Exception as e:
                print(f"Error indexing task {task.id}: {e}")
        
        return len(tasks)
    
    def bulk_index_workspaces(self, org_id: int) -> int:
        """Bulk index all workspaces for an organization."""
        workspaces = self.session.exec(
            select(Workspace).where(Workspace.organization_id == org_id)
        ).all()
        
        for workspace in workspaces:
            try:
                self.index_workspace(workspace)
            except Exception as e:
                print(f"Error indexing workspace {workspace.id}: {e}")
        
        return len(workspaces)
    
    def bulk_index_users(self, org_id: int) -> int:
        """Bulk index all users for an organization."""
        users = self.session.exec(
            select(User).where(User.organization_id == org_id)
        ).all()
        
        for user in users:
            try:
                self.index_user(user)
            except Exception as e:
                print(f"Error indexing user {user.id}: {e}")
        
        return len(users)
    
    def index_default_documentation(self):
        """Index standard WorkForcePro documentation."""
        docs = [
            ("doc_tasks_overview", "Task Management Overview", 
             "Tasks are work items assigned to employees. Each task has a title, description, status, priority, and due date. "
             "Statuses: To Do, In Progress, Submitted, Reviewing, Approved, Rejected."),
            
            ("doc_projects", "Project Management",
             "Projects organize related tasks. Projects have workspaces, team assignments, and progress tracking. "
             "View all projects in the Projects section."),
            
            ("doc_attendance", "Attendance Tracking",
             "Track daily work hours and attendance. Clock in/out times are recorded. View attendance history and statistics. "
             "Report absences or leaves through the Attendance section."),
            
            ("doc_leave", "Leave Requests",
             "Request time off through the Requests section. Available leave types: Sick Leave, Casual Leave, Personal Leave. "
             "Managers approve or reject requests. View leave calendar and history."),
            
            ("doc_profile", "Employee Profile",
             "Update your personal information including contact details, photo, and preferences. "
             "View your role, department, and organization details."),
            
            ("doc_dashboard", "Dashboard",
             "View organization-wide analytics including pending tasks, attendance stats, leave overview, and team performance. "
             "Dashboard shows key metrics for management."),
            
            ("doc_teams", "Teams",
             "Manage team structure and member assignments. Create teams, add members, assign leaders, and track team performance."),
            
            ("doc_payroll", "Payroll Management",
             "View salary information and payroll history. Admins can process monthly payroll, view employee salaries. "
             "Employees see their salary slips."),
        ]
        
        for doc_id, title, content in docs:
            try:
                self.index_documentation(doc_id, title, content)
            except Exception as e:
                print(f"Error indexing documentation {doc_id}: {e}")
        
        return len(docs)


def create_indexer(session: Session) -> VectorIndexer:
    """Factory function to create a VectorIndexer."""
    return VectorIndexer(session)
