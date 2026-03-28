"use client";

import { useEffect, useRef } from "react";
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
    
    // Wait for loading to finish
    if (isLoading) {
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
  }, [isLoading, isLoggedIn, user, allowedRoles, router, pathname]);

  // 3️⃣ Show loading spinner while checking auth
  if (isLoading) {
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

  // Don't render anything if not logged in (redirecting)
  if (!isLoggedIn) {
    return null;
  }

  // Don't render if role mismatch (redirecting)
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
