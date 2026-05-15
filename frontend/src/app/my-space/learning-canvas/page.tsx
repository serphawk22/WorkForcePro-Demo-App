"use client";

import { useState, useEffect } from "react";
import NextImage from "next/image";
import MySpaceShell from "@/components/my-space/MySpaceShell";
import { useAuth } from "@/components/AuthProvider";
import { Folder, Lightbulb, Users, Plus, X, Pencil, Trash2 } from "lucide-react";
import { submitLearningFocus, getAllLearningFocuses, LearningFocusEntry, submitPersonalProject, getMyPersonalProjects, PersonalProjectEntry, updateLearningFocusEntry, deleteLearningFocusEntry, updatePersonalProjectEntry, deletePersonalProjectEntry } from "@/lib/api";
import { toast } from "sonner";

function getInitials(name: string) { return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2); }
const AVATAR_COLORS = ["#7C3AED", "#DB2777", "#D97706", "#059669", "#2563EB", "#DC2626"];
function colorFor(userId: number) { return AVATAR_COLORS[userId % AVATAR_COLORS.length]; }

export default function LearningCanvasPage() {
  const { user } = useAuth();
  const [focus, setFocus] = useState("");
  const [editingFocusId, setEditingFocusId] = useState<number | null>(null);
  const [isSubmittingFocus, setIsSubmittingFocus] = useState(false);
  const [teamFocuses, setTeamFocuses] = useState<LearningFocusEntry[]>([]);
  const [isLoadingFocuses, setIsLoadingFocuses] = useState(true);
  const [projects, setProjects] = useState<PersonalProjectEntry[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [showAddProject, setShowAddProject] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newStage, setNewStage] = useState<"old" | "current" | "future">("current");
  const [newTag, setNewTag] = useState("");
  const [newGithubLink, setNewGithubLink] = useState("");
  const [newDemoLink, setNewDemoLink] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newWriteup, setNewWriteup] = useState("");
  const [isAddingProject, setIsAddingProject] = useState(false);

  const loadFocuses = async () => { setIsLoadingFocuses(true); const r = await getAllLearningFocuses(50); if (r.data) setTeamFocuses(r.data); setIsLoadingFocuses(false); };
  const loadProjects = async () => { setIsLoadingProjects(true); const r = await getMyPersonalProjects(); if (r.data) setProjects(r.data); setIsLoadingProjects(false); };

  useEffect(() => { loadFocuses(); loadProjects(); }, []);

  const handleSubmitFocus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!focus.trim()) { toast.error("Please describe what you are learning."); return; }
    setIsSubmittingFocus(true);
    const result = editingFocusId
      ? await updateLearningFocusEntry(editingFocusId, { focus })
      : await submitLearningFocus({ focus });
    if (result.error) { toast.error(result.error); } else {
      toast.success(editingFocusId ? "Learning focus updated!" : "Focus shared!");
      setFocus("");
      setEditingFocusId(null);
      await loadFocuses();
    }
    setIsSubmittingFocus(false);
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) { toast.error("Project title is required."); return; }
    setIsAddingProject(true);
    const payload = {
      title: newTitle,
      stage: newStage,
      tag: newTag || undefined,
      github_link: newGithubLink || undefined,
      demo_link: newDemoLink || undefined,
      image_url: newImageUrl || undefined,
      writeup: newWriteup || undefined,
    };
    const result = editingProjectId
      ? await updatePersonalProjectEntry(editingProjectId, payload)
      : await submitPersonalProject(payload);
    if (result.error) { toast.error(result.error); } else {
      toast.success(editingProjectId ? "Project updated!" : "Project added!");
      setNewTitle("");
      setNewStage("current");
      setNewTag("");
      setNewGithubLink("");
      setNewDemoLink("");
      setNewImageUrl("");
      setNewWriteup("");
      setShowAddProject(false);
      setEditingProjectId(null);
      await loadProjects();
    }
    setIsAddingProject(false);
  };

  const handleEditFocus = (entry: LearningFocusEntry) => {
    setFocus(entry.focus);
    setEditingFocusId(entry.id);
  };

  const handleDeleteFocus = async (entry: LearningFocusEntry) => {
    const ok = window.confirm("Delete your learning focus entry?");
    if (!ok) return;
    const result = await deleteLearningFocusEntry(entry.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    if (editingFocusId === entry.id) {
      setEditingFocusId(null);
      setFocus("");
    }
    toast.success("Learning focus deleted.");
    await loadFocuses();
  };

  const handleEditProject = (entry: PersonalProjectEntry) => {
    setEditingProjectId(entry.id);
    setNewTitle(entry.title);
    setNewStage((entry.stage as "old" | "current" | "future") || "current");
    setNewTag(entry.tag || "");
    setNewGithubLink(entry.github_link || "");
    setNewDemoLink(entry.demo_link || "");
    setNewImageUrl(entry.image_url || "");
    setNewWriteup(entry.writeup || "");
    setShowAddProject(true);
  };

  const handleDeleteProject = async (entry: PersonalProjectEntry) => {
    const ok = window.confirm(`Delete project \"${entry.title}\"?`);
    if (!ok) return;
    const result = await deletePersonalProjectEntry(entry.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    if (editingProjectId === entry.id) {
      setEditingProjectId(null);
      setNewTitle("");
      setNewStage("current");
      setNewTag("");
      setNewGithubLink("");
      setNewDemoLink("");
      setNewImageUrl("");
      setNewWriteup("");
      setShowAddProject(false);
    }
    toast.success("Project deleted.");
    await loadProjects();
  };

  const uniqueByUser = teamFocuses.reduce<LearningFocusEntry[]>((acc, f) => { if (!acc.find((x) => x.user_id === f.user_id)) acc.push(f); return acc; }, []);

  if (!user) return null;

  return (
    <MySpaceShell>
      <div className="pb-16 space-y-6">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] uppercase mb-1 text-[#D97706] dark:text-amber-400">GROWTH MINDSET</p>
          <h2 className="text-3xl font-extrabold text-[#2B124C] dark:text-purple-100">Learning Canvas</h2>
        </div>

        {/* My Projects */}
        <div className="rounded-2xl p-6 shadow-sm lighthouse-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Folder size={18} className="text-[#D97706] dark:text-amber-400" />
              <h3 className="font-bold text-sm text-[#2B124C] dark:text-purple-100">My Projects</h3>
            </div>
            <button onClick={() => setShowAddProject((v) => !v)} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-white">
              {showAddProject ? <X size={12} /> : <Plus size={12} />}{showAddProject ? "Cancel" : "Add Project"}
            </button>
          </div>
          {showAddProject && (
            <form onSubmit={handleAddProject} className="grid gap-3 mb-4">
              <div className="flex-1 min-w-[180px]"><input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Project title" className="w-full h-9 px-3 rounded-lg text-sm focus:outline-none lighthouse-input" /></div>
              <div className="grid gap-3 md:grid-cols-2">
                <select value={newStage} onChange={(e) => setNewStage(e.target.value as "old" | "current" | "future")} className="w-full h-9 px-3 rounded-lg text-sm focus:outline-none lighthouse-input">
                  <option value="old">Old</option>
                  <option value="current">Current</option>
                  <option value="future">Future</option>
                </select>
                <input type="text" value={newTag} onChange={(e) => setNewTag(e.target.value.toUpperCase())} placeholder="Tag (optional)" maxLength={20} className="w-full h-9 px-3 rounded-lg text-sm focus:outline-none lighthouse-input" />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <input type="url" value={newGithubLink} onChange={(e) => setNewGithubLink(e.target.value)} placeholder="GitHub link (optional)" className="w-full h-9 px-3 rounded-lg text-sm focus:outline-none lighthouse-input" />
                <input type="url" value={newDemoLink} onChange={(e) => setNewDemoLink(e.target.value)} placeholder="Demo link (optional)" className="w-full h-9 px-3 rounded-lg text-sm focus:outline-none lighthouse-input" />
              </div>
              <input type="url" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} placeholder="Image URL (optional)" className="w-full h-9 px-3 rounded-lg text-sm focus:outline-none lighthouse-input" />
              <textarea value={newWriteup} onChange={(e) => setNewWriteup(e.target.value)} placeholder="Writeup (optional)" rows={3} className="w-full p-3 rounded-lg text-sm focus:outline-none lighthouse-input" />
              <button type="submit" disabled={isAddingProject} className="h-9 px-4 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-60 w-full md:w-auto" style={{ background: "#D97706" }}>{isAddingProject ? "Saving..." : editingProjectId ? "Update" : "Add"}</button>
            </form>
          )}
          {isLoadingProjects ? (
            <div className="flex items-center justify-center py-6"><div className="h-5 w-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#D97706", borderTopColor: "transparent" }} /></div>
          ) : projects.length === 0 ? (
            <p className="text-sm text-center py-4 text-[#854F6C] dark:text-purple-400">No personal projects yet. Click &quot;Add Project&quot; to create one.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {projects.map((proj) => (
                <div key={proj.id} className="flex items-start gap-3 rounded-xl p-4 hover:shadow-md transition-shadow lighthouse-inner-card" style={{ minWidth: "180px" }}>
                  <Folder size={20} className="text-[#D97706] dark:text-amber-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#2B124C] dark:text-purple-100">{proj.title}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded inline-block lighthouse-tag">{proj.stage?.toUpperCase() || "CURRENT"}</span>
                      {proj.tag && <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded inline-block lighthouse-tag">{proj.tag}</span>}
                    </div>
                    {(proj.github_link || proj.demo_link) && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {proj.github_link && <a href={proj.github_link} target="_blank" rel="noopener noreferrer" className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline">GitHub</a>}
                        {proj.demo_link && <a href={proj.demo_link} target="_blank" rel="noopener noreferrer" className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 hover:underline">Demo</a>}
                      </div>
                    )}
                    {proj.writeup && <p className="mt-2 text-[11px] text-[#854F6C] dark:text-purple-300 line-clamp-2">{proj.writeup}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleEditProject(proj)}
                      className="h-7 px-2 rounded-md border border-slate-300/70 dark:border-white/20 text-[11px] text-[#522B5B] dark:text-purple-200 hover:bg-slate-200/70 dark:hover:bg-white/10 inline-flex items-center gap-1"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProject(proj)}
                      className="h-7 px-2 rounded-md border border-red-300/70 dark:border-red-400/30 text-[11px] text-red-700 dark:text-red-300 hover:bg-red-100/70 dark:hover:bg-red-500/10 inline-flex items-center gap-1"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Focus + Team Growth */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl p-6 shadow-sm lighthouse-card">
            <div className="flex items-center gap-2 mb-4"><Lightbulb size={18} className="text-[#D97706] dark:text-amber-400" /><h3 className="font-bold text-sm text-[#D97706] dark:text-amber-400">My Focus</h3></div>
            <form onSubmit={handleSubmitFocus} className="space-y-4">
              <p className="text-xs text-[#854F6C] dark:text-purple-400">What are you reading or learning right now?</p>
              <input type="text" value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="Learning code igniter..." className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none lighthouse-input" />
              <button type="submit" disabled={isSubmittingFocus} className="w-full py-3 rounded-xl text-sm font-bold text-white tracking-widest uppercase hover:opacity-90 transition-opacity disabled:opacity-60" style={{ background: "#D97706" }}>{isSubmittingFocus ? "Saving..." : editingFocusId ? "Update Focus" : "Share Focus"}</button>
            </form>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-4"><Users size={16} className="text-[#D97706] dark:text-amber-400" /><h3 className="font-bold text-sm text-[#D97706] dark:text-amber-400">Team Growth</h3></div>
            {isLoadingFocuses ? (
              <div className="flex items-center justify-center py-12"><div className="h-6 w-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#D97706", borderTopColor: "transparent" }} /></div>
            ) : uniqueByUser.length === 0 ? (
              <div className="rounded-xl p-8 text-center text-sm lighthouse-empty">No team learning updates yet.</div>
            ) : (
              <div className="space-y-2.5">
                {uniqueByUser.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 rounded-xl p-3.5 shadow-sm lighthouse-inner-card">
                    {f.profile_picture ? (<NextImage src={f.profile_picture} alt={f.user_name ? `${f.user_name}'s profile picture` : "User profile picture"} width={32} height={32} className="h-8 w-8 rounded-full object-cover flex-shrink-0" unoptimized />) : (<div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0" style={{ background: colorFor(f.user_id) }}>{getInitials(f.user_name || "?")}</div>)}
                    <p className="text-sm text-[#2B124C] dark:text-purple-100 flex-1"><span className="font-semibold">{f.user_name}</span>{" "}<span className="text-[#854F6C] dark:text-purple-400">is learning:</span>{" "}{f.focus}</p>
                    {f.user_id === user.id && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditFocus(f)}
                          className="h-7 px-2 rounded-md border border-slate-300/70 dark:border-white/20 text-[11px] text-[#522B5B] dark:text-purple-200 hover:bg-slate-200/70 dark:hover:bg-white/10 inline-flex items-center gap-1"
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFocus(f)}
                          className="h-7 px-2 rounded-md border border-red-300/70 dark:border-red-400/30 text-[11px] text-red-700 dark:text-red-300 hover:bg-red-100/70 dark:hover:bg-red-500/10 inline-flex items-center gap-1"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MySpaceShell>
  );
}
