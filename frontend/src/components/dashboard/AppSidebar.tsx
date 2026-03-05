"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  DollarSign,
  FolderKanban,
  MessageSquare,
  Users,
  UserCheck,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getUnreadNotificationCount } from "@/lib/api";

const adminLinks = [
  { label: "Overview", icon: LayoutDashboard, path: "/admin/dashboard" },
  { label: "Attendance", icon: CalendarCheck, path: "/attendance" },
  { label: "Payroll", icon: DollarSign, path: "/payroll" },
  { label: "Project Management", icon: FolderKanban, path: "/project-management/summary" },
  { label: "Requests", icon: MessageSquare, path: "/requests" },
  { label: "Employees", icon: Users, path: "/employees" },
  { label: "User Approvals", icon: UserCheck, path: "/admin/approvals", badgeKey: "pending" },
  { label: "The Lighthouse", icon: User, path: "/my-space/task-sheet" },
];

const employeeLinks = [
  { label: "My Dashboard", icon: LayoutDashboard, path: "/employee-dashboard" },
  { label: "Project Management", icon: FolderKanban, path: "/project-management/summary" },
  { label: "Requests", icon: MessageSquare, path: "/requests" },
  { label: "The Lighthouse", icon: User, path: "/my-space/task-sheet" },
];

interface SidebarProps {
  role?: "admin" | "employee";
  userName?: string;
  userHandle?: string;
}

export default function AppSidebar({ role = "admin", userName = "Administrator", userHandle = "@admin" }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const links = role === "admin" ? adminLinks : employeeLinks;
  const [pendingCount, setPendingCount] = useState(0);

  // Debug: Log when user changes
  useEffect(() => {
    console.log('[AppSidebar] User state changed:', user?.email || 'null');
    console.log('[AppSidebar] Profile picture:', user?.profile_picture ? '✓ Present' : '✗ Missing');
  }, [user]);

  // Fetch pending registration count for admin badge
  useEffect(() => {
    if (role !== "admin") return;
    const fetchPending = async () => {
      try {
        const { getPendingUsers } = await import("@/lib/api");
        const result = await getPendingUsers();
        if (result.data) setPendingCount(result.data.length);
      } catch {}
    };
    fetchPending();
    const interval = setInterval(fetchPending, 60000);
    return () => clearInterval(interval);
  }, [role]);

  // Use data from AuthContext if available
  const displayName = user?.name || userName;
  const displayHandle = user?.email || userHandle;
  const profilePicture = user?.profile_picture;

  const getProfilePictureUrl = () => {
    if (!profilePicture) return null;
    // If it's a data URI (base64), return it directly
    if (profilePicture.startsWith("data:")) return profilePicture;
    // Otherwise treat as URL
    if (profilePicture.startsWith("http")) return profilePicture;
    return `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${profilePicture}`;
  };

  return (
    <aside
      className={`glass-sidebar flex flex-col transition-all duration-300 ${
        collapsed ? "w-[72px]" : "w-[240px]"
      } min-h-screen`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold text-sm">
          W
        </div>
        {!collapsed && (
          <span className="text-sidebar-foreground font-semibold text-base tracking-tight">
            WorkForce Pro
          </span>
        )}
      </div>

      {/* Section label */}
      {!collapsed && (
        <div className="px-4 pt-6 pb-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">
            {role === "admin" ? "Admin Controls" : "Employee Menu"}
          </span>
        </div>
      )}

      {/* Nav links */}
      <nav className="flex-1 flex flex-col gap-1 px-3 py-2">
        {links.map((link) => {
          const isActive = link.path === "/project-management/summary"
            ? pathname.startsWith("/project-management")
            : link.path === "/my-space/task-sheet"
              ? pathname.startsWith("/my-space")
              : pathname === link.path;
          const showBadge = (link as any).badgeKey === "pending" && pendingCount > 0;
          return (
            <Link
              key={link.path}
              href={link.path}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <link.icon size={18} className="shrink-0" />
              {!collapsed && <span className="flex-1">{link.label}</span>}
              {!collapsed && showBadge && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
              {collapsed && showBadge && (
                <span className="absolute left-8 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

        {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="mx-3 mb-2 flex items-center justify-center rounded-lg p-2 text-sidebar-foreground/50 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground transition-colors"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* User section */}
      <div className="border-t border-sidebar-border px-3 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground text-sm font-semibold overflow-hidden">
            {getProfilePictureUrl() ? (
              <img
                src={getProfilePictureUrl()!}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              displayName[0]
            )}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{displayName}</p>
              <p className="text-xs text-sidebar-foreground/50 truncate">{displayHandle}</p>
            </div>
          )}
          {!collapsed && (
            <button 
              onClick={logout}
              className="text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
        {!collapsed && (
          <span className="mt-2 inline-block rounded-md bg-sidebar-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-accent-foreground">
            {role}
          </span>
        )}
      </div>
    </aside>
  );
}
