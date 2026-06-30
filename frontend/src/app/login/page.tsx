"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeClosed, ArrowRight, Loader2 } from "lucide-react";
import { getApiBaseUrl } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [pendingMessage, setPendingMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverWaking, setServerWaking] = useState(false);
  const router = useRouter();

  // Auto-redirect if user is already logged in
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

  // Ping server on mount so Railway wakes up before the user even clicks Login
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

  // Login handler with direct fetch
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
        let detail = "Login failed";
        try {
          const errorData = await res.json();
          detail = errorData?.detail || detail;
          console.error("Login failed:", errorData);
        } catch {
          const errorText = await res.text().catch(() => "");
          if (errorText) {
            if (/ECONNREFUSED|Failed to proxy|Bad Gateway|502/i.test(errorText)) {
              detail = "Cannot reach API server. Start backend and try again.";
            } else {
              detail = `Login failed (${res.status})`;
            }
          }
          console.error("Login failed with non-JSON response:", errorText || `status ${res.status}`);
        }
        if (res.status === 403) {
          setPendingMessage(detail || "Your account is pending admin approval.");
          setIsSubmitting(false);
          return;
        }
        throw new Error(detail || "Invalid credentials");
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
    <div className="bg-gradient-to-b from-white to-slate-100 min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img
            src="/Serp_Hawk_Logo-removebg-preview.png"
            alt="SerpHawk Logo"
            className="h-8 w-8 object-contain"
          />
          <span className="text-xl font-bold tracking-tight text-slate-800">
            WorkForce Pro
          </span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200/60 shadow-xl shadow-slate-200/50">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
            <p className="text-sm text-slate-500 mt-1">Sign in to your account to continue</p>
          </div>

          {serverWaking && (
            <div className="mb-5 p-3 rounded-xl flex items-center gap-3 border border-amber-200 bg-amber-50 text-amber-800 text-xs">
              <Loader2 size={14} className="animate-spin shrink-0 text-amber-600" />
              <span>Server is waking up (free tier cold start). Login will work in ~20 seconds…</span>
            </div>
          )}

          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm text-center font-medium">
              {error}
            </div>
          )}

          {pendingMessage && (
            <div className="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-sm">
              <p className="font-semibold mb-1 text-amber-800">Account Pending Approval</p>
              <p className="text-amber-800">{pendingMessage}</p>
              <p className="mt-1 text-xs text-amber-700">Please wait until an administrator approves your request.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  name="email"
                  id="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-11 rounded-xl bg-white dark:bg-white border border-slate-200 dark:border-slate-200 pl-10 pr-4 text-sm text-slate-900 dark:text-slate-900 placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition autofill:shadow-[0_0_0_30px_white_inset] [-webkit-text-fill-color:#0f172a]"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
              <div className="flex items-stretch gap-2">
                <div className="relative flex-1">
                  <Lock size={16} className="absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    id="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full h-11 rounded-xl bg-white dark:bg-white border border-slate-200 dark:border-slate-200 pl-10 pr-4 text-sm text-slate-900 dark:text-slate-900 placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition autofill:shadow-[0_0_0_30px_white_inset] [-webkit-text-fill-color:#0f172a]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="w-11 h-11 rounded-xl border border-slate-200 bg-white text-slate-600 flex items-center justify-center shrink-0 hover:bg-slate-100 transition"
                >
                  {showPassword ? <Eye size={16} /> : <EyeClosed size={16} />}
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-500 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-300 accent-slate-900" />
                Remember me
              </label>
              <Link href="#" className="text-slate-900 hover:underline font-medium">Forgot password?</Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-full font-semibold text-sm text-white bg-slate-900 hover:bg-slate-800 transition shadow-lg shadow-slate-900/10 inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

          <div className="mt-6 text-center text-sm text-slate-500">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-slate-900 hover:underline font-medium">Sign up</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
