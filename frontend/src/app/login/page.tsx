"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // 2️⃣ Auto-redirect if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    
    if (token && role) {
      console.log("User already logged in:", role);
      if (role === "admin") {
        window.location.href = "/admin/dashboard";
      } else {
        window.location.href = "/employee/dashboard";
      }
    }
  }, []);

  // 1️⃣ Login handler with direct fetch
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      console.log("Attempting login with:", { email, password: "***" });
      
      const res = await fetch(`${API_BASE_URL}/auth/login/json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      console.log("Response status:", res.status);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "Unknown error" }));
        console.error("Login failed:", errorData);
        throw new Error(errorData.detail || "Invalid credentials");
      }

      const data = await res.json();
      
      console.log("LOGIN SUCCESS:", data);

      // Ensure role exists
      if (!data.role) {
        console.error("Role missing in response");
        setError("Login failed: Role information missing");
        setIsSubmitting(false);
        return;
      }

      // Store token and role
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("user_id", data.user_id.toString());
      localStorage.setItem("user_name", data.name);
      localStorage.setItem("user_email", data.email);

      // Redirect based on role using window.location for full page reload
      if (data.role === "admin") {
        console.log("Redirecting to admin dashboard");
        window.location.href = "/admin/dashboard";
      } else {
        console.log("Redirecting to employee dashboard");
        window.location.href = "/employee/dashboard";
      }
      
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-primary">
            <Zap size={20} className="text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">
            WorkForce <span className="text-gradient-primary">Pro</span>
          </span>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-card-foreground">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to your account to continue</p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
              {error}
            </div>
          )}

          {/* Default credentials hint */}
          <div className="mb-6 p-3 rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-sm">
            <div className="font-semibold mb-1">Default Admin Credentials:</div>
            <div className="flex flex-col gap-0.5 text-xs">
              <div><strong>Email:</strong> admin@gmail.com</div>
              <div><strong>Password:</strong> admin</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-input py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-input py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
                <input type="checkbox" className="rounded border-border accent-primary" />
                Remember me
              </label>
              <Link href="#" className="text-primary hover:underline font-medium">Forgot password?</Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-primary-foreground gradient-primary shadow-primary hover:shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary hover:underline font-medium">Sign up</Link>
          </div>
        </div>

        {/* Theme toggle */}
        <div className="flex justify-center mt-6">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
