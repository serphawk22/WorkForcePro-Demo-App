import { ReactNode } from "react";
import AppSidebar from "./AppSidebar";
import TopBar from "./TopBar";

interface DashboardLayoutProps {
  children: ReactNode;
  role?: "admin" | "employee";
  userName?: string;
  userHandle?: string;
}

export default function DashboardLayout({ children, role = "admin", userName, userHandle }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Subtle ambient orbs */}
      <div className="fixed top-20 right-20 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 left-1/3 w-72 h-72 rounded-full bg-accent/5 blur-3xl pointer-events-none" />
      
      <AppSidebar role={role} userName={userName} userHandle={userHandle} />
      <div className="flex flex-1 flex-col min-w-0 relative z-10">
        <TopBar />
        <main className="flex-1 overflow-auto p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
