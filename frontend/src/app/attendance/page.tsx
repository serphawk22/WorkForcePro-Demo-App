"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { 
  CalendarCheck, Clock, UserCheck, Play, Square, Loader2, Timer,
  Calendar, SortDesc, SortAsc, X, Filter
} from "lucide-react";
import { 
  getAttendanceStatus, 
  punchIn, 
  punchOut, 
  getMyAttendance,
  getAllAttendance,
  AttendanceStatus,
  AttendanceRecord 
} from "@/lib/api";
import { toast } from "sonner";

// Timer state persistence keys (shared with employee dashboard)
const TIMER_STATE_KEY = 'workforce_timer_state';

interface TimerState {
  isActive: boolean;
  punchInTime: string | null;
  lastSyncSeconds: number;
  lastSyncTimestamp: number;
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

function calculateCurrentSeconds(state: TimerState | null): number {
  if (!state || !state.isActive) return state?.lastSyncSeconds || 0;
  const timeSinceSync = Math.floor((Date.now() - state.lastSyncTimestamp) / 1000);
  return Math.max(0, state.lastSyncSeconds + timeSinceSync);
}

function formatTime(seconds: number): string {
  // Ensure non-negative time
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function formatDateTime(isoString: string | null): string {
  if (!isoString) return "--";
  
  // Backend stores in UTC, but datetime serialization may not include 'Z' marker
  // If no 'Z' or timezone offset, append 'Z' to treat as UTC
  let dateString = isoString;
  if (!dateString.endsWith('Z') && !dateString.includes('+') && !dateString.includes('T')) {
    // Has no time component, just date
    dateString = dateString + 'T00:00:00Z';
  } else if (!dateString.endsWith('Z') && !dateString.match(/[+-]\d{2}:\d{2}$/)) {
    // Has time but no timezone marker - append Z for UTC
    dateString = dateString + 'Z';
  }
  
  const date = new Date(dateString);
  // Display time in IST (Kolkata timezone) using 24-hour format
  return date.toLocaleTimeString("en-IN", { 
    timeZone: "Asia/Kolkata",
    hour: "2-digit", 
    minute: "2-digit",
    second: "2-digit",
    hour12: false  // Use 24-hour format for clarity
  });
}

function formatDate(dateString: string): string {
  // Backend stores in UTC, ensure proper timezone parsing
  let processedDateString = dateString;
  if (!dateString.endsWith('Z') && !dateString.includes('+') && !dateString.includes('T')) {
    // Just a date, add time and UTC marker
    processedDateString = dateString + 'T00:00:00Z';
  } else if (!dateString.endsWith('Z') && !dateString.match(/[+-]\d{2}:\d{2}$/)) {
    // Has time but no timezone marker
    processedDateString = dateString + 'Z';
  }
  
  const date = new Date(processedDateString);
  // Display date in IST (Kolkata timezone)
  return date.toLocaleDateString("en-IN", { 
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

export default function AttendancePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPunching, setIsPunching] = useState(false);
  
  // Timer state - initialized to 0, then restored from localStorage after mount
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [timerInitialized, setTimerInitialized] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tableRef = useRef<HTMLDivElement | null>(null);
  
  // Filter state
  const [filterDate, setFilterDate] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isFilterActive, setIsFilterActive] = useState(false);
  const [isFilterLoading, setIsFilterLoading] = useState(false);

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

  // Load initial data (status, history)
  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [statusResult, historyResult] = await Promise.all([
      getAttendanceStatus(),
      getMyAttendance(30)
    ]);
    
    if (statusResult.data) {
      setStatus(statusResult.data);
      
      // Check if we have a persisted timer state (restored from localStorage)
      const persistedState = getPersistedTimerState();
      const hasPersistedActiveTimer = persistedState?.isActive && persistedState.lastSyncTimestamp > 0;
      
      // Initialize timer using server-provided elapsed_seconds (handles timezone correctly)
      if (statusResult.data.status === "working") {
        // If we have a recent persisted state, use calculated elapsed time to avoid flash
        const serverElapsedSeconds = Math.max(0, statusResult.data.elapsed_seconds || 0);
        
        if (hasPersistedActiveTimer) {
          // We have persisted state - calculate current time from it
          const calculatedSeconds = calculateCurrentSeconds(persistedState);
          
          // Only use server time if difference is significant (> 5 seconds)
          if (Math.abs(serverElapsedSeconds - calculatedSeconds) > 5) {
            setSeconds(serverElapsedSeconds);
          }
          // Otherwise keep the calculated seconds from persisted state
        } else {
          // No persisted state - use server time
          setSeconds(serverElapsedSeconds);
        }
        
        setIsActive(true);
        
        // Persist timer state for navigation resilience
        persistTimerState({
          isActive: true,
          punchInTime: statusResult.data.punch_in,
          lastSyncSeconds: serverElapsedSeconds,
          lastSyncTimestamp: Date.now()
        });
      } else if (statusResult.data.status === "completed") {
        // Show total elapsed time for completed session
        const elapsedSeconds = Math.max(0, statusResult.data.elapsed_seconds || 0);
        setSeconds(elapsedSeconds);
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
    if (historyResult.data) {
      setHistory(historyResult.data);
    }
    
    setIsLoading(false);
  }, []);

  // Load filtered attendance data (admin only) - separate to avoid scroll jump
  const loadFilteredAttendance = useCallback(async () => {
    if (!isAdmin) return;
    
    setIsFilterLoading(true);
    
    // Apply filters for admin
    const filters: any = { sort: sortOrder };
    
    if (filterDate) {
      filters.dateFilter = filterDate;
    } else if (startDate && endDate) {
      filters.startDate = startDate;
      filters.endDate = endDate;
    }
    
    const allResult = await getAllAttendance(filters);
    if (allResult.data) {
      setAllAttendance(allResult.data);
    }
    
    setIsFilterLoading(false);
  }, [isAdmin, filterDate, startDate, endDate, sortOrder]);

  // Initial load on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load filtered attendance when filters change (admin only)
  useEffect(() => {
    if (isAdmin) {
      loadFilteredAttendance();
    }
  }, [isAdmin, loadFilteredAttendance]);

  // Sync with server periodically to prevent drift
  const syncWithServer = useCallback(async () => {
    if (!isActive) return;
    
    try {
      const statusResult = await getAttendanceStatus();
      if (statusResult.data?.status === "working") {
        const serverElapsedSeconds = Math.max(0, statusResult.data.elapsed_seconds || 0);
        setSeconds(serverElapsedSeconds);
        
        // Update persisted state with server data
        persistTimerState({
          isActive: true,
          punchInTime: statusResult.data.punch_in,
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

  // Live timer effect - increments every second when active
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

  const handlePunchIn = async () => {
    setIsPunching(true);
    const result = await punchIn();
    if (result.error) {
      toast.error(result.error);
      setIsPunching(false);
    } else  {
      toast.success("Punched in successfully!");
      // Reload all data to refresh timer and status
      await loadData();
      setIsPunching(false);
    }
  };

  const handlePunchOut = async () => {
    setIsPunching(true);
    const result = await punchOut();
    if (result.error) {
      toast.error(result.error);
      setIsPunching(false);
    } else {
      toast.success("Punched out successfully!");
      // Clear persisted timer state immediately
      clearPersistedTimerState();
      // Reload all data to get final total and update status
      await loadData();
      setIsPunching(false);
    }
  };

  const getStatusBadge = (attendanceStatus: string) => {
    switch (attendanceStatus) {
      case "working":
        return <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-medium">Working</span>;
      case "completed":
        return <span className="px-2 py-1 rounded-full bg-blue-500/10 text-blue-600 text-xs font-medium">Completed</span>;
      default:
        return <span className="px-2 py-1 rounded-full bg-gray-500/10 text-gray-600 text-xs font-medium">Not Started</span>;
    }
  };

  // Quick filter helpers
  const setTodayFilter = () => {
    const today = new Date().toISOString().split('T')[0];
    setFilterDate(today);
    setStartDate("");
    setEndDate("");
    setIsFilterActive(true);
  };

  const setYesterdayFilter = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setFilterDate(yesterday.toISOString().split('T')[0]);
    setStartDate("");
    setEndDate("");
    setIsFilterActive(true);
  };

  const setThisWeekFilter = () => {
    const today = new Date();
    const firstDay = new Date(today);
    firstDay.setDate(today.getDate() - today.getDay());
    
    setFilterDate("");
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
    setIsFilterActive(true);
  };

  const setThisMonthFilter = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    setFilterDate("");
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
    setIsFilterActive(true);
  };

  const clearFilters = () => {
    setFilterDate("");
    setStartDate("");
    setEndDate("");
    setSortOrder("desc");
    setIsFilterActive(false);
  };

  const getFilterLabel = () => {
    if (filterDate) {
      return `Date: ${new Date(filterDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    if (startDate && endDate) {
      return `${new Date(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${new Date(endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    return "";
  };

  return (
    <ProtectedRoute>
      <DashboardLayout 
        role={isAdmin ? "admin" : "employee"} 
        userName={user?.name || "User"} 
        userHandle={`@${user?.email?.split("@")[0] || "user"}`}
      >
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Attendance</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isAdmin ? "Manage team attendance" : "Track your work hours"}
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Punch In/Out Card */}
              <div className="rounded-xl glass-card glow-sm p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="text-center md:text-left">
                    <h2 className="text-lg font-semibold text-card-foreground mb-2">Today&apos;s Session</h2>
                    <div className="flex items-center gap-2 mb-4">
                      {getStatusBadge(status?.status || "not_started")}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Punch In</p>
                        <p className="font-semibold text-card-foreground">{formatDateTime(status?.punch_in || null)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Punch Out</p>
                        <p className="font-semibold text-card-foreground">{formatDateTime(status?.punch_out || null)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Timer Display */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Timer className="h-5 w-5 text-primary" />
                      <span className="text-3xl font-mono font-bold text-card-foreground">
                        {formatTime(seconds)}
                      </span>
                    </div>
                    
                    {status?.status === "not_started" && (
                      <button
                        onClick={handlePunchIn}
                        disabled={isPunching}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl glass-button bg-green-600 hover:bg-green-700 text-white font-medium transition-colors disabled:opacity-50"
                      >
                        {isPunching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
                        Punch In
                      </button>
                    )}
                    
                    {status?.status === "working" && (
                      <button
                        onClick={handlePunchOut}
                        disabled={isPunching}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl glass-button bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50"
                      >
                        {isPunching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Square className="h-5 w-5" />}
                        Punch Out
                      </button>
                    )}
                    
                    {status?.status === "completed" && (
                      <div className="px-6 py-3 rounded-xl glass-light text-green-600 font-medium">
                        Today&apos;s Work Hours: {status.total_hours?.toFixed(2)}h
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                  icon={CalendarCheck} 
                  label="Days Present" 
                  value={history.filter(h => h.punch_in).length} 
                  subtitle="This month" 
                />
                <StatCard 
                  icon={Clock} 
                  label="Total Hours" 
                  value={`${Math.abs(history.reduce((acc, h) => acc + (Math.abs(h.total_hours || 0)), 0)).toFixed(1)}h`} 
                  subtitle="This month" 
                />
                <StatCard 
                  icon={UserCheck} 
                  label="Avg Hours/Day" 
                  value={`${Math.abs(history.filter(h => h.total_hours).reduce((acc, h) => acc + (Math.abs(h.total_hours || 0)), 0) / Math.max(history.filter(h => h.total_hours).length, 1)).toFixed(1)}h`} 
                  subtitle="Per day worked" 
                />
              </div>

              {/* History Table */}
              <div ref={tableRef} className="rounded-xl border border-border bg-card card-shadow overflow-hidden relative">
                {/* Filter Loading Overlay */}
                {isFilterLoading && (
                  <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg glass-card">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm text-foreground">Updating...</span>
                    </div>
                  </div>
                )}
                
                <div className="p-4 border-b border-border">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-card-foreground">
                        {isAdmin ? "All Attendance Records" : "Your Attendance History"}
                      </h3>
                      {isAdmin && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {allAttendance.length} record{allAttendance.length !== 1 ? 's' : ''} found
                        </p>
                      )}
                    </div>
                    
                    {/* Filter Controls - Admin Only */}
                    {isAdmin && (
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Quick Filters */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={setTodayFilter}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg glass-light hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            Today
                          </button>
                          <button
                            onClick={setYesterdayFilter}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg glass-light hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            Yesterday
                          </button>
                          <button
                            onClick={setThisWeekFilter}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg glass-light hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            This Week
                          </button>
                          <button
                            onClick={setThisMonthFilter}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg glass-light hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            This Month
                          </button>
                        </div>

                        <div className="h-6 w-px bg-border" />

                        {/* Date Picker */}
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <input
                              type="date"
                              value={filterDate}
                              onChange={(e) => {
                                setFilterDate(e.target.value);
                                setStartDate("");
                                setEndDate("");
                                setIsFilterActive(!!e.target.value);
                              }}
                              className="pl-9 pr-3 py-1.5 text-xs rounded-lg glass-light border border-border/50 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                              placeholder="Select date"
                            />
                          </div>

                          {/* Sort Dropdown */}
                          <button
                            onClick={() => {
                              setSortOrder(prev => prev === "desc" ? "asc" : "desc");
                            }}
                            className="p-1.5 rounded-lg glass-light hover:bg-primary/10 transition-colors"
                            title={sortOrder === "desc" ? "Newest First" : "Oldest First"}
                          >
                            {sortOrder === "desc" ? (
                              <SortDesc className="h-4 w-4 text-primary" />
                            ) : (
                              <SortAsc className="h-4 w-4 text-primary" />
                            )}
                          </button>

                          {/* Clear Filters */}
                          {(filterDate || startDate || endDate) && (
                            <button
                              onClick={clearFilters}
                              className="p-1.5 rounded-lg glass-light hover:bg-red-500/10 hover:text-red-600 transition-colors"
                              title="Clear Filters"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Active Filter Badge */}
                  {isAdmin && isFilterActive && getFilterLabel() && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium">
                        <Filter className="h-3 w-3" />
                        <span>Filtered by: {getFilterLabel()}</span>
                      </div>
                    </div>
                  )}
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground">
                      {isAdmin && <th className="py-3 pl-5 text-left font-semibold">Employee</th>}
                      <th className="py-3 pl-5 text-left font-semibold">Date</th>
                      <th className="py-3 text-left font-semibold">Punch In</th>
                      <th className="py-3 text-left font-semibold">Punch Out</th>
                      <th className="py-3 text-left font-semibold">Total Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(isAdmin ? allAttendance : history).slice(0, 10).map((record, index) => (
                      <tr 
                        key={record.id} 
                        className="hover:bg-secondary/30 transition-colors animate-in fade-in duration-200"
                        style={{ animationDelay: `${index * 20}ms` }}
                      >
                        {isAdmin && (
                          <td className="py-3.5 pl-5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-accent text-xs font-semibold">
                                {record.user_name?.split(" ").map(n => n[0]).join("") || "?"}
                              </div>
                              <span className="font-medium text-card-foreground">{record.user_name || "Unknown"}</span>
                            </div>
                          </td>
                        )}
                        <td className="py-3.5 pl-5 text-card-foreground">{formatDate(record.date)}</td>
                        <td className="py-3.5 text-muted-foreground">{formatDateTime(record.punch_in)}</td>
                        <td className="py-3.5 text-muted-foreground">{formatDateTime(record.punch_out)}</td>
                        <td className="py-3.5 text-card-foreground font-medium">
                          {record.total_hours ? `${Math.abs(record.total_hours).toFixed(2)}h` : "--"}
                        </td>
                      </tr>
                    ))}
                    {(isAdmin ? allAttendance : history).length === 0 && (
                      <tr>
                        <td colSpan={isAdmin ? 5 : 4} className="py-12 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <CalendarCheck className="h-10 w-10 text-muted-foreground/30" />
                            <p className="text-sm font-medium text-muted-foreground">
                              {isAdmin && (filterDate || startDate || endDate) 
                                ? "No attendance records found for selected date"
                                : "No attendance records yet"}
                            </p>
                            {isAdmin && (filterDate || startDate || endDate) && (
                              <button
                                onClick={clearFilters}
                                className="mt-2 text-xs text-primary hover:underline"
                              >
                                Clear filters to see all records
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
