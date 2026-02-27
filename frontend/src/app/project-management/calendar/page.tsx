"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ProjectShell from "@/components/project-management/ProjectShell";
import { useAuth } from "@/components/AuthProvider";
import { getAllTasks, getMyTasks, Task } from "@/lib/api";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const PRIORITY_DOT: Record<string, string> = {
  high: "#991b1b", medium: "#854F6C", low: "#166534",
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === "admin";

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    const r = isAdmin ? await getAllTasks() : await getMyTasks();
    if (r.data) setTasks(r.data);
    setIsLoading(false);
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const daysCount = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const getTasksForDay = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    return tasks.filter(t => t.due_date?.startsWith(dateStr) || t.start_date?.startsWith(dateStr));
  };

  const totalCells = Math.ceil((firstDay + daysCount) / 7) * 7;

  return (
    <ProjectShell>
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#522B5B" }} />
        </div>
      ) : (
        <div className="rounded-2xl glass-card p-6 card-shadow">
          {/* ── Month navigator ── */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-secondary/40 transition-colors" style={{ color: "#522B5B" }}>
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-lg font-bold" style={{ color: "#2B124C" }}>
              {MONTHS[viewMonth]} {viewYear}
            </h2>
            <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-secondary/40 transition-colors" style={{ color: "#522B5B" }}>
              <ChevronRight size={18} />
            </button>
          </div>

          {/* ── Day headers ── */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-bold py-2" style={{ color: "#854F6C" }}>{d}</div>
            ))}
          </div>

          {/* ── Calendar grid ── */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: totalCells }).map((_, idx) => {
              const day = idx - firstDay + 1;
              const isCurrentMonth = day >= 1 && day <= daysCount;
              const isToday = isCurrentMonth && day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear();
              const dayTasks = isCurrentMonth ? getTasksForDay(day) : [];

              return (
                <div
                  key={idx}
                  className="min-h-[80px] rounded-xl p-1.5 transition-colors"
                  style={{
                    background: isToday ? "#522B5B12" : isCurrentMonth ? "rgba(255,255,255,0.5)" : "transparent",
                    border: isToday ? "1.5px solid #522B5B60" : isCurrentMonth ? "1px solid #DFB6B230" : "none",
                  }}
                >
                  {isCurrentMonth && (
                    <>
                      {/* Day number */}
                      <div className={`text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "text-white" : ""}`}
                        style={isToday ? { background: "#522B5B", color: "white" } : { color: "#522B5B" }}>
                        {day}
                      </div>
                      {/* Task chips */}
                      <div className="space-y-0.5">
                        {dayTasks.slice(0, 3).map(t => (
                          <div
                            key={t.id}
                            onClick={() => router.push(`/project-management/${t.id}`)}
                            title={t.title}
                            className="rounded px-1.5 py-0.5 text-[9px] font-semibold truncate cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1"
                            style={{ background: PRIORITY_DOT[t.priority] + "18", color: PRIORITY_DOT[t.priority] }}
                          >
                            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: PRIORITY_DOT[t.priority] }} />
                            {t.title}
                          </div>
                        ))}
                        {dayTasks.length > 3 && (
                          <div className="text-[9px] font-semibold pl-1" style={{ color: "#854F6C" }}>
                            +{dayTasks.length - 3} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Legend ── */}
          <div className="flex items-center gap-4 mt-4 pt-4 flex-wrap" style={{ borderTop: "1px solid #DFB6B250" }}>
            {Object.entries(PRIORITY_DOT).map(([k, c]) => (
              <div key={k} className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#854F6C" }}>
                <span className="h-2 w-2 rounded-full" style={{ background: c }} />
                {k.charAt(0).toUpperCase() + k.slice(1)} priority
              </div>
            ))}
          </div>
        </div>
      )}
    </ProjectShell>
  );
}
