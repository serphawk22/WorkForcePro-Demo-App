"""
RAG Service — handles generation of textual representations, incremental synchronization
to the database vector table, and semantic cosine-similarity search.
"""
from __future__ import annotations

import os
import json
from datetime import datetime, date, timezone
from typing import List, Dict, Any, Optional
from sqlmodel import Session, select
from sqlalchemy import Column, Text

from app.models import (
    VectorEmbedding,
    User,
    Workspace,
    Task,
    Subtask,
    TaskComment,
    SubtaskComment,
    LeaveRequest,
    Attendance,
    LighthouseWeeklySheet,
    Payroll,
    TaskSheet,
    HappySheet,
    DreamProject,
    LearningFocus,
    PersonalProject,
    TeamsMeeting,
    AdminQuery,
    TicketComment
)

# ---------------------------------------------------------------------------
# Cosine Similarity Vector Math
# ---------------------------------------------------------------------------

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Compute the cosine similarity between two float vectors."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    norm_a = sum(a * a for a in v1) ** 0.5
    norm_b = sum(b * b for b in v2) ** 0.5
    if not norm_a or not norm_b:
        return 0.0
    return dot / (norm_a * norm_b)


# ---------------------------------------------------------------------------
# OpenAI Embedding Generator
# ---------------------------------------------------------------------------

from app.services.embeddings_service import LocalEmbeddings

def get_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """Fetch embeddings in batch using the local SentenceTransformer model."""
    return LocalEmbeddings.get_embeddings_batch(texts)


def get_embedding(text: str) -> List[float]:
    """Fetch embedding for a single text string using the local SentenceTransformer model."""
    return LocalEmbeddings.get_embedding(text)


# ---------------------------------------------------------------------------
# Incremental Synchronization & Text Generators
# ---------------------------------------------------------------------------

def sync_workspace_data(session: Session, organization_id: int) -> int:
    """
    Incrementally synchronizes all organization workspace records to the vector embeddings table.
    Bypasses OpenAI Embedding calls if a record's textual content signature hasn't changed.
    Purges vectors for deleted items (self-healing garbage collection).
    
    Returns the number of new/updated embeddings generated.
    """
    if organization_id is None:
        return 0

    # 1. Build lookup tables for names/emails
    users = session.exec(select(User).where(User.organization_id == organization_id)).all()
    user_map = {u.id: u for u in users}
    
    workspaces = session.exec(select(Workspace).where(Workspace.organization_id == organization_id)).all()
    workspace_map = {w.id: w for w in workspaces}

    tasks = session.exec(select(Task).where(Task.organization_id == organization_id)).all()
    task_map = {t.id: t for t in tasks}

    subtasks = session.exec(select(Subtask).where(Subtask.organization_id == organization_id)).all()
    subtask_map = {s.id: s for s in subtasks}

    queries = session.exec(select(AdminQuery).where(AdminQuery.organization_id == organization_id)).all()
    query_map = {q.id: q for q in queries}

    def get_user_name(uid: Optional[int]) -> str:
        if uid and uid in user_map:
            return user_map[uid].name
        return "Unknown User"

    def get_workspace_name(wid: Optional[int]) -> str:
        if wid and wid in workspace_map:
            return workspace_map[wid].name
        return "General Workspace"

    def get_task_title(tid: Optional[int]) -> str:
        if tid and tid in task_map:
            return task_map[tid].title
        return "Unknown Task"

    # 2. Collect all entity definitions & text representations
    items_to_sync: List[Dict[str, Any]] = []

    # Users
    for u in users:
        joined = u.date_joined.strftime("%Y-%m-%d") if u.date_joined else "N/A"
        text = (
            f"User Profile: Name: {u.name}, Email: {u.email}, Role: {u.role.value if hasattr(u.role, 'value') else str(u.role)}, "
            f"Department: {u.department or 'N/A'}, Base Salary: {u.base_salary or 'N/A'}, "
            f"Joined Date: {joined}, Github: {u.github_url or 'N/A'}, Linkedin: {u.linkedin_url or 'N/A'}."
        )
        items_to_sync.append({"type": "user", "id": str(u.id), "text": text})

    # Workspaces
    for ws in workspaces:
        desc = ws.description.strip() if ws.description else "No description"
        text = f"Workspace: Name: {ws.name}, Description: {desc}."
        items_to_sync.append({"type": "workspace", "id": str(ws.id), "text": text})

    # Tasks
    for t in tasks:
        due = t.due_date.strftime("%Y-%m-%d") if t.due_date else "No due date"
        desc = t.description.strip() if t.description else "No description"
        ws_name = get_workspace_name(t.workspace_id)
        assignee = get_user_name(t.assigned_to)
        recurring = f"Recurring ({t.recurrence_type})" if t.is_recurring else "One-time"
        text = (
            f"Task #{t.id} (Public ID: {t.public_id or 'N/A'}): Title: {t.title}. "
            f"Workspace: {ws_name}. Assignee: {assignee}. Status: {t.status.value}. "
            f"Priority: {t.priority.value}. Due Date: {due}. Type: {recurring}. Description: {desc}."
        )
        items_to_sync.append({"type": "task", "id": str(t.id), "text": text})

    # Subtasks
    for s in subtasks:
        due = s.due_date.strftime("%Y-%m-%d") if s.due_date else "No due date"
        desc = s.description.strip() if s.description else "No description"
        parent_title = get_task_title(s.parent_task_id)
        assignee = get_user_name(s.assigned_to)
        text = (
            f"Subtask #{s.id} (Under Parent Task: '{parent_title}'): Title: {s.title}. "
            f"Assignee: {assignee}. Status: {s.status.value}. Priority: {s.priority.value}. "
            f"Due Date: {due}. Description: {desc}."
        )
        items_to_sync.append({"type": "subtask", "id": str(s.id), "text": text})

    # Task Comments
    comments = session.exec(select(TaskComment)).all()
    for c in comments:
        # Filter comments by parent task organization (flat check)
        task = task_map.get(c.task_id)
        if task and task.organization_id == organization_id:
            author = get_user_name(c.user_id)
            text = f"Task Comment on Task #{c.task_id} ('{task.title}') by {author}: '{c.comment}'."
            items_to_sync.append({"type": "task_comment", "id": str(c.id), "text": text})

    # Subtask Comments
    scomments = session.exec(select(SubtaskComment).where(SubtaskComment.organization_id == organization_id)).all()
    for sc in scomments:
        author = get_user_name(sc.user_id)
        subtask_title = "Unknown Subtask"
        if sc.subtask_id in subtask_map:
            subtask_title = subtask_map[sc.subtask_id].title
        text = f"Subtask Comment on Subtask #{sc.subtask_id} ('{subtask_title}') by {author}: '{sc.comment}'."
        items_to_sync.append({"type": "subtask_comment", "id": str(sc.id), "text": text})

    # Leave Requests
    leaves = session.exec(select(LeaveRequest).where(LeaveRequest.organization_id == organization_id)).all()
    for lr in leaves:
        requester = get_user_name(lr.user_id)
        start = lr.start_date.strftime("%Y-%m-%d") if lr.start_date else "N/A"
        end = lr.end_date.strftime("%Y-%m-%d") if lr.end_date else "N/A"
        text = (
            f"Leave Request #{lr.id} by Employee {requester}: Type: {lr.leave_type}. "
            f"Dates: {start} to {end}. Reason: '{lr.reason}'. Status: {lr.status.value}."
        )
        items_to_sync.append({"type": "leave_request", "id": str(lr.id), "text": text})

    # Attendance
    attendance = session.exec(select(Attendance).where(Attendance.organization_id == organization_id)).all()
    for att in attendance:
        emp = get_user_name(att.user_id)
        punch_in = att.punch_in.strftime("%H:%M:%S") if att.punch_in else "N/A"
        punch_out = att.punch_out.strftime("%H:%M:%S") if att.punch_out else "N/A"
        text = (
            f"Attendance record for Employee {emp} on {att.date.strftime('%Y-%m-%d')}: "
            f"Punched In: {punch_in}, Punched Out: {punch_out}, Total Hours: {att.total_hours or 0.0} hrs."
        )
        items_to_sync.append({"type": "attendance", "id": str(att.id), "text": text})

    # AI Reports / Lighthouse Weekly Sheets
    sheets = session.exec(select(LighthouseWeeklySheet).where(LighthouseWeeklySheet.organization_id == organization_id)).all()
    for sh in sheets:
        emp = get_user_name(sh.user_id)
        text = (
            f"Lighthouse AI Weekly Report for Employee {emp} (Week Starting {sh.week_start_date.strftime('%Y-%m-%d')}): "
            f"Summary: {sh.weekly_summary or 'None'}. "
            f"Accomplishments: {sh.major_accomplishments or 'None'}. "
            f"Blockers/Issues: {sh.blockers or 'None'}. "
            f"Productivity Insights: {sh.productivity_insights or 'None'}."
        )
        items_to_sync.append({"type": "weekly_sheet", "id": str(sh.id), "text": text})

    # Payroll
    payroll = session.exec(select(Payroll).where(Payroll.organization_id == organization_id)).all()
    for pr in payroll:
        emp = get_user_name(pr.employee_id)
        pay_date = pr.pay_date.strftime("%Y-%m-%d") if pr.pay_date else "Unpaid"
        text = (
            f"Payroll salary record for Employee {emp} for month {pr.month}/{pr.year}: "
            f"Amount: ${pr.salary:.2f}, Status: {pr.status}, Payment Date: {pay_date}."
        )
        items_to_sync.append({"type": "payroll", "id": str(pr.id), "text": text})

    # Task Sheets (My Space task logs)
    task_sheets = session.exec(select(TaskSheet).where(TaskSheet.organization_id == organization_id)).all()
    for ts in task_sheets:
        emp = get_user_name(ts.user_id)
        text = (
            f"Workspace Task Log (Task Sheet) by Employee {emp} on {ts.date.strftime('%Y-%m-%d')}: "
            f"Completed Tasks: '{ts.tasks_completed}'. Impact: '{ts.work_impact}'. "
            f"Time Taken: {ts.time_taken}. Code/Repo link: {ts.repo_link or 'N/A'}."
        )
        items_to_sync.append({"type": "task_sheet", "id": str(ts.id), "text": text})

    # Happy Sheets (My Space well-being notes)
    happy_sheets = session.exec(select(HappySheet)).all()
    for hs in happy_sheets:
        # Filter happy sheets by user membership in active organization
        if hs.user_id in user_map:
            emp = get_user_name(hs.user_id)
            text = (
                f"Employee Well-being Feedback (Happy Sheet) by Employee {emp} on {hs.date.strftime('%Y-%m-%d')}: "
                f"What made happy: '{hs.what_made_you_happy}'. Made others happy: '{hs.what_made_others_happy}'. "
                f"Goals without greed: '{hs.goals_without_greed}'. Dreams supported: '{hs.dreams_supported}'."
            )
            items_to_sync.append({"type": "happy_sheet", "id": str(hs.id), "text": text})

    # Visionary Canvas / Dream Projects
    dreams = session.exec(select(DreamProject)).all()
    for dp in dreams:
        if dp.user_id in user_map:
            emp = get_user_name(dp.user_id)
            text = f"Visionary Goal / Dream Project description by Employee {emp}: '{dp.description}'."
            items_to_sync.append({"type": "dream_project", "id": str(dp.id), "text": text})

    # Learning Focus
    focuses = session.exec(select(LearningFocus)).all()
    for lf in focuses:
        if lf.user_id in user_map:
            emp = get_user_name(lf.user_id)
            text = f"Learning Focus / Area of professional study by Employee {emp}: '{lf.focus}'."
            items_to_sync.append({"type": "learning_focus", "id": str(lf.id), "text": text})

    # Personal Projects
    personal_projects = session.exec(select(PersonalProject)).all()
    for pp in personal_projects:
        if pp.user_id in user_map:
            emp = get_user_name(pp.user_id)
            text = (
                f"Learning Project by Employee {emp}: Title: {pp.title}. Tag: {pp.tag or 'N/A'}. "
                f"Stage: {pp.stage}. Writeup: '{pp.writeup or 'None'}'. "
                f"Github: {pp.github_link or 'N/A'}, Demo: {pp.demo_link or 'N/A'}."
            )
            items_to_sync.append({"type": "personal_project", "id": str(pp.id), "text": text})

    # Teams Meetings
    meetings = session.exec(select(TeamsMeeting)).all()
    for tm in meetings:
        # Check creator membership
        if tm.created_by in user_map:
            creator = get_user_name(tm.created_by)
            text = f"Shared Teams Meeting Link: Title: '{tm.title}'. Created by: {creator}. Link: {tm.meeting_link}."
            items_to_sync.append({"type": "teams_meeting", "id": str(tm.id), "text": text})

    # Admin Queries / Tickets (CRM & Support Issues)
    for aq in queries:
        assignee = get_user_name(aq.assigned_to)
        creator = get_user_name(aq.raised_by)
        ws_name = get_workspace_name(aq.workspace_id)
        desc = aq.description.strip() if aq.description else "No description"
        text = (
            f"Admin Support Query / Ticket #{aq.id}: Title: '{aq.title}'. "
            f"Workspace: {ws_name}. Raised by: {creator}. Assigned to: {assignee}. "
            f"Status: {aq.status.value}. Priority: {aq.priority.value}. "
            f"Estimated hours: {aq.estimated_hours or 0.0} hrs. Actual Hours Logged: {aq.actual_hours_logged or 0.0} hrs. "
            f"Description: {desc}."
        )
        items_to_sync.append({"type": "admin_query", "id": str(aq.id), "text": text})

    # Ticket Comments
    ticket_comments = session.exec(select(TicketComment)).all()
    for tc in ticket_comments:
        if tc.admin_query_id in query_map:
            ticket_title = query_map[tc.admin_query_id].title
            author = get_user_name(tc.user_id)
            text = f"Ticket Discussion Comment on Ticket #{tc.admin_query_id} ('{ticket_title}') by {author}: '{tc.content}'."
            items_to_sync.append({"type": "ticket_comment", "id": str(tc.id), "text": text})

    # 3. Perform incremental sync
    active_content_ids = set()
    embeddings_to_compute = []
    items_to_save = []

    # Load existing embeddings to detect changes
    existing_emb_list = session.exec(
        select(VectorEmbedding).where(VectorEmbedding.organization_id == organization_id)
    ).all()
    existing_map = {e.content_id: e for e in existing_emb_list}

    for item in items_to_sync:
        content_id = f"{item['type']}:{item['id']}"
        active_content_ids.add(content_id)
        
        text_content = item["text"]
        
        # Check if embedding already exists and matches signature
        existing = existing_map.get(content_id)
        if existing:
            try:
                existing_vector = json.loads(existing.embedding_json)
            except Exception:
                existing_vector = []
                
            if existing.text_content == text_content and len(existing_vector) == 384:
                # No change and correct dimension, skip local embedder call!
                continue
            else:
                # Text changed or dimension mismatch! We need to re-embed and update.
                embeddings_to_compute.append((existing, text_content))
        else:
            # New record, create a new VectorEmbedding row
            new_emb = VectorEmbedding(
                organization_id=organization_id,
                content_id=content_id,
                content_type=item["type"],
                text_content=text_content,
                embedding_json="[]"
            )
            session.add(new_emb)
            items_to_save.append((new_emb, text_content))

    # Commit new empty placeholders so they have IDs (if needed, though not strictly required)
    if items_to_save:
        session.commit()

    # Batch compute embeddings for efficiency
    all_targets = [x[1] for x in embeddings_to_compute] + [x[1] for x in items_to_save]
    
    if all_targets:
        print(f"RAG Sync: Computing embeddings for {len(all_targets)} new/updated records in organization #{organization_id}...")
        computed_vectors = get_embeddings_batch(all_targets)
        
        # Distribute vectors back to updated items
        idx = 0
        for existing, text in embeddings_to_compute:
            existing.text_content = text
            existing.embedding_json = json.dumps(computed_vectors[idx])
            existing.updated_at = datetime.now(timezone.utc)
            session.add(existing)
            idx += 1
            
        for new_emb, text in items_to_save:
            new_emb.embedding_json = json.dumps(computed_vectors[idx])
            session.add(new_emb)
            idx += 1
            
        session.commit()

    # 4. Self-healing garbage collection: purge obsolete vector keys
    to_delete = []
    for content_id, emb in existing_map.items():
        if content_id not in active_content_ids:
            to_delete.append(emb)
            
    if to_delete:
        print(f"RAG Sync: Purging {len(to_delete)} obsolete vector embeddings...")
        for emb in to_delete:
            session.delete(emb)
        session.commit()

    return len(all_targets)


# ---------------------------------------------------------------------------
# Context Retrieval / Semantic Search
# ---------------------------------------------------------------------------

def retrieve_relevant_context(
    session: Session,
    organization_id: int,
    query_text: str,
    limit: int = 8
) -> str:
    """
    Embeds the user query, performs vector similarity search against all
    workspace embeddings of the active organization, and formats the top matching
    results as an unified context block for prompt injection.
    """
    if not query_text or not query_text.strip():
        return ""

    # Ensure embeddings exist for this organization
    try:
        sync_workspace_data(session, organization_id)
    except Exception as e:
        print(f"RAG Service Sync failed during retrieval: {e}")

    # Generate embedding for query
    query_vector = get_embedding(query_text)
    
    # Load all organization vector embeddings
    stored_embeddings = session.exec(
        select(VectorEmbedding).where(VectorEmbedding.organization_id == organization_id)
    ).all()

    if not stored_embeddings:
        return ""

    # Compute similarity in python
    scored_items = []
    for emb in stored_embeddings:
        try:
            vector = json.loads(emb.embedding_json)
            if not vector:
                continue
            sim = cosine_similarity(query_vector, vector)
            scored_items.append((sim, emb))
        except Exception as e:
            print(f"Failed to score embedding #{emb.id}: {e}")
            continue

    # Sort descending by similarity score
    scored_items.sort(key=lambda x: x[0], reverse=True)
    
    # Take top K matching results with a reasonable similarity filter (> 0.2)
    top_matches = [item[1] for item in scored_items[:limit] if item[0] > 0.2]
    
    if not top_matches:
        return ""

    # Format matches into unified context block
    context_lines = []
    context_lines.append("──────────────────────────────────────────────────────────")
    context_lines.append("RETRIEVED WORKSPACE KNOWLEDGE (RAG CONTEXT):")
    context_lines.append("Use this verified information to answer user questions contextually.")
    context_lines.append("──────────────────────────────────────────────────────────")
    
    for emb in top_matches:
        context_lines.append(f"• {emb.text_content}")
        
    context_lines.append("──────────────────────────────────────────────────────────")
    return "\n".join(context_lines)
