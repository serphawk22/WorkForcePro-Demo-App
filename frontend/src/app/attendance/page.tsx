"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import NextImage from "next/image";
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
  getMyAttendance,
  getAllAttendance,
  AttendanceStatus,
  AttendanceRecord,
  getApiBaseUrl,
} from "@/lib/api";
import { toast } from "sonner";
import { useAttendanceTimer, formatTimerDisplay } from "@/components/AttendanceTimerProvider";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatTime(seconds: number): string {
  return formatTimerDisplay(seconds);
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

function formatTotalHoursMinutes(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.round(Math.abs(totalMinutes)));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${hours}hr${minutes}min`;
}

function getProfilePictureUrl(profilePicture?: string): string | null {
  if (!profilePicture) return null;
  if (profilePicture.startsWith("data:")) return profilePicture;
  if (profilePicture.startsWith("http")) return profilePicture;
  return `${getApiBaseUrl()}${profilePicture}`;
}

export default function AttendancePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Global persistent timer from context
  const { seconds, isActive, isPunching, handlePunchIn: ctxPunchIn, handlePunchOut: ctxPunchOut } = useAttendanceTimer();
  
  const tableRef = useRef<HTMLDivElement | null>(null);
  
  // Filter state
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isFilterActive, setIsFilterActive] = useState(false);
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [graphScope, setGraphScope] = useState<"all" | "individual">("all");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");

  // Load initial data (status, history) — timer handled by global context
  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [statusResult, historyResult] = await Promise.all([
      getAttendanceStatus(),
      getMyAttendance(30)
    ]);
    
    if (statusResult.data) {
      setStatus(statusResult.data);
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
    
    if (startDate) {
      filters.startDate = startDate;
    }
    if (endDate) {
      filters.endDate = endDate;
    }
    
    const allResult = await getAllAttendance(filters);
    if (allResult.data) {
      setAllAttendance(allResult.data);
    }
    
    setIsFilterLoading(false);
  }, [isAdmin, startDate, endDate, sortOrder]);

  // Initial load on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reload page data whenever the timer active state changes (punch-in/out happened)
  const prevIsActiveRef = useRef(isActive);
  useEffect(() => {
    if (prevIsActiveRef.current !== isActive) {
      prevIsActiveRef.current = isActive;
      loadData();
    }
  }, [isActive, loadData]);

  // Load filtered attendance when filters change (admin only)
  useEffect(() => {
    if (isAdmin) {
      loadFilteredAttendance();
    }
  }, [isAdmin, loadFilteredAttendance]);

  // Punch in/out — delegate to global context, then reload this page's status + history
  const handlePunchIn = async () => {
    await ctxPunchIn();
    await loadData();
  };

  const handlePunchOut = async () => {
    await ctxPunchOut();
    await loadData();
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
    setStartDate(today);
    setEndDate(today);
    setIsFilterActive(true);
  };

  const setYesterdayFilter = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const day = yesterday.toISOString().split('T')[0];
    setStartDate(day);
    setEndDate(day);
    setIsFilterActive(true);
  };

  const setThisWeekFilter = () => {
    const today = new Date();
    const firstDay = new Date(today);
    firstDay.setDate(today.getDate() - today.getDay());
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
    setIsFilterActive(true);
  };

  const setThisMonthFilter = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
    setIsFilterActive(true);
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSortOrder("desc");
    setIsFilterActive(false);
  };

  const getFilterLabel = () => {
    if (startDate && endDate) {
      return `${new Date(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${new Date(endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    if (startDate) {
      return `From ${new Date(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    if (endDate) {
      return `Until ${new Date(endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    return "";
  };

  const employeeOptions = useMemo(() => {
    const map = new Map<number, { id: number; name: string }>();
    allAttendance.forEach((record) => {
      if (!record.user_id) return;
      if (!map.has(record.user_id)) {
        map.set(record.user_id, {
          id: record.user_id,
          name: record.user_name || `Employee ${record.user_id}`,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allAttendance]);

  useEffect(() => {
    if (!isAdmin) return;
    if (graphScope !== "individual") return;
    if (selectedEmployeeId) return;
    if (employeeOptions.length > 0) {
      setSelectedEmployeeId(String(employeeOptions[0].id));
    }
  }, [isAdmin, graphScope, selectedEmployeeId, employeeOptions]);

  const chartData = useMemo(() => {
    const sourceRecords = isAdmin ? allAttendance : history;
    const scopedRecords = isAdmin && graphScope === "individual" && selectedEmployeeId
      ? sourceRecords.filter((r) => String(r.user_id) === selectedEmployeeId)
      : sourceRecords;

    const byDate = new Map<string, { present: number; absent: number; hours: number }>();

    scopedRecords.forEach((record) => {
      const dateKey = record.date;
      const current = byDate.get(dateKey) || { present: 0, absent: 0, hours: 0 };
      if (record.punch_in) {
        current.present += 1;
      } else {
        current.absent += 1;
      }
      current.hours += Math.abs(record.total_hours || 0) / 60;
      byDate.set(dateKey, current);
    });

    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({
        date,
        label: new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        }),
        present: values.present,
        absent: values.absent,
        hours: Number(values.hours.toFixed(2)),
      }));
  }, [isAdmin, graphScope, selectedEmployeeId, allAttendance, history]);

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
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Timer className="h-5 w-5 text-primary" />
                      <span className="text-3xl font-mono font-bold text-card-foreground">
                        {formatTime(seconds)}
                      </span>
                    </div>

                    {/* Button visibility driven by isActive context (instant) not status (needs network) */}
                    {!isActive && status?.status !== "completed" && (
                      <button
                        onClick={handlePunchIn}
                        disabled={isPunching}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl glass-button bg-green-600 hover:bg-green-700 text-white font-medium transition-colors disabled:opacity-50"
                      >
                        {isPunching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
                        Punch In
                      </button>
                    )}
                    
                    {isActive && (
                      <button
                        onClick={handlePunchOut}
                        disabled={isPunching}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl glass-button bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50"
                      >
                        {isPunching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Square className="h-5 w-5" />}
                        Punch Out
                      </button>
                    )}
                    
                    {!isActive && status?.status === "completed" && (
                      <div className="px-6 py-3 rounded-xl glass-light text-green-600 font-medium">
                        Today&apos;s Work Hours: {status.total_hours ? (status.total_hours / 60).toFixed(2) : "0.00"}h
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
                  value={`${(Math.abs(history.reduce((acc, h) => acc + (Math.abs(h.total_hours || 0)), 0)) / 60).toFixed(1)}h`} 
                  subtitle="This month" 
                />
                <StatCard 
                  icon={UserCheck} 
                  label="Avg Hours/Day" 
                  value={`${(Math.abs(history.filter(h => h.total_hours).reduce((acc, h) => acc + (Math.abs(h.total_hours || 0)), 0)) / 60 / Math.max(history.filter(h => h.total_hours).length, 1)).toFixed(1)}h`} 
                  subtitle="Per day worked" 
                />
              </div>

              {/* Attendance Analytics */}
              <div className="rounded-xl border border-border bg-card card-shadow overflow-hidden">
                <div className="p-4 border-b border-border">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-card-foreground">Attendance Analytics</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Present, absent, and total hours by day
                      </p>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setGraphScope("all")}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                            graphScope === "all"
                              ? "bg-primary text-white"
                              : "glass-light text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          All Employees
                        </button>
                        <button
                          onClick={() => setGraphScope("individual")}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                            graphScope === "individual"
                              ? "bg-primary text-white"
                              : "glass-light text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Individual
                        </button>
                        {graphScope === "individual" && (
                          <select
                            value={selectedEmployeeId}
                            onChange={(e) => setSelectedEmployeeId(e.target.value)}
                            className="px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground"
                          >
                            {employeeOptions.map((employee) => (
                              <option key={employee.id} value={employee.id}>
                                {employee.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4">
                  {chartData.length > 0 ? (
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                          <YAxis yAxisId="attendance" tick={{ fontSize: 12 }} allowDecimals={false} />
                          <YAxis yAxisId="hours" orientation="right" tick={{ fontSize: 12 }} />
                          <Tooltip
                            formatter={(value: number, name: string) => {
                              if (name === "hours") return [`${value}h`, "Hours"];
                              if (name === "present") return [value, "Present"];
                              if (name === "absent") return [value, "Absent"];
                              return [value, name];
                            }}
                            labelFormatter={(label: string, payload: any[]) => {
                              const row = payload?.[0]?.payload;
                              return row?.date ? formatDate(row.date) : label;
                            }}
                          />
                          <Legend />
                          <Bar yAxisId="attendance" dataKey="present" fill="#16a34a" radius={[4, 4, 0, 0]} name="present" />
                          <Bar yAxisId="attendance" dataKey="absent" fill="#f59e0b" radius={[4, 4, 0, 0]} name="absent" />
                          <Line yAxisId="hours" type="monotone" dataKey="hours" stroke="#2563eb" strokeWidth={2} dot={{ r: 2 }} name="hours" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">
                      No attendance data available for graph
                    </div>
                  )}
                </div>
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
                            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-white hover:bg-primary-glow transition-all active:scale-95 shadow-sm"
                          >
                            Today
                          </button>
                          <button
                            onClick={setYesterdayFilter}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-white hover:bg-primary-glow transition-all active:scale-95 shadow-sm"
                          >
                            Yesterday
                          </button>
                          <button
                            onClick={setThisWeekFilter}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-white hover:bg-primary-glow transition-all active:scale-95 shadow-sm"
                          >
                            This Week
                          </button>
                          <button
                            onClick={setThisMonthFilter}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-white hover:bg-primary-glow transition-all active:scale-95 shadow-sm"
                          >
                            This Month
                          </button>
                        </div>

                        <div className="h-6 w-px bg-border" />

                        {/* Date Range */}
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <input
                              type="date"
                              value={startDate}
                              onChange={(e) => {
                                setStartDate(e.target.value);
                                setIsFilterActive(!!e.target.value || !!endDate);
                              }}
                              className="pl-9 pr-3 py-1.5 text-xs rounded-lg glass-light border border-border/50 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                              placeholder="Start date"
                            />
                          </div>

                          <div className="relative">
                            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <input
                              type="date"
                              value={endDate}
                              onChange={(e) => {
                                setEndDate(e.target.value);
                                setIsFilterActive(!!startDate || !!e.target.value);
                              }}
                              className="pl-9 pr-3 py-1.5 text-xs rounded-lg glass-light border border-border/50 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                              placeholder="End date"
                            />
                          </div>

                          {/* Sort Dropdown */}
                          <button
                            onClick={() => {
                              setSortOrder(prev => prev === "desc" ? "asc" : "desc");
                            }}
                            className="p-1.5 rounded-lg bg-primary text-white hover:bg-primary-glow transition-all active:scale-95 shadow-sm"
                            title={sortOrder === "desc" ? "Newest First" : "Oldest First"}
                          >
                            {sortOrder === "desc" ? (
                              <SortDesc className="h-4 w-4" />
                            ) : (
                              <SortAsc className="h-4 w-4" />
                            )}
                          </button>

                          {/* Clear Filters */}
                          {(startDate || endDate) && (
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
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-accent text-xs font-semibold overflow-hidden">
                                {getProfilePictureUrl(record.user_profile_picture) ? (
                                  <NextImage
                                    src={getProfilePictureUrl(record.user_profile_picture)!}
                                    alt={record.user_name ? `${record.user_name} profile picture` : "Employee profile picture"}
                                    width={32}
                                    height={32}
                                    className="h-full w-full object-cover"
                                    unoptimized
                                  />
                                ) : (
                                  record.user_name?.split(" ").map(n => n[0]).join("") || "?"
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-card-foreground truncate">{record.user_name || "Unknown"}</p>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {record.user_email || "No email"}
                                  {record.user_role ? ` • ${record.user_role}` : ""}
                                </p>
                              </div>
                            </div>
                          </td>
                        )}
                        <td className="py-3.5 pl-5 text-card-foreground">{formatDate(record.date)}</td>
                        <td className="py-3.5 text-muted-foreground">{formatDateTime(record.punch_in)}</td>
                        <td className="py-3.5 text-muted-foreground">{formatDateTime(record.punch_out)}</td>
                        <td className="py-3.5 text-card-foreground font-medium">
                          {record.total_hours !== null && record.total_hours !== undefined
                            ? formatTotalHoursMinutes(record.total_hours)
                            : "--"}
                        </td>
                      </tr>
                    ))}
                    {(isAdmin ? allAttendance : history).length === 0 && (
                      <tr>
                        <td colSpan={isAdmin ? 5 : 4} className="py-12 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <CalendarCheck className="h-10 w-10 text-muted-foreground/30" />
                            <p className="text-sm font-medium text-muted-foreground">
                              {isAdmin && (startDate || endDate) 
                                ? "No attendance records found for selected date"
                                : "No attendance records yet"}
                            </p>
                            {isAdmin && (startDate || endDate) && (
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
