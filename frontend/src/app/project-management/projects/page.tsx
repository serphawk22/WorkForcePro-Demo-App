"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ProjectShell from "@/components/project-management/ProjectShell";
import { useAuth } from "@/components/AuthProvider";
import {
  Plus, Search, Circle, Loader2, X, CheckCircle2, Clock, AlertCircle,
  Github, ExternalLink, ChevronRight, ChevronDown, ListTree, Link, Save, Copy, Repeat,
} from "lucide-react";
import {
  getAllTasks, createTask, updateTaskStatus, updateTaskLinks, updateTask,
  deleteTask, getAssignableUsers, createSubtask, getTaskSubtasks,
  updateSubtaskStatus, deleteSubtask, searchByPublicId, updateSubtask,
  Task, TaskCreate, Subtask, SubtaskCreate, User,
} from "@/lib/api";
import { toast } from "sonner";

const priorityColors: Record<string, string> = {
  high: "bg-red-500/10 text-red-500 border border-red-500/30",
  medium: "bg-yellow-500/10 text-yellow-600 border border-yellow-500/30",
  low: "bg-green-500/10 text-green-600 border border-green-500/30",
};
const prioritySelectColors: Record<string, string> = {
  high: "text-red-500",
  medium: "text-yellow-600",
  low: "text-green-600",
};
const statusColors: Record<string, string> = {
  todo: "text-purple-400", in_progress: "text-blue-400",
  submitted: "text-yellow-400", reviewing: "text-amber-400",
  approved: "text-green-400", rejected: "text-red-400",
};

function assigneeOptionLabel(u: User) {
  const roleLabel = u.role === "admin" ? "Admin" : "Employee";
  return `${u.name} (${roleLabel})`;
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === "admin";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [taskSubtasks, setTaskSubtasks] = useState<Record<number, Subtask[]>>({});
  const [showSubtaskModal, setShowSubtaskModal] = useState(false);
  const [selectedTaskForSubtask, setSelectedTaskForSubtask] = useState<number | null>(null);
  const [isCreatingSubtask, setIsCreatingSubtask] = useState(false);
  const [showEditLinksModal, setShowEditLinksModal] = useState(false);
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<Task | null>(null);
  const [editingLinks, setEditingLinks] = useState({ github_link: "", deployed_link: "" });
  const [isUpdatingLinks, setIsUpdatingLinks] = useState(false);
  const [isSearchingById, setIsSearchingById] = useState(false);
  const [newTask, setNewTask] = useState<TaskCreate>({
    title: "", description: "", priority: "medium",
    assigned_to: undefined, due_date: undefined, github_link: undefined, deployed_link: undefined,
    is_recurring: false,
    recurrence_type: "weekly",
    recurrence_interval: 1,
    repeat_days: [],
    recurrence_start_date: undefined,
    recurrence_end_date: undefined,
    monthly_day: undefined,
  });

  const WEEKDAY_OPTS = [
    { v: 0, l: "Mon" }, { v: 1, l: "Tue" }, { v: 2, l: "Wed" }, { v: 3, l: "Thu" },
    { v: 4, l: "Fri" }, { v: 5, l: "Sat" }, { v: 6, l: "Sun" },
  ];

  const toggleRepeatDay = (d: number) => {
    const cur = new Set(newTask.repeat_days || []);
    if (cur.has(d)) cur.delete(d);
    else cur.add(d);
    setNewTask({ ...newTask, repeat_days: Array.from(cur).sort((a, b) => a - b) });
  };
  const [newSubtask, setNewSubtask] = useState<SubtaskCreate>({
    title: "", description: "", assigned_to: undefined,
  });

  // Auto-redirect on 6-char Ref ID
  useEffect(() => {
    const trimmed = searchQuery.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(trimmed)) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsSearchingById(true);
      try {
        const result = await searchByPublicId(trimmed);
        if (cancelled) return;
        if (result.data) router.push(`/project-management/${result.data.task_id}`);
        else toast.error(`No project found with Ref ID "${trimmed}"`);
      } catch { if (!cancelled) toast.error("Search failed"); }
      finally { if (!cancelled) setIsSearchingById(false); }
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [searchQuery, router]);

  // Track which task rows are currently loading their subtasks
  const [loadingSubtasksFor, setLoadingSubtasksFor] = useState<Set<number>>(new Set());

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    const [tasksResult, empResult] = await Promise.all([
      getAllTasks(statusFilter || undefined),   // all users see all tasks
      getAssignableUsers(),
    ]);
    if (tasksResult.data) setTasks(tasksResult.data);
    if (empResult.data) setEmployees(empResult.data);
    if (!silent) setIsLoading(false);
    // Pre-fetch subtasks for every task so they're ready on expand (and the count badge shows)
    if (tasksResult.data) {
      tasksResult.data.forEach(task => loadSubtasksQuietly(task.id));
    }
  // loadSubtasksQuietly is stable (defined below with useCallback + no deps)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  // Keep a stable ref to expandedTasks so the event listener always sees the latest value
  const expandedTasksRef = React.useRef(expandedTasks);
  useEffect(() => { expandedTasksRef.current = expandedTasks; }, [expandedTasks]);

  // Silent background fetch — no spinner, just updates state
  const loadSubtasksQuietly = useCallback(async (taskId: number) => {
    const result = await getTaskSubtasks(taskId);
    if (result.data) setTaskSubtasks(prev => ({ ...prev, [taskId]: result.data! }));
  }, []);

  // Visible fetch — shows spinner inside the expansion panel
  const loadSubtasks = useCallback(async (taskId: number) => {
    setLoadingSubtasksFor((prev) => {
      const next = new Set(prev);
      next.add(taskId);
      return next;
    });
    const result = await getTaskSubtasks(taskId);
    if (result.data) setTaskSubtasks(prev => ({ ...prev, [taskId]: result.data! }));
    setLoadingSubtasksFor(prev => { const next = new Set(prev); next.delete(taskId); return next; });
  }, []);

  useEffect(() => {
    const handleRefresh = async () => {
      // Silent reload — keeps the table visible so expandedTasks state stays intact
      await loadData(true);
      // Reload subtasks for every currently expanded task (no spinner — already visible)
      expandedTasksRef.current.forEach((taskId) => loadSubtasksQuietly(taskId));
    };
    window.addEventListener("refresh-tasks", handleRefresh);
    return () => window.removeEventListener("refresh-tasks", handleRefresh);
  }, [loadData, loadSubtasksQuietly]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) { toast.error("Task title is required"); return; }
    if (isAdmin && !newTask.assigned_to) { toast.error("Please assign this project to a team member"); return; }
    setIsCreating(true);
    const result = await createTask(newTask);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Project created!");
      setShowCreateModal(false);
      setNewTask({
        title: "", description: "", priority: "medium",
        assigned_to: undefined, due_date: undefined, github_link: undefined, deployed_link: undefined,
        is_recurring: false, recurrence_type: "weekly", recurrence_interval: 1, repeat_days: [],
        recurrence_start_date: undefined, recurrence_end_date: undefined, monthly_day: undefined,
      });
      loadData();
    }
    setIsCreating(false);
  };

  const handlePriorityChange = async (taskId: number, priority: "low" | "medium" | "high") => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, priority } : t));
    const result = await updateTask(taskId, { priority });
    if (result.error) { toast.error(result.error); loadData(); }
    else toast.success("Priority updated!");
  };

  const handleStatusChange = async (taskId: number, selectedStatus: string) => {
    const backendStatus = selectedStatus === "done" ? "submitted" : selectedStatus;
    const result = await updateTaskStatus(taskId, backendStatus as any);
    if (result.error) toast.error(result.error);
    else { toast.success(selectedStatus === "done" ? "Task submitted for review!" : "Status updated!"); loadData(); }
  };

  const handleAssigneeChange = async (taskId: number, userId: number) => {
    const result = await updateTask(taskId, { assigned_to: userId });
    if (result.error) toast.error(result.error);
    else { toast.success("Assignee updated!"); loadData(); }
  };

  const handleSubtaskAssigneeChange = async (subtaskId: number, taskId: number, userId: number) => {
    const result = await updateSubtask(subtaskId, { assigned_to: userId });
    if (result.error) toast.error(result.error);
    else { toast.success("Subtask assignee updated!"); await loadSubtasks(taskId); }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm("Delete this project?")) return;
    const result = await deleteTask(taskId);
    if (result.error) toast.error(result.error);
    else { toast.success("Project deleted!"); loadData(); }
  };

  const handleOpenEditLinks = (task: Task) => {
    setSelectedTaskForEdit(task);
    setEditingLinks({ github_link: task.github_link || "", deployed_link: task.deployed_link || "" });
    setShowEditLinksModal(true);
  };

  const handleUpdateLinks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForEdit) return;
    setIsUpdatingLinks(true);
    const result = await updateTaskLinks(selectedTaskForEdit.id, editingLinks.github_link, editingLinks.deployed_link);
    if (result.error) toast.error(result.error);
    else { toast.success("Links updated!"); setShowEditLinksModal(false); setSelectedTaskForEdit(null); loadData(); }
    setIsUpdatingLinks(false);
  };

  const toggleExpandTask = async (taskId: number) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
      await loadSubtasks(taskId); // Always reload — ensures newly created subtasks are shown
    }
    setExpandedTasks(newExpanded);
  };

  const handleCreateSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtask.title.trim()) { toast.error("Subtask title is required"); return; }
    // Capture immediately so closures stay valid after state resets
    const taskId = selectedTaskForSubtask;
    if (!taskId) { toast.error("No task selected"); return; }
    setIsCreatingSubtask(true);
    const result = await createSubtask(taskId, newSubtask);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Subtask created!");
      // Optimistically add the returned subtask immediately — no need to wait for a reload
      if (result.data) {
        setTaskSubtasks(prev => ({
          ...prev,
          [taskId]: [...(prev[taskId] ?? []), result.data!],
        }));
      }
      // Ensure the task row is expanded so the subtask is visible
      setExpandedTasks((prev) => {
        const next = new Set(prev);
        next.add(taskId);
        return next;
      });
      // Reset modal state
      setShowSubtaskModal(false);
      setNewSubtask({ title: "", description: "", assigned_to: undefined });
      setSelectedTaskForSubtask(null);
      // Sync with server in the background to get latest data (assignee names, etc.)
      loadSubtasks(taskId);
    }
    setIsCreatingSubtask(false);
  };

  const handleSubtaskStatusChange = async (subtaskId: number, taskId: number, status: string) => {
    const result = await updateSubtaskStatus(subtaskId, status);
    if (result.error) toast.error(result.error);
    else { toast.success("Subtask updated!"); await loadSubtasks(taskId); }
  };

  const handleDeleteSubtask = async (subtaskId: number, taskId: number) => {
    if (!confirm("Delete this subtask?")) return;
    const result = await deleteSubtask(subtaskId);
    if (result.error) toast.error(result.error);
    else { toast.success("Subtask deleted!"); await loadSubtasks(taskId); }
  };

  const handleCopyRefId = (e: React.MouseEvent, refId: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(refId).then(() => toast.success(`Copied ${refId}`));
  };

  const filteredTasks = tasks.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.public_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const newProjectBtn = isAdmin ? (
    <button
      onClick={() => setShowCreateModal(true)}
      className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-md hover:opacity-90 transition-opacity"
      style={{ background: "#522B5B" }}
    >
      <Plus size={16} /> New Project
    </button>
  ) : null;

  return (
    <ProjectShell headerAction={newProjectBtn}>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tasks or Ref ID (e.g. A7X9K2)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg glass-input py-2 pl-9 pr-9 text-sm"
            />
            {isSearchingById && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-purple-500" />}
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg glass-input px-3 py-2 text-sm"
          >
            <option value="">All Status</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            {isAdmin ? (
              <>
                <option value="submitted">Submitted</option>
                <option value="reviewing">Reviewing</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </>
            ) : (
              <>
                <option value="submitted">Done (Pending Review)</option>
                <option value="approved">Approved</option>
                <option value="rejected">Needs Changes</option>
              </>
            )}
          </select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500 drop-shadow-[0_0_8px_rgba(167,139,250,0.8)]" />
          </div>
        ) : (
          <div className="rounded-xl glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20 text-purple-400 font-semibold">
                  <th className="py-3 pl-4 text-left font-semibold"></th>
                  <th className="py-3 text-left font-semibold">Ref ID</th>
                  <th className="py-3 text-left font-semibold">Task</th>
                  <th className="py-3 text-left font-semibold">Priority</th>
                  <th className="py-3 text-left font-semibold">Status</th>
                  <th className="py-3 text-left font-semibold">Start Date</th>
                  <th className="py-3 text-left font-semibold">Due Date</th>
                  <th className="py-3 text-left font-semibold">Assignee</th>
                  <th className="py-3 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "#DFB6B2" }}>
                {filteredTasks.map((task) => (
                  <React.Fragment key={task.id}>
                    <tr
                      className="hover:bg-secondary/30 transition-colors cursor-pointer"
                      onClick={() => router.push(`/project-management/${task.id}`)}
                    >
                      <td className="py-3.5 pl-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleExpandTask(task.id); }}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {expandedTasks.has(task.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </td>
                      <td className="py-3.5">
                        {task.public_id ? (
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-[11px] font-semibold px-2 py-1 rounded-md tracking-wider select-all bg-gradient-to-r from-purple-500/15 to-pink-500/15 border border-purple-500/30 text-purple-400">
                              {task.public_id}
                            </span>
                            <button onClick={(e) => handleCopyRefId(e, task.public_id)} className="text-muted-foreground hover:text-purple-400 transition-colors p-0.5">
                              <Copy size={11} />
                            </button>
                          </div>
                        ) : <span className="text-[10px] text-muted-foreground italic">—</span>}
                      </td>
                      <td className="py-3.5">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-card-foreground">{task.title}</span>
                            {task.is_recurring && (
                              <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400" title="Recurring task">
                                <Repeat size={10} /> Recurring
                              </span>
                            )}
                            {(isAdmin || task.assigned_to === user?.id) && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedTaskForSubtask(task.id); setShowSubtaskModal(true); }}
                                className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-500 hover:bg-blue-500/20 transition-colors"
                                title="Add subtask"
                              >
                                <Plus size={10} />
                              </button>
                            )}
                            {!isAdmin && task.assigned_to === user?.id && (
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-gradient-to-r from-purple-500/15 to-pink-500/15 border border-purple-500/30 text-purple-400">
                                Assigned to You
                              </span>
                            )}
                            {taskSubtasks[task.id]?.length > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-500">
                                <ListTree size={10} />
                                {taskSubtasks[task.id].filter(s => s.status === "completed").length}/{taskSubtasks[task.id].length}
                              </span>
                            )}
                          </div>
                          {task.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>}
                          {(task.github_link || task.deployed_link) && (
                            <div className="flex gap-2 mt-1.5">
                              {task.github_link && (
                                <a href={task.github_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600" onClick={e => e.stopPropagation()}>
                                  <Github size={12} /> GitHub
                                </a>
                              )}
                              {task.deployed_link && (
                                <a href={task.deployed_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-green-500 hover:text-green-600" onClick={e => e.stopPropagation()}>
                                  <ExternalLink size={12} /> Live Demo
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5">
                        <select
                          value={task.priority}
                          onChange={(e) => handlePriorityChange(task.id, e.target.value as "low" | "medium" | "high")}
                          onClick={(e) => e.stopPropagation()}
                          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold capitalize cursor-pointer border bg-transparent focus:outline-none focus:ring-1 focus:ring-primary/40 ${priorityColors[task.priority]}`}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </td>
                      <td className="py-3.5">
                        {isAdmin ? (
                          <select value={task.status} onChange={(e) => handleStatusChange(task.id, e.target.value)} onClick={e => e.stopPropagation()} className={`text-xs font-medium bg-transparent border-none cursor-pointer ${statusColors[task.status]}`}>
                            <option value="reviewing">Reviewing</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        ) : (
                          <select value={task.status === "submitted" ? "done" : task.status} onChange={(e) => handleStatusChange(task.id, e.target.value)} onClick={e => e.stopPropagation()} className={`text-xs font-medium bg-transparent border-none cursor-pointer ${statusColors[task.status]}`} disabled={task.status === "submitted" || task.status === "approved"}>
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="done">Done</option>
                          </select>
                        )}
                      </td>
                      <td className="py-3.5 text-muted-foreground text-xs">
                        {task.start_date ? new Date(task.start_date).toLocaleDateString("en-IN") : "--"}
                      </td>
                      <td className="py-3.5 text-card-foreground text-xs font-medium">
                        {task.due_date ? new Date(task.due_date).toLocaleDateString("en-IN") : "--"}
                      </td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold shrink-0" style={{ background: "hsl(289 36% 26% / 0.12)", color: "#522B5B", border: "1px solid hsl(289 36% 26% / 0.2)" }}>
                            {task.assignee_name ? task.assignee_name.split(" ").map(n => n[0]).join("") : "?"}
                          </div>
                          {isAdmin ? (
                            <select
                              value={task.assigned_to || ""}
                              onChange={(e) => handleAssigneeChange(task.id, Number(e.target.value))}
                              onClick={(e) => e.stopPropagation()}
                              className="text-sm font-medium text-card-foreground bg-transparent border-none focus:outline-none cursor-pointer hover:underline underline-offset-4"
                            >
                              <option value="">Unassigned</option>
                              {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{assigneeOptionLabel(emp)}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-sm font-medium text-card-foreground">
                              {task.assignee_name || "Unassigned"}
                              {task.assigned_to === user?.id && (
                                <span className="ml-1.5 text-[10px] font-semibold text-primary">(You)</span>
                              )}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5">
                        {isAdmin && (
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }} className="text-red-500 hover:text-red-600 text-xs">Delete</button>
                        )}
                      </td>
                    </tr>

                    {/* Subtasks expansion */}
                    {expandedTasks.has(task.id) && (
                      <tr>
                        <td colSpan={9} className="py-0 px-0 bg-primary/[0.04] dark:bg-white/[0.02]">
                          <div className="px-12 py-4">
                            {loadingSubtasksFor.has(task.id) ? (
                              <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                                <Loader2 size={13} className="animate-spin" /> Loading subtasks…
                              </div>
                            ) : taskSubtasks[task.id]?.length > 0 ? (
                              <div className="space-y-2.5">
                                {taskSubtasks[task.id].map((subtask) => (
                                  <div
                                    key={subtask.id}
                                    className="relative rounded-xl p-4 flex items-center justify-between transition-all duration-200 shadow-sm bg-card border border-border hover:border-primary/30"
                                  >
                                    {/* Left accent stripe coloured by status */}
                                    <span className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${
                                      subtask.status === "completed" || subtask.status === "approved" ? "bg-green-500" :
                                      subtask.status === "in_progress" ? "bg-blue-500" :
                                      subtask.status === "reviewing" ? "bg-amber-500" :
                                      subtask.status === "rejected" ? "bg-red-500" :
                                      "bg-primary/40"
                                    }`} />

                                    <div className="flex-1 ml-3">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <ListTree size={14} className="text-primary shrink-0" />
                                        {subtask.public_id && (
                                          <>
                                            <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded select-all tracking-wider bg-primary/10 text-primary border border-primary/20">
                                              {subtask.public_id}
                                            </span>
                                            <button onClick={(e) => handleCopyRefId(e, subtask.public_id)} className="text-muted-foreground hover:text-primary transition-colors">
                                              <Copy size={10} />
                                            </button>
                                          </>
                                        )}
                                        <span className="text-sm font-medium text-card-foreground">{subtask.title}</span>
                                      </div>

                                      {/* Assignee row */}
                                      {(isAdmin || task.assigned_to === user?.id) ? (
                                        <div className="flex items-center gap-2 mt-2 ml-6">
                                          <div className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold bg-primary/15 text-primary border border-primary/20">
                                            {subtask.assignee_name ? subtask.assignee_name.split(" ").map(n => n[0]).join("") : "?"}
                                          </div>
                                          <select
                                            value={subtask.assigned_to || ""}
                                            onChange={(e) => handleSubtaskAssigneeChange(subtask.id, task.id, Number(e.target.value))}
                                            className="text-xs font-medium text-muted-foreground bg-transparent border-none focus:outline-none cursor-pointer hover:underline underline-offset-2"
                                          >
                                            <option value="">Unassigned</option>
                                            {employees.map(emp => (
                                              <option key={emp.id} value={emp.id}>{assigneeOptionLabel(emp)}</option>
                                            ))}
                                          </select>
                                        </div>
                                      ) : subtask.assignee_name && (
                                        <div className="flex items-center gap-2 mt-2 ml-6">
                                          <div className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold bg-primary/15 text-primary border border-primary/20">
                                            {subtask.assignee_name.split(" ").map(n => n[0]).join("")}
                                          </div>
                                          <span className="text-xs font-medium text-muted-foreground">{subtask.assignee_name}</span>
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0">
                                      {/* ── Status control — role-split ── */}
                                      {isAdmin ? (
                                        // Workflow: todo/in_progress → read-only (not ready); completed → admin can review; reviewing/approved/rejected → admin can update
                                        subtask.status === "todo" || subtask.status === "in_progress" ? (
                                          // Not ready for review — show status only
                                          <span className={`text-xs rounded-lg px-3 py-1.5 font-semibold border ${
                                            subtask.status === "in_progress"
                                              ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400"
                                              : "bg-muted border-border text-muted-foreground"
                                          }`}>
                                            {subtask.status === "in_progress" ? "In Progress" : "To Do"}
                                          </span>
                                        ) : subtask.status === "completed" ? (
                                          // Employee completed — admin can now start review
                                          <select
                                            defaultValue=""
                                            onChange={(e) => { if (e.target.value) handleSubtaskStatusChange(subtask.id, task.id, e.target.value); }}
                                            className="text-xs rounded-lg px-3 py-1.5 font-semibold bg-green-500/10 border border-green-500/40 text-green-700 dark:text-green-400 focus:outline-none focus:ring-1 focus:ring-green-500/40 cursor-pointer"
                                          >
                                            <option value="" disabled>Completed — Review…</option>
                                            <option value="reviewing">Reviewing</option>
                                            <option value="approved">Approved</option>
                                            <option value="rejected">Rejected</option>
                                          </select>
                                        ) : (
                                          // Already in admin phase — can update freely
                                          <select
                                            value={subtask.status}
                                            onChange={(e) => handleSubtaskStatusChange(subtask.id, task.id, e.target.value)}
                                            className="text-xs rounded-lg px-3 py-1.5 font-semibold bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
                                          >
                                            <option value="reviewing">Reviewing</option>
                                            <option value="approved">Approved</option>
                                            <option value="rejected">Rejected</option>
                                          </select>
                                        )
                                      ) : (
                                        // Employee sees admin-phase status as read-only, otherwise picks their 3 options
                                        ["reviewing","approved","rejected"].includes(subtask.status) ? (
                                          <span className={`text-xs rounded-lg px-3 py-1.5 font-semibold border ${
                                            subtask.status === "approved" ? "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400" :
                                            subtask.status === "rejected" ? "bg-red-500/10 border-red-500/30 text-red-500" :
                                            "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                                          }`}>
                                            {subtask.status.charAt(0).toUpperCase() + subtask.status.slice(1)}
                                          </span>
                                        ) : (
                                          <select
                                            value={subtask.status}
                                            onChange={(e) => handleSubtaskStatusChange(subtask.id, task.id, e.target.value)}
                                            disabled={subtask.assigned_to !== user?.id}
                                            className="text-xs rounded-lg px-3 py-1.5 font-semibold bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                          >
                                            <option value="todo">To Do</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="completed">Completed</option>
                                          </select>
                                        )
                                      )}
                                      {(isAdmin || task.assigned_to === user?.id) && (
                                        <button
                                          onClick={() => handleDeleteSubtask(subtask.id, task.id)}
                                          className="text-xs font-medium text-red-500 hover:text-red-400 border border-red-500/30 hover:border-red-400/50 rounded-lg px-2.5 py-1.5 transition-colors"
                                        >
                                          Delete
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-center text-muted-foreground text-xs py-4">No subtasks yet. Click &ldquo;+&rdquo; next to the task name to create one.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {filteredTasks.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-muted-foreground">
                      {searchQuery ? "No projects match your search" : "No projects yet"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create Project Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl bg-card border border-border max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                Create New Project
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-4">
              {[
                { label: "Title *", name: "title", type: "text", placeholder: "Project title", required: true },
              ].map(f => (
                <div key={f.name}>
                  <label className="block text-sm font-semibold mb-1 text-foreground">{f.label}</label>
                  <input type={f.type} value={(newTask as any)[f.name] || ""} onChange={e => setNewTask({ ...newTask, [f.name]: e.target.value })} className="w-full rounded-lg py-2 px-3 text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder={f.placeholder} required={f.required} />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">Description</label>
                <textarea value={newTask.description || ""} onChange={e => setNewTask({ ...newTask, description: e.target.value })} className="w-full rounded-lg py-2 px-3 text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-foreground">Priority</label>
                  <select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value as any })} className="w-full rounded-lg py-2 px-3 text-sm bg-background border border-border text-foreground focus:outline-none">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-foreground">Due Date</label>
                  <input type="date" value={newTask.due_date || ""} onChange={e => setNewTask({ ...newTask, due_date: e.target.value || undefined })} className="w-full rounded-lg py-2 px-3 text-sm bg-background border border-border text-foreground focus:outline-none" />
                </div>
              </div>
              {isAdmin && (
                <div>
                  <label className="block text-sm font-semibold mb-1 text-foreground">Assign To *</label>
                  <select value={newTask.assigned_to || ""} onChange={e => setNewTask({ ...newTask, assigned_to: e.target.value ? Number(e.target.value) : undefined })} className="w-full rounded-lg py-2 px-3 text-sm bg-background border border-border text-foreground focus:outline-none" required>
                    <option value="" disabled>Select team member</option>
                    {employees.map(emp => <option key={emp.id} value={emp.id}>{assigneeOptionLabel(emp)}</option>)}
                  </select>
                </div>
              )}
              {isAdmin && (
                <div className="rounded-xl border border-border/80 bg-primary/[0.03] dark:bg-white/[0.02] p-4 space-y-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!newTask.is_recurring}
                      onChange={e => setNewTask({ ...newTask, is_recurring: e.target.checked })}
                      className="rounded border-border"
                    />
                    <Repeat size={16} className="text-amber-500" />
                    Repeat task (recurring)
                  </label>
                  {newTask.is_recurring && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Frequency</label>
                          <select
                            value={newTask.recurrence_type || "weekly"}
                            onChange={e => setNewTask({ ...newTask, recurrence_type: e.target.value as TaskCreate["recurrence_type"] })}
                            className="w-full rounded-lg py-2 px-2 text-sm bg-background border border-border"
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Every (interval)</label>
                          <input
                            type="number"
                            min={1}
                            max={52}
                            value={newTask.recurrence_interval || 1}
                            onChange={e => setNewTask({ ...newTask, recurrence_interval: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                            className="w-full rounded-lg py-2 px-2 text-sm bg-background border border-border"
                          />
                        </div>
                      </div>
                      {newTask.recurrence_type === "weekly" && (
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-2">On weekdays</label>
                          <div className="flex flex-wrap gap-1.5">
                            {WEEKDAY_OPTS.map(({ v, l }) => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => toggleRepeatDay(v)}
                                className={`px-2 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                                  (newTask.repeat_days || []).includes(v)
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background border-border text-muted-foreground hover:border-primary/40"
                                }`}
                              >
                                {l}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {newTask.recurrence_type === "monthly" && (
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Day of month (1–31)</label>
                          <input
                            type="number"
                            min={1}
                            max={31}
                            value={newTask.monthly_day ?? ""}
                            placeholder="e.g. 15"
                            onChange={e => setNewTask({ ...newTask, monthly_day: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                            className="w-full rounded-lg py-2 px-2 text-sm bg-background border border-border"
                          />
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Series start</label>
                          <input
                            type="date"
                            value={newTask.recurrence_start_date || newTask.due_date || ""}
                            onChange={e => setNewTask({ ...newTask, recurrence_start_date: e.target.value || undefined })}
                            className="w-full rounded-lg py-2 px-2 text-sm bg-background border border-border"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Series end (optional)</label>
                          <input
                            type="date"
                            value={newTask.recurrence_end_date || ""}
                            onChange={e => setNewTask({ ...newTask, recurrence_end_date: e.target.value || undefined })}
                            className="w-full rounded-lg py-2 px-2 text-sm bg-background border border-border"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={isCreating} className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Create Subtask Modal ── */}
      {showSubtaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl bg-card border border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                <ListTree size={20} className="text-primary" /> Create Subtask
              </h2>
              <button onClick={() => { setShowSubtaskModal(false); setNewSubtask({ title: "", description: "", assigned_to: undefined }); }} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateSubtask} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1 text-foreground">Title *</label>
                <input type="text" value={newSubtask.title} onChange={e => setNewSubtask({ ...newSubtask, title: e.target.value })} className="w-full rounded-lg py-2 px-3 text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder="Subtask title" required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-foreground">Description</label>
                <textarea value={newSubtask.description || ""} onChange={e => setNewSubtask({ ...newSubtask, description: e.target.value })} className="w-full rounded-lg py-2 px-3 text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" rows={3} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-foreground">Assign To *</label>
                <select value={newSubtask.assigned_to || ""} onChange={e => setNewSubtask({ ...newSubtask, assigned_to: e.target.value ? Number(e.target.value) : undefined })} className="w-full rounded-lg py-2 px-3 text-sm bg-background border border-border text-foreground focus:outline-none" required>
                  <option value="">Select team member</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{assigneeOptionLabel(emp)}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowSubtaskModal(false); setNewSubtask({ title: "", description: "", assigned_to: undefined }); }} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={isCreatingSubtask} className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {isCreatingSubtask ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Subtask"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Links Modal ── */}
      {showEditLinksModal && selectedTaskForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl bg-card border border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-foreground"><Link size={20} className="text-primary" /> Edit Project Links</h2>
              <button onClick={() => { setShowEditLinksModal(false); setSelectedTaskForEdit(null); }} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm font-medium text-foreground">{selectedTaskForEdit.title}</p>
            </div>
            <form onSubmit={handleUpdateLinks} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1 flex items-center gap-1 text-foreground">
                  <Github size={14} /> GitHub Link
                </label>
                <input type="url" value={editingLinks.github_link} onChange={e => setEditingLinks({ ...editingLinks, github_link: e.target.value })} className="w-full rounded-lg py-2 px-3 text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder="https://github.com/user/repo" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 flex items-center gap-1 text-foreground">
                  <ExternalLink size={14} /> Deployed Link
                </label>
                <input type="url" value={editingLinks.deployed_link} onChange={e => setEditingLinks({ ...editingLinks, deployed_link: e.target.value })} className="w-full rounded-lg py-2 px-3 text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder="https://app.vercel.app" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowEditLinksModal(false); setSelectedTaskForEdit(null); }} className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" disabled={isUpdatingLinks} className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 transition-colors">
                  {isUpdatingLinks ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={16} />}
                  {isUpdatingLinks ? "Saving..." : "Save Links"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ProjectShell>
  );
}
