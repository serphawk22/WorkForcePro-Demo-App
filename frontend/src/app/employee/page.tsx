"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** /employee → main employee dashboard (avoids 404 for short links) */
export default function EmployeeRootRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/employee-dashboard");
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
      Redirecting…
    </div>
  );
}
