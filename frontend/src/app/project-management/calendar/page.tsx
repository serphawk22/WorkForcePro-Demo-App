"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import ProjectShell from "@/components/project-management/ProjectShell";
import { useAuth } from "@/components/AuthProvider";
import { getAllTasks, getMyTasks, Task } from "@/lib/api";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const PRIORITY_DOT: Record<string, string> = {
  high: "#ef4444", medium: "#f59e0b", low: "#22c55e",
};

const PRIORITY_CHIP_LIGHT: Record<string, { bg: string; border: string; text: string }> = {
  high:   { bg: "#fee2e2", border: "#fca5a5", text: "#b91c1c" },
  medium: { bg: "#fef3c7", border: "#fcd34d", text: "#92400e" },
  low:    { bg: "#dcfce7", border: "#86efac", text: "#166534" },
};

const PRIORITY_CHIP_DARK: Record<string, { bg: string; border: string; text: string }> = {
  high:   { bg: "rgba(239,68,68,0.15)",  border: "rgba(239,68,68,0.35)",  text: "#fca5a5" },
  medium: { bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.35)", text: "#fcd34d" },
  low:    { bg: "rgba(34,197,94,0.15)",  border: "rgba(34,197,94,0.35)",  text: "#86efac" },
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
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const PRIORITY_CHIP = isDark ? PRIORITY_CHIP_DARK : PRIORITY_CHIP_LIGHT;
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
    return tasks.filter(t => t.due_date?.startsWith(dateStr));
  };

  const totalCells = Math.ceil((firstDay + daysCount) / 7) * 7;

  return (
    <ProjectShell>
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          {/* ── Month navigator ── */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-primary/10 transition-colors text-muted-foreground hover:text-primary">
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-xl font-bold text-foreground tracking-tight">
              {MONTHS[viewMonth]} {viewYear}
            </h2>
            <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-primary/10 transition-colors text-muted-foreground hover:text-primary">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* ── Day headers ── */}
          <div className="grid grid-cols-7 mb-2 border-b border-border pb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold py-1 text-primary/70 uppercase tracking-widest">{d}</div>
            ))}
          </div>

          {/* ── Calendar grid ── */}
          <div className="grid grid-cols-7 gap-1.5 mt-2">
            {Array.from({ length: totalCells }).map((_, idx) => {
              const day = idx - firstDay + 1;
              const isCurrentMonth = day >= 1 && day <= daysCount;
              const isToday = isCurrentMonth && day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear();
              const dayTasks = isCurrentMonth ? getTasksForDay(day) : [];

              return (
                <div
                  key={idx}
                  className={`min-h-[86px] rounded-xl p-2 transition-all ${
                    isToday
                      ? "bg-primary/10 border-2 border-primary shadow-sm"
                      : isCurrentMonth
                      ? "bg-background border border-border hover:border-primary/40 hover:shadow-sm"
                      : "bg-muted/20 rounded-xl"
                  }`}
                >
                  {isCurrentMonth && (
                    <>
                      {/* Day number */}
                      <div className={`text-xs font-bold mb-1.5 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/70"}`}>
                        {day}
                      </div>
                      {/* Task chips */}
                      <div className="space-y-0.5">
                        {dayTasks.slice(0, 3).map(t => (
                          <div
                            key={t.id}
                            onClick={() => router.push(`/project-management/${t.id}`)}
                            title={t.title}
                            className="rounded-md px-1.5 py-0.5 text-[9px] font-semibold truncate cursor-pointer hover:brightness-95 transition-all flex items-center gap-1 border dark:border-opacity-30"
                            style={{
                              background: PRIORITY_CHIP[t.priority]?.bg ?? PRIORITY_DOT[t.priority] + "18",
                              color: PRIORITY_CHIP[t.priority]?.text ?? PRIORITY_DOT[t.priority],
                              borderColor: PRIORITY_CHIP[t.priority]?.border ?? PRIORITY_DOT[t.priority] + "35",
                            }}
                          >
                            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: PRIORITY_DOT[t.priority] }} />
                            {t.title}
                          </div>
                        ))}
                        {dayTasks.length > 3 && (
                          <div className="text-[9px] font-semibold pl-1 text-muted-foreground">
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
          <div className="flex items-center gap-6 mt-5 pt-4 flex-wrap border-t border-border">
            {Object.entries(PRIORITY_DOT).map(([k, c]) => (
              <div key={k} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
                {k.charAt(0).toUpperCase() + k.slice(1)} priority
              </div>
            ))}
          </div>
        </div>
      )}
    </ProjectShell>
  );
}
