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
    accent: "#7c3aed", 
    dot: "#a78bfa",
    bg: "rgba(124, 58, 237, 0.08)",
    headerBg: "rgba(124, 58, 237, 0.06)",
  },
  { 
    key: "in_progress", 
    label: "In Progress", 
    accent: "#2563eb", 
    dot: "#60a5fa",
    bg: "rgba(37, 99, 235, 0.08)",
    headerBg: "rgba(37, 99, 235, 0.06)",
  },
  { 
    key: "reviewing", 
    label: "Reviewing", 
    accent: "#b45309", 
    dot: "#fbbf24",
    bg: "rgba(180, 83, 9, 0.08)",
    headerBg: "rgba(180, 83, 9, 0.06)",
  },
  { 
    key: "approved", 
    label: "Done", 
    accent: "#15803d", 
    dot: "#4ade80",
    bg: "rgba(21, 128, 61, 0.08)",
    headerBg: "rgba(21, 128, 61, 0.06)",
  },
];

const PRIORITY_COLORS: Record<string, string> = {
  high:   "#f87171",
  medium: "#facc15",
  low:    "#4ade80",
};

interface BoardClientProps {
  workspaceQuery?: string | null;
}

export default function BoardPage({ workspaceQuery }: BoardClientProps) {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === "admin";
  const canManageTasks = isAdmin;
  const workspaceFilter = workspaceQuery ? Number(workspaceQuery) : undefined;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [draggingOver, setDraggingOver] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    const r = isAdmin
      ? await getAllTasks(undefined, undefined, workspaceFilter)
      : await getMyTasks();
    const loadedTasks = r.data || [];
    const scopedTasks = !isAdmin && workspaceFilter
      ? loadedTasks.filter((t) => t.workspace_id === workspaceFilter)
      : loadedTasks;
    setTasks(scopedTasks);
    setIsLoading(false);
  }, [isAdmin, workspaceFilter]);

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
    <ProjectShell activeWorkspaceId={workspaceQuery || null}>
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
                className="rounded-2xl flex flex-col transition-all bg-muted/20 dark:bg-card/30 border border-border/50"
                style={{
                  background: isDraggingOverCol ? col.accent + "10" : undefined,
                  border: isDraggingOverCol ? `2px dashed ${col.accent}60` : undefined,
                  minHeight: 500,
                }}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-4 py-3 rounded-t-2xl border-b border-border/40" style={{ background: col.headerBg }}>
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: col.dot }} />
                    <span className="font-semibold text-sm" style={{ color: col.accent }}>{col.label}</span>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full border" style={{ background: col.bg, color: col.accent, borderColor: col.accent + "30" }}>
                    {colTasks.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                  {colTasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-24 text-xs text-muted-foreground/50">
                      <span>Drop tasks here</span>
                    </div>
                  )}
                  {colTasks.map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => {
                        if (workspaceFilter) router.push(`/project-management/workspaces/${workspaceFilter}/projects/${task.id}`);
                        else router.push(`/project-management/${task.id}`);
                      }}
                      className={`rounded-xl p-4 cursor-pointer transition-all duration-200 select-none bg-card border border-border/40 shadow-sm ${draggedId === task.id ? "opacity-40 scale-95" : "hover:scale-[1.02] hover:shadow-md hover:border-border/70"}`}
                    >
                      {/* Ref ID + priority */}
                      <div className="flex items-center justify-between mb-2">
                        {task.public_id ? (
                          <span className="font-mono text-[10px] font-medium px-2 py-1 rounded tracking-wider bg-muted border border-border/60 text-muted-foreground">
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
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        {task.assignee_name ? (
                          <div className="flex items-center gap-1.5">
                            <div className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold bg-muted text-muted-foreground">
                              {task.assignee_name.split(" ").map(n => n[0]).join("")}
                            </div>
                            <span className="truncate max-w-[70px]">{task.assignee_name.split(" ")[0]}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/50">Unassigned</span>
                        )}
                        {task.due_date && (
                          <div className="flex items-center gap-1">
                            <CalendarDays size={10} />
                            {new Date(task.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                          </div>
                        )}
                      </div>
                      {canManageTasks && (
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/project-management/projects?edit=${task.id}`);
                            }}
                            className="rounded-md border border-primary/35 bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary hover:bg-primary/20 transition-colors"
                          >
                            Edit
                          </button>
                        </div>
                      )}
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
