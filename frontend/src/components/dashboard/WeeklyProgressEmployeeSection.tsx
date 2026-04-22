"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { ClipboardList, Loader2, Send, ExternalLink, MessageSquareWarning } from "lucide-react";
import { toast } from "sonner";
import {
  getMyWeeklyProgress,
  upsertMyWeeklyProgress,
  updateMyWeeklyProgress,
  markWeeklyCommentsSeen,
  postMyWeeklyComment,
  getMyOrganizationSettings,
  type WeeklyProgressEntry,
} from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import RichTextEditor from "@/components/dashboard/RichTextEditor";
import {
  buildWeeklyDescription,
  htmlToPlainText,
  normalizePointerLines,
  parseWeeklyDescription,
  resolveExternalUrl,
  sanitizeRichTextHtml,
} from "@/lib/weeklyProgress";

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
  "--admin-card-accent": "142 76% 36%",
  "--admin-card-accent-secondary": "199 89% 48%",
};

export default function WeeklyProgressEmployeeSection() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<WeeklyProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [featureEnabled, setFeatureEnabled] = useState(true);

  const defaultWeekMonday = useMemo(() => mondayOfDate(new Date()), []);
  const [weekPicker, setWeekPicker] = useState(toYMD(defaultWeekMonday));
  const [weeklyEntry, setWeeklyEntry] = useState("");
  const [highlights, setHighlights] = useState("");
  const [difficulties, setDifficulties] = useState("");
  const [githubLink, setGithubLink] = useState("");
  const [deployedLink, setDeployedLink] = useState("");
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [postingReplyId, setPostingReplyId] = useState<number | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    const orgRes = await getMyOrganizationSettings();
    if (orgRes.data && user?.role) {
      const enabled = user.role === "admin"
        ? orgRes.data.weekly_progress_enabled_for_admin
        : orgRes.data.weekly_progress_enabled_for_employee;
      setFeatureEnabled(enabled);
      if (!enabled) {
        setEntries([]);
        setLoading(false);
        return;
      }
    }

    const res = await getMyWeeklyProgress();
    if (res.data) setEntries(res.data);
    setLoading(false);
  }, [user?.role]);

  useEffect(() => {
    load();
  }, [load]);

  const weekStartForForm = useMemo(() => toYMD(mondayOfDate(new Date(weekPicker + "T12:00:00"))), [weekPicker]);

  const currentWeekEntry = entries.find((e) => e.week_start_date === weekStartForForm);

  useEffect(() => {
    if (currentWeekEntry) {
      const parsed = parseWeeklyDescription(currentWeekEntry.description);
      setWeeklyEntry(parsed.weeklyEntry);
      setHighlights(parsed.highlights);
      setDifficulties(parsed.difficulties);
      setGithubLink(currentWeekEntry.github_link || "");
      setDeployedLink(currentWeekEntry.deployed_link || "");
    } else {
      setWeeklyEntry("");
      setHighlights("");
      setDifficulties("");
      setGithubLink("");
      setDeployedLink("");
    }
  }, [currentWeekEntry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (htmlToPlainText(weeklyEntry).trim().length < 10) {
      toast.error("Weekly entry must be at least 10 characters.");
      return;
    }
    const description = buildWeeklyDescription(sanitizeRichTextHtml(weeklyEntry), highlights, difficulties);
    setSaving(true);
    try {
      if (currentWeekEntry) {
        const res = await updateMyWeeklyProgress(currentWeekEntry.id, {
          description,
          github_link: githubLink.trim() || undefined,
          deployed_link: deployedLink.trim() || undefined,
        });
        if (res.error) toast.error(res.error);
        else {
          toast.success("Weekly progress updated.");
          await load();
        }
      } else {
        const res = await upsertMyWeeklyProgress({
          week_start_date: weekStartForForm,
          description,
          github_link: githubLink.trim() || undefined,
          deployed_link: deployedLink.trim() || undefined,
        });
        if (res.error) toast.error(res.error);
        else {
          toast.success("Weekly progress submitted.");
          await load();
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const openComments = async (entry: WeeklyProgressEntry) => {
    if (entry.has_unread_comments) {
      await markWeeklyCommentsSeen(entry.id);
      await load();
    }
  };

  const submitReply = async (entryId: number) => {
    const text = (replyText[entryId] || "").trim();
    if (!text) {
      toast.error("Enter a comment first.");
      return;
    }
    setPostingReplyId(entryId);
    const res = await postMyWeeklyComment(entryId, text);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Comment shared.");
      setReplyText((prev) => ({ ...prev, [entryId]: "" }));
      await load();
    }
    setPostingReplyId(null);
  };

  const formatWeek = (ymd: string) => {
    const start = new Date(ymd + "T12:00:00");
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  };

  return (
    <div
      className="admin-dashboard-card rounded-xl glass-card glow-sm"
      style={accent}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-lg font-bold text-card-foreground flex items-center gap-2">
            <div className="admin-dashboard-card-icon p-2 rounded-lg bg-emerald-600 shadow-lg shadow-emerald-600/35">
              <ClipboardList size={18} className="text-white" />
            </div>
            Weekly Progress
          </h3>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !featureEnabled ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">Weekly Progress is currently disabled for your role by your organization admin.</p>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">Submit or update this week</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Week (pick any day — we use that calendar week)</label>
                  <input
                    type="date"
                    value={weekPicker}
                    onChange={(e) => setWeekPicker(e.target.value)}
                    className="w-full rounded-lg py-2 px-3 text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Reporting week: {formatWeek(weekStartForForm)}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Weekly Entry *</label>
                  <RichTextEditor
                    value={weeklyEntry}
                    onChange={setWeeklyEntry}
                    placeholder="Summarize what you delivered this week, key outcomes, and plan for next week..."
                    minHeightClassName="min-h-[220px]"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">Formatting is supported for emphasis, lists, and structure.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">Highlights (Pointers)</label>
                  <textarea
                    value={highlights}
                    onChange={(e) => setHighlights(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg py-2 px-3 text-sm bg-background border border-emerald-500/30 text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/35"
                    placeholder={"One point per line\nCompleted login bug fix\nImproved deployment stability"}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Use one pointer per line.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">Difficulties / Abnormalities (Pointers)</label>
                  <textarea
                    value={difficulties}
                    onChange={(e) => setDifficulties(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg py-2 px-3 text-sm bg-background border border-amber-500/30 text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/35"
                    placeholder={"One point per line\nAPI timeout issue in staging\nUnexpected dependency conflict"}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Capture blockers, risks, or unusual incidents as pointers.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">GitHub link (optional)</label>
                  <input
                    type="url"
                    value={githubLink}
                    onChange={(e) => setGithubLink(e.target.value)}
                    className="w-full rounded-lg py-2 px-3 text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="https://github.com/..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Deployed link (optional)</label>
                  <input
                    type="url"
                    value={deployedLink}
                    onChange={(e) => setDeployedLink(e.target.value)}
                    className="w-full rounded-lg py-2 px-3 text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="https://..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {currentWeekEntry ? "Update entry" : "Submit entry"}
                </button>
              </form>
            </div>

            <div>
              <p className="text-sm font-semibold text-foreground mb-3">Past submissions</p>
              {entries.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center rounded-xl border border-dashed border-border">
                  No entries yet. Submit your first weekly update.
                </p>
              ) : (
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className={`rounded-xl border p-4 transition-colors ${
                        entry.has_unread_comments
                          ? "border-amber-500/50 bg-amber-500/5 dark:bg-amber-500/10"
                          : "border-border bg-card/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="text-xs font-bold text-primary">{formatWeek(entry.week_start_date)}</p>
                          {entry.has_unread_comments && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                              <MessageSquareWarning size={12} />
                              New admin comment
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setWeekPicker(entry.week_start_date);
                            const parsed = parseWeeklyDescription(entry.description);
                            setWeeklyEntry(parsed.weeklyEntry);
                            setHighlights(parsed.highlights);
                            setDifficulties(parsed.difficulties);
                            setGithubLink(entry.github_link || "");
                            setDeployedLink(entry.deployed_link || "");
                          }}
                          className="text-[10px] font-semibold text-primary hover:underline"
                        >
                          Load in form
                        </button>
                      </div>
                      {(() => {
                        const parsed = parseWeeklyDescription(entry.description);
                        const highlightPointers = normalizePointerLines(parsed.highlights);
                        const difficultyPointers = normalizePointerLines(parsed.difficulties);
                        const githubHref = resolveExternalUrl(entry.github_link);
                        const deployedHref = resolveExternalUrl(entry.deployed_link);
                        const weeklyEntryHtml = sanitizeRichTextHtml(parsed.weeklyEntry || entry.description || "");
                        return (
                          <div className="space-y-2">
                            <div>
                              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Weekly Entry</p>
                              <div
                                className="text-xs text-card-foreground line-clamp-4 overflow-hidden [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:ml-4 [&_ol]:ml-4"
                                dangerouslySetInnerHTML={{ __html: weeklyEntryHtml }}
                              />
                            </div>
                            {highlightPointers.length > 0 && (
                              <div>
                                <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Highlights</p>
                                <ul className="mt-1 space-y-1">
                                  {highlightPointers.slice(0, 3).map((item, idx) => (
                                    <li key={`${entry.id}-h-${idx}`} className="text-xs text-card-foreground">• {item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {difficultyPointers.length > 0 && (
                              <div>
                                <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Difficulties / Abnormalities</p>
                                <ul className="mt-1 space-y-1">
                                  {difficultyPointers.slice(0, 3).map((item, idx) => (
                                    <li key={`${entry.id}-d-${idx}`} className="text-xs text-card-foreground">• {item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {githubHref && (
                          <a
                            href={githubHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-medium text-blue-600 dark:text-blue-400 inline-flex items-center gap-0.5 hover:underline"
                          >
                            GitHub <ExternalLink size={10} />
                          </a>
                        )}
                        {deployedHref && (
                          <a
                            href={deployedHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-medium text-violet-600 dark:text-violet-400 inline-flex items-center gap-0.5 hover:underline"
                          >
                            Deployed <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t border-border/60 space-y-2">
                        <button
                          type="button"
                          onClick={() => openComments(entry)}
                          className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground"
                        >
                          Weekly comments ({entry.comments.length})
                        </button>
                        {entry.comments.length > 0 ? (
                          entry.comments.map((c) => (
                            <div key={c.id} className="text-xs rounded-lg bg-secondary/50 dark:bg-secondary/30 px-2 py-1.5 border border-border/50">
                              <span className="font-semibold text-foreground">{c.admin_name || "Team"}</span>
                              <span className="text-muted-foreground text-[10px] ml-2">
                                {new Date(c.created_at).toLocaleString()}
                              </span>
                              <p className="text-card-foreground mt-1 whitespace-pre-wrap">{c.comment}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-[11px] text-muted-foreground">No comments yet.</p>
                        )}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={replyText[entry.id] || ""}
                            onChange={(e) => setReplyText((prev) => ({ ...prev, [entry.id]: e.target.value }))}
                            placeholder="Add comment or resource link..."
                            className="flex-1 rounded-md py-1.5 px-2 text-xs bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                          <button
                            type="button"
                            onClick={() => submitReply(entry.id)}
                            disabled={postingReplyId === entry.id || !(replyText[entry.id] || "").trim()}
                            className="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground disabled:opacity-50"
                          >
                            {postingReplyId === entry.id ? "..." : "Send"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
