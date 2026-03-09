"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import AdminSnapshotCard from "@/components/dashboard/AdminSnapshotCard";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { 
  Users, UserCheck, UserX, Calendar, Clock, AlertCircle, 
  ListTodo, Target, CalendarDays, Loader2, Award, Copy
} from "lucide-react";
import { fetchAdminDashboard, getTaskStats, AdminDashboardStats, TaskStats } from "@/lib/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Priority badge colors
const priorityColors: Record<string, string> = {
  high: "bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-400 border border-red-500/30 shadow-lg shadow-red-500/20",
  medium: "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-400 border border-yellow-500/30 shadow-lg shadow-yellow-500/20",
  low: "bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border border-green-500/30 shadow-lg shadow-green-500/20",
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [dashboardResult, taskResult] = await Promise.all([
        fetchAdminDashboard(),
        getTaskStats()
      ]);
      
      if (dashboardResult.data) {
        setStats(dashboardResult.data);
      }
      if (taskResult.data) {
        setTaskStats(taskResult.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate attendance metrics
  const totalEmployees = stats?.total_employees || 0;
  const activeSessions = stats?.active_sessions || 0;
  const presentToday = activeSessions;
  const onLeave = stats?.employees_on_leave_today ?? 0;
  const absent = Math.max(0, totalEmployees - presentToday - onLeave);
  const lateCheckins = stats?.late_checkins_today ?? 0;
  const activeTasks = stats?.active_tasks_count ?? stats?.pending_tasks ?? 0;

  // Task completion rate
  const totalTasks = stats?.total_tasks_count || 0;
  const completedTasks = taskStats?.approved || 0;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const upcomingTasks = stats?.upcoming_tasks || [];

  const handleCopyRefId = (refId: string) => {
    navigator.clipboard.writeText(refId).then(() => toast.success(`Copied ${refId}`));
  };

  // Department performance derived from real task stats
  const deptPerformance = [
    { dept: "Approved", completion: taskStats?.approved || 0, color: "from-green-400 to-green-600" },
    { dept: "In Progress", completion: taskStats?.in_progress || 0, color: "from-blue-400 to-blue-600" },
    { dept: "Reviewing", completion: taskStats?.reviewing || 0, color: "from-purple-400 to-purple-600" },
    { dept: "To Do", completion: taskStats?.todo || 0, color: "from-gray-400 to-gray-500" },
    { dept: "Rejected", completion: taskStats?.rejected || 0, color: "from-red-400 to-red-500" },
  ].filter(d => d.completion > 0);

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout role="admin" userName={user?.name || "Administrator"} userHandle={`@${user?.email?.split("@")[0] || "admin"}`}>
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
                  WorkForce Overview
                </h1>
                <p className="text-sm text-muted-foreground mt-1">Real-time workforce intelligence dashboard</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Live
              </div>
            </div>

            {/* 🔷 TOP SECTION - Workforce Snapshot (Full Width) */}
            <div className="glass-panel rounded-2xl p-8 glow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-lg glow-primary">
                    <Users className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Workforce Snapshot</h2>
                    <p className="text-xs text-muted-foreground">Today&apos;s attendance and activity</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* Total Employees */}
                <AdminSnapshotCard
                  title="Total Employees"
                  value={totalEmployees}
                  subtitle="Total Employees"
                  icon={Users}
                  redirectUrl="/employees"
                  gradientVariant="primary"
                />

                {/* Present Today */}
                <AdminSnapshotCard
                  title="Present Today"
                  value={presentToday}
                  subtitle="Present Today"
                  icon={UserCheck}
                  redirectUrl="/attendance"
                  gradientVariant="green"
                />

                {/* Absent */}
                <AdminSnapshotCard
                  title="Absent"
                  value={absent}
                  subtitle="Absent"
                  icon={UserX}
                  redirectUrl="/attendance?filter=absent"
                  gradientVariant="red"
                />

                {/* On Leave */}
                <AdminSnapshotCard
                  title="On Leave"
                  value={onLeave}
                  subtitle="On Leave"
                  icon={Calendar}
                  redirectUrl="/attendance?filter=leave"
                  gradientVariant="blue"
                />

                {/* Late Check-ins */}
                <AdminSnapshotCard
                  title="Late Check-ins"
                  value={lateCheckins}
                  subtitle="Late Check-ins"
                  icon={AlertCircle}
                  redirectUrl="/attendance?filter=late"
                  gradientVariant="yellow"
                />

                {/* Active Tasks */}
                <AdminSnapshotCard
                  title="Active Tasks"
                  value={activeTasks}
                  subtitle="Active Tasks"
                  icon={ListTodo}
                  redirectUrl="/project-management"
                  gradientVariant="purple"
                />
              </div>
            </div>

            {/* 🔷 2-COLUMN GRID */}
            <div className="space-y-6">
                {/* Task Completion Overview */}
                <div className="rounded-2xl glass-card glow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      <h3 className="font-bold text-foreground">Task Completion</h3>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Overall:</span>
                      <span className="font-bold text-primary">{completionRate}%</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="h-3 bg-secondary/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full transition-all duration-500 shadow-lg shadow-primary/20"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span>{taskStats?.approved || 0} completed</span>
                      <span>{totalTasks} total tasks</span>
                    </div>
                  </div>

                  {/* Department Breakdown */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-foreground mb-3">Task Status Breakdown</h4>
                    {deptPerformance.length > 0 ? deptPerformance.map((item, index) => (
                      <div key={index} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{item.dept}</span>
                          <span className="font-semibold text-foreground">{item.completion}</span>
                        </div>
                        <div className="h-2 bg-secondary/40 rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-500`}
                            style={{ width: `${totalTasks > 0 ? Math.round((item.completion / totalTasks) * 100) : 0}%` }}
                          />
                        </div>
                      </div>
                    )) : (
                      <p className="text-xs text-muted-foreground py-2">No task data yet.</p>
                    )}
                  </div>
                </div>

                {/* Upcoming Deadlines — real tasks */}
                <div className="rounded-2xl glass-card glow-sm overflow-hidden">
                  <div className="bg-gradient-to-r from-primary-light/10 to-transparent p-5 border-b border-border/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-5 w-5 text-primary-light" />
                      <h3 className="font-bold text-foreground">Upcoming Deadlines</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">Active projects nearest to due date</p>
                  </div>
                  
                  <div className="p-5 space-y-3">
                    {upcomingTasks.length > 0 ? upcomingTasks.map((task, index) => (
                      <div
                        key={task.id}
                        onClick={() => router.push(`/project-management/${task.id}`)}
                        className="relative p-4 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent hover:from-primary/20 hover:border-primary/40 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 cursor-pointer overflow-hidden group"
                      >
                        {/* subtle left accent bar */}
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-accent to-primary/30 rounded-l-xl opacity-70 group-hover:opacity-100 transition-opacity" />
                        <div className="flex items-start justify-between mb-2 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {task.public_id && (
                              <>
                                <span className="font-mono text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded shrink-0 tracking-wider">
                                  {task.public_id}
                                </span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCopyRefId(task.public_id); }}
                                  className="shrink-0 text-muted-foreground hover:text-purple-500 transition-colors"
                                  title="Copy Ref ID"
                                >
                                  <Copy size={10} />
                                </button>
                              </>
                            )}
                            <h4 className="font-semibold text-sm text-foreground truncate">{task.title}</h4>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${priorityColors[task.priority] || priorityColors.medium}`}>
                            {task.priority}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1 text-primary/70 group-hover:text-primary transition-colors">
                            <CalendarDays className="h-3 w-3" />
                            <span>Due: {task.due_date ? new Date(task.due_date).toLocaleDateString('en-IN') : 'No date'}</span>
                          </div>
                          {task.assignee_name && (
                            <div className="flex items-center gap-1 text-muted-foreground group-hover:text-foreground transition-colors">
                              <Users className="h-3 w-3" />
                              <span>{task.assignee_name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-8">
                        <ListTodo className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Tasks with due dates will appear here</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Performance Score */}
                <div className="rounded-2xl glass-card glow-primary p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-primary" />
                      <h3 className="font-bold text-foreground">Overall Performance</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-lg shadow-primary/30">
                        <div className="h-20 w-20 rounded-full bg-card flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-primary">87</div>
                            <div className="text-xs text-muted-foreground">Score</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Attendance Rate</span>
                        <span className="font-semibold text-foreground">92%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Task Completion</span>
                        <span className="font-semibold text-foreground">{completionRate}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">On-time Delivery</span>
                        <span className="font-semibold text-foreground">84%</span>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
