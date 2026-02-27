"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";

const ALL_TABS = [
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
}

export default function ProjectShell({ children, headerAction }: ProjectShellProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const isAdmin = user?.role === "admin";

  // Employees: only Summary, Board, Projects
  const tabs = isAdmin ? ALL_TABS : ALL_TABS.filter(t => ["Summary", "Board", "Projects"].includes(t.label));

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
              <h1 className="text-2xl font-bold" style={{ color: "#2B124C" }}>
                Project Management
              </h1>
              <p className="text-sm mt-0.5" style={{ color: "#854F6C" }}>
                {isAdmin
                  ? "Manage workspace, track progress, and coordinate your team"
                  : "Track your projects and collaborate with your team"}
              </p>
            </div>
            {headerAction && <div>{headerAction}</div>}
          </div>

          {/* ── Tab bar ── */}
          <div
            className="flex items-center gap-1 p-1 rounded-xl overflow-x-auto"
            style={{ background: "hsl(5 38% 79% / 0.35)" }}
          >
            {tabs.map((tab) => {
              const isActive =
                pathname === tab.path ||
                (tab.path === "/project-management/summary" &&
                  pathname === "/project-management");
              return (
                <Link
                  key={tab.path}
                  href={tab.path}
                  className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "text-white shadow-md"
                      : "hover:bg-white/50"
                  }`}
                  style={
                    isActive
                      ? { background: "#522B5B" }
                      : { color: "#522B5B" }
                  }
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
