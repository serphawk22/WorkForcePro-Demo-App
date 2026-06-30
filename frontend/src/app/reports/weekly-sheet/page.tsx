"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import ReportsShell from "@/components/reports/ReportsShell";
import WeeklySheetGenerator from "@/components/my-space/WeeklySheetGenerator";

export default function WeeklySheetPage() {
  return (
    <ReportsShell>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Weekly Sheet</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Fill in your weekly work summary manually. Enter your accomplishments, tasks, blockers, and priorities.
          </p>
        </div>
        
        <WeeklySheetGenerator />
      </div>
    </ReportsShell>
  );
}
