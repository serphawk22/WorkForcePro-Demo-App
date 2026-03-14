"use client";

import { useState, useEffect, useCallback, type CSSProperties } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { Clock, AlertCircle, Zap, Building2, Play, Square, Circle, CheckCircle, Loader2, Calendar, Copy, Video, ExternalLink } from "lucide-react";
import { fetchEmployeeDashboard, getMyTasks, updateTaskStatus, Task, EmployeeDashboardStats, getActiveMeeting, TeamsMeeting } from "@/lib/api";
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

type EmployeeCardAccentStyle = CSSProperties & {
  "--admin-card-accent": string;
  "--admin-card-accent-secondary": string;
};

const employeeCardAccentStyles: Record<
  "session" | "attention" | "productivity" | "projects" | "meeting" | "neutral",
  EmployeeCardAccentStyle
> = {
  session: {
    "--admin-card-accent": "272 91% 65%",
    "--admin-card-accent-secondary": "328 75% 62%",
  },
  attention: {
    "--admin-card-accent": "20 100% 60%",
    "--admin-card-accent-secondary": "0 84% 60%",
  },
  productivity: {
    "--admin-card-accent": "45 93% 58%",
    "--admin-card-accent-secondary": "28 92% 58%",
  },
  projects: {
    "--admin-card-accent": "217 91% 60%",
    "--admin-card-accent-secondary": "191 91% 55%",
  },
  meeting: {
    "--admin-card-accent": "217 91% 60%",
    "--admin-card-accent-secondary": "228 92% 66%",
  },
  neutral: {
    "--admin-card-accent": "220 14% 55%",
    "--admin-card-accent-secondary": "262 18% 60%",
  },
};

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] || "Employee";
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dashboardStats, setDashboardStats] = useState<EmployeeDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMeeting, setActiveMeeting] = useState<TeamsMeeting | null>(null);

  // Global persistent timer — provided by AttendanceTimerProvider at root layout level
  const {
    seconds,
    isActive,
    isPunching,
    hasCompletedToday,
    handlePunchIn: ctxPunchIn,
    handlePunchOut: ctxPunchOut,
  } = useAttendanceTimer();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const fetchData = useCallback(async () => {
    try {
      const [statsResponse, tasksResponse, meetingResponse] = await Promise.all([
        fetchEmployeeDashboard(),
        getMyTasks(),
        getActiveMeeting(),
      ]);
      if (statsResponse.data) {
        setDashboardStats(statsResponse.data);
      }
      if (tasksResponse.data) {
        setTasks(tasksResponse.data);
      }
      if (meetingResponse.data !== undefined) {
        setActiveMeeting(meetingResponse.data);
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

  const handleTaskStatusChange = async (taskId: number, selectedStatus: string) => {
    try {
      // Map employee UI status to backend status
      // "done" in UI → "submitted" in backend (triggers admin review)
      const backendStatus = selectedStatus === "done" ? "submitted" : selectedStatus;
      
      await updateTaskStatus(taskId, backendStatus as "todo" | "in_progress" | "submitted");
      
      // Show appropriate toast message
      if (selectedStatus === "done") {
        toast.success("Project submitted for review!");
      } else {
        toast.success("Project status updated!");
      }
      
      fetchData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update project";
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
  // isWorking and timer seconds come from global AttendanceTimerContext
  const isWorking = isActive;

  // Calculate from tasks list for display - filter out approved and rejected
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {getGreeting()}, <span className="text-accent">{firstName}</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold glass-card glow-sm ${isWorking ? "bg-gradient-to-r from-green-500/30 to-emerald-500/30 border-green-400/50 text-green-300 shadow-lg shadow-green-500/40" : "bg-gradient-to-r from-gray-500/20 to-slate-500/20 border-gray-400/30 text-gray-300"}`}>
                <Circle size={8} className={`${isWorking ? "fill-green-400 text-green-400 animate-pulse" : "fill-gray-400 text-gray-400"} drop-shadow-[0_0_6px_currentColor]`} />
                {isWorking ? "ON DUTY" : "OFF DUTY"}
              </span>
              {isWorking ? (
                <button
                  onClick={handlePunchOut}
                  disabled={isPunching}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-red-500 to-red-600 px-5 py-2 text-sm font-bold text-white hover:from-red-600 hover:to-red-700 transition-all transform hover:scale-105 shadow-lg shadow-red-500/50 hover:shadow-xl hover:shadow-red-500/60 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {isPunching ? <Loader2 size={14} className="animate-spin glow-icon" /> : <Square size={14} className="glow-icon" />}
                  Punch Out
                </button>
              ) : (
                <button
                  onClick={handlePunchIn}
                  disabled={isPunching || hasCompletedToday}
                  className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition-all transform shadow-lg disabled:hover:scale-100 ${
                    hasCompletedToday
                      ? "bg-gradient-to-r from-emerald-200 via-teal-200 to-cyan-200 text-emerald-900 border border-emerald-300/80 shadow-[0_10px_24px_-14px_rgba(16,185,129,0.65)] ring-1 ring-white/70 cursor-not-allowed opacity-95 dark:bg-gradient-to-r dark:from-emerald-500/35 dark:via-teal-500/30 dark:to-cyan-500/35 dark:text-emerald-100 dark:border-emerald-300/35 dark:shadow-emerald-500/30 dark:ring-0"
                      : "bg-gradient-to-r from-primary to-primary-light text-white hover:from-primary-light hover:to-primary-glow hover:scale-105 shadow-primary/50 hover:shadow-xl hover:shadow-primary/60"
                  } ${isPunching ? "opacity-50" : ""}`}
                >
                  {isPunching ? (
                    <Loader2 size={14} className="animate-spin glow-icon" />
                  ) : hasCompletedToday ? (
                    <CheckCircle size={14} className="text-emerald-700 drop-shadow-[0_0_6px_rgba(16,185,129,0.35)] dark:text-emerald-200 dark:drop-shadow-[0_0_8px_rgba(16,185,129,0.55)]" />
                  ) : (
                    <Play size={14} className="glow-icon" />
                  )}
                  {hasCompletedToday ? "Completed Today" : "Punch In"}
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Clock}
              label="Current Session"
              value={isWorking || hasCompletedToday ? formatDuration(seconds) : "--"}
              subtitle={
                isWorking
                  ? "Active session"
                  : hasCompletedToday
                    ? "Completed today"
                    : "Not clocked in"
              }
              trend={isWorking ? "LIVE" : hasCompletedToday ? "Done" : undefined}
              trendType={isWorking ? "up" : "stable"}
              iconColor="dark:bg-pink-500 dark:text-white dark:drop-shadow-[0_0_24px_rgba(236,72,153,0.9)] bg-pink-500 text-white drop-shadow-[0_0_16px_rgba(236,72,153,0.7)]"
              href="/attendance"
              enablePremiumHover
              hoverAccentStyle={employeeCardAccentStyles.session}
            />
            <StatCard
              icon={AlertCircle}
              label="Due Today"
              value={tasksDueToday}
              subtitle="Projects due today"
              trend={tasksDueToday > 0 ? "Attention" : "Good"}
              trendType={tasksDueToday > 0 ? "down" : "up"}
              iconColor="dark:bg-orange-400 dark:text-white dark:drop-shadow-[0_0_24px_rgba(251,146,60,0.9)] bg-orange-500 text-white drop-shadow-[0_0_16px_rgba(251,146,60,0.7)]"
              href="/project-management"
              enablePremiumHover
              hoverAccentStyle={employeeCardAccentStyles.attention}
            />
            <StatCard
              icon={Zap}
              label="Productivity"
              value={`${productivityScore}%`}
              subtitle={`${tasksCompleted} completed`}
              trend={productivityScore >= 50 ? "Great" : "Keep going"}
              trendType={productivityScore >= 50 ? "up" : "stable"}
              iconColor="dark:bg-yellow-300 dark:text-white dark:drop-shadow-[0_0_24px_rgba(250,204,21,0.9)] bg-yellow-400 text-white drop-shadow-[0_0_16px_rgba(250,204,21,0.7)]"
              href="/project-management"
              enablePremiumHover
              hoverAccentStyle={employeeCardAccentStyles.productivity}
            />
            <StatCard
              icon={Building2}
              label="Active Projects"
              value={activeProjects}
              subtitle="In progress"
              trend={activeProjects > 0 ? "Working" : "None"}
              trendType={activeProjects > 0 ? "up" : "stable"}
              iconColor="dark:bg-blue-400 dark:text-white dark:drop-shadow-[0_0_24px_rgba(59,130,246,0.9)] bg-blue-500 text-white drop-shadow-[0_0_16px_rgba(59,130,246,0.7)]"
              href="/project-management"
              enablePremiumHover
              hoverAccentStyle={employeeCardAccentStyles.projects}
            />
          </div>

          {/* Teams Meeting Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeMeeting ? (
              <div
                className="admin-dashboard-card col-span-full rounded-xl glass-card glow-sm p-5 border border-blue-500/30 bg-gradient-to-r from-blue-500/10 via-transparent to-transparent"
                style={employeeCardAccentStyles.meeting}
              >
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="admin-dashboard-card-icon shrink-0 p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/40">
                      <Video className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-blue-400 font-semibold uppercase tracking-wide mb-0.5">Teams Meeting</p>
                      <p className="font-bold text-foreground truncate">{activeMeeting.title}</p>
                      <p className="text-xs text-muted-foreground">Shared by {activeMeeting.creator_name}</p>
                    </div>
                  </div>
                  <a
                    href={activeMeeting.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-blue-500/30 shrink-0"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Join Meeting
                  </a>
                </div>
              </div>
            ) : (
              <div
                className="admin-dashboard-card col-span-full rounded-xl glass-card p-5 border border-border/40 flex items-center gap-3 text-muted-foreground"
                style={employeeCardAccentStyles.neutral}
              >
                <div className="admin-dashboard-card-icon p-2.5 rounded-xl bg-secondary/50">
                  <Video className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">No active Teams meeting</p>
                  <p className="text-xs">Your admin hasn&apos;t shared a meeting link yet.</p>
                </div>
              </div>
            )}
          </div>

          {/* Active Projects */}
          <div
            className="admin-dashboard-card rounded-xl glass-card glow-sm"
            style={employeeCardAccentStyles.projects}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-card-foreground flex items-center gap-2">
                  <div className="admin-dashboard-card-icon p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/50">
                    <Building2 size={18} className="text-white glow-icon" />
                  </div>
                  Active Projects
                </h3>
                <Link href="/project-management" className="text-sm font-semibold text-primary hover:text-primary-light transition-colors px-3 py-1.5 rounded-lg glass-light hover:glow-sm">View All</Link>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                {activeTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 mb-3">
                      <CheckCircle size={32} className="text-green-400 drop-shadow-[0_0_12px_rgba(74,222,128,0.8)]" />
                    </div>
                    <p className="text-green-300 font-medium">No active projects! Great job!</p>
                  </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="pb-3 text-left font-semibold">Project</th>
                      <th className="pb-3 text-left font-semibold">Priority</th>
                      <th className="pb-3 text-left font-semibold">Status</th>
                      <th className="pb-3 text-left font-semibold">Due Date</th>
                      <th className="pb-3 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {activeTasks.slice(0, 5).map((task) => (
                      <tr key={task.id} className="hover:bg-primary/5 hover:shadow-lg hover:shadow-primary/10 transition-all">
                        <td className="py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/50 animate-pulse" />
                            <div>
                              <p className="font-semibold text-card-foreground">{task.title}</p>
                              {task.public_id && (
                                <button
                                  onClick={() => { navigator.clipboard.writeText(task.public_id!); toast.success("Ref ID copied!"); }}
                                  className="inline-flex items-center gap-1 mt-0.5 rounded px-1.5 py-0.5 text-xs font-mono font-bold bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-400/30 hover:bg-gradient-to-r hover:from-purple-500/30 hover:to-pink-500/30 transition-all shadow-md shadow-purple-500/30 hover:shadow-lg hover:shadow-purple-500/40"
                                >
                                  {task.public_id}
                                  <Copy size={10} className="glow-icon" />
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5">
                          <span className={`inline-block rounded-lg px-3 py-1 text-xs font-bold capitalize ${priorityStyles[task.priority] || "bg-gray-500/20 text-gray-400 border border-gray-500/30"}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="py-3.5">
                          <span className={`flex items-center gap-1.5 text-xs font-bold ${statusStyles[task.status] || "text-muted-foreground"}`}>
                            <Circle size={6} className="fill-current animate-pulse" /> {statusLabels[task.status] || task.status}
                          </span>
                        </td>
                        <td className="py-3.5 text-muted-foreground">
                          {task.due_date ? new Date(task.due_date).toLocaleDateString() : "No deadline"}
                        </td>
                        <td className="py-3.5 text-right">
                          <select
                            value={task.status === "submitted" ? "done" : task.status}
                            onChange={(e) => handleTaskStatusChange(task.id, e.target.value)}
                            className="bg-secondary border border-border rounded px-2 py-1 text-xs cursor-pointer"
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
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
