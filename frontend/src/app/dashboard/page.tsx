"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** /dashboard → role-based dashboard (single source of truth lives in /admin/dashboard and /employee-dashboard). */
export default function DashboardRedirect() {
  const router = useRouter();
  useEffect(() => {
    const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
    router.replace(role === "admin" ? "/admin/dashboard" : "/employee-dashboard");
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
      Redirecting…
    </div>
  );
}
