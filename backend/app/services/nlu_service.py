"""
Natural Language Understanding (NLU) Service for WorkBot.
Handles intent classification, entity extraction, parameter parsing, and response generation.
"""
import os
import json
from typing import Dict, Any, Optional, List
from openai import OpenAI

# Expanded intent definitions for WorkBot
INTENT_DEFINITIONS = {
    "view_tasks": {
        "description": "User wants to see their tasks, active tasks, or project tasks",
        "examples": ["Show my pending tasks", "What tasks do I have?", "List my tasks", "Show high priority tasks"],
        "parameters": ["filter_status", "project_id", "priority"]
    },
    "create_task": {
        "description": "User wants to create a new task",
        "examples": ["Create a new task", "Add a task for Q1", "Create task 'Review documents'"],
        "parameters": ["title", "description", "due_date", "priority", "assigned_to_email"]
    },
    "clock_in": {
        "description": "User wants to clock in / punch in for attendance",
        "examples": ["Clock me in", "Punch in", "Start my workday"],
        "parameters": []
    },
    "clock_out": {
        "description": "User wants to clock out / punch out",
        "examples": ["Clock me out", "Punch out", "End my workday"],
        "parameters": []
    },
    "view_attendance": {
        "description": "User wants to see their attendance history or check work hours",
        "examples": ["Show my attendance history", "What are my work hours?", "View punch records"],
        "parameters": ["date_range"]
    },
    "request_leave": {
        "description": "User wants to submit a leave request",
        "examples": ["Request leave for next week", "Apply for sick leave", "I want to request vacation"],
        "parameters": ["leave_type", "start_date", "end_date", "reason"]
    },
    "view_leaves": {
        "description": "User wants to view leave status, history, or balance",
        "examples": ["Show my leave balance", "What is my leave status?", "Who is on leave today?", "List pending leaves"],
        "parameters": ["status", "filter_user_email"]
    },
    "approve_leave": {
        "description": "Admin wants to approve an employee's leave request",
        "examples": ["Approve leave request #5", "Approve John's leave request"],
        "parameters": ["leave_request_id"]
    },
    "reject_leave": {
        "description": "Admin wants to reject an employee's leave request",
        "examples": ["Reject leave request #5", "Reject John's leave request"],
        "parameters": ["leave_request_id", "admin_comment"]
    },
    "view_payroll": {
        "description": "User wants to view their salary information, payslip, or payroll history",
        "examples": ["Show my salary slips", "Check my payroll history", "What is my salary this month?"],
        "parameters": ["month", "year"]
    },
    "view_employees": {
        "description": "User wants to view the employee directory or details of a team member",
        "examples": ["Show all employees", "Who is on the team?", "List employee roster"],
        "parameters": ["department"]
    },
    "navigate": {
        "description": "User wants to navigate to a specific page or section of WorkForce Pro",
        "examples": ["Go to tasks", "Open attendance page", "Take me to payroll", "Go to profile"],
        "parameters": ["section"]
    },
    "help": {
        "description": "User wants general help, documentation, or has a query about the application features",
        "examples": ["How do I use this?", "Help with leave requests", "What can you do?"],
        "parameters": ["topic"]
    }
}


class NLUService:
    """Natural Language Understanding for chatbot."""
    
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        self.client = OpenAI(api_key=api_key)
        self.model = "gpt-4o-mini"
    
    def classify_intent(self, user_message: str, conversation_context: Optional[List[Dict]] = None) -> Dict[str, Any]:
        """
        Classify user intent and extract parameters using OpenAI Chat Completions.
        """
        system_prompt = f"""You are the NLU Engine for WorkBot, the AI chatbot integrated into WorkForce Pro (a comprehensive HR & Project Management platform).
Your role is to understand user natural language queries and map them to one of the supported system intents, extracting relevant arguments.

Available intents:
{json.dumps(INTENT_DEFINITIONS, indent=2)}

You MUST return a JSON object with the following structure:
{{
    "intent": "intent_name", // One of the keys in the available intents
    "parameters": {{}}, // Key-value pairs of extracted parameters
    "confidence": 0.0 to 1.0, // Floating point confidence score
    "clarification_needed": true/false, // True if the user command is highly ambiguous or missing required fields
    "clarification_question": "string" // Friendly clarifying question if clarification_needed is true, else empty string or null
}}
"""
        messages = [
            {"role": "system", "content": system_prompt}
        ]
        
        # Add conversation context if available
        if conversation_context:
            for msg in conversation_context[-5:]:  # Keep last 5 messages for context
                role = "user" if msg.get("sender_role") == "user" else "assistant"
                messages.append({
                    "role": role,
                    "content": msg.get("content", "")
                })
        
        # Add current user message
        messages.append({
            "role": "user",
            "content": user_message
        })
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.1
            )
            
            result = json.loads(response.choices[0].message.content)
            return result
        
        except Exception as e:
            print(f"NLU Classification Error: {e}")
            return {
                "intent": "help",
                "parameters": {},
                "confidence": 0.0,
                "clarification_needed": False,
                "clarification_question": ""
            }
    
    def extract_entities(self, text: str, entity_types: List[str]) -> Dict[str, List[str]]:
        """Extract specific entity types from text."""
        system_prompt = f"""You are an entity extraction system for WorkForce Pro.
Extract the following entity types from the user text: {', '.join(entity_types)}

Return as JSON with entity types as keys and lists of extracted values.
Example: {{"project_names": ["Project A", "Project B"], "dates": ["2026-06-01"]}}"""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text}
        ]
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.2,
                max_tokens=300
            )
            
            return json.loads(response.choices[0].message.content)
        
        except Exception as e:
            print(f"Entity Extraction Error: {e}")
            return {entity_type: [] for entity_type in entity_types}
    
    def generate_response(self, intent: str, parameters: Dict, context: str = "", 
                          data: Optional[Dict] = None) -> str:
        """Generate a natural language response."""
        system_prompt = """You are WorkBot, the premium intelligent assistant for WorkForce Pro.
Your job is to generate a concise, professional, and friendly response to the employee or administrator.
Use the retrieved context and data to answer in a helpful, highly specific manner.
Never speak in generic terms if concrete data is provided.
Always format numbers, dates, or statuses clearly in markdown.
Keep responses engaging, modern, and structured using clean bullets."""
        
        user_prompt = f"""Intent: {intent}
Parameters: {json.dumps(parameters)}
Retrieved RAG Context: {context}
Database Query Results: {json.dumps(data or {})}

Generate your final helpful response:"""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.5,
                max_tokens=500
            )
            
            return response.choices[0].message.content
        
        except Exception as e:
            print(f"Response Generation Error: {e}")
            return "I apologize, I encountered an issue generating a response. Please let me know how else I can assist you."
    
    def suggest_actions(self, intent: str, parameters: Dict, user_role: str = "employee") -> List[Dict[str, Any]]:
        """Suggest next actions based on intent, parameters, and user role."""
        suggestions = []
        
        if intent == "view_tasks":
            suggestions.append({"action": "filter_tasks_high", "label": "Show high priority tasks"})
            suggestions.append({"action": "navigate_tasks", "label": "Manage Tasks"})
            if user_role == "admin":
                suggestions.append({"action": "create_task_prompt", "label": "Assign new task"})
        elif intent == "create_task" and user_role == "admin":
            suggestions.append({"action": "navigate_tasks", "label": "View Tasks"})
        elif intent == "view_attendance":
            suggestions.append({"action": "clock_in_now", "label": "Clock In"})
            suggestions.append({"action": "clock_out_now", "label": "Clock Out"})
        elif intent == "view_leaves":
            suggestions.append({"action": "request_leave_prompt", "label": "Apply for leave"})
            if user_role == "admin":
                suggestions.append({"action": "view_pending_leaves", "label": "Review pending requests"})
        elif intent == "request_leave":
            suggestions.append({"action": "view_my_leaves", "label": "View my leaves"})
        
        # Default fallback suggestions
        if not suggestions:
            suggestions = [
                {"action": "view_my_tasks", "label": "Show my tasks"},
                {"action": "check_leave_balance", "label": "Check my leave balance"},
                {"action": "clock_in_now", "label": "Clock In"}
            ]
            
        return suggestions


def create_nlu_service() -> NLUService:
    """Factory function to create NLU service."""
    return NLUService()
