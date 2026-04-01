"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Send, Sparkles, ChevronRight, Check, Calendar, User as UserIcon, AlertCircle, Loader2, CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getAssignableUsers, getApiBaseUrl, User } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatAction {
  label: string;
  route: string;
}

interface TaskData {
  title: string;
  description: string;
  assignee_name?: string;
  assignee_id?: number;
  priority: "low" | "medium" | "high";
  deadline?: string;
  parent_task_id?: number;
  parent_task_name?: string;
  is_recurring?: boolean;
  recurrence_type?: string | null;
  recurrence_interval?: number;
  repeat_days?: number[] | null;
  recurrence_start_date?: string | null;
  recurrence_end_date?: string | null;
  monthly_day?: number | null;
}

interface LeaveData {
  reason: string;
  start_date: string;
  end_date: string;
  leave_type: "sick" | "personal" | "vacation" | "other";
}

interface Message {
  role: "user" | "assistant";
  content: string;
  actions?: ChatAction[];
  taskPreview?: TaskData;
  isTaskCreated?: boolean;
  isSubtask?: boolean;
  leavePreview?: LeaveData;
  isLeaveCreated?: boolean;
  suggestions?: string[];
}

interface ChatbotResponse {
  reply: string;
  actions: ChatAction[];
  navigate_to?: string | null;
  is_task_intent?: boolean;
  is_subtask_intent?: boolean;
  is_leave_intent?: boolean;
  task_data?: TaskData | null;
  leave_data?: LeaveData | null;
  needs_clarification?: boolean;
  clarification_question?: string | null;
  suggestions?: string[] | null;
}

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: "admin" | "employee";
  pathname: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token") || localStorage.getItem("access_token");
}

async function callChatbot(
  endpoint: "query" | "context",
  message: string,
  current_page: string,
  history: Message[] = []
): Promise<ChatbotResponse> {
  const token = getToken();
  
  // Format history for the backend
  const formattedHistory = history.map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  const res = await fetch(`${getApiBaseUrl()}/api/chatbot/${endpoint}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ 
      message, 
      current_page,
      history: formattedHistory
    }),
  });
  if (!res.ok) throw new Error(`Chatbot API error: ${res.status}`);
  return res.json();
}

async function confirmTaskCreation(taskData: TaskData): Promise<any> {
  const token = getToken();
  const res = await fetch(`${getApiBaseUrl()}/api/ai-assistant/create-task`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      title: taskData.title,
      description: taskData.description,
      assigned_to: taskData.assignee_id,
      priority: taskData.priority,
      due_date: taskData.deadline,
      is_recurring: taskData.is_recurring ?? false,
      recurrence_type: taskData.recurrence_type || undefined,
      recurrence_interval: taskData.recurrence_interval ?? 1,
      repeat_days: taskData.repeat_days ?? undefined,
      recurrence_start_date: taskData.recurrence_start_date || taskData.deadline || undefined,
      recurrence_end_date: taskData.recurrence_end_date || undefined,
      monthly_day: taskData.monthly_day ?? undefined,
    }),
  });
  if (!res.ok) throw new Error(`Task creation error: ${res.status}`);
  return res.json();
}

async function confirmLeaveCreation(leaveData: LeaveData): Promise<any> {
  const token = getToken();
  const res = await fetch(`${getApiBaseUrl()}/leave/ai-create`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(leaveData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Leave creation error: ${res.status}`);
  }
  return res.json();
}

async function confirmSubtaskCreation(taskData: TaskData): Promise<any> {
  const token = getToken();
  const res = await fetch(`${getApiBaseUrl()}/tasks/${taskData.parent_task_id}/subtasks`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      title: taskData.title,
      description: taskData.description,
      assigned_to: taskData.assignee_id,
      priority: taskData.priority,
      due_date: taskData.deadline,
    }),
  });
  if (!res.ok) throw new Error(`Subtask creation error: ${res.status}`);
  return res.json();
}

function formatReply(text: string): React.ReactNode {
  const lines = text.split("\n\n");
  return lines.map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} className={i > 0 ? "mt-2" : ""}>
        {parts.map((part, j) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={j}>{part.slice(2, -2)}</strong>
          ) : (
            <span key={j}>{part}</span>
          )
        )}
      </p>
    );
  });
}

// ─── Components ─────────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-3">
      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3 flex items-center space-x-1">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

function TaskPreviewCard({ 
  task, 
  onConfirm, 
  onCancel,
  isCreated,
  isSubtask,
  employees = []
}: { 
  task: TaskData; 
  onConfirm: (updatedTask: TaskData) => void; 
  onCancel: () => void;
  isCreated?: boolean;
  isSubtask?: boolean;
  employees?: User[];
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<number | undefined>(task.assignee_id);
  const [selectedAssigneeName, setSelectedAssigneeName] = useState<string | undefined>(task.assignee_name);

  const handleConfirm = async () => {
    setIsCreating(true);
    try {
      await onConfirm({
        ...task,
        assignee_id: selectedAssigneeId,
        assignee_name: selectedAssigneeName
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    const emp = employees.find(e => e.id === id);
    if (emp) {
      setSelectedAssigneeId(id);
      setSelectedAssigneeName(emp.name);
    } else {
      setSelectedAssigneeId(undefined);
      setSelectedAssigneeName(undefined);
    }
  };

  return (
    <div className="mt-3 bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-900 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3 text-purple-600 dark:text-purple-400 font-semibold text-sm">
        <Sparkles size={16} />
        Generated {isSubtask ? "Subtask" : "Task"} Preview
      </div>
      
      <div className="space-y-3 mb-4">
        <div>
          <label className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500">Title</label>
          <div className="text-sm font-medium dark:text-gray-200">{task.title}</div>
        </div>
        
        {isSubtask && task.parent_task_name && (
          <div>
            <label className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500">Parent Task</label>
            <div className="text-xs font-medium text-purple-600 dark:text-purple-400">{task.parent_task_name}</div>
          </div>
        )}
        
        {task.description && (
          <div>
            <label className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500">Description</label>
            <div className="text-xs text-gray-600 dark:text-gray-400">{task.description}</div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 block mb-1">Assignee</label>
            <div className="flex items-center gap-2">
              <UserIcon size={14} className="text-gray-400 flex-shrink-0" />
              <select 
                value={selectedAssigneeId || ""} 
                onChange={handleAssigneeChange}
                disabled={isCreated}
                className="w-full text-xs bg-transparent border-none focus:ring-0 cursor-pointer dark:text-gray-300 p-0 m-0"
              >
                <option value="">Select Employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 block mb-1">Deadline</label>
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-gray-400 flex-shrink-0" />
              <span className="text-xs dark:text-gray-300">{task.deadline || "No deadline"}</span>
            </div>
          </div>
        </div>

        <div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
            task.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
            task.priority === 'medium' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          }`}>
            {task.priority} Priority
          </span>
        </div>

        {!isSubtask && task.is_recurring && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30 px-3 py-2 text-[11px] text-amber-900 dark:text-amber-200">
            <p className="font-bold uppercase tracking-wide text-[10px] text-amber-700 dark:text-amber-400 mb-1">Recurring</p>
            <p>
              {task.recurrence_type || "custom"} · every {task.recurrence_interval ?? 1}{" "}
              {task.recurrence_type === "daily" ? "day(s)" : task.recurrence_type === "weekly" ? "week(s)" : "month(s)"}
            </p>
            {task.repeat_days && task.repeat_days.length > 0 && (
              <p className="mt-0.5 text-[10px] opacity-90">Weekdays: {task.repeat_days.map(d => ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][d]).join(", ")}</p>
            )}
            {(task.recurrence_start_date || task.recurrence_end_date) && (
              <p className="mt-0.5 text-[10px] opacity-90">
                {task.recurrence_start_date || task.deadline || "?"} → {task.recurrence_end_date || "open-ended"}
              </p>
            )}
            {task.monthly_day != null && task.monthly_day > 0 && (
              <p className="text-[10px]">Monthly on day {task.monthly_day}</p>
            )}
          </div>
        )}
      </div>

      {!isCreated ? (
        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            disabled={isCreating}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {isCreating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Confirm Task
          </button>
          <button
            onClick={onCancel}
            disabled={isCreating}
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs font-bold py-1 justify-center bg-green-50 dark:bg-green-900/20 rounded-xl">
          <Check size={14} />
          Task Created Successfully!
        </div>
      )}
    </div>
  );
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  sick: "Sick Leave",
  personal: "Personal Leave",
  vacation: "Vacation",
  other: "Other",
};

function LeavePreviewCard({
  leave,
  onConfirm,
  onCancel,
  isCreated,
}: {
  leave: LeaveData;
  onConfirm: (updated: LeaveData) => void;
  onCancel: () => void;
  isCreated?: boolean;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [editedLeave, setEditedLeave] = useState<LeaveData>({ ...leave });

  const handleConfirm = async () => {
    setIsCreating(true);
    try { await onConfirm(editedLeave); } finally { setIsCreating(false); }
  };

  const formatDate = (d: string) => {
    try { return new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
    catch { return d; }
  };

  return (
    <div className="mt-3 bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-900 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3 text-purple-600 dark:text-purple-400 font-semibold text-sm">
        <CalendarDays size={16} />
        Leave Request Preview
      </div>

      <div className="space-y-3 mb-4">
        <div>
          <label className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500">Leave Type</label>
          {isCreated ? (
            <div className="text-sm font-medium dark:text-gray-200">{LEAVE_TYPE_LABELS[editedLeave.leave_type] || editedLeave.leave_type}</div>
          ) : (
            <select
              value={editedLeave.leave_type}
              onChange={e => setEditedLeave(p => ({ ...p, leave_type: e.target.value as LeaveData["leave_type"] }))}
              className="w-full text-sm bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 mt-0.5 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="sick">Sick Leave</option>
              <option value="personal">Personal Leave</option>
              <option value="vacation">Vacation</option>
              <option value="other">Other</option>
            </select>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 block mb-1">Start Date</label>
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-gray-400 shrink-0" />
              {isCreated ? (
                <span className="text-xs dark:text-gray-300">{formatDate(editedLeave.start_date)}</span>
              ) : (
                <input
                  type="date"
                  value={editedLeave.start_date}
                  onChange={e => setEditedLeave(p => ({ ...p, start_date: e.target.value }))}
                  className="text-xs bg-transparent border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              )}
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 block mb-1">End Date</label>
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-gray-400 shrink-0" />
              {isCreated ? (
                <span className="text-xs dark:text-gray-300">{formatDate(editedLeave.end_date)}</span>
              ) : (
                <input
                  type="date"
                  value={editedLeave.end_date}
                  onChange={e => setEditedLeave(p => ({ ...p, end_date: e.target.value }))}
                  className="text-xs bg-transparent border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500">Reason</label>
          {isCreated ? (
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{editedLeave.reason}</div>
          ) : (
            <textarea
              value={editedLeave.reason}
              onChange={e => setEditedLeave(p => ({ ...p, reason: e.target.value }))}
              rows={2}
              className="w-full text-xs bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 mt-0.5 dark:text-gray-200 resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          )}
        </div>
      </div>

      {!isCreated ? (
        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            disabled={isCreating || !editedLeave.start_date || !editedLeave.end_date || !editedLeave.reason}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {isCreating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Submit Leave Request
          </button>
          <button
            onClick={onCancel}
            disabled={isCreating}
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs font-bold py-1 justify-center bg-green-50 dark:bg-green-900/20 rounded-xl">
          <Check size={14} />
          Leave Request Submitted!
        </div>
      )}
    </div>
  );
}

function ExamplePrompts({ onSelect }: { onSelect: (prompt: string) => void }) {
  const prompts = [
    "Assign UI testing task to Ravi by tomorrow",
    "Create high priority bug fix for login page",
    "Assign API docs task to Sai by Friday"
  ];

  return (
    <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800">
      <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Try asking</p>
      <div className="flex flex-col gap-1.5">
        {prompts.map((p, i) => (
          <button
            key={i}
            onClick={() => onSelect(p)}
            className="text-left text-xs p-2 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-purple-200 dark:hover:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-600 dark:text-gray-400 transition-all truncate"
          >
            &ldquo;{p}&rdquo;
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AIAssistant({
  isOpen,
  onClose,
  userRole,
  pathname,
}: AIAssistantProps) {
  const router = useRouter();

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentActions, setCurrentActions] = useState<ChatAction[]>([]);
  const [contextLoaded, setContextLoaded] = useState(false);
  const [employees, setEmployees] = useState<User[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const res = await getAssignableUsers();
        if (res.data) setEmployees(res.data);
      } catch (err) {
        console.error("Failed to fetch employees for AI Assistant", err);
      }
    };
    if (isOpen) {
      loadEmployees();
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || contextLoaded) return;
    let cancelled = false;

    (async () => {
      setIsTyping(true);
      try {
        const data = await callChatbot("context", "", pathname);
        if (cancelled) return;
        setMessages([{ role: "assistant", content: data.reply, actions: data.actions }]);
        setCurrentActions(data.actions);
        setContextLoaded(true);
      } catch {
        if (cancelled) return;
        setMessages([{
          role: "assistant",
          content: "Hi! I'm your AI Assistant. I can help you navigate or create tasks using natural language.",
          actions: [],
        }]);
        setContextLoaded(true);
      } finally {
        if (!cancelled) setIsTyping(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isOpen, pathname, contextLoaded]);

  const handleNavigate = useCallback(
    (route: string) => { router.push(route); },
    [router]
  );

  const handleSendMessage = useCallback(async (customMsg?: string) => {
    const textToSend = customMsg || message.trim();
    if (!textToSend || isTyping) return;

    if (!customMsg) setMessage("");
    
    // Add user message to state
    const newUserMsg: Message = { role: "user", content: textToSend };
    setMessages((prev) => [...prev, newUserMsg]);
    setIsTyping(true);

    try {
      // Send history including the new user message
      const data = await callChatbot("query", textToSend, pathname, [...messages, newUserMsg]);
      
      const newAssistantMsg: Message = { 
        role: "assistant", 
        content: data.reply, 
        actions: data.actions,
        suggestions: data.suggestions || undefined
      };

      // Only show preview if no clarification is needed
      if (!data.needs_clarification) {
        if (data.task_data) {
          if (data.is_task_intent) {
            newAssistantMsg.taskPreview = data.task_data;
            newAssistantMsg.isSubtask = false;
          } else if (data.is_subtask_intent) {
            newAssistantMsg.taskPreview = data.task_data;
            newAssistantMsg.isSubtask = true;
          }
        }
        if (data.is_leave_intent && data.leave_data) {
          newAssistantMsg.leavePreview = data.leave_data;
        }
      }

      setMessages((prev) => [...prev, newAssistantMsg]);
      setCurrentActions(data.actions);
      
      if (data.navigate_to) {
        setTimeout(() => {
          handleNavigate(data.navigate_to!);
          onClose(); // close the assistant so the destination page is visible
        }, 800);
      }
    } catch (error) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        actions: currentActions,
      }]);
    } finally {
      setIsTyping(false);
    }
  }, [message, isTyping, pathname, currentActions, handleNavigate, messages, onClose]);

  const handleConfirmTask = async (task: TaskData, msgIndex: number) => {
    try {
      if (messages[msgIndex]?.isSubtask) {
        await confirmSubtaskCreation(task);
        toast.success("Subtask created and assigned!");
      } else {
        await confirmTaskCreation(task);
        toast.success("Task created and assigned!");
      }
      
      // Dispatch event to refresh tasks in Project Management page if currently open
      window.dispatchEvent(new CustomEvent("refresh-tasks"));
      
      setMessages(prev => {
        const next = [...prev];
        if (next[msgIndex]) {
          next[msgIndex] = { ...next[msgIndex], isTaskCreated: true, taskPreview: task };
        }
        return next;
      });
    } catch (err) {
      toast.error(messages[msgIndex]?.isSubtask ? "Failed to create subtask" : "Failed to create task");
    }
  };

  const handleConfirmLeave = async (leave: LeaveData, msgIndex: number) => {
    try {
      await confirmLeaveCreation(leave);
      toast.success("Leave request submitted successfully!");
      setMessages(prev => {
        const next = [...prev];
        if (next[msgIndex]) next[msgIndex] = { ...next[msgIndex], isLeaveCreated: true, leavePreview: leave };
        return next;
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit leave request");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full sm:w-[440px] h-[90vh] sm:h-[640px] bg-white dark:bg-gray-950 sm:rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6 flex justify-between items-start flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Sparkles className="text-white" size={24} />
            </div>
            <div>
              <h3 className="font-bold text-xl tracking-tight">AI Assistant</h3>
              <p className="text-purple-100/80 text-xs font-medium uppercase tracking-wider">Powered by WorkForce Pro</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2 rounded-xl">
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, index) => (
            <div key={index} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                  msg.role === "user" 
                    ? "bg-purple-600 text-white rounded-tr-none" 
                    : "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-200/50 dark:border-gray-800"
                }`}
              >
                {msg.role === "assistant" ? formatReply(msg.content) : msg.content}
              </div>

              {msg.suggestions && msg.suggestions.length > 0 && !msg.isTaskCreated && (
                <div className="flex flex-wrap gap-2 mt-2 max-w-[85%]">
                  {msg.suggestions.map((suggestion, sIndex) => (
                    <button
                      key={sIndex}
                      onClick={() => handleSendMessage(suggestion)}
                      className="px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 rounded-full text-xs font-medium hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all shadow-sm"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
              
              {msg.taskPreview && (
                <div className="w-full max-w-[85%]">
                  <TaskPreviewCard 
                    task={msg.taskPreview} 
                    isCreated={msg.isTaskCreated}
                    isSubtask={msg.isSubtask}
                    employees={employees}
                    onConfirm={(updatedTask) => handleConfirmTask(updatedTask, index)}
                    onCancel={() => {
                      setMessages(prev => prev.filter((_, i) => i !== index));
                    }}
                  />
                </div>
              )}

              {msg.leavePreview && (
                <div className="w-full max-w-[85%]">
                  <LeavePreviewCard
                    leave={msg.leavePreview}
                    isCreated={msg.isLeaveCreated}
                    onConfirm={(updated) => handleConfirmLeave(updated, index)}
                    onCancel={() => {
                      setMessages(prev => prev.filter((_, i) => i !== index));
                    }}
                  />
                </div>
              )}
            </div>
          ))}
          {isTyping && <TypingIndicator />}
        </div>

        {/* Example Prompts */}
        {userRole === "admin" && messages.length <= 1 && (
          <ExamplePrompts onSelect={(p) => handleSendMessage(p)} />
        )}

        {/* Input */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-950/50 backdrop-blur-xl">
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder={userRole === "admin" ? "Try 'Assign task to Ravi...'" : "Ask me anything..."}
              className="w-full pl-5 pr-14 py-4 bg-gray-100 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-purple-500/50 text-sm dark:text-gray-200 transition-all shadow-inner"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!message.trim() || isTyping}
              className="absolute right-2 w-10 h-10 bg-purple-600 text-white rounded-xl flex items-center justify-center hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-800 transition-all shadow-lg hover:shadow-purple-500/30"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
