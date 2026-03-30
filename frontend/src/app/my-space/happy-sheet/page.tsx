"use client";

import { useState, useEffect } from "react";
import MySpaceShell from "@/components/my-space/MySpaceShell";
import { useAuth } from "@/components/AuthProvider";
import { Calendar, CheckCircle2, Sparkles, Filter, X, Download } from "lucide-react";
import { showFloatingToast } from "@/components/ui/FloatingToast";
import {
  submitHappySheet,
  getMyHappySheets,
  getAllTeamHappySheets,
  getTeamHappySheetsByDate,
  getAdminDailyHappySheetReport,
  HappySheetEntry,
} from "@/lib/api";

const AVATAR_COLORS = [
  "#522B5B", "#854F6C", "#2B124C", "#7C3D6B", "#9C4E7A",
  "#6B3A5F", "#3D1A4A", "#A05070", "#5A2E54", "#8B4565",
];
const getInitials = (name?: string | null) =>
  name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";
const colorFor = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];
const todayStr = () => new Date().toISOString().split("T")[0];
const fmtLongDate = (date: string) =>
  new Date(date + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export default function HappySheetPage() {
  const { user } = useAuth();

  // ── Form state ──────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [whatMadeYouHappy, setWhatMadeYouHappy] = useState("");
  const [whatMadeOthersHappy, setWhatMadeOthersHappy] = useState("");
  const [goalsWithoutGreed, setGoalsWithoutGreed] = useState("");
  const [dreamsSupported, setDreamsSupported] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);

  // ── Joy Log state ───────────────────────────────────────────
  const [teamHistory, setTeamHistory] = useState<HappySheetEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [logFilterDate, setLogFilterDate] = useState(todayStr());
  const [filteredTeam, setFilteredTeam] = useState<HappySheetEntry[]>([]);
  const [isLoadingFiltered, setIsLoadingFiltered] = useState(false);

  const [isExportingPng, setIsExportingPng] = useState(false);

  // Initial load
  useEffect(() => {
    loadPersonalForDate(selectedDate);
  }, []);

  // When form date changes, reload personal entry
  useEffect(() => {
    loadPersonalForDate(selectedDate);
  }, [selectedDate]);

  // When log filter date changes, fetch team entries for that date
  useEffect(() => {
    if (!logFilterDate) { setFilteredTeam([]); return; }
    (async () => {
      setIsLoadingFiltered(true);
      try {
        const res = await getTeamHappySheetsByDate(logFilterDate);
        if (res.data) setFilteredTeam(res.data);
        else setFilteredTeam([]);
      } catch (err) {
        console.error("Failed to load entries for date", err);
        setFilteredTeam([]);
      } finally {
        setIsLoadingFiltered(false);
      }
    })();
  }, [logFilterDate]);

  const loadPersonalForDate = async (date: string) => {
    try {
      const res = await getMyHappySheets(365);
      if (res.data) {
        const entry = res.data.find((e) => e.date === date);
        if (entry) {
          setWhatMadeYouHappy(entry.what_made_you_happy);
          setWhatMadeOthersHappy(entry.what_made_others_happy);
          setGoalsWithoutGreed(entry.goals_without_greed);
          setDreamsSupported(entry.dreams_supported);
          setIsUpdate(true);
        } else {
          setWhatMadeYouHappy("");
          setWhatMadeOthersHappy("");
          setGoalsWithoutGreed("");
          setDreamsSupported("");
          setIsUpdate(false);
        }
      }
    } catch (err) {
      console.error("Failed to load entry for date", err);
    }
  };

  const loadTeamHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const res = await getAllTeamHappySheets(100);
      if (res.data) setTeamHistory(res.data);
    } catch (err) {
      console.error("Failed to load team history", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatMadeYouHappy.trim() || !whatMadeOthersHappy.trim() || !goalsWithoutGreed.trim() || !dreamsSupported.trim()) {
      showFloatingToast({ type: "error", message: "Please fill all required fields" });
      return;
    }
    setIsSubmitting(true);
    setSuccess(false);
    try {
      const res = await submitHappySheet({
        what_made_you_happy: whatMadeYouHappy,
        what_made_others_happy: whatMadeOthersHappy,
        goals_without_greed: goalsWithoutGreed,
        dreams_supported: dreamsSupported,
        date: selectedDate,
      });
      if (res.error) {
        showFloatingToast({ type: "error", message: res.error });
      } else {
        setSuccess(true);
        setIsUpdate(true);
        setWhatMadeYouHappy("");
        setWhatMadeOthersHappy("");
        setGoalsWithoutGreed("");
        setDreamsSupported("");
        loadTeamHistory();
        // Refresh filtered view if active
        if (logFilterDate === selectedDate) {
          const r2 = await getTeamHappySheetsByDate(logFilterDate);
          if (r2.data) setFilteredTeam(r2.data);
        }
        setTimeout(() => setSuccess(false), 5000);
      }
    } catch (err: any) {
      showFloatingToast({ type: "error", message: err?.message || "Failed to submit." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayEntries = logFilterDate ? filteredTeam : teamHistory;
  const isLoadingLog = logFilterDate ? isLoadingFiltered : isLoadingHistory;

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
    const safe = text?.trim() ? text.trim() : "-";
    const words = safe.split(/\s+/);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth || !current) {
        current = next;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : ["-"];
  };

  const buildReportCanvas = (date: string, rows: Array<any>) => {
    const padding = 24;
    const tableTop = 110;
    const rowPaddingY = 12;
    const lineHeight = 20;
    const headerHeight = 48;
    const colWidths = [240, 340, 340, 340, 340];
    const headers = ["Employee Name", "Happy Today", "Made Others Happy", "Goals", "Dreams"];
    const width = padding * 2 + colWidths.reduce((a, b) => a + b, 0);

    const scratch = document.createElement("canvas");
    const sctx = scratch.getContext("2d");
    if (!sctx) throw new Error("Canvas not supported.");
    sctx.font = "15px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";

    const computedRows = rows.map((row) => {
      const cells = [
        row.user_name || "-",
        row.what_made_you_happy || "-",
        row.what_made_others_happy || "-",
        row.goals_without_greed || "-",
        row.dreams_supported || "-",
      ];
      const wrapped = cells.map((cell, idx) =>
        getWrappedLines(sctx, String(cell), colWidths[idx] - 20)
      );
      const maxLines = Math.max(...wrapped.map((w) => w.length));
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
    ctx.fillText("Daily Happy Sheet Report", padding, 62);

    ctx.fillStyle = "#334155";
    ctx.font = "500 16px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.fillText(fmtLongDate(date), padding, 86);

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
      const reportDate = logFilterDate || selectedDate;
      const reportRes = await getAdminDailyHappySheetReport(reportDate);
      if (!reportRes.data) {
        throw new Error(reportRes.error || "Failed to load daily report data.");
      }

      const canvas = buildReportCanvas(reportDate, reportRes.data);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (!b) reject(new Error("Failed to generate PNG image."));
          else resolve(b);
        }, "image/png");
      });
      downloadBlob(blob, `workforce-pro-happy-sheet-${reportDate}.png`);
    } catch (err: any) {
      console.error("PNG export failed", err);
      showFloatingToast({ type: "error", message: err?.message || "Failed to download PNG." });
    } finally {
      setIsExportingPng(false);
    }
  };

  if (!user) return null;

  return (
    <MySpaceShell>
      <div className="max-w-3xl mx-auto space-y-6 pb-20">
        {/* Form Card */}
        <div className="rounded-2xl p-6 md:p-8 shadow-sm lighthouse-card">
          {/* Header row: title + date picker */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <Sparkles size={24} className="lighthouse-accent" />
              <h3 className="text-xl font-bold text-[#2B124C] dark:text-purple-100">Share Your Joy</h3>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={15} className="lighthouse-muted" />
              <label className="text-xs font-medium text-[#854F6C] dark:text-purple-400">Entry Date</label>
              <input
                type="date"
                value={selectedDate}
                max={todayStr()}
                onChange={(e) => {
                  setSuccess(false);
                  setSelectedDate(e.target.value);
                }}
                className="h-8 px-2 rounded-lg text-sm focus:outline-none lighthouse-input-white"
              />
            </div>
          </div>

          {selectedDate !== todayStr() && (
            <div className="mb-4 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 lighthouse-date-note">
              <Calendar size={13} />
              Logging reflection for{" "}
              <span className="font-bold">{fmtLongDate(selectedDate)}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-medium border border-emerald-100 flex items-center gap-2">
              <CheckCircle2 size={18} />
              {isUpdate ? "Reflection saved successfully!" : "Your Joy has been shared! Keep shining."}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {([
              { label: "What Made You Happy? *", value: whatMadeYouHappy, set: setWhatMadeYouHappy, placeholder: "Share your moments of joy..." },
              { label: "What Made Others Happy? *", value: whatMadeOthersHappy, set: setWhatMadeOthersHappy, placeholder: "How did you brighten someone's day?" },
              { label: "Goals & Self-Satisfaction Without Greed *", value: goalsWithoutGreed, set: setGoalsWithoutGreed, placeholder: "What personal goals bring you fulfillment?" },
              { label: "Dreams That WorkForce Pro Can Make True *", value: dreamsSupported, set: setDreamsSupported, placeholder: "Share your aspirations where we can support you..." },
            ] as const).map(({ label, value, set, placeholder }) => (
              <div key={label}>
                <label className="block text-sm font-medium mb-1 text-[#522B5B] dark:text-purple-300">{label}</label>
                <textarea
                  value={value}
                  onChange={(e) => (set as any)(e.target.value)}
                  placeholder={placeholder}
                  className="w-full min-h-[100px] p-3 rounded-lg text-sm focus:outline-none transition-all resize-y lighthouse-input"
                />
              </div>
            ))}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed hover:opacity-90"
                style={{ background: "#522B5B" }}
              >
                {isSubmitting
                  ? <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  : isUpdate ? "Update Reflection" : "Sync Personal Pulse"}
              </button>
            </div>
          </form>
        </div>

        {/* Joy Log */}
        <div className="mt-8">
          {/* Log header + date filter */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="text-lg font-bold text-[#2B124C] dark:text-purple-100">Joy Log</h3>
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
              {logFilterDate && (
                <button
                  onClick={() => setLogFilterDate("")}
                  className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  title="Clear filter"
                >
                  <X size={14} className="lighthouse-muted" />
                </button>
              )}
              <div className="w-px h-5 bg-[#854F6C]/20" />
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={isExportingPng}
                className="h-8 px-2 flex items-center justify-center gap-1 rounded-lg border border-[#854F6C]/30 text-[#522B5B] dark:text-purple-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
                title="Download daily happy sheet PNG"
              >
                {isExportingPng ? (
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                ) : (
                  <>
                    <Download size={14} />
                    <span className="hidden sm:inline">Download</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {logFilterDate && (
            <p className="text-xs mb-3 text-[#854F6C] dark:text-purple-400">
              Showing entries for{" "}
              <span className="font-semibold text-[#522B5B] dark:text-purple-300">
                {fmtLongDate(logFilterDate)}
              </span>
            </p>
          )}

          {isLoadingLog ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-6 w-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#522B5B", borderTopColor: "transparent" }} />
            </div>
          ) : displayEntries.length === 0 ? (
            <div className="rounded-xl p-8 text-center text-sm lighthouse-empty">
              {logFilterDate
                ? `No entries found for ${new Date(logFilterDate + "T00:00:00").toLocaleDateString()}.`
                : "No reflections yet. Be the first to share your joy above!"}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {displayEntries.map((entry) => (
                <div key={entry.id} className="rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow lighthouse-inner-card">
                  {/* Avatar + name + date */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: colorFor(entry.user_id) }}
                    >
                      {getInitials(entry.user_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-[#2B124C] dark:text-purple-100">
                        {entry.user_name ?? entry.user_email ?? `User #${entry.user_id}`}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-[#854F6C] dark:text-purple-400">
                        <Calendar size={11} />
                        {new Date(entry.date + "T00:00:00").toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  {/* All 4 fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-lg p-3 lighthouse-sub-card">
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-[#854F6C] dark:text-purple-400">Happy Moment</p>
                      <p className="text-sm text-[#2B124C] dark:text-purple-100">{entry.what_made_you_happy}</p>
                    </div>
                    <div className="rounded-lg p-3 lighthouse-sub-card">
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-[#854F6C] dark:text-purple-400">Made Others Happy</p>
                      <p className="text-sm text-[#2B124C] dark:text-purple-100">{entry.what_made_others_happy}</p>
                    </div>
                    <div className="rounded-lg p-3 lighthouse-sub-card">
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-[#854F6C] dark:text-purple-400">Goals</p>
                      <p className="text-sm text-[#2B124C] dark:text-purple-100">{entry.goals_without_greed}</p>
                    </div>
                    <div className="rounded-lg p-3 lighthouse-sub-card">
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-[#854F6C] dark:text-purple-400">Dreams</p>
                      <p className="text-sm text-[#2B124C] dark:text-purple-100">{entry.dreams_supported}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MySpaceShell>
  );
}
