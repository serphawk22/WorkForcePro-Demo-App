"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/AuthProvider";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  type Notification,
} from "@/lib/api";

export function NotificationDropdown() {
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch unread count on mount and periodically
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  async function fetchUnreadCount() {
    const response = await getUnreadNotificationCount();
    if (response.data) {
      setUnreadCount(response.data.count);
    }
  }

  async function fetchNotifications() {
    setLoading(true);
    const response = await getNotifications();
    if (response.data) {
      // Show ALL notifications (both read and unread), sorted by newest first
      const allNotifications = response.data;
      setNotifications(allNotifications);
      const unread = allNotifications.filter((n) => !n.is_read);
      setUnreadCount(unread.length);
    }
    setLoading(false);
  }

  async function handleMarkAsRead(notificationId: number) {
    const response = await markNotificationRead(notificationId);
    if (response.data) {
      // Update the notification's read status locally, keep it visible
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  }

  async function handleMarkAllAsRead() {
    const response = await markAllNotificationsRead();
    if (response.data) {
      setNotifications([]);
      setUnreadCount(0);
    }
  }

  async function handleNotificationClick(notification: Notification) {
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }

    setIsOpen(false);

    const notificationType = (notification.type || "").toLowerCase();

    const taskLinkedTypes = new Set([
      "task_assigned",
      "task_submitted",
      "task_approved",
      "task_rejected",
      "task_comment",
      "subtask_assigned",
      "subtask_reviewing",
      "subtask_approved",
      "subtask_rejected",
    ]);

    if (taskLinkedTypes.has(notificationType)) {
      if (notification.task_id) {
        router.push(`/project-management/${notification.task_id}`);
      } else {
        router.push("/project-management");
      }
      return;
    }

    if (notificationType === "weekly_progress_comment") {
      router.push(user?.role === "admin" ? "/admin/weekly-progress" : "/weekly-progress");
      return;
    }

    if (notificationType === "salary_paid") {
      router.push(user?.role === "admin" ? "/payroll" : "/profile");
      return;
    }

    if (notificationType === "leave_approved" || notificationType === "leave_rejected") {
      router.push("/requests");
      return;
    }

    if (notificationType === "new_registration") {
      router.push("/admin/approvals");
      return;
    }

    if (notificationType === "user_approved" || notificationType === "user_rejected") {
      router.push("/profile");
      return;
    }

    router.push(user?.role === "admin" ? "/admin/dashboard" : "/employee-dashboard");
  }

  function formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button className="topbar-icon-btn relative outline-none border-0 bg-transparent shadow-none">
          <Bell className="h-[15px] w-[15px]" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(560px,95vw)] p-0"
        sideOffset={10}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-base">Notifications</h3>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="h-auto px-2 py-1 text-xs font-medium"
                title="Mark all notifications as read"
              >
                Mark all as read
              </Button>
            )}
          </div>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              All caught up! No notifications
            </div>
          ) : (
            <div>
              {/* Unread notifications section */}
              {notifications.filter((n) => !n.is_read).length > 0 && (
                <>
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-secondary/40">
                    New
                  </div>
                  {notifications
                    .filter((n) => !n.is_read)
                    .map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className="flex flex-col items-start px-5 py-3 cursor-pointer bg-blue-50/30 dark:bg-blue-950/20 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 border-b border-border/50 transition-colors"
                        onSelect={() => {
                          void handleNotificationClick(notification);
                        }}
                      >
                        <div className="flex items-start justify-between w-full gap-2">
                          <p className="text-sm leading-relaxed flex-1 font-medium text-foreground">{notification.message}</p>
                          <div className="h-3 w-3 rounded-full bg-blue-600 shadow-lg shadow-blue-600/50 mt-0.5 flex-shrink-0 animate-pulse" />
                        </div>
                        <span className="text-xs text-muted-foreground mt-1.5">
                          {formatTime(notification.created_at)}
                        </span>
                      </DropdownMenuItem>
                    ))}
                </>
              )}
              
              {/* Read notifications section */}
              {notifications.filter((n) => n.is_read).length > 0 && (
                <>
                  {notifications.filter((n) => !n.is_read).length > 0 && (
                    <DropdownMenuSeparator />
                  )}
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-secondary/40">
                    Earlier
                  </div>
                  {notifications
                    .filter((n) => n.is_read)
                    .map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className="flex flex-col items-start px-5 py-3 cursor-pointer hover:bg-secondary/40 border-b border-border/50 transition-colors"
                        onSelect={() => {
                          void handleNotificationClick(notification);
                        }}
                      >
                        <div className="flex items-start justify-between w-full gap-2">
                          <p className="text-sm leading-relaxed flex-1 text-muted-foreground">{notification.message}</p>
                        </div>
                        <span className="text-xs text-muted-foreground/60 mt-1.5">
                          {formatTime(notification.created_at)}
                        </span>
                      </DropdownMenuItem>
                    ))}
                </>
              )}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
