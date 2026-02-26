"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { Users, Wifi, Clock, ListTodo, CalendarOff, Loader2, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { fetchAdminDashboard, getTaskStats, AdminDashboardStats, TaskStats } from "@/lib/api";

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
    { name: "Approved", value: taskStats.approved, color: "#10b981" },
    { name: "In Progress", value: taskStats.in_progress, color: "#3b82f6" },
    { name: "Reviewing", value: taskStats.reviewing, color: "#8b5cf6" },
    { name: "To Do", value: taskStats.todo, color: "#6b7280" },
    { name: "Submitted", value: taskStats.submitted, color: "#f59e0b" },
    { name: "Rejected", value: taskStats.rejected, color: "#ef4444" },
  ].filter(item => item.value > 0) : [];
  
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

              {/* Task Distribution Chart */}
              <div className="rounded-xl border border-border bg-card p-6 card-shadow">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-card-foreground">Task Distribution</h3>
                    <p className="text-sm text-muted-foreground">Current project status breakdown</p>
                  </div>
                  <Activity size={20} className="text-muted-foreground" />
                </div>
                {taskStats && distributionData.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={distributionData}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 60,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(22 30% 90%)" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 12, fill: 'hsl(289 20% 40%)' }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fill: 'hsl(289 20% 40%)' }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(0 0% 100%)",
                            border: "1px solid hsl(22 30% 90%)",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Bar 
                          dataKey="value" 
                          fill="#8b5cf6"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-80">
                    <p className="text-sm text-muted-foreground">No project data available</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
