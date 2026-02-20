"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { Users, Wifi, Clock, ListTodo, TrendingUp, CalendarOff, Loader2, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { fetchAdminDashboard, getTaskStats, AdminDashboardStats, TaskStats } from "@/lib/api";

const velocityData = [
  { week: "W1", tasks: 10 },
  { week: "W2", tasks: 8 },
  { week: "W3", tasks: 12 },
  { week: "W4", tasks: 7 },
  { week: "W5", tasks: 15 },
  { week: "W6", tasks: 11 },
];

export default function AdminDashboard() {
  const { user } = useAuth();
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

  const distributionData = taskStats ? [
    { name: "Done", value: taskStats.done, color: "hsl(142 71% 45%)" },
    { name: "In Progress", value: taskStats.in_progress, color: "hsl(266 62% 18%)" },
    { name: "To Do", value: taskStats.todo, color: "hsl(289 36% 26%)" },
  ] : [];
  
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout role="admin" userName={user?.name || "Administrator"} userHandle={`@${user?.email?.split("@")[0] || "admin"}`}>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Overview</h1>
            <p className="text-sm text-muted-foreground mt-1">Real-time insights and workforce analytics.</p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                  icon={Users} 
                  label="Total Employees" 
                  value={stats?.total_employees || 0} 
                  subtitle="Active employees" 
                  trend="Stable" 
                  trendType="stable" 
                />
                <StatCard 
                  icon={Wifi} 
                  label="Active Sessions" 
                  value={stats?.active_sessions || 0} 
                  subtitle="Currently Working" 
                  trend={stats?.active_sessions ? "Active" : "None"} 
                  trendType={stats?.active_sessions ? "up" : "stable"} 
                />
                <StatCard 
                  icon={Clock} 
                  label="Avg Daily Hours" 
                  value={`${stats?.avg_daily_hours || 0}h`} 
                  subtitle="Per Employee" 
                  trend="Stable" 
                  trendType="stable" 
                />
                <StatCard 
                  icon={ListTodo} 
                  label="Pending Tasks" 
                  value={stats?.pending_tasks || 0} 
                  subtitle="Needs Attention" 
                  trend={stats?.pending_tasks ? "Action Required" : "All Clear"} 
                  trendType={stats?.pending_tasks ? "down" : "up"} 
                />
              </div>

              {/* Additional Stats Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatCard 
                  icon={CalendarOff} 
                  label="Pending Leave Requests" 
                  value={stats?.leave_requests_pending || 0} 
                  subtitle="Awaiting approval" 
                  trend={stats?.leave_requests_pending ? "Review Needed" : "None"} 
                  trendType={stats?.leave_requests_pending ? "down" : "stable"} 
                />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Sprint Velocity */}
                <div className="rounded-xl border border-border bg-card p-6 card-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-card-foreground">Sprint Velocity</h3>
                      <p className="text-xs text-muted-foreground">Task completion rate over time</p>
                    </div>
                    <TrendingUp size={18} className="text-muted-foreground" />
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={velocityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(22 30% 90%)" />
                      <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="hsl(289 20% 40%)" />
                      <YAxis tick={{ fontSize: 12 }} stroke="hsl(289 20% 40%)" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(0 0% 100%)",
                          border: "1px solid hsl(22 30% 90%)",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Line type="monotone" dataKey="tasks" stroke="hsl(266 62% 18%)" strokeWidth={2.5} dot={{ fill: "hsl(266 62% 18%)", r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Task Distribution */}
                <div className="rounded-xl border border-border bg-card p-6 card-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-card-foreground">Task Distribution</h3>
                      <p className="text-xs text-muted-foreground">Current task status breakdown</p>
                    </div>
                    <Activity size={18} className="text-muted-foreground" />
                  </div>
                  {taskStats && (taskStats.done + taskStats.in_progress + taskStats.todo) > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={distributionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                          labelLine={{ stroke: "hsl(289 20% 50%)", strokeWidth: 1 }}
                        >
                          {distributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(0 0% 100%)",
                            border: "1px solid hsl(22 30% 90%)",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[220px]">
                      <p className="text-sm text-muted-foreground">No task data available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Task Summary */}
              {taskStats && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-border bg-card p-4 card-shadow">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-500/10">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Done</p>
                        <p className="text-lg font-semibold text-card-foreground">{taskStats.done}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4 card-shadow">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500/10">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">In Progress</p>
                        <p className="text-lg font-semibold text-card-foreground">{taskStats.in_progress}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4 card-shadow">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-500/10">
                        <div className="w-3 h-3 rounded-full bg-purple-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">To Do</p>
                        <p className="text-lg font-semibold text-card-foreground">{taskStats.todo}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
