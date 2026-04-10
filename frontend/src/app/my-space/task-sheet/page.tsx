"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import MySpaceShell from "@/components/my-space/MySpaceShell";
import { useAuth } from "@/components/AuthProvider";
import { Calendar, Link2, Swords, Pencil, Trash2, Filter, Download } from "lucide-react";
import { showFloatingToast } from "@/components/ui/FloatingToast";
import {
  deleteTaskSheetEntry,
  getAllTaskSheets,
  getMyTaskSheets,
  submitTaskSheet,
  TaskSheetEntry,
  updateTaskSheetEntry,
  getAdminDailyTaskSheetReport,
  DailyTaskSheetReportRow,
} from "@/lib/api";

const todayStr = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toDateValue = (date: string) => new Date(`${date}T00:00:00`).getTime();

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const AVATAR_COLORS = [
  "#522B5B", "#854F6C", "#2B124C", "#7C3D6B", "#9C4E7A",
  "#6B3A5F", "#3D1A4A", "#A05070", "#5A2E54", "#8B4565",
];

const getInitials = (name?: string | null) =>
  name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";

const colorFor = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];

const fmtLongDate = (date: string) =>
  new Date(date + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export default function TaskSheetPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [logFilterDate, setLogFilterDate] = useState(todayStr());
  const [achievements, setAchievements] = useState("");
  const [repoLink, setRepoLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [timelineEntries, setTimelineEntries] = useState<TaskSheetEntry[]>([]);
  const [myEntries, setMyEntries] = useState<TaskSheetEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [pendingDeleteEntry, setPendingDeleteEntry] = useState<TaskSheetEntry | null>(null);
  const [isDeletingEntry, setIsDeletingEntry] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);

  const isAdmin = user?.role === "admin";

  const loadTaskSheets = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoadingHistory(true);
      const [timelineRes, personalRes] = await Promise.all([
        isAdmin ? getAllTaskSheets(500) : getMyTaskSheets(500),
        getMyTaskSheets(500),
      ]);

      setTimelineEntries(timelineRes.data ?? personalRes.data ?? []);
      setMyEntries(personalRes.data ?? []);
    } catch (err) {
      console.error("Failed to load task sheet data", err);
      setTimelineEntries([]);
      setMyEntries([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [isAdmin, user]);

  useEffect(() => {
    void loadTaskSheets();
  }, [loadTaskSheets]);

  useEffect(() => {
    if (!myEntries.length) {
      setAchievements("");
      setRepoLink("");
      setIsUpdate(false);
      setEditingEntryId(null);
      return;
    }
    const selectedEntry = myEntries.find((e) => e.date === selectedDate);
    if (selectedEntry) {
      setAchievements(selectedEntry.achievements);
      setRepoLink(selectedEntry.repo_link || "");
      setIsUpdate(true);
      setEditingEntryId(selectedEntry.id);
    } else {
      setAchievements("");
      setRepoLink("");
      setIsUpdate(false);
      setEditingEntryId(null);
    }
  }, [myEntries, selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!achievements.trim()) {
      showFloatingToast({ type: "error", message: "Please describe your achievements for the selected date." });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = { achievements, repo_link: repoLink || undefined, date: selectedDate };
      const res = editingEntryId
        ? await updateTaskSheetEntry(editingEntryId, payload)
        : await submitTaskSheet(payload);
      if (res.error) {
        showFloatingToast({ type: "error", message: res.error });
      } else {
        setIsUpdate(true);
        await loadTaskSheets();
        showFloatingToast({
          type: "success",
          message: editingEntryId ? "Task sheet updated successfully." : "Task sheet saved successfully."
        });
      }
    } catch (err: any) {
      showFloatingToast({ type: "error", message: err?.message || "Failed to submit task sheet." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditEntry = (entry: TaskSheetEntry) => {
    setSelectedDate(entry.date);
    setAchievements(entry.achievements);
    setRepoLink(entry.repo_link || "");
    setIsUpdate(true);
    setEditingEntryId(entry.id);
    showFloatingToast({ type: "success", message: "Entry loaded for editing." });
  };

  const handleDeleteEntry = async (entry: TaskSheetEntry) => {
    setPendingDeleteEntry(entry);
  };

  const confirmDeleteEntry = async () => {
    if (!pendingDeleteEntry) return;
    setIsDeletingEntry(true);
    const entry = pendingDeleteEntry;
    const res = await deleteTaskSheetEntry(entry.id);
    if (res.error) {
      showFloatingToast({ type: "error", message: res.error });
      setIsDeletingEntry(false);
      return;
    }
    if (editingEntryId === entry.id) {
      setEditingEntryId(null);
      setAchievements("");
      setRepoLink("");
      setIsUpdate(false);
    }
    await loadTaskSheets();
    setPendingDeleteEntry(null);
    setIsDeletingEntry(false);
    showFloatingToast({ type: "delete", message: "Entry deleted." });
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

  const buildReportCanvas = (date: string, rows: Array<DailyTaskSheetReportRow>) => {
    const padding = 24;
    const tableTop = 110;
    const rowPaddingY = 12;
    const lineHeight = 20;
    const headerHeight = 48;
    const colWidths = [260, 700];
    const headers = ["Employee Name", "Entry"];
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);
    const dividerX = padding + colWidths[0];
    const width = padding * 2 + tableWidth;

    const scratch = document.createElement("canvas");
    const sctx = scratch.getContext("2d");
    if (!sctx) throw new Error("Canvas not supported.");
    sctx.font = "15px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";

    const computedRows = rows.map((row) => {
      const wrapped = [
        getWrappedLines(sctx, String(row.user_name || "-"), colWidths[0] - 20),
        getWrappedLines(sctx, String(row.achievements || "-"), colWidths[1] - 20),
      ];
      const maxLines = Math.max(wrapped[0].length, wrapped[1].length);
      const height = rowPaddingY * 2 + maxLines * lineHeight;
      return { wrapped, height };
    });

    const bodyHeight = computedRows.reduce((sum, r) => sum + r.height, 0);
    const height = tableTop + headerHeight + bodyHeight + 20;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported.");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#64748b";
    ctx.font = "700 12px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.fillText("WORKFORCE PRO", padding, 28);

    ctx.fillStyle = "#0f172a";
    ctx.font = "700 28px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.fillText("Daily Task Sheet Report", padding, 62);

    ctx.fillStyle = "#334155";
    ctx.font = "500 16px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.fillText(fmtLongDate(date), padding, 86);

    let x = padding;
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(padding, tableTop, tableWidth, headerHeight);
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.strokeRect(padding, tableTop, tableWidth, headerHeight);

    ctx.fillStyle = "#0f172a";
    ctx.font = "700 15px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    headers.forEach((h, idx) => {
      ctx.fillText(h, x + 10, tableTop + 30);
      x += colWidths[idx];
    });

    let y = tableTop + headerHeight;
    computedRows.forEach((rowData, rowIdx) => {
      let cellX = padding;
      ctx.strokeStyle = "#e2e8f0";
      ctx.strokeRect(padding, y, tableWidth, rowData.height);

      rowData.wrapped.forEach((lines, colIdx) => {
        ctx.fillStyle = "#0f172a";
        ctx.font = "600 15px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
        lines.forEach((line, lineIdx) => {
          ctx.fillText(line, cellX + 10, y + rowPaddingY + 16 + lineIdx * lineHeight);
        });
        cellX += colWidths[colIdx];
      });

      y += rowData.height;
      if (rowIdx < computedRows.length - 1) {
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(padding + tableWidth, y);
        ctx.stroke();
      }
    });

    // Match inner divider to table outer border style.
    ctx.beginPath();
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.moveTo(dividerX + 0.5, tableTop);
    ctx.lineTo(dividerX + 0.5, tableTop + headerHeight + bodyHeight);
    ctx.stroke();

    return canvas;
  };

  const handleDownloadPng = async () => {
    if (user?.role !== "admin") return;
    setIsExportingPng(true);
    try {
      const reportDate = logFilterDate;
      const reportRes = await getAdminDailyTaskSheetReport(reportDate);
      if (!reportRes.data) {
        throw new Error(reportRes.error || "Failed to load daily task sheet report data.");
      }

      const canvas = buildReportCanvas(reportDate, reportRes.data);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (!b) reject(new Error("Failed to generate JPEG image."));
          else resolve(b);
        }, "image/jpeg", 0.95);
      });
      downloadBlob(blob, `workforce-pro-task-sheet-${reportDate}.jpg`);
    } catch (err: any) {
      console.error("JPEG export failed", err);
      showFloatingToast({ type: "error", message: err?.message || "Failed to download JPEG." });
    } finally {
      setIsExportingPng(false);
    }
  };

  const filteredEntries = useMemo(() => {
    return [...timelineEntries]
      .filter((entry) => entry.date === logFilterDate)
      .sort((left, right) => {
        const createdDiff = new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
        return -createdDiff;
      });
  }, [timelineEntries, logFilterDate]);

  if (!user) return null;

  return (
    <MySpaceShell>
      <div className="max-w-3xl mx-auto space-y-6 pb-20">
        {/* Form Card */}
        <div className="rounded-2xl p-6 md:p-8 shadow-sm lighthouse-card">
          <div className="flex items-center gap-3 mb-6">
            <Swords size={24} className="lighthouse-accent" />
            <h3 className="text-xl font-bold text-[#2B124C] dark:text-purple-100">Log Your Operational Victories</h3>
          </div>

          <div className="mb-5 flex items-center gap-2">
            <Calendar size={15} className="lighthouse-muted" />
            <label className="text-xs font-medium text-[#854F6C] dark:text-purple-400">Entry Date</label>
            <input
              type="date"
              value={selectedDate}
              max={todayStr()}
                onChange={(e) => setSelectedDate(e.target.value)}
              className="h-8 px-2 rounded-lg text-sm focus:outline-none transition-all lighthouse-input-white"
            />
          </div>
          {selectedDate !== todayStr() && (
            <div className="mb-4 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 lighthouse-date-note">
              <Calendar size={13} />
              Backfilling task sheet for <span className="font-bold">{fmtLongDate(selectedDate)}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-1 text-[#522B5B] dark:text-purple-300">Operational Victories *</label>
              <textarea value={achievements} onChange={(e) => setAchievements(e.target.value)} placeholder="Describe your achievements, learnings, and progress today..." className="w-full min-h-[140px] p-3 rounded-lg text-sm focus:outline-none transition-all resize-y lighthouse-input" maxLength={1000} />
              <div className="mt-1 text-right text-xs font-medium text-[#854F6C] dark:text-purple-400">{achievements.length} / 1000 characters</div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-[#522B5B] dark:text-purple-300">Direct Repository Link</label>
              <input type="url" value={repoLink} onChange={(e) => setRepoLink(e.target.value)} placeholder="https://github.com/..." className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none transition-all lighthouse-input" />
            </div>
            <div className="pt-2">
              <button type="submit" disabled={isSubmitting} className="w-full h-11 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed hover:opacity-90" style={{ background: "#522B5B" }}>
                {isSubmitting ? <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : editingEntryId ? "Save Edited Entry" : isUpdate ? "Update Selected Date Log" : "Publish Strategic Log"}
              </button>
            </div>
          </form>
        </div>

        {/* Timeline History - Grouped by Date */}
        <div className="mt-8">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="text-lg font-bold text-[#2B124C] dark:text-purple-100">Chronological Work Journey</h3>
            <div className="flex items-center gap-3 flex-wrap">
              <Filter size={14} className="lighthouse-muted" />
              <label className="text-xs font-medium text-[#854F6C] dark:text-purple-400">Filter by date</label>
              <input
                type="date"
                value={logFilterDate}
                max={todayStr()}
                onChange={(e) => setLogFilterDate(e.target.value)}
                className="h-8 px-2 rounded-lg text-sm focus:outline-none lighthouse-input-white"
              />
              {user?.role === "admin" && (
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  disabled={isExportingPng}
                  className="h-8 px-3 rounded-lg border border-slate-300/70 dark:border-white/20 text-xs text-[#522B5B] dark:text-purple-200 hover:bg-slate-200/70 dark:hover:bg-white/10 inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Download daily task sheet PNG"
                >
                  {isExportingPng ? (
                    <div className="h-3 w-3 rounded-full border-2 border-[#522B5B]/30 dark:border-white/20 border-t-[#522B5B] dark:border-t-white animate-spin" />
                  ) : (
                    <Download size={14} />
                  )}
                  <span className="hidden sm:inline">{isExportingPng ? "Exporting..." : "Download"}</span>
                </button>
              )}
            </div>
          </div>

          <p className="text-xs mb-3 text-[#854F6C] dark:text-purple-400">
            Showing entries for{" "}
            <span className="font-semibold text-[#522B5B] dark:text-purple-300">
              {fmtLongDate(logFilterDate)}
            </span>
          </p>

          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-10"><div className="h-6 w-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#522B5B", borderTopColor: "transparent" }} /></div>
          ) : filteredEntries.length === 0 ? (
            <div className="rounded-xl p-8 text-center text-sm lighthouse-empty">
              No mission records found for {new Date(logFilterDate + "T00:00:00").toLocaleDateString()}.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredEntries.map((entry) => (
                <div key={entry.id} className="rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow lighthouse-inner-card">
                  <div className="flex items-center gap-3 mb-4">
                    {entry.profile_picture ? (
                      <Image
                        src={entry.profile_picture}
                        alt={entry.user_name || "User"}
                        width={36}
                        height={36}
                        className="h-9 w-9 rounded-full object-cover flex-shrink-0"
                        unoptimized
                      />
                    ) : (
                      <div
                        className="h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: colorFor(entry.user_id) }}
                      >
                        {getInitials(entry.user_name)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-[#2B124C] dark:text-purple-100">
                        {entry.user_name ?? entry.user_email ?? `User #${entry.user_id}`}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-[#854F6C] dark:text-purple-400">
                        <Calendar size={11} />
                        {new Date(entry.date + "T00:00:00").toLocaleDateString()}
                      </div>
                    </div>
                    {entry.user_id === user.id && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditEntry(entry)}
                          className="h-8 px-2.5 rounded-lg border border-slate-300/70 dark:border-white/20 text-xs text-[#522B5B] dark:text-purple-200 hover:bg-slate-200/70 dark:hover:bg-white/10 inline-flex items-center gap-1"
                        >
                          <Pencil size={12} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(entry)}
                          className="h-8 px-2.5 rounded-lg border border-red-300/70 dark:border-red-400/30 text-xs text-red-700 dark:text-red-300 hover:bg-red-100/70 dark:hover:bg-red-500/10 inline-flex items-center gap-1"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg p-3 lighthouse-sub-card">
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-[#854F6C] dark:text-purple-400">Task Log</p>
                    <p className="text-sm text-[#2B124C] dark:text-purple-100 whitespace-pre-wrap">{entry.achievements}</p>
                  </div>

                  {entry.repo_link && (
                    <a
                      href={entry.repo_link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors lighthouse-repo-link"
                    >
                      <Link2 size={12} /> View Repository
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {pendingDeleteEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200/70 dark:border-white/15 bg-white dark:bg-[#221038] p-5 shadow-xl">
              <h4 className="text-base font-bold text-[#2B124C] dark:text-purple-100">Delete Entry?</h4>
              <p className="mt-2 text-sm text-[#854F6C] dark:text-purple-300">
                Delete your task sheet entry for <span className="font-semibold">{fmtLongDate(pendingDeleteEntry.date)}</span>?
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPendingDeleteEntry(null)}
                  disabled={isDeletingEntry}
                  className="h-9 px-3 rounded-lg border border-slate-300/70 dark:border-white/20 text-xs font-medium text-[#522B5B] dark:text-purple-200 hover:bg-slate-100/80 dark:hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteEntry}
                  disabled={isDeletingEntry}
                  className="h-9 px-3 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-70 inline-flex items-center gap-1.5"
                >
                  {isDeletingEntry ? (
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  ) : (
                    <Trash2 size={12} />
                  )}
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MySpaceShell>
  );
}
