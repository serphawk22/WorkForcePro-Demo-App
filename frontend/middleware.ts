import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
const protectedRoutes = [
  "/dashboard",
  "/employee-dashboard",
  "/employees",
  "/tasks",
  "/attendance",
  "/requests",
  "/reports",
  "/payroll",
  "/profile",
];

// Routes that require admin role
const adminRoutes = [
  "/dashboard",
  "/employees",
  "/reports",
  "/payroll",
];

// Routes that require employee role
const employeeRoutes = [
  "/employee-dashboard",
];

// Public routes (no auth required)
const publicRoutes = ["/", "/login", "/signup"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for API routes, static files, etc.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname === route || pathname.startsWith(route + "/")
  );
  
  const isPublicRoute = publicRoutes.includes(pathname);
  
  // Get the access token from cookies
  const token = request.cookies.get("access_token")?.value;
  
  // If no token and trying to access protected route, redirect to login
  if (isProtectedRoute && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // If has token, verify and get user role
  if (token) {
    try {
      // Decode JWT to get role (basic decode, not verification)
      const tokenPart = token.split(".")[1];
      const base64 = tokenPart.replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
      const payload = JSON.parse(Buffer.from(padded, "base64").toString());
      
      const userRole = payload.role;
      const isExpired = payload.exp * 1000 < Date.now();
      
      // If token is expired, redirect to login
      if (isExpired) {
        const response = NextResponse.redirect(new URL("/login", request.url));
        response.cookies.delete("access_token");
        return response;
      }
      
      // If authenticated user tries to access login/signup, redirect to appropriate dashboard
      if (isPublicRoute && pathname !== "/") {
        const dashboardUrl = userRole === "admin" ? "/dashboard" : "/employee-dashboard";
        return NextResponse.redirect(new URL(dashboardUrl, request.url));
      }
      
      // Check role-based access
      const isAdminRoute = adminRoutes.some(route => 
        pathname === route || pathname.startsWith(route + "/")
      );
      const isEmployeeRoute = employeeRoutes.some(route => 
        pathname === route || pathname.startsWith(route + "/")
      );
      
      // Admin trying to access employee-only route
      if (isEmployeeRoute && userRole === "admin") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      
      // Employee trying to access admin-only route
      if (isAdminRoute && userRole === "employee") {
        return NextResponse.redirect(new URL("/employee-dashboard", request.url));
      }
      
    } catch (error) {
      // Invalid token, clear it and redirect to login
      if (isProtectedRoute) {
        const response = NextResponse.redirect(new URL("/login", request.url));
        response.cookies.delete("access_token");
        return response;
      }
    }
  }
  
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
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
