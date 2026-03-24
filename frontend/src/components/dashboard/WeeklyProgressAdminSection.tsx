"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { ClipboardList, Loader2, Send, ExternalLink, User, ChevronRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  getAdminWeeklyProgress,
  getAdminWeeklyByEmployee,
  postAdminWeeklyComment,
  type WeeklyProgressEntry,
} from "@/lib/api";

function mondayOfDate(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Accent = CSSProperties & { "--admin-card-accent"?: string; "--admin-card-accent-secondary"?: string };

const accent: Accent = {
  "--admin-card-accent": "262 83% 58%",
  "--admin-card-accent-secondary": "199 89% 48%",
};

export default function WeeklyProgressAdminSection() {
  const [entries, setEntries] = useState<WeeklyProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);
  /** When false, load all employees' submissions (fixes empty list when employee picked a different week). */
  const [filterByWeek, setFilterByWeek] = useState(false);
  const [weekFilter, setWeekFilter] = useState(toYMD(mondayOfDate(new Date())));
  const [commentText, setCommentText] = useState<Record<number, string>>({});
  const [postingId, setPostingId] = useState<number | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailUserId, setDetailUserId] = useState<number | null>(null);
  const [detailName, setDetailName] = useState("");
  const [detailEntries, setDetailEntries] = useState<WeeklyProgressEntry[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const weekParam = useMemo(() => toYMD(mondayOfDate(new Date(weekFilter + "T12:00:00"))), [weekFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    const eRes = await getAdminWeeklyProgress(
      filterByWeek ? { week_start: weekParam } : undefined
    );
    if (eRes.error) {
      toast.error(eRes.error);
      setEntries([]);
    } else if (eRes.data) {
      setEntries(eRes.data);
    }
    setLoading(false);
  }, [weekParam, filterByWeek]);

  useEffect(() => {
    load();
  }, [load]);

  const openEmployeeDetail = async (userId: number, name: string) => {
    setDetailUserId(userId);
    setDetailName(name);
    setDetailOpen(true);
    setDetailLoading(true);
    const res = await getAdminWeeklyByEmployee(userId);
    if (res.data) setDetailEntries(res.data);
    setDetailLoading(false);
  };

  const submitComment = async (entryId: number) => {
    const text = (commentText[entryId] || "").trim();
    if (!text) {
      toast.error("Enter a comment.");
      return;
    }
    setPostingId(entryId);
    const res = await postAdminWeeklyComment(entryId, text);
    if (res.error) toast.error(res.error);
    else {
      toast.success("Comment added. Employee will be notified.");
      setCommentText((prev) => ({ ...prev, [entryId]: "" }));
      await load();
      if (detailOpen && detailUserId) {
        const r2 = await getAdminWeeklyByEmployee(detailUserId);
        if (r2.data) setDetailEntries(r2.data);
      }
    }
    setPostingId(null);
  };

  const formatWeek = (ymd: string) => {
    const start = new Date(ymd + "T12:00:00");
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  };

  const uniqueEmployees = useMemo(() => {
    const m = new Map<number, string>();
    entries.forEach((e) => {
      if (!m.has(e.user_id)) m.set(e.user_id, e.employee_name || `User #${e.user_id}`);
    });
    return Array.from(m.entries());
  }, [entries]);

  return (
    <>
      <div className="admin-dashboard-card rounded-xl glass-card glow-sm" style={accent}>
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-bold text-card-foreground flex items-center gap-2">
              <div className="admin-dashboard-card-icon p-2 rounded-lg bg-violet-600 shadow-lg shadow-violet-600/35">
                <ClipboardList size={18} className="text-white" />
              </div>
              Weekly Progress
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filterByWeek}
                  onChange={(e) => setFilterByWeek(e.target.checked)}
                  className="rounded border-border"
                />
                Filter by week
              </label>
              {filterByWeek && (
                <>
                  <input
                    type="date"
                    value={weekFilter}
                    onChange={(e) => setWeekFilter(e.target.value)}
                    className="rounded-lg py-2 px-3 text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <span className="text-[10px] text-muted-foreground">Week: {formatWeek(weekParam)}</span>
                </>
              )}
              <button
                type="button"
                onClick={() => load()}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted/50 disabled:opacity-50"
                title="Refresh list"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10 rounded-xl border border-dashed border-border">
              {filterByWeek
                ? "No submissions for that week. Turn off “Filter by week” to see all entries, or pick another date."
                : "No weekly progress entries yet. Submissions will appear here after employees save their updates."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/80">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 px-4 font-semibold">Employee</th>
                    <th className="py-3 px-4 font-semibold whitespace-nowrap">Week</th>
                    <th className="py-3 px-4 font-semibold">Summary</th>
                    <th className="py-3 px-4 font-semibold">Links</th>
                    <th className="py-3 px-4 font-semibold">Comments</th>
                    <th className="py-3 px-4 font-semibold w-[220px]">Add comment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entries.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/20 align-top">
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => openEmployeeDetail(row.user_id, row.employee_name || `User ${row.user_id}`)}
                          className="flex items-center gap-1 font-semibold text-primary hover:underline text-left"
                        >
                          <User size={14} />
                          {row.employee_name || `User #${row.user_id}`}
                          <ChevronRight size={14} className="opacity-50" />
                        </button>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        {formatWeek(row.week_start_date)}
                      </td>
                      <td className="py-3 px-4 max-w-md">
                        <p className="text-xs text-card-foreground whitespace-pre-wrap line-clamp-4">{row.description}</p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          {row.github_link ? (
                            <a href={row.github_link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 inline-flex items-center gap-0.5">
                              GitHub <ExternalLink size={10} />
                            </a>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                          {row.deployed_link && (
                            <a href={row.deployed_link} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-600 dark:text-violet-400 inline-flex items-center gap-0.5">
                              Live <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {row.comments.length === 0 ? "—" : `${row.comments.length} note(s)`}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={commentText[row.id] || ""}
                            onChange={(e) => setCommentText((p) => ({ ...p, [row.id]: e.target.value }))}
                            rows={2}
                            placeholder="Feedback…"
                            className="w-full rounded-lg py-1.5 px-2 text-xs bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                          />
                          <button
                            type="button"
                            disabled={postingId === row.id}
                            onClick={() => submitComment(row.id)}
                            className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold py-1.5 px-2 hover:bg-primary/90 disabled:opacity-50"
                          >
                            {postingId === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                            Send
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && uniqueEmployees.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground w-full sm:w-auto sm:mr-2">Quick open history:</span>
              {uniqueEmployees.map(([id, name]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => openEmployeeDetail(id, name)}
                  className="text-xs font-medium px-2 py-1 rounded-lg border border-border bg-card/50 hover:border-primary/40 hover:bg-primary/5"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {detailOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => setDetailOpen(false)}>
          <div
            className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h4 className="font-bold text-foreground">{detailName}&apos;s weekly history</h4>
              <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setDetailOpen(false)}>
                Close
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {detailLoading ? (
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              ) : detailEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center">No entries.</p>
              ) : (
                detailEntries.map((e) => (
                  <div key={e.id} className="rounded-xl border border-border p-3 space-y-2">
                    <p className="text-xs font-bold text-primary">{formatWeek(e.week_start_date)}</p>
                    <p className="text-xs text-card-foreground whitespace-pre-wrap">{e.description}</p>
                    {e.comments.map((c) => (
                      <div key={c.id} className="text-xs rounded-lg bg-secondary/40 px-2 py-1.5 border border-border/50">
                        <span className="font-semibold">{c.admin_name}</span>
                        <span className="text-muted-foreground text-[10px] ml-2">{new Date(c.created_at).toLocaleString()}</span>
                        <p className="mt-1">{c.comment}</p>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
