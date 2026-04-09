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
      setNotifications(response.data);
      setUnreadCount(response.data.filter((n) => !n.is_read).length);
    }
    setLoading(false);
  }

  async function handleMarkAsRead(notificationId: number) {
    const response = await markNotificationRead(notificationId);
    if (response.data) {
      // Update local state
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
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
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
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-auto px-2 py-1 text-xs"
            >
              Mark all as read
            </Button>
          )}
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex flex-col items-start px-5 py-4 cursor-pointer ${
                  !notification.is_read ? "bg-muted/50" : ""
                }`}
                onSelect={() => {
                  void handleNotificationClick(notification);
                }}
              >
                <div className="flex items-start justify-between w-full gap-2">
                  <p className="text-sm leading-relaxed flex-1">{notification.message}</p>
                  {!notification.is_read && (
                    <div className="h-2 w-2 rounded-full bg-blue-600 mt-1 flex-shrink-0" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground mt-1.5">
                  {formatTime(notification.created_at)}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
