"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ProjectShell from "@/components/project-management/ProjectShell";
import { useAuth } from "@/components/AuthProvider";
import { getAllTasks, getMyTasks, getTaskStats, Task, TaskStats } from "@/lib/api";
import { Loader2, CheckCircle2, Clock, AlertCircle, Circle, ListTodo, TrendingUp, Copy } from "lucide-react";
import { toast } from "sonner";

const statusMeta: Record<string, { label: string; color: string; bg: string }> = {
  todo:        { label: "To Do",       color: "#854F6C", bg: "#854F6C1A" },
  in_progress: { label: "In Progress", color: "#2B124C", bg: "#2B124C1A" },
  submitted:   { label: "Submitted",   color: "#522B5B", bg: "#522B5B1A" },
  reviewing:   { label: "Reviewing",   color: "#854F6C", bg: "#854F6C15" },
  approved:    { label: "Approved",    color: "#166534", bg: "#16653415" },
  rejected:    { label: "Rejected",    color: "#991b1b", bg: "#991b1b15" },
};

export default function SummaryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === "admin";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    const [taskRes, statsRes] = await Promise.all([
      isAdmin ? getAllTasks() : getMyTasks(),
      getTaskStats(),
    ]);
    if (taskRes.data) setTasks(taskRes.data);
    if (statsRes.data) setStats(statsRes.data);
    setIsLoading(false);
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  const total = tasks.length;
  const active = tasks.filter(t => ["todo", "in_progress", "reviewing"].includes(t.status)).length;
  const completed = tasks.filter(t => t.status === "approved").length;
  const today = new Date();
  const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < today && !["approved"].includes(t.status)).length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const recentTasks = [...tasks]
    .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))
    .slice(0, 8);

  const statusBreakdown = [
    { key: "todo",        count: stats?.todo ?? 0 },
    { key: "in_progress", count: stats?.in_progress ?? 0 },
    { key: "reviewing",   count: stats?.reviewing ?? 0 },
    { key: "approved",    count: stats?.approved ?? 0 },
    { key: "rejected",    count: stats?.rejected ?? 0 },
  ].filter(s => s.count > 0);

  const topCards = [
    { label: "Total Projects", value: total, icon: ListTodo, accent: "#2B124C" },
    { label: "Active",         value: active, icon: Clock,     accent: "#522B5B" },
    { label: "Completed",      value: completed, icon: CheckCircle2, accent: "#166534" },
    { label: "Overdue",        value: overdue, icon: AlertCircle, accent: "#991b1b" },
  ];

  return (
    <ProjectShell>
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#522B5B" }} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {topCards.map(card => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded-2xl p-5 glass-card card-shadow flex items-center gap-4">
                  <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: card.accent + "18", border: `1.5px solid ${card.accent}28` }}>
                    <Icon size={20} style={{ color: card.accent }} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: card.accent }}>{card.value}</div>
                    <div className="text-xs font-medium mt-0.5" style={{ color: "#854F6C" }}>{card.label}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status distribution */}
            <div className="rounded-2xl glass-card p-6 card-shadow">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-base" style={{ color: "#2B124C" }}>Status Distribution</h3>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "#522B5B18", color: "#522B5B" }}>
                  {total} total
                </span>
              </div>

              {/* Donut-style breakdown bars */}
              <div className="space-y-3">
                {statusBreakdown.map(s => {
                  const meta = statusMeta[s.key];
                  const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                  return (
                    <div key={s.key}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium" style={{ color: "#522B5B" }}>{meta.label}</span>
                        <span className="font-bold" style={{ color: meta.color }}>{s.count} ({pct}%)</span>
                      </div>
                      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "#DFB6B230" }}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: meta.color }} />
                      </div>
                    </div>
                  );
                })}
                {statusBreakdown.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No project data yet</p>
                )}
              </div>

              {/* Overall progress bar */}
              <div className="mt-5 pt-4" style={{ borderTop: "1px solid #DFB6B2" }}>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-medium" style={{ color: "#522B5B" }}>Overall Completion</span>
                  <span className="font-bold" style={{ color: "#2B124C" }}>{completionRate}%</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ background: "#DFB6B240" }}>
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${completionRate}%`, background: "linear-gradient(90deg, #522B5B, #854F6C)" }} />
                </div>
              </div>
            </div>

            {/* Recent projects */}
            <div className="rounded-2xl glass-card p-6 card-shadow">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-base" style={{ color: "#2B124C" }}>Recent Projects</h3>
                <button onClick={() => router.push("/project-management/projects")} className="text-xs font-medium hover:underline" style={{ color: "#854F6C" }}>View All</button>
              </div>
              <div className="space-y-2.5">
                {recentTasks.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No projects yet</p>
                )}
                {recentTasks.map(task => {
                  const meta = statusMeta[task.status] ?? statusMeta.todo;
                  return (
                    <div
                      key={task.id}
                      onClick={() => router.push(`/project-management/${task.id}`)}
                      className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
                      style={{ background: "rgba(255,255,255,0.55)", border: "1px solid #DFB6B240" }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {task.public_id && (
                          <span className="font-mono text-[10px] font-bold shrink-0 px-1.5 py-0.5 rounded tracking-wider" style={{ background: "#522B5B12", color: "#522B5B" }}>
                            {task.public_id}
                          </span>
                        )}
                        <span className="text-sm font-medium truncate" style={{ color: "#2B124C" }}>{task.title}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2" style={{ background: meta.bg, color: meta.color }}>
                        {meta.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Priority breakdown */}
          {total > 0 && (
            <div className="rounded-2xl glass-card p-6 card-shadow">
              <h3 className="font-bold text-base mb-5" style={{ color: "#2B124C" }}>Priority Breakdown</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "High",   key: "high",   accent: "#991b1b", tasks: tasks.filter(t => t.priority === "high") },
                  { label: "Medium", key: "medium", accent: "#854F6C", tasks: tasks.filter(t => t.priority === "medium") },
                  { label: "Low",    key: "low",    accent: "#166534", tasks: tasks.filter(t => t.priority === "low") },
                ].map(p => (
                  <div key={p.key} className="rounded-xl p-4 text-center" style={{ background: p.accent + "10", border: `1.5px solid ${p.accent}20` }}>
                    <div className="text-3xl font-bold mb-1" style={{ color: p.accent }}>{p.tasks.length}</div>
                    <div className="text-xs font-semibold" style={{ color: p.accent }}>{p.label} Priority</div>
                    <div className="text-[10px] mt-1" style={{ color: p.accent + "99" }}>
                      {p.tasks.filter(t => t.status === "approved").length} completed
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </ProjectShell>
  );
}
