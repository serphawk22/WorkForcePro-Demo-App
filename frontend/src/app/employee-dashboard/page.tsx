"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { Clock, AlertCircle, Zap, Building2, Play, Square, Circle, CheckCircle, Loader2, Calendar, Copy } from "lucide-react";
import { fetchEmployeeDashboard, punchIn, punchOut, getMyTasks, updateTaskStatus, Task, EmployeeDashboardStats } from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";

// Timer state persistence keys
const TIMER_STATE_KEY = 'workforce_timer_state';

interface TimerState {
  isActive: boolean;
  punchInTime: string | null;  // ISO string of punch-in time
  lastSyncSeconds: number;
  lastSyncTimestamp: number;  // When we last synced with server
}

function getPersistedTimerState(): TimerState | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(TIMER_STATE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading timer state:', e);
  }
  return null;
}

function persistTimerState(state: TimerState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Error saving timer state:', e);
  }
}

function clearPersistedTimerState(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TIMER_STATE_KEY);
  } catch (e) {
    console.error('Error clearing timer state:', e);
  }
}

// Calculate current elapsed seconds from persisted state
function calculateCurrentSeconds(state: TimerState | null): number {
  if (!state || !state.isActive) return state?.lastSyncSeconds || 0;
  
  // Calculate time elapsed since last sync
  const timeSinceSync = Math.floor((Date.now() - state.lastSyncTimestamp) / 1000);
  return Math.max(0, state.lastSyncSeconds + timeSinceSync);
}

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
  const [punchLoading, setPunchLoading] = useState(false);
  
  // Timer state - initialized to 0, then restored from localStorage after mount
  const [seconds, setSeconds] = useState<number>(0);
  const [isActive, setIsActive] = useState(false);
  const [timerInitialized, setTimerInitialized] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTimeRef = useRef<number>(Date.now());
  
  // Restore timer state from localStorage immediately on mount (client-side only)
  useEffect(() => {
    const persistedState = getPersistedTimerState();
    if (persistedState && persistedState.isActive) {
      // Calculate current seconds including time elapsed since last save
      const currentSeconds = calculateCurrentSeconds(persistedState);
      setSeconds(currentSeconds);
      setIsActive(true);
    }
    setTimerInitialized(true);
  }, []);
  
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
        
        // Check if we have a persisted timer state (restored from localStorage)
        const persistedState = getPersistedTimerState();
        const hasPersistedActiveTimer = persistedState?.isActive && persistedState.lastSyncTimestamp > 0;
        
        // Initialize timer using server-provided elapsed_seconds (handles timezone correctly)
        const isWorking = statsResponse.data.current_session?.clocked_in || false;
        if (isWorking && statsResponse.data.current_session) {
          // If we have a recent persisted state, use calculated elapsed time to avoid flash
          // Only use server time if we don't have valid persisted state or server is significantly different
          const serverElapsedSeconds = Math.max(0, statsResponse.data.current_session.elapsed_seconds || 0);
          
          if (hasPersistedActiveTimer) {
            // We have persisted state - calculate current time from it
            const calculatedSeconds = calculateCurrentSeconds(persistedState);
            
            // Only use server time if difference is significant (> 5 seconds)
            // This prevents resetting the timer due to network latency
            if (Math.abs(serverElapsedSeconds - calculatedSeconds) > 5) {
              setSeconds(serverElapsedSeconds);
            }
            // Otherwise keep the calculated seconds from persisted state
          } else {
            // No persisted state - use server time
            setSeconds(serverElapsedSeconds);
          }
          
          setIsActive(true);
          lastSyncTimeRef.current = Date.now();
          
          // Persist timer state for navigation resilience
          persistTimerState({
            isActive: true,
            punchInTime: statsResponse.data.current_session.punch_in,
            lastSyncSeconds: serverElapsedSeconds,
            lastSyncTimestamp: Date.now()
          });
        } else if (statsResponse.data.current_session && !isWorking) {
          // Completed session for today - use server-provided elapsed_seconds
          const serverElapsedSeconds = Math.max(0, statsResponse.data.current_session.elapsed_seconds || 0);
          setSeconds(serverElapsedSeconds);
          setIsActive(false);
          // Clear persisted state when session is complete
          clearPersistedTimerState();
        } else {
          setSeconds(0);
          setIsActive(false);
          // Clear any stale persisted state
          clearPersistedTimerState();
        }
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

  // Sync with server periodically to prevent drift
  const syncWithServer = useCallback(async () => {
    if (!isActive) return;
    
    try {
      const statsResponse = await fetchEmployeeDashboard();
      if (statsResponse.data?.current_session?.clocked_in) {
        const serverElapsedSeconds = Math.max(0, statsResponse.data.current_session.elapsed_seconds || 0);
        setSeconds(serverElapsedSeconds);
        lastSyncTimeRef.current = Date.now();
        
        // Update persisted state with server data
        persistTimerState({
          isActive: true,
          punchInTime: statsResponse.data.current_session.punch_in,
          lastSyncSeconds: serverElapsedSeconds,
          lastSyncTimestamp: Date.now()
        });
      } else {
        // Session ended - stop timer and clear persisted state
        setIsActive(false);
        clearPersistedTimerState();
      }
    } catch (error) {
      console.error("Error syncing with server:", error);
    }
  }, [isActive]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set up periodic server sync every 30 seconds when timer is active
  useEffect(() => {
    if (isActive) {
      syncIntervalRef.current = setInterval(() => {
        syncWithServer();
      }, 30000); // Sync every 30 seconds
    } else {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isActive, syncWithServer]);

  // Sync when page becomes visible (user returns to tab or navigates back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive) {
        // Page became visible - sync with server immediately
        syncWithServer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, syncWithServer]);

  // Timer effect - increments every second when active
  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive]);

  // Persist timer state periodically (every 5 seconds) and on unmount
  useEffect(() => {
    if (!isActive) return;
    
    const persistCurrentState = () => {
      const storedState = getPersistedTimerState();
      if (storedState && isActive) {
        persistTimerState({
          ...storedState,
          lastSyncSeconds: seconds,
          lastSyncTimestamp: Date.now()
        });
      }
    };

    // Persist every 5 seconds
    const persistInterval = setInterval(persistCurrentState, 5000);
    
    // Also persist on page unload/navigation
    const handleBeforeUnload = () => persistCurrentState();
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      clearInterval(persistInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Persist state when component unmounts (navigation)
      persistCurrentState();
    };
  }, [isActive, seconds]);

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
      // Fetch fresh data to update dashboard and timer
      await fetchData();
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
      // Clear persisted timer state immediately
      clearPersistedTimerState();
      // Reload data - backend will return completed session
      await fetchData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to punch out";
      toast.error(errorMessage);
    } finally {
      setPunchLoading(false);
    }
  };

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
  const isWorking = dashboardStats?.current_session?.clocked_in || false;
  
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
                  disabled={punchLoading}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-red-500 to-red-600 px-5 py-2 text-sm font-bold text-white hover:from-red-600 hover:to-red-700 transition-all transform hover:scale-105 shadow-lg shadow-red-500/50 hover:shadow-xl hover:shadow-red-500/60 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {punchLoading ? <Loader2 size={14} className="animate-spin glow-icon" /> : <Square size={14} className="glow-icon" />}
                  Punch Out
                </button>
              ) : (
                <button
                  onClick={handlePunchIn}
                  disabled={punchLoading}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-light px-5 py-2 text-sm font-bold text-white hover:from-primary-light hover:to-primary-glow transition-all transform hover:scale-105 shadow-lg shadow-primary/50 hover:shadow-xl hover:shadow-primary/60 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {punchLoading ? <Loader2 size={14} className="animate-spin glow-icon" /> : <Play size={14} className="glow-icon" />}
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
              value={dashboardStats?.current_session ? formatDuration(seconds) : "--"}
              subtitle={
                isWorking 
                  ? "Active session" 
                  : dashboardStats?.current_session 
                    ? "Completed today" 
                    : "Not clocked in"
              }
              trend={isWorking ? "LIVE" : dashboardStats?.current_session ? "Done" : undefined}
              trendType={isWorking ? "up" : "stable"}
              iconColor="bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50"
            />
            <StatCard
              icon={AlertCircle}
              label="Due Today"
              value={tasksDueToday}
              subtitle="Projects due today"
              trend={tasksDueToday > 0 ? "Attention" : "Good"}
              trendType={tasksDueToday > 0 ? "down" : "up"}
              iconColor="bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/50"
            />
            <StatCard
              icon={Zap}
              label="Productivity"
              value={`${productivityScore}%`}
              subtitle={`${tasksCompleted} completed`}
              trend={productivityScore >= 50 ? "Great" : "Keep going"}
              trendType={productivityScore >= 50 ? "up" : "stable"}
              iconColor="bg-gradient-to-br from-yellow-500 to-orange-500 text-white shadow-lg shadow-yellow-500/50"
            />
            <StatCard
              icon={Building2}
              label="Active Projects"
              value={activeProjects}
              subtitle="In progress"
              trend={activeProjects > 0 ? "Working" : "None"}
              trendType={activeProjects > 0 ? "up" : "stable"}
              iconColor="bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/50"
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
              iconColor="bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/50"
            />
            <StatCard
              icon={Clock}
              label="Pending Requests"
              value={pendingLeaveRequests}
              subtitle="Leave requests"
              trend={pendingLeaveRequests > 0 ? "Pending" : "None"}
              trendType="stable"
              iconColor="bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/50"
            />
          </div>

          {/* Active Projects */}
          <div className="rounded-xl glass-card glow-sm">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-card-foreground flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/50">
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
