"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import ProjectShell from "@/components/project-management/ProjectShell";
import { useAuth } from "@/components/AuthProvider";
import { getAllTasks, getMyTasks, Task } from "@/lib/api";
import { Loader2, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const PRIORITY_COLOR: Record<string, string> = {
  high: "#f87171", medium: "#facc15", low: "#4ade80",
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
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 drop-shadow-[0_0_8px_rgba(167,139,250,0.8)]" />
        </div>
      ) : (
        <div className="rounded-2xl glass-card p-5 card-shadow overflow-x-auto">
          {/* ── Month navigator ── */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setOffset(o => o - 1)} className="p-2 rounded-xl hover:bg-purple-500/10 text-purple-400">
              <ChevronLeft size={18} />
            </button>
            <div className="flex gap-2">
              <span className="text-sm font-bold text-foreground drop-shadow-sm">
                {MONTHS[months[0].month]} {months[0].year} — {MONTHS[months[VISIBLE-1].month]} {months[VISIBLE-1].year}
              </span>
              {offset !== 0 && (
                <button onClick={() => setOffset(0)} className="text-xs px-2.5 py-1 rounded-lg font-semibold bg-gradient-to-r from-purple-500/15 to-pink-500/15 border border-purple-500/30 text-purple-400 hover:scale-105 transition-all">
                  Today
                </button>
              )}
            </div>
            <button onClick={() => setOffset(o => o + 1)} className="p-2 rounded-xl hover:bg-purple-500/10 text-purple-400">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* ── Gantt area ── */}
          <div className="min-w-[600px]">
            {/* Month labels + grid background */}
            <div className="flex mb-3 border-b border-border/50">
              {/* Row label column */}
              <div className="w-52 shrink-0" />
              {/* Month columns */}
              <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${VISIBLE}, 1fr)` }}>
                {months.map(({ year, month }) => (
                  <div key={`${year}-${month}`} className="text-center text-xs font-bold pb-2 text-purple-400">
                    {MONTHS[month]} {year}
                  </div>
                ))}
              </div>
            </div>

            {visibleTasks.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
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
                          className="text-xs font-semibold truncate cursor-pointer hover:underline text-foreground"
                          onClick={() => router.push(`/project-management/${task.id}`)}
                        >
                          {task.title}
                        </span>
                        <span className="text-[10px] mt-0.5 text-muted-foreground">
                          {STATUS_LABEL[task.status] ?? task.status}
                        </span>
                      </div>

                      {/* Bar track */}
                      <div className="flex-1 relative h-8 rounded-lg bg-muted/20">
                        {/* Today line */}
                        {todayInView && (
                          <div className="absolute top-0 bottom-0 w-0.5 z-10 bg-red-400 shadow-lg" style={{ left: `${todayLeft.toFixed(2)}%`, boxShadow: "0 0 8px rgba(248, 113, 113, 0.6)" }} />
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
                          className="absolute top-1 bottom-1 rounded-md flex items-center px-2 cursor-pointer hover:scale-105 hover:shadow-lg transition-all overflow-hidden border"
                          style={{ left: bp.left, width: bp.width, background: pColor, minWidth: 4, borderColor: pColor, boxShadow: `0 2px 8px ${pColor}40` }}
                          onClick={() => router.push(`/project-management/${task.id}`)}
                          title={`${task.title} (${task.priority})`}
                        >
                          <span className="text-[9px] font-bold text-white drop-shadow-sm truncate">{task.title}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Legend ── */}
          <div className="flex items-center gap-5 mt-5 pt-4 flex-wrap border-t border-border/50">
            {Object.entries(PRIORITY_COLOR).map(([k, c]) => (
              <div key={k} className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <span className="h-3 w-6 rounded shadow-sm" style={{ background: c, boxShadow: `0 0 6px ${c}40` }} />
                {k.charAt(0).toUpperCase() + k.slice(1)}
              </div>
            ))}
            {todayInView && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
                <span className="h-3 w-0.5 inline-block bg-red-400 shadow-sm" style={{ boxShadow: "0 0 6px rgba(248, 113, 113, 0.6)" }} />
                Today
              </div>
            )}
          </div>
        </div>
      )}
    </ProjectShell>
  );
}
