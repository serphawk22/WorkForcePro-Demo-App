import { ReactNode, Suspense } from "react";
import AppSidebar from "./AppSidebar";
import TopBar from "./TopBar";

interface DashboardLayoutProps {
  children: ReactNode;
  role?: "admin" | "employee";
  userName?: string;
  userHandle?: string;
  noPadding?: boolean;
}

export default function DashboardLayout({ children, role = "admin", userName, userHandle, noPadding }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen dashboard-root">
      {/* Subtle ambient orbs */}
      <div className="lm-orb fixed top-20 right-20 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="lm-orb fixed bottom-20 left-1/3 w-72 h-72 rounded-full bg-accent/5 blur-3xl pointer-events-none" />
      
      <Suspense fallback={<div className="w-[72px] shrink-0" />}>
        <AppSidebar role={role} userName={userName} userHandle={userHandle} />
      </Suspense>
      <div className="flex flex-1 flex-col min-w-0 relative z-10 transition-[margin] duration-300 ease-in-out" style={{ marginLeft: 'var(--sidebar-width, 72px)' }}>
        <TopBar />
        <main className={`flex-1 animate-fade-in${noPadding ? "" : " overflow-auto px-6 pt-3 pb-6"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
