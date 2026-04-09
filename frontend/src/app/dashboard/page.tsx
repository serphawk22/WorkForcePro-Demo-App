"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { 
  Users, UserCheck, UserX, Calendar, Clock, AlertCircle, 
  ListTodo, Target, CalendarDays, Loader2, Award, Copy
} from "lucide-react";
import { fetchAdminDashboard, fetchAllUsers, getTaskStats, AdminDashboardStats, TaskStats } from "@/lib/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Priority badge colors
const priorityColors: Record<string, string> = {
  high: "bg-red-500/10 text-red-600",
  medium: "bg-yellow-500/10 text-yellow-600",
  low: "bg-green-500/10 text-green-600",
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [activeUsersCount, setActiveUsersCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [dashboardResult, taskResult] = await Promise.all([
        fetchAdminDashboard(),
        getTaskStats()
      ]);

      const allUsersResult = await fetchAllUsers();
      if (allUsersResult.data) {
        setActiveUsersCount(allUsersResult.data.length);
      }
      
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
  const totalEmployees = (activeUsersCount ?? stats?.total_employees) || 0;
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
                <div className="group relative overflow-hidden rounded-xl glass-card glass-card-hover p-5 transition-all duration-300">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl" />
                  <div className="relative">
                    <Users className="h-5 w-5 text-primary mb-3" />
                    <div className="text-2xl font-bold text-foreground">{totalEmployees}</div>
                    <div className="text-xs text-muted-foreground mt-1">Total Employees</div>
                  </div>
                </div>

                {/* Present Today */}
                <div className="group relative overflow-hidden rounded-xl glass-card glass-card-hover p-5 transition-all duration-300">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/10 to-transparent rounded-full blur-2xl" />
                  <div className="relative">
                    <UserCheck className="h-5 w-5 text-green-600 mb-3" />
                    <div className="text-2xl font-bold text-foreground">{presentToday}</div>
                    <div className="text-xs text-muted-foreground mt-1">Present Today</div>
                  </div>
                </div>

                {/* Absent */}
                <div className="group relative overflow-hidden rounded-xl glass-card glass-card-hover p-5 transition-all duration-300">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-red-500/10 to-transparent rounded-full blur-2xl" />
                  <div className="relative">
                    <UserX className="h-5 w-5 text-red-600 mb-3" />
                    <div className="text-2xl font-bold text-foreground">{absent}</div>
                    <div className="text-xs text-muted-foreground mt-1">Absent</div>
                  </div>
                </div>

                {/* On Leave */}
                <div className="group relative overflow-hidden rounded-xl glass-card glass-card-hover p-5 transition-all duration-300">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-2xl" />
                  <div className="relative">
                    <Calendar className="h-5 w-5 text-blue-600 mb-3" />
                    <div className="text-2xl font-bold text-foreground">{onLeave}</div>
                    <div className="text-xs text-muted-foreground mt-1">On Leave</div>
                  </div>
                </div>

                {/* Late Check-ins */}
                <div className="group relative overflow-hidden rounded-xl glass-card glass-card-hover p-5 transition-all duration-300">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-full blur-2xl" />
                  <div className="relative">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mb-3" />
                    <div className="text-2xl font-bold text-foreground">{lateCheckins}</div>
                    <div className="text-xs text-muted-foreground mt-1">Late Check-ins</div>
                  </div>
                </div>

                {/* Active Tasks */}
                <div className="group relative overflow-hidden rounded-xl glass-card glass-card-hover p-5 transition-all duration-300">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary-light/10 to-transparent rounded-full blur-2xl" />
                  <div className="relative">
                    <ListTodo className="h-5 w-5 text-primary-light mb-3" />
                    <div className="text-2xl font-bold text-foreground">{activeTasks}</div>
                    <div className="text-xs text-muted-foreground mt-1">Active Tasks</div>
                  </div>
                </div>
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
                    {upcomingTasks.length > 0 ? upcomingTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => router.push(`/project-management/${task.id}`)}
                        className="p-4 rounded-xl glass-light hover:scale-[1.02] transition-all duration-300 cursor-pointer"
                      >
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
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <CalendarDays className="h-3 w-3" />
                            <span>Due: {task.due_date ? new Date(task.due_date).toLocaleDateString('en-IN') : 'No date'}</span>
                          </div>
                          {task.assignee_name && (
                            <div className="flex items-center gap-1 text-muted-foreground">
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
