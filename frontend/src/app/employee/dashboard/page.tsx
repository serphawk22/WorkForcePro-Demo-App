"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { Clock, AlertCircle, Zap, Building2, Play, Square, Circle, CheckCircle, Loader2, Calendar } from "lucide-react";
import { fetchEmployeeDashboard, getMyTasks, updateTaskStatus, Task, EmployeeDashboardStats } from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";
import { useAttendanceTimer, formatTimerDisplay } from "@/components/AttendanceTimerProvider";

const priorityStyles: Record<string, string> = {
  high: "bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-400 border border-red-500/30 shadow-lg shadow-red-500/20",
  medium: "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-400 border border-yellow-500/30 shadow-lg shadow-yellow-500/20",
  low: "bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border border-green-500/30 shadow-lg shadow-green-500/20",
};

const statusStyles: Record<string, string> = {
  in_progress: "text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.6)]",
  todo: "text-gray-400 drop-shadow-[0_0_4px_rgba(156,163,175,0.3)]",
  submitted: "text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.6)]",  // Employee sees "Done" as green
  approved: "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]",
  rejected: "text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.6)]",
};

const statusLabels: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  submitted: "Done",  // For employees, "submitted" displays as "Done"
  approved: "Approved",
  rejected: "Needs Changes",
};

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] || "Employee";
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dashboardStats, setDashboardStats] = useState<EmployeeDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Global persistent timer from context
  const { seconds, isActive, isPunching, handlePunchIn: ctxPunchIn, handlePunchOut: ctxPunchOut } = useAttendanceTimer();
  
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

  // Punch in/out — delegate to global context, then reload dashboard stats
  const handlePunchIn = async () => {
    await ctxPunchIn();
    await fetchData();
  };

  const handlePunchOut = async () => {
    await ctxPunchOut();
    await fetchData();
  };

  const formatDuration = (secs: number) => formatTimerDisplay(secs);

  // isWorking derived from global timer context
  const isWorking = isActive;

  const handleTaskStatusChange = async (taskId: number, selectedStatus: string) => {
    try {
      // Map employee UI status to backend status
      // "done" in UI → "submitted" in backend (triggers admin review)
      const backendStatus = selectedStatus === "done" ? "submitted" : selectedStatus;
      
      await updateTaskStatus(taskId, backendStatus as "todo" | "in_progress" | "submitted");
      
      // Show appropriate toast message
      if (selectedStatus === "done") {
        toast.success("Task submitted for review!");
      } else {
        toast.success("Task status updated!");
      }
      
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
  // isWorking comes from global AttendanceTimerContext (set above)
  
  // Calculate from tasks list for display - filter out approved tasks, but show submitted as "Done"
  const activeTasks = tasks.filter((t) => t.status !== "approved" && t.status !== "rejected");

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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-panel p-6 rounded-2xl glow-sm">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {getGreeting()}, <span className="text-gradient-primary">{firstName}</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-2 rounded-full glass-card px-4 py-2 text-sm font-medium ${isWorking ? "text-green-500 glow-sm" : "text-muted-foreground"}`}>
                <Circle size={8} className={isWorking ? "fill-green-500 text-green-500 animate-pulse" : "fill-gray-400 text-gray-400"} />
                {isWorking ? "ON DUTY" : "OFF DUTY"}
              </span>
              {isWorking ? (
                <button
                  onClick={handlePunchOut}
                  disabled={isPunching}
                  className="inline-flex items-center gap-2 rounded-full glass-button bg-red-500 px-5 py-2 text-sm font-semibold text-white hover:bg-red-600 hover:scale-105 transition-all disabled:opacity-50"
                >
                  {isPunching ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} />}
                  Punch Out
                </button>
              ) : (
                <button
                  onClick={handlePunchIn}
                  disabled={isPunching}
                  className="inline-flex items-center gap-2 rounded-full glass-button bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 hover:scale-105 transition-all disabled:opacity-50 glow-primary"
                >
                  {isPunching ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
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
              value={isWorking ? formatDuration(seconds) : "--"}
              subtitle={isWorking ? "Active session" : "Not clocked in"}
              trend={isWorking ? "LIVE" : undefined}
              trendType="up"
              iconColor="bg-accent text-accent-foreground"
              href="/attendance"
            />
            <StatCard
              icon={AlertCircle}
              label="Due Today"
              value={tasksDueToday}
              subtitle="Tasks due today"
              trend={tasksDueToday > 0 ? "Attention" : "Good"}
              trendType={tasksDueToday > 0 ? "down" : "up"}
              href="/project-management"
            />
            <StatCard
              icon={Zap}
              label="Productivity"
              value={`${productivityScore}%`}
              subtitle={`${tasksCompleted} completed`}
              trend={productivityScore >= 50 ? "Great" : "Keep going"}
              trendType={productivityScore >= 50 ? "up" : "stable"}
              href="/project-management"
            />
            <StatCard
              icon={Building2}
              label="Active Projects"
              value={activeProjects}
              subtitle="In progress"
              trend={activeProjects > 0 ? "Working" : "None"}
              trendType={activeProjects > 0 ? "up" : "stable"}
              href="/project-management"
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
              href="/requests"
            />
            <StatCard
              icon={Clock}
              label="Pending Requests"
              value={pendingLeaveRequests}
              subtitle="Leave requests"
              trend={pendingLeaveRequests > 0 ? "Pending" : "None"}
              trendType="stable"
              href="/requests"
            />
          </div>

          {/* Active Assignments */}
          <div className="rounded-xl glass-card glow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-card-foreground flex items-center gap-2">
                <Building2 size={18} className="text-accent" /> Active Assignments
              </h3>
              <Link href="/tasks" className="text-sm font-medium text-accent hover:underline glass-light px-3 py-1 rounded-full transition-all hover:scale-105">View All</Link>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {activeTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground glass-light rounded-xl">
                  <CheckCircle size={32} className="mx-auto mb-2 text-green-500" />
                  <p>No active tasks! Great job!</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="pb-3 text-left font-semibold">Task</th>
                      <th className="pb-3 text-left font-semibold">Priority</th>
                      <th className="pb-3 text-left font-semibold">Status</th>
                      <th className="pb-3 text-left font-semibold">Due Date</th>
                      <th className="pb-3 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {activeTasks.slice(0, 5).map((task) => (
                      <tr key={task.id} className="hover:bg-primary/5 transition-colors group">
                        <td className="py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-accent group-hover:animate-pulse" />
                            <div>
                              <p className="font-medium text-card-foreground">{task.title}</p>
                              <p className="text-xs text-muted-foreground">{task.public_id || `TSK-${task.id.toString().padStart(4, "0")}`}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize glass-light ${priorityStyles[task.priority] || "bg-gray-500/10 text-gray-500"}`}>
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
                            value={task.status === "submitted" ? "done" : task.status}
                            onChange={(e) => handleTaskStatusChange(task.id, e.target.value)}
                            className="glass-input rounded-lg px-2 py-1 text-xs cursor-pointer"
                            disabled={task.status === "submitted" || task.status === "approved"}
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
