"use client";

import React, { useState } from "react";
import { Star, MoreHorizontal } from "lucide-react";
import { Task, toggleTaskStar, toggleTaskPin } from "@/lib/api";
import { toast } from "sonner";

interface Props {
  task: Task;
  onClose: () => void;
}

export default function TaskPreviewPopup({ task, onClose }: Props) {
  const [isStarred, setIsStarred] = useState<boolean>(!!task.is_starred);
  const [isPinned, setIsPinned] = useState<boolean>(!!task.is_pinned);
  const [loadingStar, setLoadingStar] = useState(false);
  const [loadingPin, setLoadingPin] = useState(false);

  const handleToggleStar = async () => {
    setLoadingStar(true);
    const res = await toggleTaskStar(task.id);
    setLoadingStar(false);
    if (res.data) {
      setIsStarred(!!res.data.is_starred);
      toast.success(res.data.is_starred ? "Marked important" : "Unmarked important");
    } else {
      toast.error(res.error || "Could not update star");
    }
  };

  const handleTogglePin = async () => {
    setLoadingPin(true);
    const res = await toggleTaskPin(task.id);
    setLoadingPin(false);
    if (res.data) {
      setIsPinned(!!res.data.is_pinned);
      toast.success(res.data.is_pinned ? "Pinned" : "Unpinned");
    } else {
      toast.error(res.error || "Could not update pin");
    }
  };

  return (
    <div className="absolute z-50 w-96 right-4 top-12 rounded-xl border border-border bg-card p-4 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-foreground line-clamp-2">{task.title}</h4>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">{task.description || "No description"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleToggleStar} className={`p-2 rounded-md hover:bg-muted ${isStarred ? "text-yellow-400" : "text-muted-foreground"}`} disabled={loadingStar} aria-label="Toggle star">
            <Star className="h-4 w-4" />
          </button>
          <button onClick={handleTogglePin} className={`p-2 rounded-md hover:bg-muted ${isPinned ? "text-primary" : "text-muted-foreground"}`} disabled={loadingPin} aria-label="Toggle pin">
            <MoreHorizontal className="h-4 w-4" />
          </button>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-muted text-muted-foreground">Close</button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
        <div className="p-2 rounded-lg bg-secondary/30 text-center">
          <p className="text-[10px] text-muted-foreground">Due</p>
          <p className="mt-1 font-medium">{task.due_date ? new Date(task.due_date).toLocaleDateString() : "—"}</p>
        </div>
        <div className="p-2 rounded-lg bg-secondary/30 text-center">
          <p className="text-[10px] text-muted-foreground">Assignee</p>
          <p className="mt-1 font-medium">{task.assignee_name || "Unassigned"}</p>
        </div>
        <div className="p-2 rounded-lg bg-secondary/30 text-center">
          <p className="text-[10px] text-muted-foreground">Priority</p>
          <p className="mt-1 font-medium">{task.priority}</p>
        </div>
      </div>
    </div>
  );
}
