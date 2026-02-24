"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { 
  Users, UserCheck, UserX, Calendar, Clock, AlertCircle, 
  TrendingUp, CheckCircle2, ListTodo, Target, Sparkles, 
  Send, Zap, BarChart3, CalendarDays, Filter, ChevronRight,
  Loader2, MessageCircle, Award
} from "lucide-react";
import { fetchAdminDashboard, getTaskStats, AdminDashboardStats, TaskStats } from "@/lib/api";

// Mock data for leaves timeline
const leaveTimeline = [
  { name: "Sarah Johnson", type: "Vacation", start: "24 Feb", end: "28 Feb", status: "approved", color: "bg-purple-500" },
  { name: "Mike Chen", type: "Sick Leave", start: "25 Feb", end: "26 Feb", status: "pending", color: "bg-yellow-500" },
  { name: "Emma Davis", type: "Personal", start: "27 Feb", end: "1 Mar", status: "approved", color: "bg-green-500" },
  { name: "James Wilson", type: "Vacation", start: "1 Mar", end: "5 Mar", status: "approved", color: "bg-purple-500" },
];

// Mock upcoming deadlines
const upcomingDeadlines = [
  { project: "Q1 Performance Review", dueDate: "28 Feb", assignees: 12, priority: "high" },
  { project: "Website Redesign", dueDate: "2 Mar", assignees: 5, priority: "medium" },
  { project: "Mobile App Update", dueDate: "5 Mar", assignees: 8, priority: "high" },
  { project: "Database Migration", dueDate: "10 Mar", assignees: 3, priority: "low" },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [aiMessage, setAiMessage] = useState("");

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
  const absent = totalEmployees - presentToday;
  const onLeave = 3; // Mock data
  const lateCheckins = 2; // Mock data
  const activeTasks = stats?.pending_tasks || 0;

  // Task completion rate
  const totalTasks = (taskStats?.done || 0) + (taskStats?.in_progress || 0) + (taskStats?.todo || 0);
  const completionRate = totalTasks > 0 ? Math.round(((taskStats?.done || 0) / totalTasks) * 100) : 0;

  // Department performance mock data
  const deptPerformance = [
    { dept: "Engineering", completion: 85 },
    { dept: "Marketing", completion: 72 },
    { dept: "Sales", completion: 91 },
    { dept: "HR", completion: 68 },
  ];

  const handleAIAction = (action: string) => {
    console.log("AI Action:", action);
    // Placeholder for AI actions
  };
  
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

            {/* 🔷 3-COLUMN GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT COLUMN - Attendance & Leaves Timeline */}
              <div className="lg:col-span-4 space-y-6">
                {/* Planned Absences */}
                <div className="glass-card rounded-2xl overflow-hidden glow-sm">
                  <div className="bg-gradient-to-r from-primary/10 via-primary-light/10 to-transparent p-5 border-b border-border/30">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-primary" />
                        <h3 className="font-bold text-foreground">Planned Absences</h3>
                      </div>
                      <button className="p-2 rounded-lg glass-light hover:scale-105 transition-all">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">Upcoming leaves and time-off</p>
                  </div>
                  
                  <div className="p-5 space-y-4">
                    {leaveTimeline.map((leave, index) => (
                      <div key={index} className="group relative">
                        <div className="flex items-start gap-3 p-4 rounded-xl glass-light hover:scale-[1.02] transition-all duration-300">
                          <div className={`h-10 w-1 rounded-full ${leave.color}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="font-semibold text-sm text-foreground truncate">{leave.name}</h4>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                leave.status === 'approved' 
                                  ? 'bg-green-500/10 text-green-700' 
                                  : 'bg-yellow-500/10 text-yellow-700'
                              }`}>
                                {leave.status}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-1">{leave.type}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{leave.start} - {leave.end}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-background/30 border-t border-border/30">
                    <button className="w-full text-sm text-primary hover:text-primary-light font-medium flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-background/50 transition-colors">
                      View All Leaves
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* MIDDLE COLUMN - Productivity & Tasks */}
              <div className="lg:col-span-5 space-y-6">
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
                      <span>{taskStats?.done || 0} completed</span>
                      <span>{totalTasks} total tasks</span>
                    </div>
                  </div>

                  {/* Department Breakdown */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-foreground mb-3">Department Performance</h4>
                    {deptPerformance.map((dept, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{dept.dept}</span>
                          <span className="font-semibold text-foreground">{dept.completion}%</span>
                        </div>
                        <div className="h-2 bg-secondary/40 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-primary-light to-primary rounded-full transition-all duration-500"
                            style={{ width: `${dept.completion}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Upcoming Deadlines */}
                <div className="rounded-2xl glass-card glow-sm overflow-hidden">
                  <div className="bg-gradient-to-r from-primary-light/10 to-transparent p-5 border-b border-border/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-5 w-5 text-primary-light" />
                      <h3 className="font-bold text-foreground">Upcoming Deadlines</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">Projects requiring attention</p>
                  </div>
                  
                  <div className="p-5 space-y-3">
                    {upcomingDeadlines.map((item, index) => (
                      <div key={index} className="p-4 rounded-xl glass-light hover:scale-[1.02] transition-all duration-300">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-sm text-foreground">{item.project}</h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            item.priority === 'high' 
                              ? 'bg-red-500/10 text-red-700' 
                              : item.priority === 'medium' 
                              ? 'bg-yellow-500/10 text-yellow-700' 
                              : 'bg-green-500/10 text-green-700'
                          }`}>
                            {item.priority}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <CalendarDays className="h-3 w-3" />
                            <span>Due: {item.dueDate}</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span>{item.assignees} assigned</span>
                          </div>
                        </div>
                      </div>
                    ))}
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

              {/* RIGHT COLUMN - AI Workforce Assistant */}
              <div className="lg:col-span-3">
                <div className="rounded-2xl glass-card glow-primary overflow-hidden sticky top-6">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-primary to-primary-light p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <h3 className="font-bold text-white">AI Assistant</h3>
                    </div>
                    <p className="text-xs text-white/80">Intelligent workforce insights</p>
                  </div>

                  {/* Chat Messages */}
                  <div className="p-5 space-y-4 max-h-[400px] overflow-y-auto">
                    <div className="glass-light rounded-2xl rounded-tl-sm p-4">
                      <p className="text-sm text-foreground">
                        👋 Hi! I can help you with workforce analytics, generate reports, or provide insights. What would you like to know?
                      </p>
                    </div>

                    {aiMessage && (
                      <div className="glass-light rounded-2xl rounded-tr-sm p-4 bg-primary/5 ml-8">
                        <p className="text-sm text-foreground">{aiMessage}</p>
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="p-5 space-y-2 border-t border-border/30 bg-background/30">
                    <p className="text-xs font-semibold text-muted-foreground mb-3">Quick Actions</p>
                    
                    <button 
                      onClick={() => handleAIAction('payroll')}
                      className="w-full flex items-center gap-3 p-3 rounded-xl glass-light glass-card-hover transition-all duration-300 group"
                    >
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary-light/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <BarChart3 className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-xs font-semibold text-foreground">Generate Payroll</div>
                        <div className="text-xs text-muted-foreground">Summary report</div>
                      </div>
                    </button>

                    <button 
                      onClick={() => handleAIAction('attendance')}
                      className="w-full flex items-center gap-3 p-3 rounded-xl glass-light glass-card-hover transition-all duration-300 group"
                    >
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <UserX className="h-4 w-4 text-red-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-xs font-semibold text-foreground">Low Attendance</div>
                        <div className="text-xs text-muted-foreground">Alert employees</div>
                      </div>
                    </button>

                    <button 
                      onClick={() => handleAIAction('performance')}
                      className="w-full flex items-center gap-3 p-3 rounded-xl glass-light glass-card-hover transition-all duration-300 group"
                    >
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-xs font-semibold text-foreground">Dept Performance</div>
                        <div className="text-xs text-muted-foreground">View analytics</div>
                      </div>
                    </button>
                  </div>

                  {/* Chat Input */}
                  <div className="p-5 bg-background/50 border-t border-border/30">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Ask AI anything..."
                        value={aiMessage}
                        onChange={(e) => setAiMessage(e.target.value)}
                        className="w-full pl-4 pr-12 py-3 rounded-xl glass-input text-sm"
                      />
                      <button className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg bg-gradient-to-r from-primary to-primary-light flex items-center justify-center hover:shadow-lg hover:scale-105 transition-all duration-300">
                        <Send className="h-4 w-4 text-white" />
                      </button>
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
