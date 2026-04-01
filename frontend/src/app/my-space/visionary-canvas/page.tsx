"use client";

import { useState, useEffect } from "react";
import NextImage from "next/image";
import MySpaceShell from "@/components/my-space/MySpaceShell";
import { useAuth } from "@/components/AuthProvider";
import { Rocket, Users } from "lucide-react";
import { submitDreamProject, getAllDreamProjects, DreamProjectEntry } from "@/lib/api";
import { toast } from "sonner";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}
const AVATAR_COLORS = ["#7C3AED", "#DB2777", "#D97706", "#059669", "#2563EB", "#DC2626"];
function colorFor(userId: number) { return AVATAR_COLORS[userId % AVATAR_COLORS.length]; }

export default function VisionaryCanvasPage() {
  const { user } = useAuth();
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teamAspirations, setTeamAspirations] = useState<DreamProjectEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTeamAspirations = async () => {
    setIsLoading(true);
    const result = await getAllDreamProjects(50);
    if (result.data) setTeamAspirations(result.data);
    setIsLoading(false);
  };

  useEffect(() => { loadTeamAspirations(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) { toast.error("Please describe your dream project."); return; }
    setIsSubmitting(true);
    const result = await submitDreamProject({ description });
    if (result.error) { toast.error(result.error); }
    else { toast.success("Aspiration saved!"); setDescription(""); await loadTeamAspirations(); }
    setIsSubmitting(false);
  };

  if (!user) return null;

  const uniqueByUser = teamAspirations.reduce<DreamProjectEntry[]>((acc, proj) => {
    if (!acc.find((p) => p.user_id === proj.user_id)) acc.push(proj);
    return acc;
  }, []);

  return (
    <MySpaceShell>
      <div className="pb-16">
        <div className="mb-6">
          <p className="text-xs font-bold tracking-[0.2em] uppercase mb-1 text-[#854F6C] dark:text-purple-400">VISIONARY CANVAS</p>
          <h2 className="text-3xl font-extrabold text-[#2B124C] dark:text-purple-100">Dream Scope</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Dream Project */}
          <div className="rounded-2xl p-6 shadow-sm lighthouse-card">
            <div className="flex items-center gap-2 mb-5">
              <Rocket size={18} className="lighthouse-accent" />
              <h3 className="font-bold text-sm text-[#522B5B] dark:text-purple-300">My Dream Project</h3>
            </div>
            <p className="text-sm mb-4 text-[#854F6C] dark:text-purple-400">What is that one &quot;moonshot&quot; project you dream of building? Capture it here.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Dream project is to..." rows={5} className="w-full p-3 rounded-xl text-sm focus:outline-none resize-y lighthouse-input" />
              <button type="submit" disabled={isSubmitting} className="w-full py-3 rounded-xl text-sm font-bold text-white tracking-widest uppercase hover:opacity-90 transition-opacity disabled:opacity-60" style={{ background: "#522B5B" }}>
                {isSubmitting ? "Saving..." : "Save Aspiration"}
              </button>
            </form>
          </div>
          {/* Team Aspirations */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Users size={16} className="lighthouse-accent" />
              <h3 className="font-bold text-sm text-[#522B5B] dark:text-purple-300">Team Aspirations</h3>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-12"><div className="h-6 w-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#522B5B", borderTopColor: "transparent" }} /></div>
            ) : uniqueByUser.length === 0 ? (
              <div className="rounded-xl p-8 text-center text-sm lighthouse-empty">No team aspirations yet. Be the first to share!</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {uniqueByUser.map((proj) => (
                  <div key={proj.id} className="rounded-xl p-4 shadow-sm lighthouse-aspiration-card" style={{ borderLeft: `4px solid ${colorFor(proj.user_id)}`, border: `1px solid ${colorFor(proj.user_id)}` }}>
                    <div className="flex items-center gap-2 mb-2">
                      {proj.profile_picture ? (
                        <NextImage src={proj.profile_picture} alt={proj.user_name ? `${proj.user_name}'s profile picture` : "User profile picture"} width={32} height={32} className="h-8 w-8 rounded-full object-cover" unoptimized />
                      ) : (
                        <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0" style={{ background: colorFor(proj.user_id) }}>{getInitials(proj.user_name || "?")}</div>
                      )}
                      <span className="font-semibold text-sm text-[#2B124C] dark:text-purple-100">{proj.user_name}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-[#522B5B] dark:text-purple-300">{proj.description}</p>
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
