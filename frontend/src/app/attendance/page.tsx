"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { CalendarCheck, Clock, UserCheck, Play, Square, Loader2, Timer } from "lucide-react";
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

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
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
  // Display time in IST (Kolkata timezone)
  return date.toLocaleTimeString("en-IN", { 
    timeZone: "Asia/Kolkata",
    hour: "2-digit", 
    minute: "2-digit",
    second: "2-digit"
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
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [statusResult, historyResult] = await Promise.all([
      getAttendanceStatus(),
      getMyAttendance(30)
    ]);
    
    if (statusResult.data) {
      setStatus(statusResult.data);
      
      // Initialize timer using server-provided elapsed_seconds (handles timezone correctly)
      if (statusResult.data.status === "working") {
        // Use server-calculated elapsed time to avoid timezone issues
        setSeconds(statusResult.data.elapsed_seconds || 0);
        setIsActive(true);
      } else if (statusResult.data.status === "completed") {
        // Show total elapsed time for completed session
        setSeconds(statusResult.data.elapsed_seconds || 0);
        setIsActive(false);
      } else {
        setSeconds(0);
        setIsActive(false);
      }
    }
    if (historyResult.data) {
      setHistory(historyResult.data);
    }
    
    if (isAdmin) {
      const allResult = await getAllAttendance();
      if (allResult.data) {
        setAllAttendance(allResult.data);
      }
    }
    
    setIsLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
                  value={`${history.reduce((acc, h) => acc + (h.total_hours || 0), 0).toFixed(1)}h`} 
                  subtitle="This month" 
                />
                <StatCard 
                  icon={UserCheck} 
                  label="Avg Hours/Day" 
                  value={`${(history.filter(h => h.total_hours).reduce((acc, h) => acc + (h.total_hours || 0), 0) / Math.max(history.filter(h => h.total_hours).length, 1)).toFixed(1)}h`} 
                  subtitle="Per day worked" 
                />
              </div>

              {/* History Table */}
              <div className="rounded-xl border border-border bg-card card-shadow overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold text-card-foreground">
                    {isAdmin ? "All Attendance Records" : "Your Attendance History"}
                  </h3>
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
                    {(isAdmin ? allAttendance : history).slice(0, 10).map((record) => (
                      <tr key={record.id} className="hover:bg-secondary/30 transition-colors">
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
                          {record.total_hours ? `${record.total_hours.toFixed(2)}h` : "--"}
                        </td>
                      </tr>
                    ))}
                    {(isAdmin ? allAttendance : history).length === 0 && (
                      <tr>
                        <td colSpan={isAdmin ? 5 : 4} className="py-8 text-center text-muted-foreground">
                          No attendance records yet
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
