"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ProjectShell from "@/components/project-management/ProjectShell";
import { useAuth } from "@/components/AuthProvider";
import { getAllTasks, getMyTasks, updateTaskStatus, Task } from "@/lib/api";
import { Loader2, CalendarDays, User } from "lucide-react";
import { toast } from "sonner";

const COLUMNS = [
  { key: "todo",        label: "To Do",       accent: "#854F6C", bg: "#854F6C12" },
  { key: "in_progress", label: "In Progress", accent: "#2B124C", bg: "#2B124C12" },
  { key: "reviewing",   label: "Reviewing",   accent: "#522B5B", bg: "#522B5B12" },
  { key: "approved",    label: "Done",        accent: "#166534", bg: "#16653412" },
];

const PRIORITY_COLORS: Record<string, string> = {
  high:   "#991b1b",
  medium: "#854F6C",
  low:    "#166534",
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
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#522B5B" }} />
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
                <div className="flex items-center justify-between px-4 py-3 rounded-t-2xl" style={{ background: col.bg, borderBottom: `1.5px solid ${col.accent}20` }}>
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: col.accent }} />
                    <span className="font-bold text-sm" style={{ color: col.accent }}>{col.label}</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: col.accent + "22", color: col.accent }}>
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
                      className={`rounded-xl p-4 cursor-pointer transition-all duration-200 select-none ${draggedId === task.id ? "opacity-40 scale-95" : "hover:scale-[1.02]"}`}
                      style={{ background: "rgba(255,255,255,0.75)", border: "1px solid #DFB6B240", boxShadow: "0 2px 8px #2B124C10" }}
                    >
                      {/* Ref ID + priority */}
                      <div className="flex items-center justify-between mb-2">
                        {task.public_id ? (
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wider" style={{ background: "#522B5B12", color: "#522B5B" }}>
                            {task.public_id}
                          </span>
                        ) : <span />}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize" style={{ background: PRIORITY_COLORS[task.priority] + "18", color: PRIORITY_COLORS[task.priority] }}>
                          {task.priority}
                        </span>
                      </div>

                      {/* Title */}
                      <p className="text-sm font-semibold line-clamp-2 mb-3" style={{ color: "#2B124C" }}>{task.title}</p>

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
