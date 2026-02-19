"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
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
      setIsLoading(false);
    }
    loadData();
  }, []);

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
                  <div className="mb-4">
                    <h3 className="text-base font-semibold text-card-foreground">Task Distribution</h3>
                    <p className="text-xs text-muted-foreground">Current task breakdown</p>
                  </div>
                  {distributionData.some(d => d.value > 0) ? (
                    <div className="flex items-center gap-6">
                      <ResponsiveContainer width="50%" height={180}>
                        <PieChart>
                          <Pie data={distributionData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                            {distributionData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-col gap-2.5">
                        {distributionData.map((item) => (
                          <div key={item.name} className="flex items-center gap-2 text-xs">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-muted-foreground">{item.name}</span>
                            <span className="font-semibold text-card-foreground ml-auto">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[180px] text-muted-foreground">
                      No tasks yet. Create your first task!
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Activities */}
              {stats?.recent_activities && stats.recent_activities.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-6 card-shadow">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity size={18} className="text-muted-foreground" />
                    <h3 className="text-base font-semibold text-card-foreground">Recent Activities</h3>
                  </div>
                  <div className="space-y-3">
                    {stats.recent_activities.map((activity, index) => (
                      <div key={index} className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                        <div className={`mt-1 h-2 w-2 rounded-full ${
                          activity.status === 'done' || activity.status === 'approved' ? 'bg-green-500' :
                          activity.status === 'in_progress' || activity.status === 'pending' ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-card-foreground">{activity.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          activity.status === 'done' || activity.status === 'approved' ? 'bg-green-500/10 text-green-600' :
                          activity.status === 'in_progress' || activity.status === 'pending' ? 'bg-yellow-500/10 text-yellow-600' :
                          activity.status === 'rejected' ? 'bg-red-500/10 text-red-600' :
                          'bg-blue-500/10 text-blue-600'
                        }`}>
                          {activity.status}
                        </span>
                      </div>
                    ))}
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
