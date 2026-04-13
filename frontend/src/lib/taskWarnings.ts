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

function toDate(value: Date | string | number | null | undefined): Date {
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string") return new Date(value);
  return new Date();
}

function daysBetween(later: Date | string | number, earlier: Date | string | number): number {
  const laterDate = toDate(later);
  const earlierDate = toDate(earlier);
  if (Number.isNaN(laterDate.getTime()) || Number.isNaN(earlierDate.getTime())) {
    return 0;
  }
  const laterUtc = Date.UTC(laterDate.getFullYear(), laterDate.getMonth(), laterDate.getDate());
  const earlierUtc = Date.UTC(earlierDate.getFullYear(), earlierDate.getMonth(), earlierDate.getDate());
  return Math.max(0, Math.floor((laterUtc - earlierUtc) / 86400000));
}

function formatDayCount(days: number): string {
  return `${days} day${days === 1 ? "" : "s"}`;
}

export function getTaskWarningState(
  task: Pick<Task, "status" | "updated_at" | "latest_comment_at" | "start_date">,
  settings: TaskWarningSettings,
  now: Date | string | number = new Date(),
  activityAtOverride?: string | null
): TaskWarningState {
  const stageLimitDays = Math.max(1, Number(settings.task_warning_stage_days) || 3);
  const commentLimitDays = Math.max(1, Number(settings.task_warning_comment_days) || 2);

  const nowDate = toDate(now);
  const updatedAt = new Date(activityAtOverride || task.updated_at || task.start_date || nowDate.toISOString());
  const latestCommentAt = task.latest_comment_at ? new Date(task.latest_comment_at) : null;
  const commentBaseline = latestCommentAt || updatedAt;

  const stageAgeDays = daysBetween(nowDate, updatedAt);
  const commentAgeDays = daysBetween(nowDate, commentBaseline);
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