"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { Clock, AlertCircle, Zap, Building2, Play, Square, Circle, CheckCircle, Loader2, Calendar } from "lucide-react";
import { fetchEmployeeDashboard, punchIn, punchOut, getMyTasks, updateTaskStatus, Task, EmployeeDashboardStats } from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";

const priorityStyles: Record<string, string> = {
  high: "bg-red-500/10 text-red-500",
  medium: "bg-yellow-500/10 text-yellow-500",
  low: "bg-green-500/10 text-green-500",
};

const statusStyles: Record<string, string> = {
  in_progress: "text-blue-500",
  todo: "text-muted-foreground",
  done: "text-green-500",
};

const statusLabels: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] || "Employee";
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dashboardStats, setDashboardStats] = useState<EmployeeDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [punchLoading, setPunchLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const fetchData = useCallback(async () => {
    try {
      const [statsResponse, tasksResponse] = await Promise.all([
        fetchEmployeeDashboard(),
        getMyTasks(),
      ]);
      if (statsResponse.data) {
        setDashboardStats(statsResponse.data);
      }
      if (tasksResponse.data) {
        setTasks(tasksResponse.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Timer for current session - use data from dashboard stats
  useEffect(() => {
    const isWorking = dashboardStats?.current_session?.clocked_in || false;
    if (!isWorking || !dashboardStats?.current_session?.punch_in) {
      setElapsedTime(0);
      return;
    }

    const punchInTime = new Date(dashboardStats.current_session.punch_in).getTime();
    
    const updateElapsed = () => {
      const now = Date.now();
      setElapsedTime(Math.floor((now - punchInTime) / 1000));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [dashboardStats?.current_session]);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePunchIn = async () => {
    setPunchLoading(true);
    try {
      await punchIn();
      toast.success("Punched in successfully!");
      fetchData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to punch in";
      toast.error(errorMessage);
    } finally {
      setPunchLoading(false);
    }
  };

  const handlePunchOut = async () => {
    setPunchLoading(true);
    try {
      await punchOut();
      toast.success("Punched out successfully!");
      fetchData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to punch out";
      toast.error(errorMessage);
    } finally {
      setPunchLoading(false);
    }
  };

  const handleTaskStatusChange = async (taskId: number, newStatus: "todo" | "in_progress" | "done") => {
    try {
      await updateTaskStatus(taskId, newStatus);
      toast.success("Task status updated!");
      fetchData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update task";
      toast.error(errorMessage);
    }
  };

  // Use stats from dashboard API
  const tasksDueToday = dashboardStats?.tasks_due_today || 0;
  const tasksCompleted = dashboardStats?.tasks_completed || 0;
  const productivityScore = dashboardStats?.productivity_score || 0;
  const activeProjects = dashboardStats?.active_projects || 0;
  const leaveBalance = dashboardStats?.leave_balance || 0;
  const pendingLeaveRequests = dashboardStats?.pending_leave_requests || 0;
  const isWorking = dashboardStats?.current_session?.clocked_in || false;
  
  // Calculate from tasks list for display
  const activeTasks = tasks.filter((t) => t.status !== "done");

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["employee"]}>
        <DashboardLayout role="employee" userName={user?.name || "Employee"} userHandle={`@${user?.email?.split("@")[0] || "employee"}`}>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }
  
  return (
    <ProtectedRoute allowedRoles={["employee"]}>
      <DashboardLayout role="employee" userName={user?.name || "Employee"} userHandle={`@${user?.email?.split("@")[0] || "employee"}`}>
        <div className="space-y-6">
          {/* Greeting */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {getGreeting()}, <span className="text-accent">{firstName}</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium card-shadow ${isWorking ? "text-green-500" : "text-muted-foreground"}`}>
                <Circle size={8} className={isWorking ? "fill-green-500 text-green-500" : "fill-gray-400 text-gray-400"} />
                {isWorking ? "ON DUTY" : "OFF DUTY"}
              </span>
              {isWorking ? (
                <button
                  onClick={handlePunchOut}
                  disabled={punchLoading}
                  className="inline-flex items-center gap-2 rounded-full bg-red-500 px-5 py-2 text-sm font-semibold text-white hover:bg-red-600 transition-colors card-shadow disabled:opacity-50"
                >
                  {punchLoading ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} />}
                  Punch Out
                </button>
              ) : (
                <button
                  onClick={handlePunchIn}
                  disabled={punchLoading}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity card-shadow disabled:opacity-50"
                >
                  {punchLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  Punch In
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Clock}
              label="Current Session"
              value={isWorking ? formatDuration(elapsedTime) : "--"}
              subtitle={isWorking ? "Active session" : "Not clocked in"}
              trend={isWorking ? "LIVE" : undefined}
              trendType="up"
              iconColor="bg-accent text-accent-foreground"
            />
            <StatCard
              icon={AlertCircle}
              label="Due Today"
              value={tasksDueToday}
              subtitle="Tasks due today"
              trend={tasksDueToday > 0 ? "Attention" : "Good"}
              trendType={tasksDueToday > 0 ? "down" : "up"}
            />
            <StatCard
              icon={Zap}
              label="Productivity"
              value={`${productivityScore}%`}
              subtitle={`${tasksCompleted} completed`}
              trend={productivityScore >= 50 ? "Great" : "Keep going"}
              trendType={productivityScore >= 50 ? "up" : "stable"}
            />
            <StatCard
              icon={Building2}
              label="Active Projects"
              value={activeProjects}
              subtitle="In progress"
              trend={activeProjects > 0 ? "Working" : "None"}
              trendType={activeProjects > 0 ? "up" : "stable"}
            />
          </div>

          {/* Leave Balance Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              icon={Calendar}
              label="Leave Balance"
              value={leaveBalance}
              subtitle="Days remaining"
              trend={leaveBalance > 10 ? "Healthy" : leaveBalance > 5 ? "Moderate" : "Low"}
              trendType={leaveBalance > 10 ? "up" : leaveBalance > 5 ? "stable" : "down"}
            />
            <StatCard
              icon={Clock}
              label="Pending Requests"
              value={pendingLeaveRequests}
              subtitle="Leave requests"
              trend={pendingLeaveRequests > 0 ? "Pending" : "None"}
              trendType="stable"
            />
          </div>

          {/* Active Assignments */}
          <div className="rounded-xl border border-border bg-card p-6 card-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-card-foreground flex items-center gap-2">
                <Building2 size={18} className="text-accent" /> Active Assignments
              </h3>
              <Link href="/tasks" className="text-sm font-medium text-accent hover:underline">View All</Link>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {activeTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle size={32} className="mx-auto mb-2 text-green-500" />
                  <p>No active tasks! Great job!</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="pb-3 text-left font-semibold">Task</th>
                      <th className="pb-3 text-left font-semibold">Priority</th>
                      <th className="pb-3 text-left font-semibold">Status</th>
                      <th className="pb-3 text-left font-semibold">Due Date</th>
                      <th className="pb-3 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {activeTasks.slice(0, 5).map((task) => (
                      <tr key={task.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-accent" />
                            <div>
                              <p className="font-medium text-card-foreground">{task.title}</p>
                              <p className="text-xs text-muted-foreground">TSK-{task.id.toString().padStart(4, "0")}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5">
                          <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold capitalize ${priorityStyles[task.priority] || "bg-gray-500/10 text-gray-500"}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="py-3.5">
                          <span className={`flex items-center gap-1.5 text-xs font-medium ${statusStyles[task.status] || "text-muted-foreground"}`}>
                            <Circle size={6} className="fill-current" /> {statusLabels[task.status] || task.status}
                          </span>
                        </td>
                        <td className="py-3.5 text-muted-foreground">
                          {task.due_date ? new Date(task.due_date).toLocaleDateString() : "No deadline"}
                        </td>
                        <td className="py-3.5 text-right">
                          <select
                            value={task.status}
                            onChange={(e) => handleTaskStatusChange(task.id, e.target.value as "todo" | "in_progress" | "done")}
                            className="bg-secondary border border-border rounded px-2 py-1 text-xs cursor-pointer"
                          >
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="done">Done</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
