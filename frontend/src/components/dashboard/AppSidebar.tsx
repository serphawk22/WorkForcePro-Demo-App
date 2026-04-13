"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  CalendarCheck,
  DollarSign,
  FolderKanban,
  MessageSquare,
  Users,
  UserCheck,
  LogOut,
  Pin,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  Menu,
  PanelLeftClose,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getApiBaseUrl, getWorkspaces, Workspace } from "@/lib/api";

function LighthouseNavIcon({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path d="M32 5 23.5 10h17z" fill="currentColor" />
      <rect x="26" y="10" width="12" height="9" rx="1.5" fill="currentColor" />
      <rect x="26.8" y="10.8" width="3.2" height="6.8" rx="0.7" fill="hsl(var(--background))" opacity="0.95" />
      <rect x="33.9" y="10.8" width="3.2" height="6.8" rx="0.7" fill="hsl(var(--background))" opacity="0.95" />

      <path d="M18 16.5 7 19.5 18 20.8 25.5 18.9z" fill="currentColor" opacity="0.18" />
      <path d="M46 16.5 57 19.5 46 20.8 38.5 18.9z" fill="currentColor" opacity="0.18" />

      <path d="M24.7 19h14.6l1.3 3.8H23.4z" fill="currentColor" />
      <path d="M25.8 22.8h12.4l2.2 18.5H23.6z" fill="currentColor" />

      <path d="M29.4 27.1h5.2v3.3h-5.2z" fill="hsl(var(--background))" />
      <path d="M29.8 34h4.4v3h-4.4z" fill="hsl(var(--background))" />
      <path d="M29.8 41.3v-3.1a2.2 2.2 0 0 1 4.4 0v3.1z" fill="hsl(var(--background))" />

      <path d="M9 44.2c10.1-1.9 18.1-1.7 24.1.8 7.7 3.2 15.8 3.2 22.3 1.1-2.5 4.1-7.7 6.4-14.6 6.4-3.4 0-6.7-.6-9.8-1.8-3.7-1.4-8.8-2.5-15.6-1.4-2.9.5-5.4-1.8-6.4-5.1z" fill="currentColor" />
      <path d="M9.4 48.3c6.1-.6 10.8.2 14.5 1.6 5.1 2 10.6 2.6 16 1.9-3.1 3.8-8.4 6.2-14.5 6.2-7.2 0-13.2-3.3-16-8.1z" fill="currentColor" />
    </svg>
  );
}

const adminLinks = [
  { label: "Overview", icon: LayoutDashboard, path: "/admin/dashboard" },
  { label: "Attendance", icon: CalendarCheck, path: "/attendance" },
  { label: "Payroll", icon: DollarSign, path: "/payroll" },
  { label: "Project Management", icon: FolderKanban, path: "/project-management" },
  { label: "Requests", icon: MessageSquare, path: "/requests" },
  { label: "Employees", icon: Users, path: "/employees" },
  { label: "User Approvals", icon: UserCheck, path: "/admin/approvals", badgeKey: "pending" },
  { label: "The Lighthouse", icon: LighthouseNavIcon, path: "/my-space/task-sheet" },
  { label: "Weekly Progress", icon: ClipboardList, path: "/admin/weekly-progress" },
];

const employeeLinks = [
  { label: "My Dashboard", icon: LayoutDashboard, path: "/employee-dashboard" },
  { label: "Weekly Progress", icon: ClipboardList, path: "/weekly-progress" },
  { label: "Project Management", icon: FolderKanban, path: "/project-management" },
  { label: "Requests", icon: MessageSquare, path: "/requests" },
  { label: "The Lighthouse", icon: LighthouseNavIcon, path: "/my-space/task-sheet" },
];

interface SidebarProps {
  role?: "admin" | "employee";
  userName?: string;
  userHandle?: string;
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "").trim();
  if (normalized.length !== 6) return `rgba(107, 114, 128, ${alpha})`;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((value) => Number.isNaN(value))) return `rgba(107, 114, 128, ${alpha})`;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function AppSidebar({ role = "admin", userName = "Administrator", userHandle = "@admin" }: SidebarProps) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isHovered, setIsHovered] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [isCompactOpen, setIsCompactOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState<number>(0);
  const PIN_KEY = "workforcepro_sidebarPinned";
  const SIDEBAR_WIDTH_KEY = "workforcepro_sidebarWidth";
  const LAST_PROJECT_WORKSPACE_KEY = "workforcepro_lastProjectWorkspaceId";
  const [isPinned, setIsPinned] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(PIN_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window === "undefined") return 280;
    try {
      const raw = localStorage.getItem(SIDEBAR_WIDTH_KEY);
      const parsed = raw ? Number(raw) : NaN;
      if (Number.isFinite(parsed)) {
        return Math.min(360, Math.max(220, parsed));
      }
    } catch {}
    return 280;
  });
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(72);
  const { user, logout } = useAuth();
  const links = role === "admin" ? adminLinks : employeeLinks;
  const [pendingCount, setPendingCount] = useState(0);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspacesOpen, setWorkspacesOpen] = useState(true);
  const isOpen = isCompactViewport ? isCompactOpen : (isHovered || isPinned);
  const compactSidebarWidth = viewportWidth > 0
    ? Math.min(280, Math.max(220, Math.round(viewportWidth * 0.86)))
    : 240;
  const effectiveWidth = isCompactViewport
    ? compactSidebarWidth
    : (isOpen ? sidebarWidth : 72);

  // Persist pinned state across route navigation (prevents collapse on menu click).
  useEffect(() => {
    try {
      localStorage.setItem(PIN_KEY, String(isPinned));
    } catch {}
  }, [isPinned]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
    } catch {}
  }, [sidebarWidth]);

  useEffect(() => {
    console.log('[AppSidebar] User state changed:', user?.email || 'null');
    console.log('[AppSidebar] Profile picture:', user?.profile_picture ? '✓ Present' : '✗ Missing');
  }, [user]);

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

  useEffect(() => {
    const loadWorkspaces = async () => {
      const res = await getWorkspaces();
      if (res.data) setWorkspaces(res.data);
    };
    loadWorkspaces();
    window.addEventListener("workspaces-updated", loadWorkspaces);
    return () => window.removeEventListener("workspaces-updated", loadWorkspaces);
  }, []);

  useEffect(() => {
    const width = isCompactViewport ? 0 : effectiveWidth;
    document.documentElement.style.setProperty('--sidebar-width', `${width}px`);
  }, [effectiveWidth, isCompactViewport]);

  useEffect(() => {
    const updateViewportWidth = () => setViewportWidth(window.innerWidth);
    updateViewportWidth();

    const media = window.matchMedia("(max-width: 1279px)");
    const updateViewport = () => {
      const compact = media.matches;
      setIsCompactViewport(compact);
      if (!compact) {
        setIsCompactOpen(false);
      }
    };

    updateViewport();
    window.addEventListener("resize", updateViewportWidth);
    media.addEventListener("change", updateViewport);
    return () => {
      window.removeEventListener("resize", updateViewportWidth);
      media.removeEventListener("change", updateViewport);
    };
  }, []);

  useEffect(() => {
    if (isCompactViewport) {
      setIsCompactOpen(false);
    }
  }, [pathname, searchParams, isCompactViewport]);

  useEffect(() => {
    const workspaceIdFromPath = pathname.match(/^\/project-management\/workspaces\/(\d+)/)?.[1];
    const workspaceIdFromQuery = searchParams?.get("workspace");
    const activeWorkspaceId = workspaceIdFromPath || workspaceIdFromQuery;
    if (!activeWorkspaceId) return;
    try {
      localStorage.setItem(LAST_PROJECT_WORKSPACE_KEY, activeWorkspaceId);
    } catch {}
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const delta = e.clientX - dragStartX.current;
      const newWidth = Math.min(360, Math.max(220, dragStartWidth.current + delta));
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    if (isCompactViewport) return;
    dragStartX.current = e.clientX;
    dragStartWidth.current = isOpen ? sidebarWidth : 280;
    isDraggingRef.current = true;
    setIsDragging(true);
    e.preventDefault();
  }, [isCompactViewport, isOpen, sidebarWidth]);

  const handleCompactNavigate = () => {
    if (isCompactViewport) {
      setIsCompactOpen(false);
    }
  };

  const displayName = user?.name || userName;
  const displayHandle = user?.email || userHandle;
  const profilePicture = user?.profile_picture;
  const workspaceIdFromPath = pathname.match(/^\/project-management\/workspaces\/(\d+)/)?.[1] || null;
  const workspaceIdFromQuery = searchParams?.get("workspace") || null;
  const activeWorkspaceId = workspaceIdFromPath || workspaceIdFromQuery;

  const getProfilePictureUrl = () => {
    if (!profilePicture) return null;
    if (profilePicture.startsWith("data:")) return profilePicture;
    if (profilePicture.startsWith("http")) return profilePicture;
    return `${getApiBaseUrl()}${profilePicture}`;
  };

  const profilePictureUrl = getProfilePictureUrl();

  return (
    <>
      {isCompactViewport && (
        <button
          type="button"
          aria-label={isCompactOpen ? "Close navigation" : "Open navigation"}
          onClick={() => setIsCompactOpen((prev) => !prev)}
          className="fixed left-3 top-3 z-50 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar/90 text-sidebar-foreground shadow-lg backdrop-blur-md xl:hidden"
          style={{ left: "max(0.75rem, env(safe-area-inset-left))" }}
        >
          {isCompactOpen ? <PanelLeftClose size={18} /> : <Menu size={18} />}
        </button>
      )}

      {isCompactViewport && isCompactOpen && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          onClick={() => setIsCompactOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] xl:hidden"
        />
      )}

      <aside
      onMouseEnter={() => { if (!isPinned) setIsHovered(true); }}
      onMouseLeave={() => { if (!isPinned) setIsHovered(false); }}
      className={`glass-sidebar fixed left-0 top-0 h-dvh flex flex-col z-40 ${
        isCompactViewport ? (isCompactOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0"
      } ${
        isDragging ? "" : "transition-[width] duration-300 ease-in-out"
      } ${isCompactViewport ? "transition-transform duration-300" : ""}`}
      style={{ width: effectiveWidth, left: "env(safe-area-inset-left)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border overflow-hidden">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold text-sm">
          W
        </div>
        <span className={`text-sidebar-foreground font-semibold text-base tracking-tight whitespace-nowrap transition-all duration-200 ${
          isOpen ? "opacity-100 max-w-[160px]" : "opacity-0 max-w-0"
        }`}>
          WorkForce Pro
        </span>
        {/* Pin button — visible when sidebar is open */}
        <button
          onClick={() => setIsPinned((prev) => !prev)}
          title={isPinned ? "Unpin sidebar" : "Pin sidebar open"}
          className={`ml-auto shrink-0 rounded p-1 transition-all duration-200 ${
            isOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          } ${
            isPinned
              ? "text-sidebar-primary"
              : "text-sidebar-foreground/40 hover:text-sidebar-foreground"
          }`}
        >
          <Pin size={13} className={`transition-transform duration-200 ${isPinned ? "-rotate-45" : "rotate-0"}`} />
        </button>
      </div>

      {/* Section label */}
      <div className="px-4 pt-6 pb-2 overflow-hidden">
        <span className={`text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/50 whitespace-nowrap transition-all duration-200 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}>
          {role === "admin" ? "Admin Controls" : "Employee Menu"}
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1 px-3 py-2 pb-3">
        {links.map((link) => {
          if (link.label === "Project Management") {
            const parentActive = pathname.startsWith("/project-management");

            return (
              <div key={link.path} className="relative group/item">
                <button
                  type="button"
                  onClick={() => {
                    const workspaceIdFromPath = pathname.match(/^\/project-management\/workspaces\/(\d+)/)?.[1];
                    const workspaceIdFromQuery = searchParams?.get("workspace");
                    let targetWorkspaceId = workspaceIdFromPath || workspaceIdFromQuery;

                    if (!targetWorkspaceId) {
                      try {
                        targetWorkspaceId = localStorage.getItem(LAST_PROJECT_WORKSPACE_KEY) || null;
                      } catch {}
                    }

                    if (targetWorkspaceId) {
                      router.push(`/project-management/workspaces/${targetWorkspaceId}`, { scroll: false });
                      handleCompactNavigate();
                      return;
                    }

                    router.push("/project-management", { scroll: false });
                    handleCompactNavigate();
                  }}
                  className={`relative w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 overflow-hidden ${
                    parentActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }`}
                >
                  <span className={`sidebar-active-bar absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-sidebar-primary transition-all duration-300 ${
                    parentActive ? "h-5 opacity-100" : "h-0 opacity-0"
                  }`} />
                  <FolderKanban size={18} className={`shrink-0 transition-transform duration-200 ${parentActive ? "scale-110" : "group-hover/item:scale-110"}`} />
                  <span className={`flex-1 min-w-0 truncate whitespace-nowrap transition-all duration-200 ${
                      isOpen ? "opacity-100" : "opacity-0 max-w-0"
                    }`}>
                    Project Management
                  </span>
                  {isOpen && (
                    <span
                      className="ml-auto rounded p-0.5 hover:bg-sidebar-accent/70"
                      onClick={(e) => {
                        e.stopPropagation();
                        setWorkspacesOpen((prev) => !prev);
                      }}
                    >
                      {workspacesOpen ? <ChevronDown size={14} className="ml-auto" /> : <ChevronRight size={14} className="ml-auto" />}
                    </span>
                  )}
                </button>

                {isOpen && workspacesOpen && (
                  <div className="ml-7 mt-1 space-y-1 border-l border-sidebar-border pl-3">
                    {workspaces.length === 0 && (
                      <p className="py-1 text-xs text-sidebar-foreground/60">No workspaces</p>
                    )}
                    {workspaces.map((ws) => {
                      const wsPath = `/project-management/workspaces/${ws.id}`;
                      const wsActive = String(ws.id) === activeWorkspaceId;
                      const badgeBg = hexToRgba(ws.color || "#6b7280", wsActive ? 0.26 : 0.16);
                      const badgeBorder = hexToRgba(ws.color || "#6b7280", wsActive ? 0.58 : 0.35);
                      return (
                        <Link
                          key={ws.id}
                          href={wsPath}
                          prefetch
                          scroll={false}
                          onClick={() => {
                            try {
                              localStorage.setItem(LAST_PROJECT_WORKSPACE_KEY, String(ws.id));
                            } catch {}
                            handleCompactNavigate();
                          }}
                          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                            wsActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "text-sidebar-foreground/75 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                          }`}
                        >
                          <span
                            className="inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 transition-all duration-200 hover:-translate-y-0.5"
                            style={{ backgroundColor: badgeBg, borderColor: badgeBorder }}
                            aria-hidden
                          >
                            <span
                              className="inline-flex h-2 w-2 rounded-full border border-white/25"
                              style={{ backgroundColor: ws.color || "#6b7280" }}
                            />
                            <span className="text-sm leading-none">{ws.icon || "📁"}</span>
                          </span>
                          <span className="truncate">{ws.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}

                {!isOpen && (
                  <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 opacity-0 group-hover/item:opacity-100 transition-opacity duration-150 delay-150">
                    <div className="rounded-md bg-popover text-popover-foreground text-xs font-medium px-2.5 py-1.5 shadow-lg border border-border whitespace-nowrap">
                      Project Management
                    </div>
                  </div>
                )}
              </div>
            );
          }

          const isActive = link.path === "/project-management"
            ? pathname.startsWith("/project-management")
            : link.path === "/my-space/task-sheet"
              ? pathname.startsWith("/my-space")
              : pathname === link.path;
          const showBadge = (link as any).badgeKey === "pending" && pendingCount > 0;

          return (
            <div key={link.path} className="relative group/item">
              <Link
                href={link.path}
                prefetch
                scroll={false}
                onClick={handleCompactNavigate}
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 overflow-hidden ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                {/* Active left indicator bar */}
                <span className={`sidebar-active-bar absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-sidebar-primary transition-all duration-300 ${
                  isActive ? "h-5 opacity-100" : "h-0 opacity-0"
                }`} />

                <link.icon
                  size={link.label === "The Lighthouse" ? 26 : 18}
                  className={`shrink-0 transition-transform duration-200 ${
                    isActive ? "scale-110" : "group-hover/item:scale-110"
                  }`}
                />

                <span className={`flex-1 min-w-0 truncate whitespace-nowrap transition-all duration-200 ${
                  isOpen ? "opacity-100" : "opacity-0 max-w-0"
                }`}>
                  {link.label}
                </span>

                {isOpen && showBadge && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                    {pendingCount}
                  </span>
                )}
                {!isOpen && showBadge && (
                  <span className="absolute left-8 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">
                    {pendingCount}
                  </span>
                )}
              </Link>

              {/* Tooltip — only visible when sidebar is collapsed */}
              {!isOpen && (
                <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 opacity-0 group-hover/item:opacity-100 transition-opacity duration-150 delay-150">
                  <div className="rounded-md bg-popover text-popover-foreground text-xs font-medium px-2.5 py-1.5 shadow-lg border border-border whitespace-nowrap">
                    {link.label}
                    {showBadge && (
                      <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">
                        {pendingCount}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-sidebar-border px-3 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground text-sm font-semibold overflow-hidden">
            {profilePictureUrl ? (
              <Image
                src={profilePictureUrl}
                alt={`${displayName}'s profile picture`}
                width={36}
                height={36}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              displayName[0]
            )}
          </div>
          <div className={`min-w-0 overflow-hidden transition-all duration-200 ${
            isOpen ? "flex-1 opacity-100 max-w-[120px]" : "flex-none opacity-0 max-w-0"
          }`}>
            <p className="text-sm font-medium text-sidebar-foreground truncate">{displayName}</p>
            <p className="text-xs text-sidebar-foreground/50 truncate">{displayHandle}</p>
          </div>
          <button
            onClick={logout}
            title="Logout"
            className={`shrink-0 text-sidebar-foreground/50 hover:text-sidebar-foreground transition-all duration-200 ${
              isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <LogOut size={16} />
          </button>
        </div>
        <div className={`overflow-hidden transition-all duration-200 ${
          isOpen ? "max-h-10 opacity-100 mt-2" : "max-h-0 opacity-0"
        }`}>
          <span className="inline-block rounded-md bg-sidebar-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-accent-foreground">
            {role}
          </span>
        </div>
      </div>

      {/* Resize handle */}
      {!isCompactViewport && (
        <div
          onMouseDown={handleResizeMouseDown}
          className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize z-50 hover:bg-sidebar-primary/20 transition-colors"
        />
      )}
    </aside>
    </>
  );
}

