"use client";

import { useState, useEffect } from "react";
import MySpaceShell from "@/components/my-space/MySpaceShell";
import { useAuth } from "@/components/AuthProvider";
import { Calendar, Sparkles, Filter, Download, Send, MessageSquare, Plus, Star, Flame, Brain, Pencil, Trash2 } from "lucide-react";
import { showFloatingToast } from "@/components/ui/FloatingToast";
import {
  submitHappySheet,
  updateHappySheetEntry,
  deleteHappySheetEntry,
  getMyHappySheets,
  getAllTeamHappySheets,
  getTeamHappySheetsByDate,
  getAdminDailyHappySheetReport,
  HappySheetEntry,
  HappySheetReactionSummary,
  HappySheetCommentEntry,
  getHappySheetReactions,
  toggleHappySheetReaction,
  getHappySheetComments,
  addHappySheetComment,
  HappySheetAppreciationEntry,
  HappySheetStreakEntry,
  HappySheetWeeklyHighlightEntry,
  HappySheetLeaderboardEntry,
  HappySheetAiInsights,
  getHappySheetAppreciations,
  addHappySheetAppreciation,
  getHappySheetStreaks,
  getHappySheetWeeklyHighlights,
  getHappySheetWeeklyLeaderboard,
  getHappySheetWeeklyAiInsights,
} from "@/lib/api";

const AVATAR_COLORS = [
  "#522B5B", "#854F6C", "#2B124C", "#7C3D6B", "#9C4E7A",
  "#6B3A5F", "#3D1A4A", "#A05070", "#5A2E54", "#8B4565",
];
const getInitials = (name?: string | null) =>
  name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";
const colorFor = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];
const DEFAULT_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
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
  const [dreamsForSerphawk, setDreamsForSerphawk] = useState("");
  const [dreamsWithSerphawk, setDreamsWithSerphawk] = useState("");
  const [goalsWithoutGreedImpossible, setGoalsWithoutGreedImpossible] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);

  // ── Joy Log state ───────────────────────────────────────────
  const [teamHistory, setTeamHistory] = useState<HappySheetEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [logFilterDate, setLogFilterDate] = useState(todayStr());
  const [filteredTeam, setFilteredTeam] = useState<HappySheetEntry[]>([]);
  const [isLoadingFiltered, setIsLoadingFiltered] = useState(false);
  const [reactionsByEntry, setReactionsByEntry] = useState<Record<number, HappySheetReactionSummary[]>>({});
  const [commentsByEntry, setCommentsByEntry] = useState<Record<number, HappySheetCommentEntry[]>>({});
  const [commentInputByEntry, setCommentInputByEntry] = useState<Record<number, string>>({});
  const [replyTargetByEntry, setReplyTargetByEntry] = useState<Record<number, HappySheetCommentEntry | null>>({});
  const [customReactionByEntry, setCustomReactionByEntry] = useState<Record<number, string>>({});
  const [customReactionOpenEntryId, setCustomReactionOpenEntryId] = useState<number | null>(null);
  const [appreciationsByEntry, setAppreciationsByEntry] = useState<Record<number, HappySheetAppreciationEntry[]>>({});
  const [appreciationInputByEntry, setAppreciationInputByEntry] = useState<Record<number, string>>({});
  const [appreciationOpenEntryId, setAppreciationOpenEntryId] = useState<number | null>(null);

  const [streakByUser, setStreakByUser] = useState<Record<number, HappySheetStreakEntry>>({});
  const [weeklyHighlights, setWeeklyHighlights] = useState<HappySheetWeeklyHighlightEntry[]>([]);
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState<HappySheetLeaderboardEntry[]>([]);
  const [aiInsights, setAiInsights] = useState<HappySheetAiInsights | null>(null);

  const [isExportingPng, setIsExportingPng] = useState(false);
  const [pendingDeleteEntry, setPendingDeleteEntry] = useState<HappySheetEntry | null>(null);
  const [isDeletingEntry, setIsDeletingEntry] = useState(false);

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

  useEffect(() => {
    if (filteredTeam.length === 0) {
      setReactionsByEntry({});
      setCommentsByEntry({});
      setAppreciationsByEntry({});
      return;
    }

    const load = async () => {
      const reactionPairs = await Promise.all(
        filteredTeam.map(async (entry) => {
          const res = await getHappySheetReactions(entry.id);
          return [entry.id, res.data || []] as const;
        })
      );
      const commentPairs = await Promise.all(
        filteredTeam.map(async (entry) => {
          const res = await getHappySheetComments(entry.id);
          return [entry.id, res.data || []] as const;
        })
      );
      const appreciationPairs = await Promise.all(
        filteredTeam.map(async (entry) => {
          const res = await getHappySheetAppreciations(entry.id);
          return [entry.id, res.data || []] as const;
        })
      );
      const [streakRes, highlightsRes, leaderboardRes, insightsRes] = await Promise.all([
        getHappySheetStreaks(),
        getHappySheetWeeklyHighlights(),
        getHappySheetWeeklyLeaderboard(),
        getHappySheetWeeklyAiInsights(),
      ]);

      setReactionsByEntry(Object.fromEntries(reactionPairs));
      setCommentsByEntry(Object.fromEntries(commentPairs));
      setAppreciationsByEntry(Object.fromEntries(appreciationPairs));
      setStreakByUser(
        Object.fromEntries((streakRes.data || []).map((s) => [s.user_id, s]))
      );
      setWeeklyHighlights(highlightsRes.data || []);
      setWeeklyLeaderboard(leaderboardRes.data || []);
      setAiInsights(insightsRes.data || null);
    };

    load();
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, [filteredTeam]);

  const loadPersonalForDate = async (date: string) => {
    try {
      const res = await getMyHappySheets(365);
      if (res.data) {
        const entry = res.data.find((e) => e.date === date);
        if (entry) {
          setEditingEntryId(entry.id);
          setWhatMadeYouHappy(entry.what_made_you_happy);
          setWhatMadeOthersHappy(entry.what_made_others_happy);
          setDreamsForSerphawk(entry.goals_without_greed);
          setDreamsWithSerphawk(entry.dreams_supported);
          setGoalsWithoutGreedImpossible(entry.goals_without_greed_impossible || "");
          setIsUpdate(true);
        } else {
          setEditingEntryId(null);
          setWhatMadeYouHappy("");
          setWhatMadeOthersHappy("");
          setDreamsForSerphawk("");
          setDreamsWithSerphawk("");
          setGoalsWithoutGreedImpossible("");
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
    if (!whatMadeYouHappy.trim() || !whatMadeOthersHappy.trim() || !dreamsForSerphawk.trim() || !dreamsWithSerphawk.trim() || !goalsWithoutGreedImpossible.trim()) {
      showFloatingToast({ type: "error", message: "Please fill all required fields" });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        what_made_you_happy: whatMadeYouHappy,
        what_made_others_happy: whatMadeOthersHappy,
        goals_without_greed: dreamsForSerphawk,
        dreams_supported: dreamsWithSerphawk,
        goals_without_greed_impossible: goalsWithoutGreedImpossible,
        date: selectedDate,
      };
      const res = editingEntryId
        ? await updateHappySheetEntry(editingEntryId, payload)
        : await submitHappySheet(payload);
      if (res.error) {
        showFloatingToast({ type: "error", message: res.error });
      } else {
        setIsUpdate(true);
        setEditingEntryId(res.data?.id ?? null);
        if (!editingEntryId) {
          setWhatMadeYouHappy("");
          setWhatMadeOthersHappy("");
          setDreamsForSerphawk("");
          setDreamsWithSerphawk("");
          setGoalsWithoutGreedImpossible("");
        }
        // Refresh filtered view if active
        if (logFilterDate === selectedDate) {
          const r2 = await getTeamHappySheetsByDate(logFilterDate);
          if (r2.data) setFilteredTeam(r2.data);
        }
        await loadPersonalForDate(selectedDate);
        showFloatingToast({
          type: "success",
          message: editingEntryId ? "Personal pulse updated successfully." : "Personal pulse synced successfully.",
        });
      }
    } catch (err: any) {
      showFloatingToast({ type: "error", message: err?.message || "Failed to submit." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditEntry = (entry: HappySheetEntry) => {
    setSelectedDate(entry.date);
    setEditingEntryId(entry.id);
    setWhatMadeYouHappy(entry.what_made_you_happy);
    setWhatMadeOthersHappy(entry.what_made_others_happy);
    setDreamsForSerphawk(entry.goals_without_greed);
    setDreamsWithSerphawk(entry.dreams_supported);
    setGoalsWithoutGreedImpossible(entry.goals_without_greed_impossible || "");
    setIsUpdate(true);
    showFloatingToast({ type: "success", message: "Entry loaded for editing." });
  };

  const handleDeleteEntry = async (entry: HappySheetEntry) => {
    setPendingDeleteEntry(entry);
  };

  const confirmDeleteEntry = async () => {
    if (!pendingDeleteEntry) return;
    setIsDeletingEntry(true);
    const entry = pendingDeleteEntry;
    const res = await deleteHappySheetEntry(entry.id);
    if (res.error) {
      showFloatingToast({ type: "error", message: res.error });
      setIsDeletingEntry(false);
      return;
    }

    if (editingEntryId === entry.id) {
      setEditingEntryId(null);
      setIsUpdate(false);
      setWhatMadeYouHappy("");
      setWhatMadeOthersHappy("");
      setDreamsForSerphawk("");
      setDreamsWithSerphawk("");
      setGoalsWithoutGreedImpossible("");
    }

    if (logFilterDate === entry.date) {
      const r2 = await getTeamHappySheetsByDate(logFilterDate);
      setFilteredTeam(r2.data || []);
    }
    await loadTeamHistory();
    setPendingDeleteEntry(null);
    setIsDeletingEntry(false);
    showFloatingToast({ type: "delete", message: "Entry deleted." });
  };

  const refreshEntryInteractions = async (entryId: number) => {
    const [reactionRes, commentRes, appreciationRes] = await Promise.all([
      getHappySheetReactions(entryId),
      getHappySheetComments(entryId),
      getHappySheetAppreciations(entryId),
    ]);

    setReactionsByEntry((prev) => ({
      ...prev,
      [entryId]: reactionRes.data || [],
    }));
    setCommentsByEntry((prev) => ({
      ...prev,
      [entryId]: commentRes.data || [],
    }));
    setAppreciationsByEntry((prev) => ({
      ...prev,
      [entryId]: appreciationRes.data || [],
    }));
  };

  const handleToggleReaction = async (entryId: number, emoji: string) => {
    const targetEmoji = (emoji || "").trim();
    if (!targetEmoji) return;
    const res = await toggleHappySheetReaction(entryId, targetEmoji);
    if (res.error) {
      showFloatingToast({ type: "error", message: res.error });
      return;
    }
    await refreshEntryInteractions(entryId);
  };

  const handleAddComment = async (entryId: number) => {
    const text = (commentInputByEntry[entryId] || "").trim();
    if (!text) return;

    const target = replyTargetByEntry[entryId];
    const res = await addHappySheetComment(entryId, {
      comment_text: text,
      parent_comment_id: target?.id || null,
    });

    if (res.error) {
      showFloatingToast({ type: "error", message: res.error });
      return;
    }

    setCommentInputByEntry((prev) => ({ ...prev, [entryId]: "" }));
    setReplyTargetByEntry((prev) => ({ ...prev, [entryId]: null }));
    await refreshEntryInteractions(entryId);
  };

  const handleAddAppreciation = async (entryId: number) => {
    const message = (appreciationInputByEntry[entryId] || "").trim();
    if (!message) return;

    const res = await addHappySheetAppreciation(entryId, { message });
    if (res.error) {
      showFloatingToast({ type: "error", message: res.error });
      return;
    }

    setAppreciationInputByEntry((prev) => ({ ...prev, [entryId]: "" }));
    setAppreciationOpenEntryId(null);
    await refreshEntryInteractions(entryId);

    const [highlightsRes, leaderboardRes] = await Promise.all([
      getHappySheetWeeklyHighlights(),
      getHappySheetWeeklyLeaderboard(),
    ]);
    setWeeklyHighlights(highlightsRes.data || []);
    setWeeklyLeaderboard(leaderboardRes.data || []);
  };

  const displayEntries = filteredTeam;
  const isLoadingLog = isLoadingFiltered;

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
    const colWidths = [240, 280, 280, 280, 280, 280];
    const headers = ["Employee Name", "Happy Today", "Made Others Happy", "My Dreams for serphawk", "My Dreams with serphawk", "Goals (No Greed)"];
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
        row.goals_without_greed_impossible || "-",
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
    if (user?.role !== "admin") return;
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
          if (!b) reject(new Error("Failed to generate JPEG image."));
          else resolve(b);
        }, "image/jpeg", 0.95);
      });
      downloadBlob(blob, `workforce-pro-happy-sheet-${reportDate}.jpg`);
    } catch (err: any) {
      console.error("JPEG export failed", err);
      showFloatingToast({ type: "error", message: err?.message || "Failed to download JPEG." });
    } finally {
      setIsExportingPng(false);
    }
  };

  if (!user) return null;

  return (
    <MySpaceShell>
      <div className="max-w-3xl mx-auto space-y-6 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 rounded-2xl p-4 lighthouse-card">
            <div className="flex items-center gap-2 mb-3 text-[#2B124C] dark:text-purple-100">
              <Sparkles size={16} />
              <h3 className="text-sm font-semibold">Weekly Highlights</h3>
            </div>
            {weeklyHighlights.length === 0 ? (
              <p className="text-xs text-[#854F6C] dark:text-purple-300">No appreciations yet this week.</p>
            ) : (
              <div className="space-y-2">
                {weeklyHighlights.map((item) => (
                  <div key={item.entry_id} className="rounded-lg p-2 bg-white/70 dark:bg-white/5 border border-slate-200/70 dark:border-white/10">
                    <div className="text-xs font-semibold text-[#2B124C] dark:text-purple-100">{item.user_name}</div>
                    <div className="text-xs text-[#522B5B] dark:text-purple-200 truncate">{item.excerpt || "Shared a positive update"}</div>
                    <div className="text-[11px] text-[#854F6C] dark:text-purple-300 mt-1">⭐ {item.appreciation_count} Appreciations</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl p-4 lighthouse-card space-y-3">
            <div>
              <div className="text-sm font-semibold text-[#2B124C] dark:text-purple-100 mb-2">Top Positive Contributors</div>
              {weeklyLeaderboard.length === 0 ? (
                <p className="text-xs text-[#854F6C] dark:text-purple-300">No leaderboard data yet.</p>
              ) : (
                <div className="space-y-1 text-xs">
                  {weeklyLeaderboard.map((item, idx) => (
                    <div key={item.user_id} className="flex items-center justify-between text-[#522B5B] dark:text-purple-200">
                      <span>{idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"} {item.user_name}</span>
                      <span>⭐ {item.appreciation_count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="pt-2 border-t border-slate-200/70 dark:border-white/10">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#2B124C] dark:text-purple-100 mb-2">
                <Brain size={14} /> AI Insights
              </div>
              {aiInsights ? (
                <ul className="space-y-1 text-xs text-[#522B5B] dark:text-purple-200">
                  {aiInsights.bullets.map((b, i) => (
                    <li key={i}>• {b}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[#854F6C] dark:text-purple-300">Insights are generating...</p>
              )}
            </div>
          </div>
        </div>

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

          <form onSubmit={handleSubmit} className="space-y-5">
            {([
              { label: "What Made You Happy? *", value: whatMadeYouHappy, set: setWhatMadeYouHappy, placeholder: "Share your moments of joy..." },
              { label: "What Made Others Happy? *", value: whatMadeOthersHappy, set: setWhatMadeOthersHappy, placeholder: "How did you brighten someone's day?" },
              { label: "My Dreams for serphawk *", value: dreamsForSerphawk, set: setDreamsForSerphawk, placeholder: "Share your dreams for serphawk..." },
              { label: "My Dreams with serphawk that serphawk can help reach *", value: dreamsWithSerphawk, set: setDreamsWithSerphawk, placeholder: "Share your dreams that we can support you with..." },
              { label: "Goals without any greed even if it is impossible *", value: goalsWithoutGreedImpossible, set: setGoalsWithoutGreedImpossible, placeholder: "What goals matter to you regardless of greed?" },
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
                  : editingEntryId ? "Save Edited Reflection" : isUpdate ? "Update Reflection" : "Sync Personal Pulse"}
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
              <div className="w-px h-5 bg-[#854F6C]/20" />
              {user.role === "admin" && (
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
              )}
            </div>
          </div>

          <p className="text-xs mb-3 text-[#854F6C] dark:text-purple-400">
              Showing entries for{" "}
              <span className="font-semibold text-[#522B5B] dark:text-purple-300">
                {fmtLongDate(logFilterDate)}
              </span>
          </p>

          {isLoadingLog ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-6 w-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#522B5B", borderTopColor: "transparent" }} />
            </div>
          ) : displayEntries.length === 0 ? (
            <div className="rounded-xl p-8 text-center text-sm lighthouse-empty">
              No entries found for {new Date(logFilterDate + "T00:00:00").toLocaleDateString()}.
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
                      <div className="flex items-center gap-2 text-xs text-[#854F6C] dark:text-purple-400">
                        <Calendar size={11} />
                        {new Date(entry.date + "T00:00:00").toLocaleDateString()}
                        {(streakByUser[entry.user_id]?.current_streak || 0) > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full bg-orange-100/80 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300">
                            <Flame size={10} /> {streakByUser[entry.user_id].current_streak} days
                          </span>
                        )}
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
                  {/* All 5 fields */}
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
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-[#854F6C] dark:text-purple-400">My Dreams for serphawk</p>
                      <p className="text-sm text-[#2B124C] dark:text-purple-100">{entry.goals_without_greed}</p>
                    </div>
                    <div className="rounded-lg p-3 lighthouse-sub-card">
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-[#854F6C] dark:text-purple-400">My Dreams with serphawk</p>
                      <p className="text-sm text-[#2B124C] dark:text-purple-100">{entry.dreams_supported}</p>
                    </div>
                    <div className="rounded-lg p-3 lighthouse-sub-card lg:col-span-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-[#854F6C] dark:text-purple-400">Goals (No Greed)</p>
                      <p className="text-sm text-[#2B124C] dark:text-purple-100">{entry.goals_without_greed_impossible || "—"}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg p-3 bg-slate-100/70 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {(reactionsByEntry[entry.id] || []).slice(0, 3).map((reaction) => (
                        <button
                          key={`${entry.id}-${reaction.emoji}`}
                          type="button"
                          title={reaction.users.join("\n")}
                          onClick={() => handleToggleReaction(entry.id, reaction.emoji)}
                          className={`px-2 py-1 rounded-full text-xs border transition-colors ${reaction.reacted_by_me ? "bg-[#522B5B] text-white border-[#522B5B]" : "bg-white/80 dark:bg-white/10 text-[#2B124C] dark:text-purple-100 border-slate-300/70 dark:border-white/20"}`}
                        >
                          {reaction.emoji} {reaction.count}
                        </button>
                      ))}
                      {(reactionsByEntry[entry.id] || []).length > 3 && (
                        <span className="text-xs text-[#854F6C] dark:text-purple-300">
                          +{(reactionsByEntry[entry.id] || []).length - 3} more
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {DEFAULT_REACTIONS.map((emoji) => (
                        <button
                          key={`${entry.id}-default-${emoji}`}
                          type="button"
                          onClick={() => handleToggleReaction(entry.id, emoji)}
                          className="h-7 min-w-7 px-2 rounded-full border border-slate-300/70 dark:border-white/20 text-sm hover:bg-slate-200/70 dark:hover:bg-white/15"
                          title={`React ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="h-7 px-2 rounded-full border border-slate-300/70 dark:border-white/20 text-xs text-[#522B5B] dark:text-purple-200 flex items-center gap-1 hover:bg-slate-200/70 dark:hover:bg-white/15"
                        onClick={() => setCustomReactionOpenEntryId((prev) => (prev === entry.id ? null : entry.id))}
                        title="Add custom emoji (use your system emoji keyboard)"
                      >
                        <Plus size={12} /> Reaction
                      </button>
                      {customReactionOpenEntryId === entry.id && (
                        <input
                          value={customReactionByEntry[entry.id] || ""}
                          onChange={(e) =>
                            setCustomReactionByEntry((prev) => ({ ...prev, [entry.id]: e.target.value }))
                          }
                          onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              await handleToggleReaction(entry.id, customReactionByEntry[entry.id] || "");
                              setCustomReactionByEntry((prev) => ({ ...prev, [entry.id]: "" }));
                              setCustomReactionOpenEntryId(null);
                            }
                          }}
                          placeholder="😀"
                          className="h-7 w-16 px-2 rounded-md text-sm lighthouse-input-white"
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="rounded-md p-2 bg-white/80 dark:bg-white/5 border border-slate-200/70 dark:border-white/10">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs text-[#522B5B] dark:text-purple-200">⭐ {(appreciationsByEntry[entry.id] || []).length} Appreciations</div>
                          <button
                            type="button"
                            className="h-7 px-2 rounded-md border border-slate-300/70 dark:border-white/20 text-xs text-[#522B5B] dark:text-purple-200 flex items-center gap-1 hover:bg-slate-200/70 dark:hover:bg-white/15"
                            onClick={() => setAppreciationOpenEntryId((prev) => (prev === entry.id ? null : entry.id))}
                          >
                            <Star size={12} /> Appreciate
                          </button>
                        </div>
                        {appreciationOpenEntryId === entry.id && (
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              value={appreciationInputByEntry[entry.id] || ""}
                              onChange={(e) =>
                                setAppreciationInputByEntry((prev) => ({ ...prev, [entry.id]: e.target.value }))
                              }
                              onKeyDown={async (e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  await handleAddAppreciation(entry.id);
                                }
                              }}
                              placeholder="Write appreciation message..."
                              className="flex-1 h-8 px-2 rounded-md text-xs lighthouse-input-white"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddAppreciation(entry.id)}
                              className="h-8 w-8 rounded-md bg-[#522B5B] text-white flex items-center justify-center hover:opacity-90"
                              title="Send appreciation"
                            >
                              <Send size={14} />
                            </button>
                          </div>
                        )}

                        {(appreciationsByEntry[entry.id] || []).length > 0 && (
                          <div className="mt-2 space-y-1 max-h-32 overflow-y-auto pr-1">
                            {(appreciationsByEntry[entry.id] || []).map((a) => (
                              <div key={a.id} className="text-xs text-[#522B5B] dark:text-purple-200">
                                <span className="font-semibold">⭐ Appreciated by {a.from_user_name || a.from_user_email || `User #${a.from_user_id}`}</span>
                                <div className="text-[#854F6C] dark:text-purple-300">&quot;{a.message}&quot;</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-[#854F6C] dark:text-purple-300">
                        <MessageSquare size={13} /> Comments
                      </div>

                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {(commentsByEntry[entry.id] || []).map((comment) => (
                          <div key={comment.id} className="rounded-md px-2 py-1.5 bg-white/80 dark:bg-white/5 border border-slate-200/70 dark:border-white/10">
                            <div className="flex items-start gap-2">
                              <div
                                className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                                style={{ background: colorFor(comment.user_id) }}
                              >
                                {getInitials(comment.user_name)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 text-[11px]">
                                  <span className="font-semibold text-[#2B124C] dark:text-purple-100">
                                    {comment.user_name || comment.user_email || `User #${comment.user_id}`}
                                  </span>
                                  <span className="text-[#854F6C] dark:text-purple-400">
                                    {new Date(comment.created_at).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-xs text-[#2B124C] dark:text-purple-100 break-words">{comment.comment_text}</p>
                                <button
                                  type="button"
                                  className="text-[11px] text-[#854F6C] dark:text-purple-300 hover:underline"
                                  onClick={() => {
                                    setReplyTargetByEntry((prev) => ({ ...prev, [entry.id]: comment }));
                                    setCommentInputByEntry((prev) => ({ ...prev, [entry.id]: `@${comment.user_name || "team"} ` }));
                                  }}
                                >
                                  Reply
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {replyTargetByEntry[entry.id] && (
                        <div className="text-[11px] text-[#854F6C] dark:text-purple-300">
                          Replying to {replyTargetByEntry[entry.id]?.user_name || "comment"}
                          <button
                            type="button"
                            className="ml-2 underline"
                            onClick={() => setReplyTargetByEntry((prev) => ({ ...prev, [entry.id]: null }))}
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <input
                          value={commentInputByEntry[entry.id] || ""}
                          onChange={(e) =>
                            setCommentInputByEntry((prev) => ({ ...prev, [entry.id]: e.target.value }))
                          }
                          onKeyDown={async (e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              await handleAddComment(entry.id);
                            }
                          }}
                          placeholder="Write a comment..."
                          className="flex-1 h-8 px-2 rounded-md text-xs lighthouse-input-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddComment(entry.id)}
                          className="h-8 w-8 rounded-md bg-[#522B5B] text-white flex items-center justify-center hover:opacity-90"
                          title="Send comment"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {pendingDeleteEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200/70 dark:border-white/15 bg-white dark:bg-[#221038] p-5 shadow-xl">
            <h4 className="text-base font-bold text-[#2B124C] dark:text-purple-100">Delete Entry?</h4>
            <p className="mt-2 text-sm text-[#854F6C] dark:text-purple-300">
              Delete your happy sheet entry for <span className="font-semibold">{fmtLongDate(pendingDeleteEntry.date)}</span>?
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
    </MySpaceShell>
  );
}
