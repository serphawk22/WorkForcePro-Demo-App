"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ProjectShell from "@/components/project-management/ProjectShell";
import { useAuth } from "@/components/AuthProvider";
import { getAllTasks, getMyTasks, Task } from "@/lib/api";
import { Loader2, CheckCircle2, Clock, AlertCircle, Circle, ListTodo, TrendingUp, Copy } from "lucide-react";
import { toast } from "sonner";

const statusMeta: Record<string, { label: string; color: string; bg: string; gradient: string }> = {
  todo: {
    label: "To Do",
    color: "#a78bfa", // brighter purple
    bg: "rgba(167, 139, 250, 0.15)",
    gradient: "from-purple-500/20 to-purple-600/20"
  },
  in_progress: {
    label: "In Progress",
    color: "#60a5fa", // bright blue
    bg: "rgba(96, 165, 250, 0.15)",
    gradient: "from-blue-500/20 to-blue-600/20"
  },
  submitted: {
    label: "Submitted",
    color: "#c084fc", // bright purple/pink
    bg: "rgba(192, 132, 252, 0.15)",
    gradient: "from-purple-400/20 to-pink-500/20"
  },
  reviewing: {
    label: "Reviewing",
    color: "#facc15", // bright yellow
    bg: "rgba(250, 204, 21, 0.15)",
    gradient: "from-yellow-500/20 to-yellow-600/20"
  },
  approved: {
    label: "Approved",
    color: "#4ade80", // bright green
    bg: "rgba(74, 222, 128, 0.15)",
    gradient: "from-green-500/20 to-green-600/20"
  },
  rejected: {
    label: "Rejected",
    color: "#f87171", // bright red
    bg: "rgba(248, 113, 113, 0.15)",
    gradient: "from-red-500/20 to-red-600/20"
  }
};

interface SummaryClientProps {
  workspaceQuery?: string | null;
}

export default function SummaryPage({ workspaceQuery }: SummaryClientProps) {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === "admin";
  const canManageTasks = isAdmin;
  const workspaceFilter = workspaceQuery ? Number(workspaceQuery) : undefined;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    const taskRes = isAdmin
      ? await getAllTasks(undefined, undefined, workspaceFilter)
      : await getMyTasks();

    const loadedTasks = taskRes.data || [];
    const scopedTasks = !isAdmin && workspaceFilter
      ? loadedTasks.filter((t) => t.workspace_id === workspaceFilter)
      : loadedTasks;

    setTasks(scopedTasks);
    setIsLoading(false);
  }, [isAdmin, workspaceFilter]);

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
    { key: "todo",        count: tasks.filter(t => t.status === "todo").length },
    { key: "in_progress", count: tasks.filter(t => t.status === "in_progress").length },
    { key: "reviewing",   count: tasks.filter(t => t.status === "reviewing").length },
    { key: "approved",    count: tasks.filter(t => t.status === "approved").length },
    { key: "rejected",    count: tasks.filter(t => t.status === "rejected").length },
  ].filter(s => s.count > 0);

  const topCards = [
    { 
      label: "Total Projects", 
      value: total, 
      icon: ListTodo, 
      accent: "#a78bfa",
      gradient: "from-purple-500 to-purple-600",
      shadowColor: "purple-500/50"
    },
    { 
      label: "Active", 
      value: active, 
      icon: Clock, 
      accent: "#60a5fa",
      gradient: "from-blue-500 to-blue-600",
      shadowColor: "blue-500/50"
    },
    { 
      label: "Completed", 
      value: completed, 
      icon: CheckCircle2, 
      accent: "#4ade80",
      gradient: "from-green-500 to-green-600",
      shadowColor: "green-500/50"
    },
    { 
      label: "Overdue", 
      value: overdue, 
      icon: AlertCircle, 
      accent: "#f87171",
      gradient: "from-red-500 to-red-600",
      shadowColor: "red-500/50"
    },
  ];

  return (
    <ProjectShell activeWorkspaceId={workspaceQuery || null}>
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {topCards.map(card => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded-2xl p-5 glass-card card-shadow flex items-center gap-4 hover:scale-[1.02] transition-all glow-sm hover:glow-md">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${card.gradient} shadow-lg shadow-${card.shadowColor}`}>
                    <Icon size={22} className="text-white drop-shadow-lg" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold drop-shadow-sm" style={{ color: card.accent }}>{card.value}</div>
                    <div className="text-xs font-semibold mt-0.5 text-muted-foreground">{card.label}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status distribution */}
            <div className="rounded-2xl glass-card p-6 card-shadow">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-base text-foreground">Status Distribution</h3>
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-400 drop-shadow-sm">
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
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-foreground">{meta.label}</span>
                        <span className="font-bold drop-shadow-sm" style={{ color: meta.color }}>{s.count} ({pct}%)</span>
                      </div>
                      <div className="h-3 rounded-full overflow-hidden bg-muted/30">
                        <div className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${meta.gradient} shadow-sm`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {statusBreakdown.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No project data yet</p>
                )}
              </div>

              {/* Overall progress bar */}
              <div className="mt-5 pt-4 border-t border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={14} className="text-purple-400 drop-shadow-sm" />
                  <div className="flex items-center justify-between text-xs flex-1">
                    <span className="font-semibold text-foreground">Overall Completion</span>
                    <span className="font-bold text-2xl text-purple-400 drop-shadow-[0_0_8px_rgba(167,139,250,0.6)]">{completionRate}%</span>
                  </div>
                </div>
                <div className="h-4 rounded-full overflow-hidden bg-muted/30 shadow-inner">
                  <div className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 shadow-lg" style={{ width: `${completionRate}%` }} />
                </div>
              </div>
            </div>

            {/* Recent projects */}
            <div className="rounded-2xl glass-card p-6 card-shadow">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-base text-foreground">Recent Projects</h3>
                <button onClick={() => router.push("/project-management/projects")} className="text-xs font-semibold hover:underline text-purple-400 hover:text-purple-300 transition-colors drop-shadow-sm">View All</button>
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
                        onClick={() => {
                          if (workspaceFilter) router.push(`/project-management/workspaces/${workspaceFilter}/projects/${task.id}`);
                          else router.push(`/project-management/${task.id}`);
                        }}
                      className="flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all hover:scale-[1.02] glass-card border border-border/30 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/20"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {task.public_id && (
                          <span className="font-mono text-[10px] font-bold shrink-0 px-2 py-1 rounded tracking-wider bg-gradient-to-r from-purple-500/15 to-pink-500/15 border border-purple-500/30 text-purple-400 drop-shadow-sm">
                            {task.public_id}
                          </span>
                        )}
                        <span className="text-sm font-semibold truncate text-foreground">{task.title}</span>
                      </div>
                      <div className="ml-2 flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full bg-gradient-to-r ${meta.gradient} border border-current/20 drop-shadow-sm`} style={{ color: meta.color }}>
                          {meta.label}
                        </span>
                        {canManageTasks && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/project-management/projects?edit=${task.id}`);
                            }}
                            className="rounded-md border border-primary/35 bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary hover:bg-primary/20 transition-colors"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Priority breakdown */}
          {total > 0 && (
            <div className="rounded-2xl glass-card p-6 card-shadow">
              <h3 className="font-bold text-base mb-5 text-foreground">Priority Breakdown</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { 
                    label: "High", 
                    key: "high", 
                    accent: "#f87171", 
                    gradient: "from-red-500/20 to-red-600/20",
                    borderColor: "border-red-500/30",
                    shadow: "hover:shadow-lg hover:shadow-red-500/30",
                    tasks: tasks.filter(t => t.priority === "high")
                  },
                  { 
                    label: "Medium", 
                    key: "medium", 
                    accent: "#facc15", 
                    gradient: "from-yellow-500/20 to-amber-500/20",
                    borderColor: "border-yellow-500/30",
                    shadow: "hover:shadow-lg hover:shadow-yellow-500/30",
                    tasks: tasks.filter(t => t.priority === "medium")
                  },
                  { 
                    label: "Low", 
                    key: "low", 
                    accent: "#4ade80", 
                    gradient: "from-green-500/20 to-emerald-500/20",
                    borderColor: "border-green-500/30",
                    shadow: "hover:shadow-lg hover:shadow-green-500/30",
                    tasks: tasks.filter(t => t.priority === "low")
                  },
                ].map(p => (
                  <div 
                    key={p.key} 
                    className={`rounded-xl p-5 text-center bg-gradient-to-br ${p.gradient} border-2 ${p.borderColor} transition-all hover:scale-105 ${p.shadow}`}
                  >
                    <div className="text-4xl font-bold mb-1.5 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" style={{ color: p.accent }}>
                      {p.tasks.length}
                    </div>
                    <div className="text-xs font-bold mb-1" style={{ color: p.accent }}>
                      {p.label} Priority
                    </div>
                    <div className="text-[10px] font-semibold text-muted-foreground">
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
