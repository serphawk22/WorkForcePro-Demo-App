"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";

const ALL_TABS = [
  { label: "Global",   path: "/project-management" },
  { label: "Workspace", path: "/project-management/workspaces" },
  { label: "Summary",  path: "/project-management/summary" },
  { label: "Board",    path: "/project-management/board" },
  { label: "Projects", path: "/project-management/projects" },
  { label: "Calendar", path: "/project-management/calendar" },
  { label: "Timeline", path: "/project-management/timeline" },
  { label: "Reports",  path: "/project-management/reports" },
];

interface ProjectShellProps {
  children: React.ReactNode;
  /** Right side header action (e.g. New Project button) */
  headerAction?: React.ReactNode;
  activeWorkspaceId?: string | null;
}

export default function ProjectShell({ children, headerAction, activeWorkspaceId }: ProjectShellProps) {
  return (
    <Suspense fallback={<div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading project management...</div>}>
      <ProjectShellContent headerAction={headerAction} activeWorkspaceId={activeWorkspaceId}>{children}</ProjectShellContent>
    </Suspense>
  );
}

function ProjectShellContent({ children, headerAction, activeWorkspaceId }: ProjectShellProps) {
  const { user } = useAuth();
  const pathname = usePathname() || "";
  const isAdmin = user?.role === "admin";

  const workspaceMatch = pathname.match(/^\/project-management\/workspaces\/(\d+)/);
  const workspaceIdFromPath = workspaceMatch?.[1] || null;
  const activeWorkspace = workspaceIdFromPath || activeWorkspaceId || null;

  // Employees: global + core project views
  const tabs = (isAdmin ? ALL_TABS : ALL_TABS.filter(t => ["Global", "Workspace", "Summary", "Board", "Projects"].includes(t.label))).map((tab) => {
    if (activeWorkspace) {
      if (tab.label === "Workspace") {
        return { ...tab, path: `/project-management/workspaces/${activeWorkspace}` };
      }
      if (["Summary", "Board", "Projects", "Calendar", "Timeline", "Reports"].includes(tab.label)) {
        return { ...tab, path: `${tab.path}?workspace=${activeWorkspace}` };
      }
    }
    if (!activeWorkspace && tab.label === "Workspace") {
      return { ...tab, path: "/project-management" };
    }
    return tab;
  });

  return (
    <ProtectedRoute>
      <DashboardLayout
        role={isAdmin ? "admin" : "employee"}
        userName={user?.name || "User"}
        userHandle={`@${user?.email?.split("@")[0] || "user"}`}
      >
        <div className="space-y-5">
          {/* ── Page header ── */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground drop-shadow-sm">
                Project Management
              </h1>
              <p className="text-sm mt-0.5 text-muted-foreground">
                {isAdmin
                  ? "Manage workspace, track progress, and coordinate your team"
                  : "Track your projects and collaborate with your team"}
              </p>
            </div>
            {headerAction && <div>{headerAction}</div>}
          </div>

          {/* ── Tab bar ── */}
          <div
            className="flex items-center gap-1.5 p-1.5 rounded-xl overflow-x-auto glass-card card-shadow"
          >
            {tabs.map((tab) => {
              if (tab.label === "Workspace" && !activeWorkspace) {
                return null;
              }

              const isProjectsTab = tab.label === "Projects";
              const isWorkspaceTab = tab.label === "Workspace";
              const tabWorkspaceId = tab.path.includes("workspace=")
                ? new URLSearchParams(tab.path.split("?")[1]).get("workspace")
                : null;
              const isActive = isProjectsTab
                ? pathname === "/project-management/projects"
                : isWorkspaceTab
                  ? Boolean(activeWorkspace) && pathname === `/project-management/workspaces/${activeWorkspace}`
                : pathname === tab.path;
              return (
                <Link
                  key={tab.path}
                  href={tab.path}
                  prefetch
                  scroll={false}
                  className={`whitespace-nowrap px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? "text-white shadow-lg shadow-purple-500/40 scale-105 bg-gradient-to-r from-purple-600 to-pink-600"
                      : "text-primary hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-pink-500/10 hover:scale-[1.02] dark:text-purple-300"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>

          {/* ── Tab content ── */}
          <div>{children}</div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
