/**
 * Optimized Task Item Component
 * 
 * Performance optimizations:
 * - React.memo() prevents re-renders when props haven't changed
 * - useMemo() caches expensive calculations
 * - Lazy loading of heavy features (comments, subtasks)
 * - Efficient event handlers with useCallback
 */

"use client";

import React, { memo, useMemo, useCallback, useState } from "react";
import { Task } from "@/lib/api";
import { Priority, StatusBadge } from "@/components/ui";
import { useIntersectionObserver } from "@/lib/performance";
import {
  Calendar,
  User,
  MessageSquare,
  ListTree,
  Flag,
  Star,
  Pin,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface OptimizedTaskItemProps {
  task: Task;
  isSelected?: boolean;
  onSelect?: (taskId: number) => void;
  onStatusChange?: (taskId: number, status: string) => void;
  onLoadComments?: (taskId: number) => void;
  onLoadSubtasks?: (taskId: number) => void;
}

/**
 * Lightweight task row component
 * Only renders minimal information for list view
 */
const TaskListRow = memo(
  ({ task, isSelected, onSelect }: OptimizedTaskItemProps) => {
    const handleClick = useCallback(() => {
      onSelect?.(task.id);
    }, [task.id, onSelect]);

    // Format due date for display
    const dueDate = useMemo(() => {
      if (!task.due_date) return null;
      return new Date(task.due_date).toLocaleDateString();
    }, [task.due_date]);

    // Determine row styling
    const rowClass = useMemo(() => {
      let classes = "flex items-center gap-3 p-3 rounded border hover:bg-muted/50 cursor-pointer transition-colors";
      if (isSelected) classes += " bg-blue-50 border-blue-200 dark:bg-blue-950/20";
      return classes;
    }, [isSelected]);

    return (
      <div
        data-task-id={task.id}
        className={rowClass}
        onClick={handleClick}
      >
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected || false}
          onChange={() => {}}
          className="w-4 h-4 rounded cursor-pointer"
        />

        {/* Task Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{task.title}</p>
          <p className="text-xs text-muted-foreground">
            {task.public_id && `#${task.public_id}`}
            {task.workspace_name && ` • ${task.workspace_name}`}
          </p>
        </div>

        {/* Status Badge */}
        <StatusBadge status={task.status} />

        {/* Priority */}
        <Priority priority={task.priority} />

        {/* Assignee */}
        {task.assignee_name && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <User size={14} />
            <span className="hidden sm:inline">{task.assignee_name}</span>
          </div>
        )}

        {/* Due Date */}
        {dueDate && (
          <div className="text-xs text-muted-foreground flex items-center gap-1 hidden md:flex">
            <Calendar size={14} />
            {dueDate}
          </div>
        )}

        {/* Meta Information */}
        <div className="flex gap-1 text-xs text-muted-foreground">
          {task.comments && task.comments.length > 0 && (
            <span className="flex items-center gap-0.5">
              <MessageSquare size={12} />
              {task.comments.length}
            </span>
          )}
          {task.subtask_count && task.subtask_count > 0 && (
            <span className="flex items-center gap-0.5">
              <ListTree size={12} />
              {task.subtask_count}
            </span>
          )}
          {task.is_flagged && <Flag size={12} className="text-red-500" />}
          {task.is_starred && <Star size={12} className="text-amber-500 fill-amber-500" />}
          {task.is_pinned && <Pin size={12} className="text-blue-500" />}
        </div>
      </div>
    );
  }
);

TaskListRow.displayName = "TaskListRow";

/**
 * Expandable task card with lazy-loaded details
 * Details (comments, subtasks) only load when expanded
 */
const LazyExpandableTaskCard = memo(
  ({
    task,
    onLoadComments,
    onLoadSubtasks,
    onStatusChange,
  }: OptimizedTaskItemProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [commentsLoaded, setCommentsLoaded] = useState(false);
    const [subtasksLoaded, setSubtasksLoaded] = useState(false);

    // Lazy load comments when expanded
    const handleExpand = useCallback(() => {
      if (!isExpanded && !commentsLoaded && onLoadComments) {
        onLoadComments(task.id);
        setCommentsLoaded(true);
      }
      if (!isExpanded && !subtasksLoaded && onLoadSubtasks) {
        onLoadSubtasks(task.id);
        setSubtasksLoaded(true);
      }
      setIsExpanded(!isExpanded);
    }, [isExpanded, commentsLoaded, subtasksLoaded, task.id, onLoadComments, onLoadSubtasks]);

    // Format due date
    const dueDate = useMemo(() => {
      if (!task.due_date) return null;
      return new Date(task.due_date).toLocaleDateString();
    }, [task.due_date]);

    return (
      <div className="border rounded-lg overflow-hidden bg-card">
        {/* Header */}
        <div className="p-4 border-b hover:bg-muted/50 transition-colors">
          <div className="flex items-start gap-3">
            {/* Expand Button */}
            <button
              onClick={handleExpand}
              className="mt-1 p-1 hover:bg-muted rounded"
            >
              {isExpanded ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </button>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-sm truncate">{task.title}</h3>
                {task.public_id && (
                  <span className="text-xs bg-muted px-2 py-0.5 rounded">
                    #{task.public_id}
                  </span>
                )}
              </div>

              {task.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {task.description}
                </p>
              )}

              {/* Metadata Row */}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {task.workspace_name && <span>📁 {task.workspace_name}</span>}
                {dueDate && <span>📅 {dueDate}</span>}
                {task.assignee_name && <span>👤 {task.assignee_name}</span>}
                {task.progress && <span>⚡ {task.progress}% complete</span>}
              </div>
            </div>

            {/* Status Badge */}
            <StatusBadge status={task.status} />
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t p-4 bg-muted/20 space-y-3">
            {/* Comments Section */}
            {task.comments && task.comments.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <MessageSquare size={14} />
                  Comments ({task.comments.length})
                </h4>
                <div className="space-y-1 text-sm">
                  {task.comments.slice(0, 3).map((comment, idx) => (
                    <p key={idx} className="text-muted-foreground truncate">
                      {comment}
                    </p>
                  ))}
                  {task.comments.length > 3 && (
                    <p className="text-xs text-blue-600">
                      +{task.comments.length - 3} more comments
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Subtasks Section */}
            {task.subtask_count && task.subtask_count > 0 && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <ListTree size={14} />
                  Subtasks ({task.subtask_count})
                </h4>
                <p className="text-xs text-muted-foreground">
                  {task.subtask_count} subtask{task.subtask_count > 1 ? "s" : ""} assigned
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

LazyExpandableTaskCard.displayName = "LazyExpandableTaskCard";

export {
  TaskListRow,
  LazyExpandableTaskCard,
  type OptimizedTaskItemProps,
};
