"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { ClipboardList, Loader2, Send, ExternalLink, User, ChevronRight, RefreshCw, Download } from "lucide-react";
import { toast } from "sonner";
import {
  getAdminWeeklyProgress,
  getAdminWeeklyByEmployee,
  postAdminWeeklyComment,
  getAdminWeeklyProgressReport,
  getMyOrganizationSettings,
  updateMyOrganizationSettings,
  type WeeklyProgressEntry,
  type WeeklyProgressReportRow,
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
  const [filterMode, setFilterMode] = useState<"all" | "week" | "month" | "custom">("all");
  const [weekStart, setWeekStart] = useState(toYMD(mondayOfDate(new Date())));
  const [weekEnd, setWeekEnd] = useState(toYMD(mondayOfDate(new Date())));
  const [monthStart, setMonthStart] = useState(toYMD(new Date()).slice(0, 7));
  const [monthEnd, setMonthEnd] = useState(toYMD(new Date()).slice(0, 7));
  const [customStart, setCustomStart] = useState(toYMD(new Date()));
  const [customEnd, setCustomEnd] = useState(toYMD(new Date()));
  const [commentText, setCommentText] = useState<Record<number, string>>({});
  const [postingId, setPostingId] = useState<number | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [weeklyEnabledForAdmin, setWeeklyEnabledForAdmin] = useState(true);
  const [weeklyEnabledForEmployee, setWeeklyEnabledForEmployee] = useState(true);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailUserId, setDetailUserId] = useState<number | null>(null);
  const [detailName, setDetailName] = useState("");
  const [detailEntries, setDetailEntries] = useState<WeeklyProgressEntry[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [summaryPreviewEntry, setSummaryPreviewEntry] = useState<WeeklyProgressEntry | null>(null);
  const [isExportingPng, setIsExportingPng] = useState(false);

  const rangeStartEnd = useMemo(() => {
    if (filterMode === "all") {
      return { startDate: undefined as string | undefined, endDate: undefined as string | undefined };
    }

    if (filterMode === "week") {
      const start = toYMD(mondayOfDate(new Date(weekStart + "T12:00:00")));
      const endBase = mondayOfDate(new Date(weekEnd + "T12:00:00"));
      const endDateObj = new Date(endBase);
      endDateObj.setDate(endDateObj.getDate() + 6);
      return { startDate: start, endDate: toYMD(endDateObj) };
    }

    if (filterMode === "month") {
      const [startYear, startMonth] = monthStart.split("-").map(Number);
      const [endYear, endMonth] = monthEnd.split("-").map(Number);
      const startDateObj = new Date(startYear, startMonth - 1, 1);
      const endDateObj = new Date(endYear, endMonth, 0);
      return { startDate: toYMD(startDateObj), endDate: toYMD(endDateObj) };
    }

    return {
      startDate: customStart || undefined,
      endDate: customEnd || undefined,
    };
  }, [filterMode, weekStart, weekEnd, monthStart, monthEnd, customStart, customEnd]);

  const load = useCallback(async () => {
    setLoading(true);
    const eRes = await getAdminWeeklyProgress({
      start_date: rangeStartEnd.startDate,
      end_date: rangeStartEnd.endDate,
    });
    if (eRes.error) {
      toast.error(eRes.error);
      setEntries([]);
    } else if (eRes.data) {
      setEntries(eRes.data);
    }
    setLoading(false);
  }, [rangeStartEnd.startDate, rangeStartEnd.endDate]);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    const res = await getMyOrganizationSettings();
    if (res.error) {
      toast.error(res.error);
    } else if (res.data) {
      setWeeklyEnabledForAdmin(res.data.weekly_progress_enabled_for_admin);
      setWeeklyEnabledForEmployee(res.data.weekly_progress_enabled_for_employee);
    }
    setSettingsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveWeeklySetting = async (payload: {
    weekly_progress_enabled_for_admin?: boolean;
    weekly_progress_enabled_for_employee?: boolean;
  }) => {
    setSavingSettings(true);
    const res = await updateMyOrganizationSettings(payload);
    if (res.error) {
      toast.error(res.error);
      await loadSettings();
    } else {
      toast.success("Weekly progress settings updated.");
      if (res.data) {
        setWeeklyEnabledForAdmin(res.data.weekly_progress_enabled_for_admin);
        setWeeklyEnabledForEmployee(res.data.weekly_progress_enabled_for_employee);
      }
    }
    setSavingSettings(false);
  };

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

  const downloadBlob = (blob: Blob, filename: string) => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const getWrappedLines = (
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ): string[] => {
    const words = String(text).split(" ");
    const lines: string[] = [];
    let current = "";
    words.forEach((word) => {
      const testLine = current ? `${current} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = testLine;
      }
    });
    if (current) lines.push(current);
    return lines.length ? lines : ["-"];
  };

  const buildReportCanvas = (reportLabel: string, rows: Array<WeeklyProgressReportRow>) => {
    const exportScale = 3;
    const padding = 24;
    const tableTop = 110;
    const rowPaddingY = 12;
    const lineHeight = 20;
    const headerHeight = 48;
    const colWidths = [300, 740];
    const headers = ["Employee Name", "Weekly Updates"];
    const width = padding * 2 + colWidths.reduce((a, b) => a + b, 0);

    const scratch = document.createElement("canvas");
    const sctx = scratch.getContext("2d");
    if (!sctx) throw new Error("Canvas not supported.");
    sctx.font = "15px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";

    const computedRows = rows.map((row) => {
      const wrapped = [
        getWrappedLines(sctx, String(row.user_name || row.user_email || `User #${row.user_id}`), colWidths[0] - 20),
        getWrappedLines(sctx, String(row.description || "-"), colWidths[1] - 20),
      ];
      const maxLines = Math.max(...wrapped.map((w) => w.length));
      const height = rowPaddingY * 2 + maxLines * lineHeight;
      return { wrapped, height };
    });

    const bodyHeight = computedRows.reduce((sum, r) => sum + r.height, 0);
    const height = tableTop + headerHeight + bodyHeight + 20;

    const canvas = document.createElement("canvas");
    canvas.width = width * exportScale;
    canvas.height = height * exportScale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported.");

    ctx.scale(exportScale, exportScale);
    ctx.imageSmoothingEnabled = true;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#64748b";
    ctx.font = "700 12px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.fillText("WORKFORCE PRO", padding, 28);

    ctx.fillStyle = "#0f172a";
    ctx.font = "700 28px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.fillText("Weekly Progress Report", padding, 62);

    ctx.fillStyle = "#334155";
    ctx.font = "500 16px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.fillText(reportLabel, padding, 86);

    let x = padding;
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(padding, tableTop, colWidths.reduce((a, b) => a + b, 0), headerHeight);
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.strokeRect(padding, tableTop, colWidths.reduce((a, b) => a + b, 0), headerHeight);

    ctx.fillStyle = "#0f172a";
    ctx.font = "700 15px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    headers.forEach((h, idx) => {
      ctx.fillText(h, x + 10, tableTop + 30);
      x += colWidths[idx];
      if (idx < colWidths.length - 1) {
        ctx.beginPath();
        ctx.moveTo(x, tableTop);
        ctx.lineTo(x, tableTop + headerHeight);
        ctx.stroke();
      }
    });

    let y = tableTop + headerHeight;
    computedRows.forEach((rowData, rowIdx) => {
      let cellX = padding;
      ctx.strokeStyle = "#e2e8f0";
      ctx.strokeRect(padding, y, colWidths.reduce((a, b) => a + b, 0), rowData.height);

      rowData.wrapped.forEach((lines, colIdx) => {
        if (colIdx > 0) {
          ctx.beginPath();
          ctx.moveTo(cellX, y);
          ctx.lineTo(cellX, y + rowData.height);
          ctx.stroke();
        }
        ctx.fillStyle = colIdx === 0 ? "#0f172a" : "#334155";
        ctx.font = `${colIdx === 0 ? "600" : "500"} 15px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif`;
        lines.forEach((line, lineIdx) => {
          ctx.fillText(line, cellX + 10, y + rowPaddingY + 16 + lineIdx * lineHeight);
        });
        cellX += colWidths[colIdx];
      });

      y += rowData.height;
      if (rowIdx < computedRows.length - 1) {
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(padding + colWidths.reduce((a, b) => a + b, 0), y);
        ctx.stroke();
      }
    });

    return canvas;
  };

  const handleDownloadPng = async () => {
    setIsExportingPng(true);
    try {
      const reportWeek = toYMD(mondayOfDate(new Date((rangeStartEnd.startDate || toYMD(new Date())) + "T12:00:00")));
      const reportRes = await getAdminWeeklyProgressReport(reportWeek);
      if (!reportRes.data) {
        throw new Error(reportRes.error || "Failed to load weekly progress report data.");
      }

      const visibleWeekEntries = entries.filter((entry) => entry.week_start_date === reportWeek);
      const weekEntryByUserId = new Map<number, WeeklyProgressEntry>();
      visibleWeekEntries.forEach((entry) => {
        if (!weekEntryByUserId.has(entry.user_id)) {
          weekEntryByUserId.set(entry.user_id, entry);
        }
      });

      const exportRows = reportRes.data.map((row) => {
        const fallback = weekEntryByUserId.get(row.user_id);
        return {
          ...row,
          user_name: row.user_name || fallback?.employee_name || `User #${row.user_id}`,
          description: row.description || fallback?.description || "-",
        };
      });

      if (exportRows.length === 0) {
        throw new Error("No employees available to include in report.");
      }

      const reportLabel = formatWeek(reportWeek);

      const canvas = buildReportCanvas(reportLabel, exportRows);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (!b) reject(new Error("Failed to generate JPEG image."));
          else resolve(b);
        }, "image/jpeg", 0.95);
      });
      downloadBlob(blob, `workforce-pro-weekly-progress-${reportWeek}.jpg`);
    } catch (err: any) {
      console.error("JPEG export failed", err);
      toast.error(err?.message || "Failed to download JPEG.");
    } finally {
      setIsExportingPng(false);
    }
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
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-foreground">Filter</label>
                <select
                  value={filterMode}
                  onChange={(e) => setFilterMode(e.target.value as "all" | "week" | "month" | "custom")}
                  className="rounded-lg py-2 px-3 text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="all">All</option>
                  <option value="week">Week Range</option>
                  <option value="month">Month Range</option>
                  <option value="custom">Custom Date</option>
                </select>
              </div>
              {filterMode === "week" && (
                <>
                  <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} className="rounded-lg py-2 px-3 text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
                  <input type="date" value={weekEnd} onChange={(e) => setWeekEnd(e.target.value)} className="rounded-lg py-2 px-3 text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </>
              )}
              {filterMode === "month" && (
                <>
                  <input type="month" value={monthStart} onChange={(e) => setMonthStart(e.target.value)} className="rounded-lg py-2 px-3 text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
                  <input type="month" value={monthEnd} onChange={(e) => setMonthEnd(e.target.value)} className="rounded-lg py-2 px-3 text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </>
              )}
              {filterMode === "custom" && (
                <>
                  <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="rounded-lg py-2 px-3 text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
                  <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="rounded-lg py-2 px-3 text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </>
              )}

              <label className="inline-flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={weeklyEnabledForEmployee}
                  disabled={settingsLoading || savingSettings}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setWeeklyEnabledForEmployee(next);
                    void saveWeeklySetting({ weekly_progress_enabled_for_employee: next });
                  }}
                  className="rounded border-border"
                />
                Employee enabled
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={weeklyEnabledForAdmin}
                  disabled={settingsLoading || savingSettings}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setWeeklyEnabledForAdmin(next);
                    void saveWeeklySetting({ weekly_progress_enabled_for_admin: next });
                  }}
                  className="rounded border-border"
                />
                Admin enabled
              </label>
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
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={isExportingPng}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted/50 disabled:opacity-50"
                title="Download weekly progress JPEG"
              >
                {isExportingPng ? (
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-foreground/30 border-t-foreground animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                {isExportingPng ? "Exporting..." : "Download"}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10 rounded-xl border border-dashed border-border">
              {filterMode !== "all"
                ? "No submissions found for the selected range. Adjust start/end filters or switch to All."
                : "No weekly progress entries yet. Submissions will appear here after users save their updates."}
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
                    <tr
                      key={row.id}
                      className="hover:bg-muted/20 align-top cursor-pointer"
                      onClick={() => openEmployeeDetail(row.user_id, row.employee_name || `User ${row.user_id}`)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 font-semibold text-primary text-left">
                          <User size={14} />
                          {row.employee_name || `User #${row.user_id}`}
                          <ChevronRight size={14} className="opacity-50" />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        {formatWeek(row.week_start_date)}
                      </td>
                      <td className="py-3 px-4 max-w-md">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSummaryPreviewEntry(row);
                          }}
                          className="w-full rounded-lg border border-border/80 bg-background/60 px-2.5 py-2 text-left hover:bg-muted/40 transition-colors"
                          title="Click to open full summary"
                        >
                          <p className="text-xs text-card-foreground whitespace-pre-wrap line-clamp-4">{row.description}</p>
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        {(row.github_link || row.deployed_link) ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(row.deployed_link || row.github_link || "", "_blank", "noopener,noreferrer");
                            }}
                            className="w-full rounded-lg border border-border/80 bg-background/60 px-2.5 py-2 text-left hover:bg-muted/40 transition-colors"
                            title="Open submission link"
                          >
                            <span className="text-xs text-blue-600 dark:text-blue-400 inline-flex items-center gap-0.5">
                              {row.deployed_link ? "Live" : "GitHub"} <ExternalLink size={10} />
                            </span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {row.comments.length === 0 ? "—" : `${row.comments.length} note(s)`}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={commentText[row.id] || ""}
                            onChange={(e) => setCommentText((p) => ({ ...p, [row.id]: e.target.value }))}
                            onClick={(e) => e.stopPropagation()}
                            rows={2}
                            placeholder="Feedback…"
                            className="w-full rounded-lg py-1.5 px-2 text-xs bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                          />
                          <button
                            type="button"
                            disabled={postingId === row.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              submitComment(row.id);
                            }}
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
              <span className="text-xs text-foreground/90 dark:text-foreground w-full sm:w-auto sm:mr-2">Quick open history:</span>
              {uniqueEmployees.map(([id, name]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => openEmployeeDetail(id, name)}
                  className="text-xs font-medium px-2 py-1 rounded-lg border border-primary/60 bg-primary text-white hover:bg-primary/90"
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

      {summaryPreviewEntry && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4" onClick={() => setSummaryPreviewEntry(null)}>
          <div
            className="bg-card border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h4 className="font-bold text-foreground">Weekly Summary</h4>
              <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setSummaryPreviewEntry(null)}>
                Close
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <p className="text-xs font-bold text-primary mb-2">{summaryPreviewEntry.employee_name || `User #${summaryPreviewEntry.user_id}`} • {formatWeek(summaryPreviewEntry.week_start_date)}</p>
              <p className="text-sm text-card-foreground whitespace-pre-wrap leading-relaxed">{summaryPreviewEntry.description}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
