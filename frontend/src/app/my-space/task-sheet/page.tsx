"use client";

import { useState, useEffect } from "react";
import MySpaceShell from "@/components/my-space/MySpaceShell";
import { useAuth } from "@/components/AuthProvider";
import { Calendar, CheckCircle2, Link2, Swords, Pencil, Trash2 } from "lucide-react";
import { submitTaskSheet, getMyTaskSheets, TaskSheetEntry, updateTaskSheetEntry, deleteTaskSheetEntry } from "@/lib/api";

const todayStr = () => new Date().toISOString().split("T")[0];

export default function TaskSheetPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [achievements, setAchievements] = useState("");
  const [repoLink, setRepoLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<TaskSheetEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => { fetchHistory(); }, []);

  useEffect(() => {
    if (!history.length) {
      setAchievements("");
      setRepoLink("");
      setIsUpdate(false);
      return;
    }
    const selectedEntry = history.find((e) => e.date === selectedDate);
    if (selectedEntry) {
      setAchievements(selectedEntry.achievements);
      setRepoLink(selectedEntry.repo_link || "");
      setIsUpdate(true);
    } else {
      setAchievements("");
      setRepoLink("");
      setIsUpdate(false);
    }
  }, [history, selectedDate]);

  // Initial load: fetch task history for date-based editing
  const fetchHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const res = await getMyTaskSheets();
      if (res.data) {
        setHistory(res.data);
      }
    } catch (err) {
      console.error("Failed to load history", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // After submit: refresh list only, do NOT re-populate fields
  const refreshHistoryList = async () => {
    try {
      const res = await getMyTaskSheets();
      if (res.data) setHistory(res.data);
    } catch (err) {
      console.error("Failed to refresh history", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!achievements.trim()) { setError("Please describe your achievements for the selected date."); return; }
    setIsSubmitting(true); setError(null); setSuccess(false);
    try {
      const payload = { achievements, repo_link: repoLink || undefined, date: selectedDate };
      const res = editingEntryId
        ? await updateTaskSheetEntry(editingEntryId, payload)
        : await submitTaskSheet(payload);
      if (res.error) { setError(res.error); }
      else {
        setSuccess(true);
        setIsUpdate(true);
        setEditingEntryId(null);
        await refreshHistoryList();
        setTimeout(() => setSuccess(false), 5000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit task sheet.");
    } finally { setIsSubmitting(false); }
  };

  const handleEditEntry = (entry: TaskSheetEntry) => {
    setSelectedDate(entry.date);
    setAchievements(entry.achievements);
    setRepoLink(entry.repo_link || "");
    setIsUpdate(true);
    setEditingEntryId(entry.id);
    setSuccess(false);
    setError(null);
  };

  const handleDeleteEntry = async (entry: TaskSheetEntry) => {
    const ok = window.confirm(`Delete your task sheet entry for ${new Date(entry.date + "T00:00:00").toLocaleDateString()}?`);
    if (!ok) return;
    const res = await deleteTaskSheetEntry(entry.id);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (editingEntryId === entry.id) {
      setEditingEntryId(null);
      setAchievements("");
      setRepoLink("");
      setIsUpdate(false);
    }
    await refreshHistoryList();
  };

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
          {error && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">⚠️ {error}</div>}
          {success && <div className="mb-6 p-4 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-medium border border-emerald-100 flex items-center gap-2"><CheckCircle2 size={18} />Task sheet saved successfully for {new Date(selectedDate + "T00:00:00").toLocaleDateString()}.</div>}
          <div className="mb-5 flex items-center gap-2">
            <Calendar size={15} className="lighthouse-muted" />
            <label className="text-xs font-medium text-[#854F6C] dark:text-purple-400">Entry Date</label>
            <input
              type="date"
              value={selectedDate}
              max={todayStr()}
              onChange={(e) => {
                setSuccess(false);
                setError(null);
                setSelectedDate(e.target.value);
              }}
              className="h-8 px-2 rounded-lg text-sm focus:outline-none transition-all lighthouse-input-white"
            />
          </div>
          {selectedDate !== todayStr() && (
            <div className="mb-4 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 lighthouse-date-note">
              <Calendar size={13} />
              Backfilling task sheet for <span className="font-bold">{new Date(selectedDate + "T00:00:00").toLocaleDateString()}</span>
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

        {/* History */}
        <div className="mt-8">
          <h3 className="text-lg font-bold mb-4 text-[#2B124C] dark:text-purple-100">Recent Mission History</h3>
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-10"><div className="h-6 w-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#522B5B", borderTopColor: "transparent" }} /></div>
          ) : history.length === 0 ? (
            <div className="rounded-xl p-8 text-center text-sm lighthouse-empty">No mission records found. Log your first victory above.</div>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => (
                <div key={entry.id} className="rounded-xl p-5 shadow-sm transition-shadow hover:shadow-md lighthouse-inner-card">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 font-semibold text-sm text-[#522B5B] dark:text-purple-300">
                      <Calendar size={14} />
                      {new Date(entry.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                    </div>
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
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed text-sm text-[#2B124C] dark:text-purple-100">{entry.achievements}</p>
                  {entry.repo_link && (
                      <a href={entry.repo_link} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:opacity-80 lighthouse-repo-link">
                      <Link2 size={12} /> View Repository
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MySpaceShell>
  );
}
