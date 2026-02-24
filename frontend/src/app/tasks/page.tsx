"use client";

import React, { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { Plus, Search, Circle, Loader2, X, CheckCircle2, Clock, AlertCircle, Github, ExternalLink, ChevronRight, ChevronDown, ListTree } from "lucide-react";
import { 
  getAllTasks, 
  getMyTasks, 
  createTask, 
  updateTaskStatus, 
  deleteTask,
  fetchEmployees,
  getAllEmployees,
  createSubtask,
  getTaskSubtasks,
  updateSubtaskStatus,
  deleteSubtask,
  Task,
  TaskCreate,
  Subtask,
  SubtaskCreate,
  User
} from "@/lib/api";
import { toast } from "sonner";

const priorityColors: Record<string, string> = {
  high: "bg-red-500/10 text-red-500",
  medium: "bg-yellow-500/10 text-yellow-500",
  low: "bg-green-500/10 text-green-500",
};

const statusColors: Record<string, string> = {
  todo: "text-muted-foreground",
  in_progress: "text-blue-500",
  submitted: "text-yellow-500",
  reviewing: "text-purple-500",
  approved: "text-green-500",
  rejected: "text-red-500",
  completed: "text-green-500",
};

const statusIcons: Record<string, React.ReactNode> = {
  todo: <Circle size={14} />,
  in_progress: <Clock size={14} />,
  submitted: <AlertCircle size={14} />,
  reviewing: <Clock size={14} />,
  approved: <CheckCircle2 size={14} />,
  rejected: <Circle size={14} />,
};

// Employee sees simplified labels
const employeeStatusLabels: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  submitted: "Done (Pending Review)",
  approved: "Approved",
  rejected: "Needs Changes",
};

// Admin sees full workflow labels
const adminStatusLabels: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  submitted: "Submitted",
  reviewing: "Reviewing",
  approved: "Approved",
  rejected: "Rejected",
};

export default function TasksPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Subtask state
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [taskSubtasks, setTaskSubtasks] = useState<Record<number, Subtask[]>>({});
  const [showSubtaskModal, setShowSubtaskModal] = useState(false);
  const [selectedTaskForSubtask, setSelectedTaskForSubtask] = useState<number | null>(null);
  const [isCreatingSubtask, setIsCreatingSubtask] = useState(false);
  
  // New task form state
  const [newTask, setNewTask] = useState<TaskCreate>({
    title: "",
    description: "",
    priority: "medium",
    assigned_to: undefined,
    due_date: undefined,
    github_link: undefined,
    deployed_link: undefined,
  });
  
  // New subtask form state
  const [newSubtask, setNewSubtask] = useState<SubtaskCreate>({
    title: "",
    description: "",
    assigned_to: undefined,
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    
    const tasksResult = isAdmin 
      ? await getAllTasks(statusFilter || undefined)
      : await getMyTasks(statusFilter || undefined);
    
    if (tasksResult.data) {
      setTasks(tasksResult.data);
    }
    
    // Load employees for both admin (task assignment) and employees (subtask assignment)
    const employeesResult = isAdmin 
      ? await fetchEmployees() 
      : await getAllEmployees();
    
    if (employeesResult.data) {
      setEmployees(employeesResult.data);
    }
    
    setIsLoading(false);
  }, [isAdmin, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) {
      toast.error("Task title is required");
      return;
    }
    
    setIsCreating(true);
    const result = await createTask(newTask);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Task created successfully!");
      setShowCreateModal(false);
      setNewTask({ title: "", description: "", priority: "medium", assigned_to: undefined, due_date: undefined });
      loadData();
    }
    setIsCreating(false);
  };

  const handleStatusChange = async (taskId: number, selectedStatus: string) => {
    // For employees, "done" maps to "submitted" 
    const backendStatus = selectedStatus === "done" ? "submitted" : selectedStatus;
    
    const result = await updateTaskStatus(taskId, backendStatus as "todo" | "in_progress" | "submitted" | "approved" | "rejected");
    if (result.error) {
      toast.error(result.error);
    } else {
      // Show appropriate message for employees marking done
      if (selectedStatus === "done") {
        toast.success("Task submitted for review!");
      } else {
        toast.success("Task status updated!");
      }
      loadData();
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    
    const result = await deleteTask(taskId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Task deleted!");
      loadData();
    }
  };
  
  // Subtask handlers
  const toggleExpandTask = async (taskId: number) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
      // Load subtasks if not already loaded
      if (!taskSubtasks[taskId]) {
        await loadSubtasks(taskId);
      }
    }
    setExpandedTasks(newExpanded);
  };
  
  const loadSubtasks = async (taskId: number) => {
    const result = await getTaskSubtasks(taskId);
    if (result.data) {
      setTaskSubtasks(prev => ({ ...prev, [taskId]: result.data! }));
    }
  };
  
  const handleCreateSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtask.title.trim()) {
      toast.error("Subtask title is required");
      return;
    }
    if (!selectedTaskForSubtask) {
      toast.error("No task selected");
      return;
    }
    
    setIsCreatingSubtask(true);
    const result = await createSubtask(selectedTaskForSubtask, newSubtask);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Subtask created and assigned!");
      setShowSubtaskModal(false);
      setNewSubtask({ title: "", description: "", assigned_to: undefined });
      setSelectedTaskForSubtask(null);
      // Reload subtasks for this task
      await loadSubtasks(selectedTaskForSubtask);
    }
    setIsCreatingSubtask(false);
  };
  
  const handleSubtaskStatusChange = async (subtaskId: number, taskId: number, status: string) => {
    const result = await updateSubtaskStatus(subtaskId, status);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Subtask updated!");
      await loadSubtasks(taskId);
    }
  };
  
  const handleDeleteSubtask = async (subtaskId: number, taskId: number) => {
    if (!confirm("Are you sure you want to delete this subtask?")) return;
    
    const result = await deleteSubtask(subtaskId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Subtask deleted!");
      await loadSubtasks(taskId);
    }
  };

  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ProtectedRoute>
      <DashboardLayout 
        role={isAdmin ? "admin" : "employee"} 
        userName={user?.name || "User"} 
        userHandle={`@${user?.email?.split("@")[0] || "user"}`}
      >
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isAdmin ? "Manage and assign tasks to team members" : "View and update your assigned tasks"}
              </p>
            </div>
            {isAdmin && (
              <button 
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <Plus size={16} /> New Task
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg glass-input py-2 pl-9 pr-4 text-sm"
              />
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
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-xl glass-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 pl-4 text-left font-semibold">ID</th>
                    <th className="py-3 text-left font-semibold">Task</th>
                    <th className="py-3 text-left font-semibold">Priority</th>
                    <th className="py-3 text-left font-semibold">Status</th>
                    <th className="py-3 text-left font-semibold">Due Date</th>
                    {isAdmin && <th className="py-3 text-left font-semibold">Assignee</th>}
                    <th className="py-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTasks.map((task) => (
                    <React.Fragment key={task.id}>
                      <tr className="hover:bg-secondary/30 transition-colors">
                        <td className="py-3.5 pl-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleExpandTask(task.id)}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {expandedTasks.has(task.id) ? (
                                <ChevronDown size={14} />
                              ) : (
                                <ChevronRight size={14} />
                              )}
                            </button>
                            <span className="text-xs font-mono text-muted-foreground">
                              {task.id}
                            </span>
                          </div>
                        </td>
                      <td className="py-3.5">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-card-foreground">{task.title}</span>
                            {!isAdmin && task.assigned_to === user?.id && (
                              <span className="inline-flex items-center rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-500">
                                Assigned to You
                              </span>
                            )}
                            {taskSubtasks[task.id] && taskSubtasks[task.id].length > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-500">
                                <ListTree size={10} />
                                {taskSubtasks[task.id].filter(s => s.status === "completed" || s.status === "approved").length}/{taskSubtasks[task.id].length}
                              </span>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                          )}
                          {(task.github_link || task.deployed_link) && (
                            <div className="flex gap-2 mt-1.5">
                              {task.github_link && (
                                <a
                                  href={task.github_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Github size={12} />
                                  GitHub
                                </a>
                              )}
                              {task.deployed_link && (
                                <a
                                  href={task.deployed_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-green-500 hover:text-green-600 transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink size={12} />
                                  Live Demo
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5">
                        <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold capitalize ${priorityColors[task.priority]}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="py-3.5">
                        {isAdmin ? (
                          // Admin can only set: Reviewing, Approved, Rejected
                          <select
                            value={task.status}
                            onChange={(e) => handleStatusChange(task.id, e.target.value)}
                            className={`flex items-center gap-1.5 text-xs font-medium bg-transparent border-none cursor-pointer ${statusColors[task.status]}`}
                          >
                            <option value="reviewing">Reviewing</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        ) : (
                          // Employee can only set: To Do, In Progress, Done
                          <select
                            value={task.status === "submitted" ? "done" : task.status}
                            onChange={(e) => handleStatusChange(task.id, e.target.value)}
                            className={`flex items-center gap-1.5 text-xs font-medium bg-transparent border-none cursor-pointer ${statusColors[task.status]}`}
                            disabled={task.status === "submitted" || task.status === "approved"}
                          >
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="done">Done</option>
                          </select>
                        )}
                      </td>
                      <td className="py-3.5 text-muted-foreground text-xs">
                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : "--"}
                      </td>
                      {isAdmin && (
                        <td className="py-3.5">
                          {task.assignee_name ? (
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 backdrop-blur-sm border border-purple-500/30 text-purple-600 text-[11px] font-bold shadow-sm">
                                {task.assignee_name.split(" ").map(n => n[0]).join("")}
                              </div>
                              <span className="text-sm font-medium text-card-foreground">{task.assignee_name}</span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-gray-500/10 px-2.5 py-1 text-xs font-medium text-gray-500">
                              Unassigned
                            </span>
                          )}
                        </td>
                      )}
                      <td className="py-3.5">
                        <div className="flex items-center gap-2">
                          {(isAdmin || task.assigned_to === user?.id) && (
                            <button
                              onClick={() => {
                                setSelectedTaskForSubtask(task.id);
                                setShowSubtaskModal(true);
                              }}
                              className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition-colors"
                            >
                              <ListTree size={14} />
                              Subtask
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-red-500 hover:text-red-600 text-xs"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    
                    {/* Subtasks expansion row */}
                    {expandedTasks.has(task.id) && (
                      <tr>
                        <td colSpan={isAdmin ? 7 : 6} className="py-0 px-0 bg-gradient-to-b from-secondary/20 to-transparent">
                          <div className="px-12 py-4">
                            {taskSubtasks[task.id]?.length > 0 ? (
                              <div className="space-y-2.5">
                                {taskSubtasks[task.id].map((subtask, subtaskIndex) => (
                                  <div 
                                    key={subtask.id} 
                                    className="relative rounded-xl bg-white/30 dark:bg-white/5 backdrop-blur-md border border-white/20 p-4 flex items-center justify-between hover:bg-white/40 dark:hover:bg-white/10 transition-all duration-200 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-gradient-to-b before:from-purple-500 before:to-blue-500 before:rounded-l-xl shadow-sm"
                                  >
                                    <div className="flex-1 ml-2">
                                      <div className="flex items-center gap-2">
                                        <ListTree size={14} className="text-purple-500" />
                                        <span className="text-[10px] font-mono font-semibold text-purple-400/70 select-none">
                                          {task.id}.{subtaskIndex + 1}
                                        </span>
                                        <span className="text-sm font-medium text-card-foreground">{subtask.title}</span>
                                      </div>
                                      {subtask.description && (
                                        <p className="text-xs text-muted-foreground mt-1 ml-6">{subtask.description}</p>
                                      )}
                                      {subtask.assignee_name && (
                                        <div className="flex items-center gap-2 mt-2 ml-6">
                                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 text-purple-600 text-[9px] font-bold">
                                            {subtask.assignee_name.split(" ").map(n => n[0]).join("")}
                                          </div>
                                          <span className="text-xs font-medium text-muted-foreground">{subtask.assignee_name}</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                      {/* Subtask status dropdown - role-based */}
                                      {isAdmin ? (
                                        // Admin: reviewing/approved/rejected
                                        <select
                                          value={subtask.status}
                                          onChange={(e) => handleSubtaskStatusChange(subtask.id, task.id, e.target.value)}
                                          className={`text-xs rounded-lg px-3 py-1.5 border border-white/20 bg-white/50 dark:bg-white/10 backdrop-blur-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
                                            subtask.status === 'approved' ? 'text-green-500' :
                                            subtask.status === 'rejected' ? 'text-red-500' :
                                            subtask.status === 'reviewing' ? 'text-purple-500' : 'text-muted-foreground'
                                          }`}
                                        >
                                          <option value="reviewing">Reviewing</option>
                                          <option value="approved">Approved</option>
                                          <option value="rejected">Rejected</option>
                                        </select>
                                      ) : (
                                        // Employee: todo/in_progress/completed
                                        <select
                                          value={subtask.status}
                                          onChange={(e) => handleSubtaskStatusChange(subtask.id, task.id, e.target.value)}
                                          disabled={subtask.assigned_to !== user?.id}
                                          className={`text-xs rounded-lg px-3 py-1.5 border border-white/20 bg-white/50 dark:bg-white/10 backdrop-blur-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 ${
                                            subtask.status === 'completed' ? 'text-green-500' :
                                            subtask.status === 'in_progress' ? 'text-blue-500' :
                                            subtask.status === 'approved' ? 'text-green-500' :
                                            subtask.status === 'rejected' ? 'text-red-500' :
                                            subtask.status === 'reviewing' ? 'text-purple-500' : 'text-muted-foreground'
                                          }`}
                                        >
                                          {/* Lock non-employee statuses as read-only */}
                                          {['reviewing', 'approved', 'rejected'].includes(subtask.status) ? (
                                            <>
                                              <option value={subtask.status} disabled style={{textTransform:'capitalize'}}>{subtask.status.charAt(0).toUpperCase() + subtask.status.slice(1)}</option>
                                            </>
                                          ) : (
                                            <>
                                              <option value="todo">To Do</option>
                                              <option value="in_progress">In Progress</option>
                                              <option value="completed">Completed</option>
                                            </>
                                          )}
                                        </select>
                                      )}
                                      {(isAdmin || task.assigned_to === user?.id) && (
                                        <button
                                          onClick={() => handleDeleteSubtask(subtask.id, task.id)}
                                          className="text-red-500 hover:text-red-600 text-xs font-medium transition-colors"
                                        >
                                          Delete
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center text-muted-foreground text-xs py-4">
                                No subtasks yet. Click &quot;Subtask&quot; to create one.
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                  ))}
                  {filteredTasks.length === 0 && (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6} className="py-8 text-center text-muted-foreground">
                        {searchQuery ? "No tasks match your search" : "No tasks yet"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create Task Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md mx-4 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-card-foreground">Create New Task</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">Title *</label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Enter task title"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">Description</label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Enter task description"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-1">Priority</label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as "low" | "medium" | "high" })}
                      className="w-full rounded-lg border border-input bg-background py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-1">Due Date</label>
                    <input
                      type="date"
                      value={newTask.due_date || ""}
                      onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value || undefined })}
                      className="w-full rounded-lg border border-input bg-background py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">GitHub Link (Optional)</label>
                  <input
                    type="url"
                    value={newTask.github_link || ""}
                    onChange={(e) => setNewTask({ ...newTask, github_link: e.target.value || undefined })}
                    className="w-full rounded-lg border border-input bg-background py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="https://github.com/username/repo"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">Deployed Link (Optional)</label>
                  <input
                    type="url"
                    value={newTask.deployed_link || ""}
                    onChange={(e) => setNewTask({ ...newTask, deployed_link: e.target.value || undefined })}
                    className="w-full rounded-lg border border-input bg-background py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="https://your-app.vercel.app"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">Assign To</label>
                  <select
                    value={newTask.assigned_to || ""}
                    onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full rounded-lg border border-input bg-background py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Unassigned</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Task"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Create Subtask Modal */}
        {showSubtaskModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="glass-card rounded-2xl border border-white/20 p-6 w-full max-w-md mx-4 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
                  <ListTree size={20} className="text-purple-500" />
                  Create Subtask
                </h2>
                <button 
                  onClick={() => {
                    setShowSubtaskModal(false);
                    setNewSubtask({ title: "", description: "", assigned_to: undefined });
                  }} 
                  className="text-muted-foreground hover:text-foreground transition-colors rounded-lg p-1 hover:bg-secondary/50"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleCreateSubtask} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">Title *</label>
                  <input
                    type="text"
                    value={newSubtask.title}
                    onChange={(e) => setNewSubtask({ ...newSubtask, title: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Enter subtask title"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">Description</label>
                  <textarea
                    value={newSubtask.description}
                    onChange={(e) => setNewSubtask({ ...newSubtask, description: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Enter subtask description"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">Assign To *</label>
                  <select
                    value={newSubtask.assigned_to || ""}
                    onChange={(e) => setNewSubtask({ ...newSubtask, assigned_to: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full rounded-lg border border-input bg-background py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  >
                    <option value="">Select an employee</option>
                    {employees
                      .filter(emp => emp.id !== user?.id) // Exclude current user
                      .map((emp) => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">You cannot assign a subtask to yourself</p>
                </div>
                
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSubtaskModal(false);
                      setNewSubtask({ title: "", description: "", assigned_to: undefined });
                    }}
                    className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingSubtask}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingSubtask ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Subtask"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
