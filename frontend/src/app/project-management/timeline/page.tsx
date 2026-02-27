"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import ProjectShell from "@/components/project-management/ProjectShell";
import { useAuth } from "@/components/AuthProvider";
import { getAllTasks, getMyTasks, Task } from "@/lib/api";
import { Loader2, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const PRIORITY_COLOR: Record<string, string> = {
  high: "#991b1b", medium: "#854F6C", low: "#166534",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "To Do", in_progress: "In Progress", under_review: "Reviewing",
  submitted: "Submitted", approved: "Done",
};

function parseDate(s?: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function clamp(val: number, min: number, max: number) { return Math.max(min, Math.min(max, val)); }

export default function TimelinePage() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === "admin";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [offset, setOffset] = useState(0); // months offset
  const VISIBLE = 3; // months visible at once

  const load = useCallback(async () => {
    setIsLoading(true);
    const r = isAdmin ? await getAllTasks() : await getMyTasks();
    if (r.data) setTasks(r.data);
    setIsLoading(false);
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  const today = useMemo(() => new Date(), []);

  // determine the base months to show
  const months = useMemo(() => {
    return Array.from({ length: VISIBLE }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() + offset + i, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }, [today, offset]);

  const viewStart = useMemo(() => new Date(months[0].year, months[0].month, 1), [months]);
  const viewEnd = useMemo(() => new Date(months[VISIBLE - 1].year, months[VISIBLE - 1].month + 1, 0, 23, 59, 59), [months]);
  const totalMs = viewEnd.getTime() - viewStart.getTime() || 1;

  // tasks that overlap with the view window
  const visibleTasks = useMemo(() => tasks.filter(t => {
    const start = parseDate(t.start_date) ?? parseDate(t.due_date);
    const end = parseDate(t.due_date) ?? start;
    if (!start || !end) return false;
    return end >= viewStart && start <= viewEnd;
  }), [tasks, viewStart, viewEnd]);

  function barProps(task: Task) {
    const rawStart = parseDate(task.start_date) ?? parseDate(task.due_date)!;
    const rawEnd = parseDate(task.due_date) ?? rawStart;
    const clampedStart = rawStart < viewStart ? viewStart : rawStart;
    const clampedEnd = rawEnd > viewEnd ? viewEnd : rawEnd;
    const left = clamp((clampedStart.getTime() - viewStart.getTime()) / totalMs * 100, 0, 100);
    const width = clamp((clampedEnd.getTime() - clampedStart.getTime()) / totalMs * 100, 0.5, 100 - left);
    return { left: `${left.toFixed(2)}%`, width: `${width.toFixed(2)}%` };
  }

  // today line
  const todayLeft = clamp((today.getTime() - viewStart.getTime()) / totalMs * 100, 0, 100);
  const todayInView = today >= viewStart && today <= viewEnd;

  return (
    <ProjectShell>
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#522B5B" }} />
        </div>
      ) : (
        <div className="rounded-2xl glass-card p-5 card-shadow overflow-x-auto">
          {/* ── Month navigator ── */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setOffset(o => o - 1)} className="p-2 rounded-xl hover:bg-secondary/40" style={{ color: "#522B5B" }}>
              <ChevronLeft size={18} />
            </button>
            <div className="flex gap-2">
              <span className="text-sm font-bold" style={{ color: "#2B124C" }}>
                {MONTHS[months[0].month]} {months[0].year} — {MONTHS[months[VISIBLE-1].month]} {months[VISIBLE-1].year}
              </span>
              {offset !== 0 && (
                <button onClick={() => setOffset(0)} className="text-xs px-2 py-1 rounded-lg" style={{ color: "#854F6C", background: "#854F6C18" }}>
                  Today
                </button>
              )}
            </div>
            <button onClick={() => setOffset(o => o + 1)} className="p-2 rounded-xl hover:bg-secondary/40" style={{ color: "#522B5B" }}>
              <ChevronRight size={18} />
            </button>
          </div>

          {/* ── Gantt area ── */}
          <div className="min-w-[600px]">
            {/* Month labels + grid background */}
            <div className="flex mb-3 border-b" style={{ borderColor: "#DFB6B250" }}>
              {/* Row label column */}
              <div className="w-52 shrink-0" />
              {/* Month columns */}
              <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${VISIBLE}, 1fr)` }}>
                {months.map(({ year, month }) => (
                  <div key={`${year}-${month}`} className="text-center text-xs font-bold pb-2" style={{ color: "#854F6C" }}>
                    {MONTHS[month]} {year}
                  </div>
                ))}
              </div>
            </div>

            {visibleTasks.length === 0 ? (
              <div className="text-center py-12 text-sm" style={{ color: "#854F6C" }}>
                No tasks with due dates in this period.
              </div>
            ) : (
              <div className="space-y-2">
                {visibleTasks.map(task => {
                  const bp = barProps(task);
                  const pColor = PRIORITY_COLOR[task.priority] ?? "#854F6C";
                  return (
                    <div key={task.id} className="flex items-center">
                      {/* Label */}
                      <div className="w-52 shrink-0 pr-3 flex flex-col min-w-0">
                        <span
                          className="text-xs font-semibold truncate cursor-pointer hover:underline"
                          style={{ color: "#190019" }}
                          onClick={() => router.push(`/project-management/${task.id}`)}
                        >
                          {task.title}
                        </span>
                        <span className="text-[10px] mt-0.5" style={{ color: "#854F6C" }}>
                          {STATUS_LABEL[task.status] ?? task.status}
                        </span>
                      </div>

                      {/* Bar track */}
                      <div className="flex-1 relative h-8 rounded-lg" style={{ background: "#DFB6B220" }}>
                        {/* Today line */}
                        {todayInView && (
                          <div className="absolute top-0 bottom-0 w-px z-10 opacity-70" style={{ left: `${todayLeft.toFixed(2)}%`, background: "#991b1b" }} />
                        )}
                        {/* Month dividers */}
                        {months.slice(1).map(({ year, month }, i) => {
                          const dividerDate = new Date(year, month, 1);
                          const dividerLeft = clamp((dividerDate.getTime() - viewStart.getTime()) / totalMs * 100, 0, 100);
                          return (
                            <div key={i} className="absolute top-0 bottom-0 w-px opacity-30" style={{ left: `${dividerLeft.toFixed(2)}%`, background: "#DFB6B2" }} />
                          );
                        })}
                        {/* Task bar */}
                        <div
                          className="absolute top-1 bottom-1 rounded-md flex items-center px-2 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden"
                          style={{ left: bp.left, width: bp.width, background: pColor + "CC", minWidth: 4 }}
                          onClick={() => router.push(`/project-management/${task.id}`)}
                          title={`${task.title} (${task.priority})`}
                        >
                          <span className="text-[9px] font-bold text-white truncate">{task.title}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Legend ── */}
          <div className="flex items-center gap-5 mt-5 pt-4 flex-wrap" style={{ borderTop: "1px solid #DFB6B250" }}>
            {Object.entries(PRIORITY_COLOR).map(([k, c]) => (
              <div key={k} className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#854F6C" }}>
                <span className="h-3 w-6 rounded" style={{ background: c + "CC" }} />
                {k.charAt(0).toUpperCase() + k.slice(1)}
              </div>
            ))}
            {todayInView && (
              <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#991b1b" }}>
                <span className="h-3 w-px inline-block" style={{ background: "#991b1b" }} />
                Today
              </div>
            )}
          </div>
        </div>
      )}
    </ProjectShell>
  );
}
