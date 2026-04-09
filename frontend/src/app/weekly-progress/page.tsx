"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import WeeklyProgressEmployeeSection from "@/components/dashboard/WeeklyProgressEmployeeSection";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";

export default function WeeklyProgressPage() {
  const { user } = useAuth();
  return (
    <ProtectedRoute allowedRoles={["employee", "admin"]}>
      <DashboardLayout role={user?.role === "admin" ? "admin" : "employee"} userName={user?.name} userHandle={user?.email}>
        <div className="space-y-4 pb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Weekly Progress</h1>
            <p className="text-sm text-muted-foreground mt-1">Submit updates and review feedback.</p>
          </div>
          <WeeklyProgressEmployeeSection />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
