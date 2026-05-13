"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading, isLoggedIn } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || "";
  const hasRedirected = useRef(false);
  const [authLoadTimedOut, setAuthLoadTimedOut] = useState(false);

  const hasLocalSession =
    typeof window !== "undefined" &&
    Boolean(localStorage.getItem("token") && localStorage.getItem("role") && localStorage.getItem("user_id"));

  const RedirectState = ({ message }: { message: string }) => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/20 bg-white/20 dark:bg-white/5 px-8 py-6 backdrop-blur-xl shadow-lg">
        <Loader2 size={40} className="animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );

  useEffect(() => {
    if (!isLoading) {
      setAuthLoadTimedOut(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setAuthLoadTimedOut(true);
      console.warn("[PROTECTED ROUTE] Auth load timeout reached, using fallback behavior");
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    const userRole = user?.role;
    
    console.log('[PROTECTED ROUTE]', {
      pathname,
      isLoading,
      isLoggedIn,
      userRole,
      allowedRoles,
      hasRedirected: hasRedirected.current
    });
    
    // 3️⃣ Don't interfere with login page
    if (pathname === "/login") {
      console.log('[PROTECTED ROUTE] On login page, skipping checks');
      return;
    }
    
    // Wait for loading to finish unless we timed out and have a local session fallback.
    if (isLoading && !(authLoadTimedOut && hasLocalSession)) {
      console.log('[PROTECTED ROUTE] Still loading, waiting...');
      return;
    }

    // Prevent multiple redirects
    if (hasRedirected.current) {
      console.log('[PROTECTED ROUTE] Already redirected, skipping');
      return;
    }

    // Check if not logged in
    if (!isLoggedIn) {
      console.log('[PROTECTED ROUTE] Not logged in, redirecting to /login');
      hasRedirected.current = true;
      router.replace("/login");
      return;
    }

    // 3️⃣ Check role permission
    if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
      console.log(`[PROTECTED ROUTE] Role mismatch - User: ${userRole}, Allowed: ${allowedRoles.join(', ')}`);
      
      // Redirect to appropriate dashboard based on role
      const targetPath = userRole === "admin" ? "/admin/dashboard" : "/employee-dashboard";
      
      // Only redirect if not already on target path
      if (pathname !== targetPath) {
        console.log(`[PROTECTED ROUTE] Redirecting to ${targetPath}`);
        hasRedirected.current = true;
        router.replace(targetPath);
      }
      return;
    }

    console.log('[PROTECTED ROUTE] Access granted ✓');
  }, [isLoading, isLoggedIn, user, allowedRoles, router, pathname, authLoadTimedOut, hasLocalSession]);

  // 3️⃣ Show loading spinner while checking auth
  if (isLoading && !authLoadTimedOut) {
    console.log('[PROTECTED ROUTE] Rendering loading spinner');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Fallback: if auth hydration is stuck but local session exists, render children instead of blank screen.
  if (isLoading && authLoadTimedOut && hasLocalSession) {
    console.warn('[PROTECTED ROUTE] Rendering children with local session fallback');
    return <>{children}</>;
  }

  // Don't render anything if not logged in (redirecting)
  if (!isLoggedIn) {
    return <RedirectState message="Redirecting to login..." />;
  }

  // Don't render if role mismatch (redirecting)
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <RedirectState message="Redirecting to your dashboard..." />;
  }

  return <>{children}</>;
}
