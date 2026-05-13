"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import ProjectShell from "@/components/project-management/ProjectShell";
import { useAuth } from "@/components/AuthProvider";
import { getAllTasks, getMyTasks, getTaskStats, getAllEmployees, Task, TaskStats, User } from "@/lib/api";
import { Loader2, TrendingUp, Users, CheckCircle2, AlertCircle } from "lucide-react";

const PRIORITY_COLOR: Record<string, string> = {
  high: "#f87171", medium: "#facc15", low: "#4ade80",
};
const STATUS_LABEL: Record<string, string> = {
  todo: "To Do", in_progress: "In Progress", submitted: "Submitted",
  reviewing: "Reviewing", approved: "Done", rejected: "Rejected",
};
const STATUS_COLOR: Record<string, string> = {
  todo: "#a78bfa", in_progress: "#60a5fa", submitted: "#c084fc",
  reviewing: "#facc15", approved: "#4ade80", rejected: "#f87171",
};

export default function ReportsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [employees, setEmployees] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    const [tRes, sRes, eRes] = await Promise.all([
      isAdmin ? getAllTasks() : getMyTasks(),
      getTaskStats(),
      isAdmin ? getAllEmployees() : Promise.resolve({ data: [] }),
    ]);
    if (tRes.data) setTasks(tRes.data);
    if (sRes.data) setStats(sRes.data);
    if ((eRes as { data: User[] }).data) setEmployees((eRes as { data: User[] }).data!);
    setIsLoading(false);
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  // ── Priority breakdown ──
  const byPriority = useMemo(() => ({
    high: tasks.filter(t => t.priority === "high").length,
    medium: tasks.filter(t => t.priority === "medium").length,
    low: tasks.filter(t => t.priority === "low").length,
  }), [tasks]);

  // ── Status breakdown ──
  const byStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach(t => { counts[t.status] = (counts[t.status] ?? 0) + 1; });
    return counts;
  }, [tasks]);

  // ── Per-assignee performance (admin only) ──
  const byAssignee = useMemo(() => {
    const map: Record<number, { name: string; total: number; done: number; overdue: number }> = {};
    const now = new Date();
    tasks.forEach(t => {
      if (!t.assigned_to) return;
      if (!map[t.assigned_to]) {
        map[t.assigned_to] = {
          name: t.assignee_name ?? `User ${t.assigned_to}`,
          total: 0, done: 0, overdue: 0,
        };
      }
      map[t.assigned_to].total++;
      if (t.status === "approved") map[t.assigned_to].done++;
      if (t.due_date && new Date(t.due_date) < now && t.status !== "approved")
        map[t.assigned_to].overdue++;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [tasks]);

  // ── On-time rate ──
  const completed = tasks.filter(t => t.status === "approved");
  const onTime = completed.filter(t => !t.due_date || new Date(t.updated_at) <= new Date(t.due_date)).length;
  const onTimeRate = completed.length > 0 ? Math.round((onTime / completed.length) * 100) : 0;

  const total = tasks.length || 1;
  const maxByAssignee = byAssignee.length > 0 ? Math.max(...byAssignee.map(a => a.total)) : 1;

  return (
    <ProjectShell>
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 drop-shadow-[0_0_8px_rgba(167,139,250,0.8)]" />
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── KPI row ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Projects",   value: stats?.total ?? tasks.length, icon: <TrendingUp size={18}/>, accent: "#a78bfa", gradient: "from-purple-500 to-purple-600" },
              { label: "Completion Rate",  value: `${stats?.completion_percent ?? 0}%`, icon: <CheckCircle2 size={18}/>, accent: "#4ade80", gradient: "from-green-500 to-green-600" },
              { label: "On-time Rate",     value: `${onTimeRate}%`, icon: <CheckCircle2 size={18}/>, accent: "#60a5fa", gradient: "from-blue-500 to-blue-600" },
              { label: "Overdue",          value: stats?.overdue ?? 0, icon: <AlertCircle size={18}/>, accent: "#f87171", gradient: "from-red-500 to-red-600" },
            ].map(kpi => (
              <div key={kpi.label} className="rounded-2xl glass-card p-5 card-shadow hover:scale-[1.02] transition-all glow-sm hover:glow-md">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${kpi.gradient} shadow-lg`} style={{ color: "white" }}>{kpi.icon}</div>
                  <span className="text-xs font-semibold text-muted-foreground">{kpi.label}</span>
                </div>
                <div className="text-3xl font-extrabold drop-shadow-sm" style={{ color: kpi.accent }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ── Status distribution ── */}
            <div className="rounded-2xl glass-card p-5 card-shadow">
              <h2 className="text-sm font-bold mb-4 text-foreground">Status Distribution</h2>
              <div className="space-y-3">
                {Object.entries(byStatus).sort((a,b) => b[1]-a[1]).map(([status, count]) => (
                  <div key={status}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-semibold text-foreground">{STATUS_LABEL[status] ?? status}</span>
                      <span className="font-bold drop-shadow-sm" style={{ color: STATUS_COLOR[status] }}>{count} <span className="font-normal text-[10px] text-muted-foreground">({Math.round(count/total*100)}%)</span></span>
                    </div>
                    <div className="rounded-full h-3 w-full bg-muted/30">
                      <div className="h-3 rounded-full transition-all duration-700 shadow-sm"
                        style={{ width: `${Math.round(count/total*100)}%`, background: STATUS_COLOR[status] ?? "#a78bfa" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Priority breakdown ── */}
            <div className="rounded-2xl glass-card p-5 card-shadow">
              <h2 className="text-sm font-bold mb-4 text-foreground">Priority Breakdown</h2>
              <div className="space-y-3">
                {(["high","medium","low"] as const).map(p => {
                  const count = byPriority[p] ?? 0;
                  return (
                    <div key={p}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="font-semibold" style={{ color: PRIORITY_COLOR[p] }}>{p.charAt(0).toUpperCase()+p.slice(1)}</span>
                        <span className="font-bold drop-shadow-sm" style={{ color: PRIORITY_COLOR[p] }}>{count} <span className="font-normal text-[10px] text-muted-foreground">({Math.round(count/total*100)}%)</span></span>
                      </div>
                      <div className="rounded-full h-3 w-full bg-muted/30">
                        <div className="h-3 rounded-full transition-all duration-700 shadow-sm"
                          style={{ width: `${Math.round(count/total*100)}%`, background: PRIORITY_COLOR[p] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Completion gauge ── */}
          <div className="rounded-2xl glass-card p-5 card-shadow">
            <h2 className="text-sm font-bold mb-4 text-foreground">Overall Completion</h2>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-5 rounded-full bg-muted/30 shadow-inner">
                <div className="h-5 rounded-full transition-all duration-700 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 shadow-lg"
                  style={{ width: `${stats?.completion_percent ?? 0}%` }} />
              </div>
              <span className="text-2xl font-extrabold w-14 text-right text-purple-400 drop-shadow-[0_0_8px_rgba(167,139,250,0.6)]">
                {stats?.completion_percent ?? 0}%
              </span>
            </div>
            <div className="flex gap-6 mt-3 text-xs text-muted-foreground">
              <span><b className="text-green-400">{stats?.approved ?? 0}</b> completed</span>
              <span><b className="text-blue-400">{stats?.in_progress ?? 0}</b> in progress</span>
              <span><b className="text-red-400">{stats?.overdue ?? 0}</b> overdue</span>
            </div>
          </div>

          {/* ── Team productivity (admin only) ── */}
          {isAdmin && byAssignee.length > 0 && (
            <div className="rounded-2xl glass-card p-5 card-shadow">
              <h2 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: "#2B124C" }}>
                <Users size={15} style={{ color: "#854F6C" }} /> Team Productivity
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: "1px solid #DFB6B240" }}>
                      {["Assignee","Total","Done","Overdue","Rate"].map(h => (
                        <th key={h} className="text-left py-2 pr-4 font-bold" style={{ color: "#854F6C" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {byAssignee.map((a, i) => {
                      const rate = a.total > 0 ? Math.round(a.done / a.total * 100) : 0;
                      return (
                        <tr key={i} className="border-b" style={{ borderColor: "#DFB6B218" }}>
                          <td className="py-2 pr-4 font-semibold" style={{ color: "#190019" }}>{a.name}</td>
                          <td className="py-2 pr-4" style={{ color: "#522B5B" }}>{a.total}</td>
                          <td className="py-2 pr-4" style={{ color: "#166534" }}>{a.done}</td>
                          <td className="py-2 pr-4" style={{ color: a.overdue > 0 ? "#991b1b" : "#166534" }}>{a.overdue}</td>
                          <td className="py-2">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full" style={{ background: "#DFB6B240", minWidth: 60 }}>
                                <div className="h-1.5 rounded-full" style={{ width: `${rate}%`, background: rate >= 70 ? "#166534" : rate >= 40 ? "#854F6C" : "#991b1b" }} />
                              </div>
                              <span className="font-bold w-8 text-right" style={{ color: "#522B5B" }}>{rate}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </ProjectShell>
  );
}
