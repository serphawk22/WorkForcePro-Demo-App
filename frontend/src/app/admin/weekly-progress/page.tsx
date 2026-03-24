"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import WeeklyProgressAdminSection from "@/components/dashboard/WeeklyProgressAdminSection";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";

export default function AdminWeeklyProgressPage() {
  const { user } = useAuth();
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout role="admin" userName={user?.name || "Administrator"} userHandle={`@${user?.email?.split("@")[0] || "admin"}`}>
        <div className="space-y-4 pb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Weekly Progress</h1>
            <p className="text-sm text-muted-foreground mt-1">Review team submissions and leave feedback.</p>
          </div>
          <WeeklyProgressAdminSection />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
