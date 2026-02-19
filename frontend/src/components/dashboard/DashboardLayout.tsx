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
    <div className="flex min-h-screen bg-background">
      <AppSidebar role={role} userName={userName} userHandle={userHandle} />
      <div className="flex flex-1 flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-auto p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
