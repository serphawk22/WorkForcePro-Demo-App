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
  high: "#f87171", medium: "#facc15", low: "#4ade80",
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
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 drop-shadow-[0_0_8px_rgba(167,139,250,0.8)]" />
        </div>
      ) : (
        <div className="rounded-2xl glass-card p-6 card-shadow">
          {/* ── Month navigator ── */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-purple-500/10 transition-colors text-purple-400">
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-lg font-bold text-foreground drop-shadow-sm">
              {MONTHS[viewMonth]} {viewYear}
            </h2>
            <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-purple-500/10 transition-colors text-purple-400">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* ── Day headers ── */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-bold py-2 text-purple-400">{d}</div>
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
                  className="min-h-[80px] rounded-xl p-1.5 transition-all hover:scale-[1.01]"
                  style={{
                    background: isToday ? "rgba(167, 139, 250, 0.15)" : isCurrentMonth ? "rgba(255,255,255,0.5)" : "transparent",
                    border: isToday ? "2px solid #a78bfa" : isCurrentMonth ? "1px solid #DFB6B230" : "none",
                    boxShadow: isToday ? "0 0 12px rgba(167, 139, 250, 0.3)" : "none"
                  }}
                >
                  {isCurrentMonth && (
                    <>
                      {/* Day number */}
                      <div className={`text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/50" : "text-purple-400"}`}>
                        {day}
                      </div>
                      {/* Task chips */}
                      <div className="space-y-0.5">
                        {dayTasks.slice(0, 3).map(t => (
                          <div
                            key={t.id}
                            onClick={() => router.push(`/project-management/${t.id}`)}
                            title={t.title}
                            className="rounded px-1.5 py-0.5 text-[9px] font-semibold truncate cursor-pointer hover:scale-105 transition-all flex items-center gap-1 border"
                            style={{ background: PRIORITY_DOT[t.priority] + "20", color: PRIORITY_DOT[t.priority], borderColor: PRIORITY_DOT[t.priority] + "40" }}
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
          <div className="flex items-center gap-4 mt-4 pt-4 flex-wrap border-t border-border/50">
            {Object.entries(PRIORITY_DOT).map(([k, c]) => (
              <div key={k} className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <span className="h-2.5 w-2.5 rounded-full shadow-sm" style={{ background: c, boxShadow: `0 0 6px ${c}60` }} />
                {k.charAt(0).toUpperCase() + k.slice(1)} priority
              </div>
            ))}
          </div>
        </div>
      )}
    </ProjectShell>
  );
}
