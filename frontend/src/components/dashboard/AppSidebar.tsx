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
  MessagesSquare,
  Users,
  UserCheck,
  LogOut,
  Pin,
  ChevronDown,
  ChevronRight,
  Menu,
  PanelLeftClose,
  Smile,
  FileText,
  Boxes,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getApiBaseUrl, getWorkspaces, getMyNodes, Workspace } from "@/lib/api";

const adminLinks = [
  { label: "Overview", icon: LayoutDashboard, path: "/admin/dashboard" },
  { label: "Project Management", icon: FolderKanban, path: "/project-management" },
  { label: "Chat", icon: MessagesSquare, path: "/chat" },
  { label: "Attendance", icon: CalendarCheck, path: "/attendance" },
  { label: "Payroll", icon: DollarSign, path: "/payroll" },
  { label: "Requests", icon: MessageSquare, path: "/requests" },
  { label: "Employees", icon: Users, path: "/employees" },
  { label: "User Approvals", icon: UserCheck, path: "/admin/approvals", badgeKey: "pending" },
  { label: "Reports", icon: FileText, path: "/reports" },
];

const employeeLinks = [
  { label: "My Dashboard", icon: LayoutDashboard, path: "/employee-dashboard" },
  { label: "Project Management", icon: FolderKanban, path: "/project-management" },
  { label: "Chat", icon: MessagesSquare, path: "/chat" },
  { label: "Attendance", icon: CalendarCheck, path: "/attendance" },
  { label: "Requests", icon: MessageSquare, path: "/requests" },
  { label: "Reports", icon: FileText, path: "/reports" },
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
    if (typeof window === "undefined") return 260;
    try {
      const raw = localStorage.getItem(SIDEBAR_WIDTH_KEY);
      const parsed = raw ? Number(raw) : NaN;
      if (Number.isFinite(parsed)) {
        return Math.min(340, Math.max(220, parsed));
      }
    } catch {}
    return 260;
  });
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(72);
  const hoverDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      let list = res.data || [];
      // Workers only navigate workspaces where they have assigned nodes.
      if (role !== "admin") {
        const mine = await getMyNodes();
        const wsIds = new Set((mine.data || []).map((n) => n.workspace_id));
        list = list.filter((w) => wsIds.has(w.id));
      }
      setWorkspaces(list);
    };
    loadWorkspaces();
    window.addEventListener("workspaces-updated", loadWorkspaces);
    return () => window.removeEventListener("workspaces-updated", loadWorkspaces);
  }, [role]);

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
      const newWidth = Math.min(340, Math.max(220, dragStartWidth.current + delta));
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

  useEffect(() => () => {
    if (hoverDelayRef.current) clearTimeout(hoverDelayRef.current);
  }, []);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    if (isCompactViewport) return;
    dragStartX.current = e.clientX;
    dragStartWidth.current = isOpen ? sidebarWidth : 260;
    isDraggingRef.current = true;
    setIsDragging(true);
    e.preventDefault();
  }, [isCompactViewport, isOpen, sidebarWidth]);

  const handleMouseEnter = useCallback(() => {
    if (isPinned || isCompactViewport) return;
    if (hoverDelayRef.current) clearTimeout(hoverDelayRef.current);
    hoverDelayRef.current = setTimeout(() => setIsHovered(true), 80);
  }, [isPinned, isCompactViewport]);

  const handleMouseLeave = useCallback(() => {
    if (isPinned || isCompactViewport) return;
    if (hoverDelayRef.current) clearTimeout(hoverDelayRef.current);
    hoverDelayRef.current = setTimeout(() => setIsHovered(false), 120);
  }, [isPinned, isCompactViewport]);

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
  const widthTransition = isDragging
    ? "none"
    : "width 220ms cubic-bezier(0.4, 0, 0.2, 1)";

  return (
    <>
      {isCompactViewport && (
        <button
          type="button"
          aria-label={isCompactOpen ? "Close navigation" : "Open navigation"}
          onClick={() => setIsCompactOpen((prev) => !prev)}
          className="fixed left-3 top-3 z-50 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm xl:hidden"
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
          className="fixed inset-0 z-30 bg-black/40 xl:hidden"
        />
      )}

      <aside
        data-open={isOpen ? "true" : "false"}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`bg-sidebar border-r border-sidebar-border fixed left-0 top-0 h-dvh flex flex-col z-40 ${
          isCompactViewport ? (isCompactOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0"
        } ${isCompactViewport ? "transition-transform duration-300" : ""}`}
        style={{
          width: effectiveWidth,
          left: "env(safe-area-inset-left)",
          transition: isCompactViewport ? undefined : widthTransition,
          willChange: "width",
        }}
      >
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border overflow-hidden">
        <img
          src="/Serp_Hawk_Logo-removebg-preview.png"
          alt="SerpHawk Logo"
          className="h-8 w-8 shrink-0 object-contain"
        />
        {isOpen && (
          <span className="text-sidebar-foreground font-semibold text-base tracking-tight whitespace-nowrap">
            WorkForce Pro
          </span>
        )}
        {isOpen && (
          <button
            onClick={() => setIsPinned((prev) => !prev)}
            title={isPinned ? "Unpin sidebar" : "Pin sidebar open"}
            className={`ml-auto shrink-0 rounded p-1 ${
              isPinned
                ? "text-sidebar-primary"
                : "text-sidebar-foreground/50 hover:text-sidebar-foreground"
            }`}
            aria-label={isPinned ? "Unpin sidebar" : "Pin sidebar open"}
          >
            <Pin size={13} className={isPinned ? "-rotate-45" : ""} />
          </button>
        )}
      </div>

      {/* Section label */}
      {isOpen && (
        <div className="px-4 pt-5 pb-2 overflow-hidden">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/50 whitespace-nowrap">
            {role === "admin" ? "Admin Controls" : "Employee Menu"}
          </span>
        </div>
      )}

      {/* Nav links */}
      <nav className={`flex-1 min-h-0 overflow-y-auto flex flex-col gap-1 px-3 ${isOpen ? "py-2" : "py-4"} pb-3`}>
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
                      router.push(`/project-management/nodes?workspace=${targetWorkspaceId}`, { scroll: false });
                      handleCompactNavigate();
                      return;
                    }

                    router.push("/project-management/nodes", { scroll: false });
                    handleCompactNavigate();
                  }}
                  className={`relative w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium overflow-hidden transition-colors duration-150 ${
                    parentActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  }`}
                >
                  {parentActive && (
                    <span className="sidebar-active-bar absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full" />
                  )}
                  <FolderKanban size={18} className="shrink-0" />
                  {isOpen && (
                    <span className="flex-1 min-w-0 truncate whitespace-nowrap">
                      Project Management
                    </span>
                  )}
                  {isOpen && (
                    <span
                      className="ml-auto rounded p-0.5 hover:bg-sidebar-accent"
                      onClick={(e) => {
                        e.stopPropagation();
                        setWorkspacesOpen((prev) => !prev);
                      }}
                    >
                      {workspacesOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                  )}
                </button>

                {isOpen && workspacesOpen && (
                  <div className="ml-7 mt-1 space-y-1 border-l border-sidebar-border pl-3">
                    {workspaces.length === 0 && (
                      <p className="py-1 text-xs text-sidebar-foreground/60">No workspaces</p>
                    )}
                    {workspaces.map((ws) => {
                      const wsPath = `/project-management/nodes?workspace=${ws.id}`;
                      const wsActive = String(ws.id) === activeWorkspaceId;
                      const badgeBg = hexToRgba(ws.color || "#6b7280", wsActive ? 0.2 : 0.12);
                      const badgeBorder = hexToRgba(ws.color || "#6b7280", wsActive ? 0.5 : 0.3);
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
                          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors duration-150 ${
                            wsActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                          }`}
                        >
                          <span
                            className="inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5"
                            style={{ backgroundColor: badgeBg, borderColor: badgeBorder }}
                            aria-hidden
                          >
                            <span
                              className="inline-flex h-2 w-2 rounded-full"
                              style={{ backgroundColor: ws.color || "#6b7280" }}
                            />
                          </span>
                          <span className="truncate">{ws.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}

                {!isOpen && (
                  <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 opacity-0 group-hover/item:opacity-100 transition-opacity duration-150">
                    <div className="rounded-md bg-popover text-popover-foreground text-xs font-medium px-2.5 py-1.5 shadow-sm border border-border whitespace-nowrap">
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
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium overflow-hidden transition-colors duration-150 ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                {isActive && (
                  <span className="sidebar-active-bar absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full" />
                )}

                <link.icon size={18} className="shrink-0" />

                {isOpen && (
                  <span className="flex-1 min-w-0 truncate whitespace-nowrap">
                    {link.label}
                  </span>
                )}

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

              {!isOpen && (
                <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 opacity-0 group-hover/item:opacity-100 transition-opacity duration-150">
                  <div className="rounded-md bg-popover text-popover-foreground text-xs font-medium px-2.5 py-1.5 shadow-sm border border-border whitespace-nowrap">
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
              (displayName?.[0] || "?").toUpperCase()
            )}
          </div>
          {isOpen && (
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{displayName}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{displayHandle}</p>
            </div>
          )}
          {isOpen && (
            <button
              onClick={logout}
              title="Logout"
              aria-label="Logout"
              className="shrink-0 text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors duration-150"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
        {isOpen && (
          <div className="mt-2">
            <span className="inline-block rounded-md bg-sidebar-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-accent-foreground">
              {role}
            </span>
          </div>
        )}
      </div>

      {!isCompactViewport && (
        <div
          onMouseDown={handleResizeMouseDown}
          className="absolute right-0 top-0 h-full w-1 cursor-col-resize z-50 hover:bg-sidebar-primary/20 transition-colors"
        />
      )}
    </aside>
    </>
  );
}
