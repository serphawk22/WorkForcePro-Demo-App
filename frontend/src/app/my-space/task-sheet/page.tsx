"use client";

import { useState, useEffect } from "react";
import MySpaceShell from "@/components/my-space/MySpaceShell";
import { useAuth } from "@/components/AuthProvider";
import { Calendar, CheckCircle2, Link2, Swords } from "lucide-react";
import { submitTaskSheet, getMyTaskSheets, TaskSheetEntry } from "@/lib/api";

export default function TaskSheetPage() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState("");
  const [repoLink, setRepoLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<TaskSheetEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => { fetchHistory(); }, []);

  // Initial load: pre-populate form if today's entry already exists
  const fetchHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const res = await getMyTaskSheets();
      if (res.data) {
        setHistory(res.data);
        const today = new Date().toISOString().split("T")[0];
        const todayEntry = res.data.find((e) => e.date === today);
        if (todayEntry) {
          setAchievements(todayEntry.achievements);
          setRepoLink(todayEntry.repo_link || "");
          setIsUpdate(true);
        } else {
          setIsUpdate(false);
        }
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
    if (!achievements.trim()) { setError("Please describe your achievements today."); return; }
    setIsSubmitting(true); setError(null); setSuccess(false);
    try {
      const res = await submitTaskSheet({ achievements, repo_link: repoLink || undefined });
      if (res.error) { setError(res.error); }
      else {
        setSuccess(true);
        setAchievements("");
        setRepoLink("");
        setIsUpdate(true);
        refreshHistoryList();
        setTimeout(() => setSuccess(false), 5000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit task sheet.");
    } finally { setIsSubmitting(false); }
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
          {success && <div className="mb-6 p-4 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-medium border border-emerald-100 flex items-center gap-2"><CheckCircle2 size={18} />{isUpdate ? "Today's log updated successfully!" : "Performance logged successfully! Keep up the great work."}</div>}
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
                {isSubmitting ? <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : isUpdate ? "Update Today's Log" : "Publish Strategic Log"}
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
                  <div className="flex items-center gap-1.5 font-semibold text-sm mb-3 text-[#522B5B] dark:text-purple-300">
                    <Calendar size={14} />
                    {new Date(entry.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
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
