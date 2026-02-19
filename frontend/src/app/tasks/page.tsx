"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { Plus, Search, Circle, Loader2, X, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { 
  getAllTasks, 
  getMyTasks, 
  createTask, 
  updateTaskStatus, 
  deleteTask,
  fetchEmployees,
  Task,
  TaskCreate,
  User
} from "@/lib/api";
import { toast } from "sonner";

const priorityColors: Record<string, string> = {
  high: "bg-red-500/10 text-red-500",
  medium: "bg-yellow-500/10 text-yellow-500",
  low: "bg-green-500/10 text-green-500",
};

const statusColors: Record<string, string> = {
  pending: "text-muted-foreground",
  in_progress: "text-blue-500",
  completed: "text-green-500",
  overdue: "text-red-500",
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Circle size={14} />,
  in_progress: <Clock size={14} />,
  completed: <CheckCircle2 size={14} />,
  overdue: <AlertCircle size={14} />,
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
  
  // New task form state
  const [newTask, setNewTask] = useState<TaskCreate>({
    title: "",
    description: "",
    priority: "medium",
    assigned_to: undefined,
    due_date: undefined,
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    
    const tasksResult = isAdmin 
      ? await getAllTasks(statusFilter || undefined)
      : await getMyTasks(statusFilter || undefined);
    
    if (tasksResult.data) {
      setTasks(tasksResult.data);
    }
    
    if (isAdmin) {
      const employeesResult = await fetchEmployees();
      if (employeesResult.data) {
        setEmployees(employeesResult.data);
      }
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

  const handleStatusChange = async (taskId: number, newStatus: "todo" | "in_progress" | "done") => {
    const result = await updateTaskStatus(taskId, newStatus);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Task status updated!");
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
                className="w-full rounded-lg border border-input bg-card py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card card-shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 pl-4 text-left font-semibold">Task</th>
                    <th className="py-3 text-left font-semibold">Priority</th>
                    <th className="py-3 text-left font-semibold">Status</th>
                    <th className="py-3 text-left font-semibold">Due Date</th>
                    {isAdmin && <th className="py-3 text-left font-semibold">Assignee</th>}
                    <th className="py-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-3.5 pl-4">
                        <div>
                          <span className="font-medium text-card-foreground">{task.title}</span>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5">
                        <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold capitalize ${priorityColors[task.priority]}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value as "todo" | "in_progress" | "done")}
                          className={`flex items-center gap-1.5 text-xs font-medium bg-transparent border-none cursor-pointer ${statusColors[task.status]}`}
                        >
                          <option value="todo">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="done">Done</option>
                        </select>
                      </td>
                      <td className="py-3.5 text-muted-foreground text-xs">
                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : "--"}
                      </td>
                      {isAdmin && (
                        <td className="py-3.5">
                          {task.assignee_name ? (
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-accent text-[10px] font-semibold">
                                {task.assignee_name.split(" ").map(n => n[0]).join("")}
                              </div>
                              <span className="text-xs text-muted-foreground">{task.assignee_name}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Unassigned</span>
                          )}
                        </td>
                      )}
                      <td className="py-3.5">
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-red-500 hover:text-red-600 text-xs"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredTasks.length === 0 && (
                    <tr>
                      <td colSpan={isAdmin ? 6 : 5} className="py-8 text-center text-muted-foreground">
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
      </DashboardLayout>
    </ProtectedRoute>
  );
}
