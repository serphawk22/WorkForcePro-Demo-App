"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirect page for backward compatibility
 * Redirects /tasks to /project-management
 */
export default function TasksRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/project-management");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <p className="mt-4 text-muted-foreground">Redirecting to Project Management...</p>
      </div>
    </div>
  );
}
