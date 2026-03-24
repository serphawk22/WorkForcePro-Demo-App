"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** /admin → default admin overview (avoids 404) */
export default function AdminRootRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/dashboard");
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
      Redirecting…
    </div>
  );
}
