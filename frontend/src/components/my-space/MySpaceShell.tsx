"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";

const TABS = [
  { label: "Task Sheet", path: "/my-space/task-sheet" },
  { label: "Happy Sheet", path: "/my-space/happy-sheet" },
  { label: "Visionary Canvas", path: "/my-space/visionary-canvas" },
  { label: "Learning Canvas", path: "/my-space/learning-canvas" },
];

interface MySpaceShellProps {
  children: React.ReactNode;
  /** Right side header action (optional) */
  headerAction?: React.ReactNode;
}

export default function MySpaceShell({ children, headerAction }: MySpaceShellProps) {
  const { user } = useAuth();
  const pathname = usePathname() || "";

  return (
    <ProtectedRoute>
      <DashboardLayout
        role={user?.role as "admin" | "employee"}
        userName={user?.name || "User"}
        userHandle={`@${user?.email?.split("@")[0] || "user"}`}
        noPadding
      >
        {/*
          noPadding disables DashboardLayout's p-6 + overflow-auto.
          We now control height, padding and scrolling ourselves.
        */}
        <div
          className="flex flex-col"
          style={{ height: "calc(100vh - 64px)" }}
        >
          {/* ── Fixed header + tab bar ── */}
          <div className="flex-shrink-0 px-6 pt-6 pb-4 space-y-4">
            {/* Page title */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-[#2B124C] dark:text-purple-100">
                  The Lighthouse
                </h1>
                <p className="text-sm mt-0.5 text-[#854F6C] dark:text-purple-400">
                  Your personal space for growth, reflections, and aspirations
                </p>
              </div>
              {headerAction && <div>{headerAction}</div>}
            </div>

            {/* Tab bar */}
            <div
              className="flex items-center gap-1 p-1 rounded-xl overflow-x-auto border lighthouse-tab-bar"
            >
              {TABS.map((tab) => {
                const isActive = pathname === tab.path;
                return (
                  <Link
                    key={tab.path}
                    href={tab.path}
                    className={`whitespace-nowrap px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? "text-white shadow-md transform scale-[1.02] lighthouse-tab-active"
                        : "hover:bg-white/50 dark:hover:bg-white/10 lighthouse-tab-inactive"
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* ── Scrollable content area ── */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 hide-scrollbar">
            {children}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
