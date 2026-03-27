"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Mail, Lock, ArrowRight, Loader2, ServerCrash } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getApiBaseUrl } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pendingMessage, setPendingMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverWaking, setServerWaking] = useState(false);
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
        window.location.href = "/employee-dashboard";
      }
    }
  }, []);

  // 3️⃣ Ping server on mount so Railway wakes up before the user even clicks Login
  useEffect(() => {
    let cancelled = false;

    const wakeAndPoll = async () => {
      // Step 1: no-cors fire-and-forget to wake Railway without hitting CORS error
      // (Railway's sleeping proxy returns 502 with no CORS headers; no-cors ignores that)
      try {
        await fetch(`${getApiBaseUrl()}/health`, { method: "GET", mode: "no-cors", cache: "no-store" });
      } catch {}

      // Step 2: poll with normal CORS fetch until FastAPI is actually up
      for (let attempt = 0; attempt < 15; attempt++) {
        if (cancelled) break;
        if (attempt === 1) setServerWaking(true); // show "waking up" banner after first retry
        try {
          const res = await fetch(`${getApiBaseUrl()}/health`, { signal: AbortSignal.timeout(5000) });
          if (res.ok) { setServerWaking(false); return; }
        } catch {}
        await new Promise(r => setTimeout(r, 4000));
      }
      if (!cancelled) setServerWaking(false);
    };

    wakeAndPoll();
    return () => { cancelled = true; };
  }, []);

  // 1️⃣ Login handler with direct fetch
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPendingMessage("");
    setIsSubmitting(true);

    try {
      console.log("Attempting login with:", { email, password: "***" });
      
      const controller = new AbortController();
      const t1 = setTimeout(() => controller.abort(), 35000);
      let res: Response;
      try {
        res = await fetch(`${getApiBaseUrl()}/auth/login/json`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
          signal: controller.signal,
        });
        clearTimeout(t1);
      } catch (fetchErr: any) {
        clearTimeout(t1);
        if (fetchErr.name === "AbortError") {
          // retry once for cold start
          const res2 = await fetch(`${getApiBaseUrl()}/auth/login/json`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          res = res2;
        } else {
          throw fetchErr;
        }
      }

      console.log("Response status:", res.status);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "Unknown error" }));
        console.error("Login failed:", errorData);
        if (res.status === 403) {
          setPendingMessage(errorData.detail || "Your account is pending admin approval.");
          setIsSubmitting(false);
          return;
        }
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
        window.location.href = "/employee-dashboard";
      }
      
    } catch (err: any) {
      console.error("Login error:", err);
      const msg = err?.message || "";
      if (msg === "Failed to fetch" || err?.name === "TypeError") {
        setError(
          "Cannot reach the API. In development, start the backend in another terminal: cd backend && uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
        );
      } else {
        setError(msg || "An unexpected error occurred");
      }
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
        <div className="rounded-2xl glass-card glow-sm p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-card-foreground">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to your account to continue</p>
          </div>

          {serverWaking && (
            <div className="mb-5 p-3 rounded-xl flex items-center gap-3 border border-amber-400/40 bg-amber-500/10 text-amber-300 text-xs">
              <Loader2 size={14} className="animate-spin shrink-0" />
              <span>Server is waking up (free tier cold start). Login will work in ~20 seconds…</span>
            </div>
          )}

          {error && (
            <div className="mb-6 p-3 rounded-xl glass-light bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
              {error}
            </div>
          )}

          {pendingMessage && (
            <div className="mb-6 p-4 rounded-xl border-2 border-purple-400/60 bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-sm">
              <div className="flex items-center gap-2 font-semibold mb-1">
                <span className="text-lg">⏳</span>
                Account Pending Approval
              </div>
              <p>{pendingMessage}</p>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Please wait until an administrator approves your request.</p>
            </div>
          )}


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
                  className="w-full rounded-xl glass-input py-2.5 pl-10 pr-4 text-sm"
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
                  className="w-full rounded-xl glass-input py-2.5 pl-10 pr-4 text-sm"
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
