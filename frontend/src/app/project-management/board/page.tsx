"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ProjectShell from "@/components/project-management/ProjectShell";
import { useAuth } from "@/components/AuthProvider";
import { getAllTasks, getMyTasks, updateTaskStatus, Task } from "@/lib/api";
import { Loader2, CalendarDays, User } from "lucide-react";
import { toast } from "sonner";

const COLUMNS = [
  { 
    key: "todo", 
    label: "To Do", 
    accent: "#a78bfa", 
    bg: "rgba(167, 139, 250, 0.15)",
    gradient: "from-purple-500/20 to-purple-600/20",
    shadow: "purple-500/30"
  },
  { 
    key: "in_progress", 
    label: "In Progress", 
    accent: "#60a5fa", 
    bg: "rgba(96, 165, 250, 0.15)",
    gradient: "from-blue-500/20 to-blue-600/20",
    shadow: "blue-500/30"
  },
  { 
    key: "reviewing", 
    label: "Reviewing", 
    accent: "#facc15", 
    bg: "rgba(250, 204, 21, 0.15)",
    gradient: "from-yellow-500/20 to-yellow-600/20",
    shadow: "yellow-500/30"
  },
  { 
    key: "approved", 
    label: "Done", 
    accent: "#4ade80", 
    bg: "rgba(74, 222, 128, 0.15)",
    gradient: "from-green-500/20 to-green-600/20",
    shadow: "green-500/30"
  },
];

const PRIORITY_COLORS: Record<string, string> = {
  high:   "#f87171",
  medium: "#facc15",
  low:    "#4ade80",
};

export default function BoardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === "admin";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [draggingOver, setDraggingOver] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    const r = isAdmin ? await getAllTasks() : await getMyTasks();
    if (r.data) setTasks(r.data);
    setIsLoading(false);
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  const getColumnTasks = (colKey: string) => {
    if (colKey === "approved") return tasks.filter(t => ["approved", "rejected", "submitted"].includes(t.status));
    return tasks.filter(t => t.status === colKey);
  };

  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    setDraggedId(taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDraggingOver(colKey);
  };

  const handleDrop = async (e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    setDraggingOver(null);
    if (!draggedId) return;

    const task = tasks.find(t => t.id === draggedId);
    if (!task || task.status === colKey) { setDraggedId(null); return; }

    // Determine correct status to send
    let newStatus = colKey;
    if (colKey === "approved" && isAdmin) newStatus = "approved";
    else if (colKey === "approved" && !isAdmin) newStatus = "submitted";

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === draggedId ? { ...t, status: colKey as any } : t));

    const result = await updateTaskStatus(draggedId, newStatus as any);
    if (result.error) {
      toast.error(result.error);
      load(); // revert
    } else {
      toast.success("Status updated!");
    }
    setDraggedId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDraggingOver(null);
  };

  return (
    <ProjectShell>
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 drop-shadow-[0_0_8px_rgba(167,139,250,0.8)]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 min-h-[600px]">
          {COLUMNS.map(col => {
            const colTasks = getColumnTasks(col.key);
            const isDraggingOverCol = draggingOver === col.key;
            return (
              <div
                key={col.key}
                onDragOver={(e) => handleDragOver(e, col.key)}
                onDrop={(e) => handleDrop(e, col.key)}
                onDragLeave={() => setDraggingOver(null)}
                className="rounded-2xl flex flex-col transition-all"
                style={{
                  background: isDraggingOverCol ? col.accent + "18" : "hsl(5 38% 79% / 0.2)",
                  border: isDraggingOverCol ? `2px dashed ${col.accent}` : `1.5px solid #DFB6B250`,
                  minHeight: 500,
                }}
              >
                {/* Column header */}
                <div className={`flex items-center justify-between px-4 py-3 rounded-t-2xl bg-gradient-to-r ${col.gradient} border-b-2`} style={{ borderColor: col.accent + "30" }}>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full shadow-lg" style={{ background: col.accent, boxShadow: `0 0 8px ${col.accent}` }} />
                    <span className="font-bold text-sm drop-shadow-sm" style={{ color: col.accent }}>{col.label}</span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full border drop-shadow-sm" style={{ background: col.bg, color: col.accent, borderColor: col.accent + "40" }}>
                    {colTasks.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                  {colTasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-24 text-xs" style={{ color: "#DFB6B2" }}>
                      <span>Drop tasks here</span>
                    </div>
                  )}
                  {colTasks.map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => router.push(`/project-management/${task.id}`)}
                      className={`rounded-xl p-4 cursor-pointer transition-all duration-200 select-none glass-card border border-border/30 ${draggedId === task.id ? "opacity-40 scale-95" : "hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/20 hover:border-purple-500/30"}`}
                    >
                      {/* Ref ID + priority */}
                      <div className="flex items-center justify-between mb-2">
                        {task.public_id ? (
                          <span className="font-mono text-[10px] font-bold px-2 py-1 rounded tracking-wider bg-gradient-to-r from-purple-500/15 to-pink-500/15 border border-purple-500/30 text-purple-400 drop-shadow-sm">
                            {task.public_id}
                          </span>
                        ) : <span />}
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full capitalize border drop-shadow-sm" style={{ background: PRIORITY_COLORS[task.priority] + "20", color: PRIORITY_COLORS[task.priority], borderColor: PRIORITY_COLORS[task.priority] + "40" }}>
                          {task.priority}
                        </span>
                      </div>

                      {/* Title */}
                      <p className="text-sm font-semibold line-clamp-2 mb-3 text-foreground">{task.title}</p>

                      {/* Footer */}
                      <div className="flex items-center justify-between text-[11px]" style={{ color: "#854F6C" }}>
                        {task.assignee_name ? (
                          <div className="flex items-center gap-1.5">
                            <div className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: "#522B5B18", color: "#522B5B" }}>
                              {task.assignee_name.split(" ").map(n => n[0]).join("")}
                            </div>
                            <span className="truncate max-w-[70px]">{task.assignee_name.split(" ")[0]}</span>
                          </div>
                        ) : (
                          <span className="text-[10px]" style={{ color: "#DFB6B2" }}>Unassigned</span>
                        )}
                        {task.due_date && (
                          <div className="flex items-center gap-1">
                            <CalendarDays size={10} />
                            {new Date(task.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ProjectShell>
  );
}
