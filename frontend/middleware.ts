import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 1️⃣ Define public routes (no auth required)
const publicRoutes = ["/", "/login", "/signup"];

/** Employee-only portal paths — must NOT use startsWith("/employee") (that matches /employees, /employee-handbook, etc.) */
function isEmployeePortalRoute(pathname: string): boolean {
  if (pathname === "/employee-dashboard" || pathname.startsWith("/employee-dashboard/")) return true;
  if (pathname.startsWith("/employee/")) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for Next.js internals (avoid pathname.includes(".") — breaks valid app routes)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  console.log('[MIDDLEWARE] Processing:', pathname);

  // 2️⃣ Check if current route is public - allow without redirect
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route + "/"));
  
  if (isPublicRoute && pathname !== "/login") {
    // If accessing root and has a valid cookie token, redirect to dashboard
    if (pathname === "/") {
      const cookieTokenForRoot = request.cookies.get("access_token")?.value;
      if (cookieTokenForRoot) {
        try {
          const tokenPart = cookieTokenForRoot.split(".")[1];
          const base64 = tokenPart.replace(/-/g, "+").replace(/_/g, "/");
          const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
          let payload;
          if (typeof Buffer !== 'undefined') {
            payload = JSON.parse(Buffer.from(padded, "base64").toString());
          } else {
            payload = JSON.parse(atob(padded));
          }
          const isExpiredRoot = payload.exp * 1000 < Date.now();
          if (!isExpiredRoot && payload.role) {
            const dashboardUrl = payload.role === "admin" ? "/admin/dashboard" : "/employee-dashboard";
            return NextResponse.redirect(new URL(dashboardUrl, request.url));
          }
        } catch {
          // Invalid token, allow landing page
        }
      }
    }
    // Public routes (except login) always allowed
    return NextResponse.next();
  }

  // Get token and role from localStorage (client-side only, middleware can't access it)
  // So we rely on cookies for middleware auth OR let client-side ProtectedRoute handle it
  const cookieToken = request.cookies.get("access_token")?.value;
  
  let userRole: string | null = null;
  let isExpired = false;

  // Decode token if exists
  if (cookieToken) {
    try {
      const tokenPart = cookieToken.split(".")[1];
      const base64 = tokenPart.replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
      
      let payload;
      if (typeof Buffer !== 'undefined') {
        payload = JSON.parse(Buffer.from(padded, "base64").toString());
      } else {
        payload = JSON.parse(atob(padded));
      }
      
      userRole = payload.role;
      isExpired = payload.exp * 1000 < Date.now();
      
      console.log('[MIDDLEWARE] Token found - Role:', userRole, 'Expired:', isExpired);
    } catch (error) {
      console.log('[MIDDLEWARE] Invalid token');
      isExpired = true;
    }
  }

  // 5️⃣ If user has valid token and visits /login, redirect to correct dashboard
  if (pathname === "/login") {
    if (cookieToken && !isExpired && userRole) {
      const dashboardUrl = userRole === "admin" ? "/admin/dashboard" : "/employee-dashboard";
      console.log('[MIDDLEWARE] Already authenticated, redirecting from login to:', dashboardUrl);
      return NextResponse.redirect(new URL(dashboardUrl, request.url));
    }
    // No token or expired - allow login page
    return NextResponse.next();
  }

  // 3️⃣ Check if route starts with /admin
  if (pathname.startsWith("/admin")) {
    // No token or expired → redirect to login
    if (!cookieToken || isExpired) {
      console.log('[MIDDLEWARE] Admin route without valid token, redirecting to login');
      const response = NextResponse.redirect(new URL("/login", request.url));
      if (cookieToken) response.cookies.delete("access_token");
      return response;
    }

    // Has token but not admin → redirect to employee dashboard
    if (userRole !== "admin") {
      console.log('[MIDDLEWARE] Non-admin accessing admin route, redirecting to employee dashboard');
      return NextResponse.redirect(new URL("/employee-dashboard", request.url));
    }

    // Admin with valid token - allow
    return NextResponse.next();
  }

  // 4️⃣ Employee portal (/employee-dashboard, /employee/...) — not /employees
  if (isEmployeePortalRoute(pathname)) {
    // No token or expired → redirect to login
    if (!cookieToken || isExpired) {
      console.log('[MIDDLEWARE] Employee route without valid token, redirecting to login');
      const response = NextResponse.redirect(new URL("/login", request.url));
      if (cookieToken) response.cookies.delete("access_token");
      return response;
    }
    
    // Has token but not employee → redirect to admin dashboard
    if (userRole !== "employee") {
      console.log('[MIDDLEWARE] Non-employee accessing employee route, redirecting to admin dashboard');
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    
    // Employee with valid token - allow
    return NextResponse.next();
  }

  // Other protected routes (tasks, attendance, etc.)
  const protectedRoutes = [
    "/dashboard",
    "/employees",
    "/tasks",
    "/attendance",
    "/requests",
    "/reports",
    "/payroll",
    "/profile",
    "/weekly-progress",
    "/project-management",
    "/my-space",
  ];
  const isProtectedRoute = protectedRoutes.some(route => pathname === route || pathname.startsWith(route + "/"));
  
  if (isProtectedRoute) {
    // Note: localStorage token is checked client-side in ProtectedRoute component
    // If no cookie, let client-side handle it (for localStorage-based auth)
    if (!cookieToken) {
      console.log('[MIDDLEWARE] Protected route without cookie - allowing (client-side will check localStorage)');
      return NextResponse.next();
    }
    
    // Has cookie but expired
    if (isExpired) {
      console.log('[MIDDLEWARE] Expired token on protected route, redirecting to login');
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("access_token");
      return response;
    }
  }

  // 6️⃣ Default: allow access
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * Include "/" explicitly — some setups omit the root from a single catch-all matcher.
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
    "/",
  ],
};
