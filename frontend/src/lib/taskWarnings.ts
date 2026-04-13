import type { Task } from "@/lib/api";

export interface TaskWarningSettings {
  task_warning_stage_days: number;
  task_warning_comment_days: number;
}

export interface TaskWarningState {
  isWarning: boolean;
  reason: string | null;
  stageOverdue: boolean;
  commentOverdue: boolean;
  stageAgeDays: number;
  commentAgeDays: number;
}

const ACTIVE_STATUSES = new Set<Task["status"]>(["todo", "in_progress", "submitted", "reviewing"]);

function daysBetween(later: Date, earlier: Date): number {
  const laterUtc = Date.UTC(later.getFullYear(), later.getMonth(), later.getDate());
  const earlierUtc = Date.UTC(earlier.getFullYear(), earlier.getMonth(), earlier.getDate());
  return Math.max(0, Math.floor((laterUtc - earlierUtc) / 86400000));
}

function formatDayCount(days: number): string {
  return `${days} day${days === 1 ? "" : "s"}`;
}

export function getTaskWarningState(
  task: Pick<Task, "status" | "updated_at" | "latest_comment_at" | "start_date">,
  settings: TaskWarningSettings,
  now = new Date()
): TaskWarningState {
  const stageLimitDays = Math.max(1, Number(settings.task_warning_stage_days) || 3);
  const commentLimitDays = Math.max(1, Number(settings.task_warning_comment_days) || 2);

  const updatedAt = new Date(task.updated_at || task.start_date || now.toISOString());
  const latestCommentAt = task.latest_comment_at ? new Date(task.latest_comment_at) : null;
  const commentBaseline = latestCommentAt || updatedAt;

  const stageAgeDays = daysBetween(now, updatedAt);
  const commentAgeDays = daysBetween(now, commentBaseline);
  const stageOverdue = stageAgeDays >= stageLimitDays;
  const commentOverdue = commentAgeDays >= commentLimitDays;
  const isActive = ACTIVE_STATUSES.has(task.status);
  const isWarning = isActive && stageOverdue && commentOverdue;

  const reason = isWarning
    ? `No stage update for ${formatDayCount(stageAgeDays)} and no comment/activity for ${formatDayCount(commentAgeDays)}.`
    : null;

  return {
    isWarning,
    reason,
    stageOverdue,
    commentOverdue,
    stageAgeDays,
    commentAgeDays,
  };
}