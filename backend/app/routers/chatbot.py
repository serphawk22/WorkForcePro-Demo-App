"""
WorkBot Backend Router for WorkForce Pro.
Provides RAG conversational endpoints, auditing, role-based security, and pgvector-style semantic caching.
"""
import json
import random
from typing import Optional, List, Dict, Any
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, text
from pydantic import BaseModel

from app.auth import get_current_user
from app.models import (
    User, Task, Workspace, LeaveRequest, Attendance, Payroll, LeaveStatus, TaskStatus, TaskPriority, UserRole,
    WorkBotConversation, WorkBotMessage, WorkBotApiCall, WorkBotQACache
)
from app.database import get_session
from app.services.rag_service import retrieve_relevant_context, cosine_similarity, get_embeddings_batch
from app.services.nlu_service import NLUService, INTENT_DEFINITIONS

router = APIRouter(prefix="/chatbot", tags=["WorkBot Chatbot"])


# ============================================================================
# Schemas and Models
# ============================================================================

class ChatMessageCreate(BaseModel):
    """Payload to send a message."""
    content: str


class ConversationCreate(BaseModel):
    """Payload to create a chat conversation."""
    title: str


class ChatbotResponse(BaseModel):
    """Final premium chatbot response."""
    response_text: str
    intent: str
    parameters: Dict[str, Any] = {}
    navigation_url: Optional[str] = None
    suggested_actions: List[Dict[str, Any]] = []
    context_sources: List[str] = []
    confidence: float
    cached: bool = False


class ConversationRead(BaseModel):
    """Conversation metadata response."""
    id: int
    user_id: int
    title: str
    created_at: datetime
    updated_at: datetime


class MessageRead(BaseModel):
    """Chat message response."""
    id: int
    conversation_id: int
    sender_role: str
    content: str
    intent: Optional[str] = None
    navigation_url: Optional[str] = None
    created_at: datetime


class ChatbotContextRequest(BaseModel):
    """Request for page-specific context."""
    current_page: str
    user_role: str


class ChatbotContextResponse(BaseModel):
    """Context for chatbot suggestions on a page."""
    page: str
    suggestions: List[str]
    quick_actions: List[Dict[str, str]]


# ============================================================================
# Database Auditing Helpers
# ============================================================================

def audit_api_call(session: Session, user_id: int, endpoint: str, method: str, 
                   request: Any, response: Any, status_code: int, conversation_id: Optional[int] = None):
    """Helper to log all chatbot API activity to the database."""
    try:
        api_log = WorkBotApiCall(
            conversation_id=conversation_id,
            user_id=user_id,
            api_endpoint=endpoint,
            method=method,
            request_payload=json.dumps(request) if request else None,
            response_payload=json.dumps(response) if response else None,
            status_code=status_code
        )
        session.add(api_log)
        session.commit()
    except Exception as e:
        print(f"Auditing error: {e}")
        session.rollback()


# ============================================================================
# Endpoints
# ============================================================================

@router.get("/conversations", response_model=List[ConversationRead])
async def list_conversations(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """List all chatbot conversations for the active user."""
    stmt = select(WorkBotConversation).where(WorkBotConversation.user_id == current_user.id).order_by(WorkBotConversation.updated_at.desc())
    conversations = session.exec(stmt).all()
    return conversations


@router.post("/conversations", response_model=ConversationRead)
async def create_conversation(
    payload: ConversationCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Create a new conversation session."""
    conversation = WorkBotConversation(
        user_id=current_user.id,
        organization_id=current_user.organization_id,
        title=payload.title
    )
    session.add(conversation)
    session.commit()
    session.refresh(conversation)
    return conversation


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Delete a chatbot conversation session."""
    stmt = select(WorkBotConversation).where(
        WorkBotConversation.id == conversation_id,
        WorkBotConversation.user_id == current_user.id
    )
    conversation = session.exec(stmt).first()
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or access denied"
        )
    session.delete(conversation)
    session.commit()
    return None


@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageRead])
async def get_conversation_messages(
    conversation_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Retrieve chat history inside a conversation session."""
    # Verify ownership
    conv_stmt = select(WorkBotConversation).where(
        WorkBotConversation.id == conversation_id,
        WorkBotConversation.user_id == current_user.id
    )
    conversation = session.exec(conv_stmt).first()
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or access denied"
        )
    
    stmt = select(WorkBotMessage).where(WorkBotMessage.conversation_id == conversation_id).order_by(WorkBotMessage.created_at.asc())
    messages = session.exec(stmt).all()
    return messages


@router.post("/conversations/{conversation_id}/messages", response_model=ChatbotResponse)
async def send_message(
    conversation_id: int,
    payload: ChatMessageCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Core WorkBot interaction endpoint.
    Retrieves user messages, checks Q&A semantic cache, processes intents, triggers actions in DB,
    generates contextual RAG responses, audits queries, and returns actions.
    """
    user_query = payload.content.strip()
    if not user_query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty"
        )

    # 1. Verify conversation session
    conv_stmt = select(WorkBotConversation).where(
        WorkBotConversation.id == conversation_id,
        WorkBotConversation.user_id == current_user.id
    )
    conversation = session.exec(conv_stmt).first()
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    # Save user message to database
    user_msg_db = WorkBotMessage(
        conversation_id=conversation_id,
        sender_role="user",
        content=user_query
    )
    session.add(user_msg_db)
    session.commit()

    # 2. SEMANTIC Q&A CACHE SEARCH (pgvector simulation/fallback)
    query_vector = get_embeddings_batch([user_query])[0]
    
    cached_response = None
    # Attempt pgvector search if extension works, else fallback to python cosine similarity
    try:
        # Check if pgvector column 'embedding' exists (it is created by migration when pgvector is available)
        raw_sql = text("""
            SELECT id, question, answer, intent, parameters_json, navigation_url, suggested_actions_json,
                   embedding_json,
                   1 as distance
            FROM workbot_qa_cache
            WHERE embedding_json IS NOT NULL
            LIMIT 100;
        """)
        cache_rows = session.execute(raw_sql).fetchall()
        best_sim = 0.0
        best_match = None
        for row in cache_rows:
            try:
                vec = json.loads(row.embedding_json)
                if vec and len(vec) == len(query_vector):
                    sim = cosine_similarity(query_vector, vec)
                    if sim > 0.90 and sim > best_sim:
                        best_sim = sim
                        best_match = row
            except Exception:
                continue
        if best_match:
            cached_response = best_match
    except Exception as e:
        # Cosine Similarity Python fallback using ORM
        all_cache = session.exec(select(WorkBotQACache)).all()
        best_sim = 0.0
        best_match = None
        for cache in all_cache:
            if cache.embedding_json:
                try:
                    vec = json.loads(cache.embedding_json)
                    sim = cosine_similarity(query_vector, vec)
                    if sim > 0.90 and sim > best_sim:
                        best_sim = sim
                        best_match = cache
                except Exception:
                    continue
        if best_match:
            cached_response = best_match

    # If cached hit, skip LLM and return instantly!
    if cached_response is not None:
        c_answer = cached_response.answer
        c_intent = cached_response.intent
        c_params = json.loads(cached_response.parameters_json or "{}")
        c_nav = cached_response.navigation_url
        c_actions = json.loads(cached_response.suggested_actions_json or "[]")
        
        # Save assistant cached message
        assistant_msg = WorkBotMessage(
            conversation_id=conversation_id,
            sender_role="assistant",
            content=c_answer,
            intent=c_intent,
            parameters_json=json.dumps(c_params),
            navigation_url=c_nav
        )
        session.add(assistant_msg)
        
        # Update conversation time
        conversation.updated_at = datetime.now()
        session.add(conversation)
        session.commit()

        # Audit log
        audit_api_call(
            session=session,
            user_id=current_user.id,
            endpoint=f"/chatbot/conversations/{conversation_id}/messages (CACHED)",
            method="POST",
            request={"content": user_query},
            response={"response_text": c_answer, "intent": c_intent, "cached": True},
            status_code=200,
            conversation_id=conversation_id
        )

        return ChatbotResponse(
            response_text=c_answer,
            intent=c_intent,
            parameters=c_params,
            navigation_url=c_nav,
            suggested_actions=c_actions,
            confidence=0.99,
            cached=True
        )

    # 3. SEMANTIC SEARCH (RAG Context Block)
    rag_context = retrieve_relevant_context(session, current_user.organization_id, user_query)

    # 4. NLU INTENT CLASSIFICATION
    nlu_service = NLUService()
    history_list = []
    # Grab last 4 messages for conversational context
    recent_msgs = session.exec(
        select(WorkBotMessage).where(WorkBotMessage.conversation_id == conversation_id).order_by(WorkBotMessage.created_at.desc()).limit(5)
    ).all()
    for m in reversed(recent_msgs):
        history_list.append({"sender_role": m.sender_role, "content": m.content})
    
    nlu_res = nlu_service.classify_intent(user_query, history_list)
    intent = nlu_res.get("intent", "help")
    parameters = nlu_res.get("parameters", {})
    confidence = nlu_res.get("confidence", 0.5)
    clarification_needed = nlu_res.get("clarification_needed", False)

    if clarification_needed:
        clarify_q = nlu_res.get("clarification_question", "Could you please specify what action you'd like to perform?")
        # Save clarification response
        assistant_msg = WorkBotMessage(
            conversation_id=conversation_id,
            sender_role="assistant",
            content=clarify_q,
            intent="clarification"
        )
        session.add(assistant_msg)
        session.commit()
        return ChatbotResponse(
            response_text=clarify_q,
            intent="clarification",
            confidence=confidence
        )

    # 5. ACTION & LIVE QUERY DISPATCHING
    database_data = {}
    navigation_url = None
    suggested_response_text = None

    # Apply role restriction: Employee cannot approve or reject leaves
    if intent in ["approve_leave", "reject_leave"] and current_user.role != UserRole.admin:
        suggested_response_text = "🔒 **Access Denied**: Only administrators are authorized to approve or reject leave requests. Please contact your manager."
        intent = "denied"
    
    elif intent == "clock_in":
        # Action: Attendance Clock-in
        existing = session.exec(
            select(Attendance).where(
                Attendance.user_id == current_user.id,
                Attendance.date == date.today()
            )
        ).first()
        if existing and existing.punch_in:
            suggested_response_text = "You are already **clocked in** for today!"
        else:
            new_att = Attendance(
                organization_id=current_user.organization_id,
                user_id=current_user.id,
                date=date.today(),
                punch_in=datetime.now()
            )
            session.add(new_att)
            session.commit()
            suggested_response_text = f"🌞 **Successfully Clocked In!** Welcome to work. Your workday has officially started at {datetime.now().strftime('%I:%M %p')}."
            navigation_url = "/attendance"

    elif intent == "clock_out":
        # Action: Attendance Clock-out
        existing = session.exec(
            select(Attendance).where(
                Attendance.user_id == current_user.id,
                Attendance.date == date.today()
            )
        ).first()
        if not existing or not existing.punch_in:
            suggested_response_text = "You cannot clock out since you haven't **clocked in** today yet!"
        elif existing.punch_out:
            suggested_response_text = "You are already **clocked out** for today!"
        else:
            existing.punch_out = datetime.now()
            duration = (existing.punch_out - existing.punch_in).total_seconds() / 3600.0
            existing.total_hours = round(duration, 2)
            session.add(existing)
            session.commit()
            suggested_response_text = f"🌙 **Successfully Clocked Out!** You clocked out at {existing.punch_out.strftime('%I:%M %p')}. Total logged time today: **{existing.total_hours} hours**."
            navigation_url = "/attendance"

    elif intent == "create_task" and current_user.role == UserRole.admin:
        # Action: Admin creates task
        title = parameters.get("title", "New Task via Chatbot")
        desc = parameters.get("description", "Assigned via chatbot assistant")
        priority = parameters.get("priority", "medium")
        assignee_email = parameters.get("assigned_to_email")
        
        assignee = current_user
        if assignee_email:
            assignee = session.exec(select(User).where(User.email == assignee_email)).first() or current_user

        due_date_val = date.today() + timedelta(days=3)
        if parameters.get("due_date"):
            try:
                due_date_val = datetime.strptime(parameters["due_date"], "%Y-%m-%d").date()
            except Exception:
                pass

        public_id = "".join(random.choices("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", k=6))
        
        # Grab default workspace
        workspace = session.exec(select(Workspace).where(Workspace.organization_id == current_user.organization_id)).first()
        ws_id = workspace.id if workspace else 1

        new_task = Task(
            organization_id=current_user.organization_id,
            title=title,
            description=desc,
            priority=TaskPriority(priority),
            status=TaskStatus.todo,
            assigned_to=assignee.id,
            assigned_by=current_user.id,
            due_date=due_date_val,
            public_id=public_id,
            workspace_id=ws_id
        )
        session.add(new_task)
        session.commit()
        suggested_response_text = f"✅ **Task Created Successfully!** \n\n* **Title**: {title}\n* **Assignee**: {assignee.name} ({assignee.email})\n* **Priority**: {priority.capitalize()}\n* **Due Date**: {due_date_val.strftime('%B %d, %Y')}\n\nThe task is now live in the system."
        navigation_url = "/tasks"

    elif intent == "request_leave":
        # Action: Request a Leave
        leave_type = parameters.get("leave_type", "personal")
        reason = parameters.get("reason", "Requested via WorkBot")
        
        st_date = date.today() + timedelta(days=1)
        en_date = date.today() + timedelta(days=2)
        if parameters.get("start_date"):
            try: st_date = datetime.strptime(parameters["start_date"], "%Y-%m-%d").date()
            except Exception: pass
        if parameters.get("end_date"):
            try: en_date = datetime.strptime(parameters["end_date"], "%Y-%m-%d").date()
            except Exception: pass

        new_leave = LeaveRequest(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            leave_type=leave_type,
            start_date=st_date,
            end_date=en_date,
            reason=reason,
            status=LeaveStatus.pending
        )
        session.add(new_leave)
        session.commit()
        suggested_response_text = f"📝 **Leave Request Submitted!**\n\n* **Type**: {leave_type.capitalize()}\n* **Dates**: {st_date.strftime('%Y-%m-%d')} to {en_date.strftime('%Y-%m-%d')}\n* **Reason**: {reason}\n\nYour request has been sent to your supervisor for review."
        navigation_url = "/requests"

    elif intent == "approve_leave" and current_user.role == UserRole.admin:
        # Action: Approve Leave (Admin Only)
        lr_id = parameters.get("leave_request_id")
        if lr_id:
            try:
                lr_id = int(lr_id)
                leave = session.exec(select(LeaveRequest).where(
                    LeaveRequest.id == lr_id,
                    LeaveRequest.organization_id == current_user.organization_id
                )).first()
                if leave:
                    leave.status = LeaveStatus.approved
                    leave.reviewed_by = current_user.id
                    leave.reviewed_at = datetime.now()
                    session.add(leave)
                    session.commit()
                    suggested_response_text = f"✅ Approved leave request **#{lr_id}**."
                    navigation_url = "/requests"
                else:
                    suggested_response_text = f"Leave request **#{lr_id}** was not found."
            except Exception:
                suggested_response_text = "Could not parse leave request ID."
        else:
            suggested_response_text = "Please specify a leave request ID to approve."

    elif intent == "reject_leave" and current_user.role == UserRole.admin:
        # Action: Reject Leave (Admin Only)
        lr_id = parameters.get("leave_request_id")
        comment = parameters.get("admin_comment", "Rejected via AI Assistant")
        if lr_id:
            try:
                lr_id = int(lr_id)
                leave = session.exec(select(LeaveRequest).where(
                    LeaveRequest.id == lr_id,
                    LeaveRequest.organization_id == current_user.organization_id
                )).first()
                if leave:
                    leave.status = LeaveStatus.rejected
                    leave.reviewed_by = current_user.id
                    leave.reviewed_at = datetime.now()
                    leave.admin_comment = comment
                    session.add(leave)
                    session.commit()
                    suggested_response_text = f"❌ Rejected leave request **#{lr_id}** with comment: *'{comment}'*."
                    navigation_url = "/requests"
                else:
                    suggested_response_text = f"Leave request **#{lr_id}** was not found."
            except Exception:
                suggested_response_text = "Could not parse leave request ID."
        else:
            suggested_response_text = "Please specify a leave request ID to reject."

    elif intent == "view_tasks":
        # Querying Tasks
        if current_user.role == UserRole.admin:
            stmt = select(Task).where(Task.organization_id == current_user.organization_id)
        else:
            stmt = select(Task).where(Task.assigned_to == current_user.id)
            
        priority = parameters.get("priority")
        if priority:
            stmt = stmt.where(Task.priority == TaskPriority(priority))
            
        tasks_list = session.exec(stmt.order_by(Task.due_date.asc()).limit(5)).all()
        database_data["tasks"] = [
            {"id": t.id, "title": t.title, "priority": t.priority.value, "status": t.status.value, "due_date": str(t.due_date)}
            for t in tasks_list
        ]
        navigation_url = "/tasks"

    elif intent == "view_leaves":
        # Querying Leaves
        if current_user.role == UserRole.admin:
            stmt = select(LeaveRequest).where(LeaveRequest.organization_id == current_user.organization_id)
        else:
            stmt = select(LeaveRequest).where(LeaveRequest.user_id == current_user.id)
            
        leaves_list = session.exec(stmt.order_by(LeaveRequest.created_at.desc()).limit(5)).all()
        database_data["leaves"] = [
            {"id": l.id, "leave_type": l.leave_type, "start": str(l.start_date), "end": str(l.end_date), "status": l.status.value}
            for l in leaves_list
        ]
        navigation_url = "/requests"

    elif intent == "view_attendance":
        # Querying Attendance
        stmt = select(Attendance).where(Attendance.user_id == current_user.id).order_by(Attendance.date.desc()).limit(5)
        att_list = session.exec(stmt).all()
        database_data["attendance"] = [
            {"date": str(a.date), "punch_in": a.punch_in.strftime("%H:%M") if a.punch_in else None,
             "punch_out": a.punch_out.strftime("%H:%M") if a.punch_out else None, "hours": a.total_hours}
            for a in att_list
        ]
        navigation_url = "/attendance"

    elif intent == "view_payroll":
        # Querying Salary
        stmt = select(Payroll).where(Payroll.employee_id == current_user.id).order_by(Payroll.year.desc(), Payroll.month.desc()).limit(5)
        payroll_list = session.exec(stmt).all()
        database_data["payroll"] = [
            {"month": p.month, "year": p.year, "salary": p.salary, "status": p.status}
            for p in payroll_list
        ]
        navigation_url = "/payroll"

    elif intent == "view_employees":
        # Querying Employee Directory
        stmt = select(User).where(User.organization_id == current_user.organization_id).limit(10)
        employees_list = session.exec(stmt).all()
        database_data["employees"] = [
            {"name": e.name, "email": e.email, "role": e.role.value, "department": e.department or "General"}
            for e in employees_list
        ]
        navigation_url = "/employees"

    elif intent == "navigate":
        # Standard Navigation Redirects
        section = parameters.get("section", "dashboard").lower()
        nav_map = {
            "tasks": "/tasks",
            "projects": "/project-management/projects",
            "attendance": "/attendance",
            "leave": "/requests",
            "requests": "/requests",
            "profile": "/profile",
            "payroll": "/payroll",
            "dashboard": "/dashboard" if current_user.role == UserRole.admin else "/employee-dashboard"
        }
        navigation_url = nav_map.get(section, "/dashboard")
        suggested_response_text = f"Sure! I am redirecting you to the **{section.capitalize()}** page now."

    # 6. LLM RESPONSE GENERATION
    if not suggested_response_text:
        response_text = nlu_service.generate_response(
            intent=intent,
            parameters=parameters,
            context=rag_context,
            data=database_data
        )
    else:
        response_text = suggested_response_text

    # 7. ADD TO SEMANTIC CACHE FOR FUTURE QUERIES
    try:
        new_cache = WorkBotQACache(
            question=user_query,
            answer=response_text,
            intent=intent,
            parameters_json=json.dumps(parameters),
            navigation_url=navigation_url,
            suggested_actions_json=json.dumps(nlu_service.suggest_actions(intent, parameters, current_user.role.value)),
            embedding_json=json.dumps(query_vector)
        )
        session.add(new_cache)
        session.commit()
    except Exception as e:
        print(f"Error caching Q&A: {e}")
        session.rollback()

    # Save assistant message
    assistant_msg = WorkBotMessage(
        conversation_id=conversation_id,
        sender_role="assistant",
        content=response_text,
        intent=intent,
        parameters_json=json.dumps(parameters),
        navigation_url=navigation_url
    )
    session.add(assistant_msg)
    
    # Update conversation time
    conversation.updated_at = datetime.now()
    session.add(conversation)
    session.commit()

    # Log audit
    audit_api_call(
        session=session,
        user_id=current_user.id,
        endpoint=f"/chatbot/conversations/{conversation_id}/messages",
        method="POST",
        request={"content": user_query},
        response={"response_text": response_text, "intent": intent},
        status_code=200,
        conversation_id=conversation_id
    )

    return ChatbotResponse(
        response_text=response_text,
        intent=intent,
        parameters=parameters,
        navigation_url=navigation_url,
        suggested_actions=nlu_service.suggest_actions(intent, parameters, current_user.role.value),
        confidence=confidence
    )


# ============================================================================
# Page Contexts and Legacy compatibility
# ============================================================================

@router.post("/context", response_model=ChatbotContextResponse)
async def chatbot_context(
    request: ChatbotContextRequest,
    current_user: User = Depends(get_current_user)
):
    """Provide context-aware suggestions and quick actions depending on the current page."""
    page_suggestions = {
        "/tasks": [
            "Show my pending tasks",
            "What tasks are due today?",
            "Filter tasks by High priority"
        ],
        "/attendance": [
            "Clock in",
            "Clock out",
            "Show my work hours"
        ],
        "/requests": [
            "Apply for sick leave",
            "Check my leave history",
            "What is my leave status?"
        ],
        "/payroll": [
            "What is my salary this month?",
            "Show payroll slips"
        ]
    }
    
    quick_actions = {
        "/tasks": [
            {"label": "Show Tasks", "action": "Show my pending tasks"},
            {"label": "Filter High", "action": "Filter tasks by High priority"}
        ],
        "/attendance": [
            {"label": "Clock In", "action": "Clock in"},
            {"label": "Clock Out", "action": "Clock out"}
        ],
        "/requests": [
            {"label": "Request Leave", "action": "Apply for leave"}
        ]
    }

    if current_user.role == UserRole.admin:
        page_suggestions["/requests"].append("Show all pending leave requests")
        quick_actions["/requests"].append({"label": "Pending Requests", "action": "Show pending leave requests"})
        
        page_suggestions["/tasks"].append("Create a new task")
        quick_actions["/tasks"].append({"label": "Assign Task", "action": "Create a new task"})

    page = request.current_page
    suggestions = page_suggestions.get(page, [
        "What tasks are assigned to me?",
        "Check my salary details",
        "How do I clock in?"
    ])
    actions = quick_actions.get(page, [
        {"label": "My Tasks", "action": "Show my pending tasks"},
        {"label": "Work Hours", "action": "Show my work hours"}
    ])

    return ChatbotContextResponse(
        page=page,
        suggestions=suggestions,
        quick_actions=actions
    )


@router.post("/query", response_model=ChatbotResponse)
async def chatbot_query_legacy(
    request: ChatMessageCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Legacy backward-compatible endpoint that leverages a default chat conversation."""
    # Find or create a 'Default Chat' conversation for the user
    stmt = select(WorkBotConversation).where(
        WorkBotConversation.user_id == current_user.id,
        WorkBotConversation.title == "WorkBot Assistant"
    ).order_by(WorkBotConversation.created_at.asc())
    conversation = session.exec(stmt).first()
    
    if not conversation:
        conversation = WorkBotConversation(
            user_id=current_user.id,
            organization_id=current_user.organization_id,
            title="WorkBot Assistant"
        )
        session.add(conversation)
        session.commit()
        session.refresh(conversation)

    return await send_message(
        conversation_id=conversation.id,
        payload=request,
        session=session,
        current_user=current_user
    )


@router.get("/intents", response_model=Dict[str, Any])
async def get_available_intents():
    """Get list of available chatbot intents and descriptions."""
    return {"intents": INTENT_DEFINITIONS}
