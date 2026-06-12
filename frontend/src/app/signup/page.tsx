"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight, Loader2, User, Shield } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"admin" | "employee">("employee");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    const result = await register(name, email, password, role);

    if (result.success) {
      setSuccess("Registration successful! Your account is awaiting admin approval. You will be able to log in once approved.");
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } else {
      setError(result.error || "Registration failed");
    }

    setIsLoading(false);
  };

  return (
    <div className="bg-gradient-to-b from-white to-slate-100 min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img
            src="/Serp_Hwak_Logo-removebg-preview.png"
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
            <h1 className="text-2xl font-bold text-slate-900">Create an account</h1>
            <p className="text-sm text-slate-500 mt-1">Join WorkForce Pro today</p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm text-center font-medium">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-3 rounded-xl bg-green-50 border border-green-200 text-green-600 text-sm text-center font-medium">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  name="name"
                  id="name"
                  autoComplete="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  className="w-full h-11 rounded-xl bg-white dark:bg-white border border-slate-200 dark:border-slate-200 pl-10 pr-4 text-sm text-slate-900 dark:text-slate-900 placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition autofill:shadow-[0_0_0_30px_white_inset] [-webkit-text-fill-color:#0f172a]"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
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

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
              <div className="relative">
                <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  value={role}
                  name="role"
                  id="role"
                  autoComplete="off"
                  onChange={(e) => setRole(e.target.value as "admin" | "employee")}
                  className="w-full h-11 rounded-xl bg-white dark:bg-white border border-slate-200 dark:border-slate-200 pl-10 pr-10 text-sm text-slate-900 dark:text-slate-900 appearance-none cursor-pointer focus:outline-none focus:border-slate-400 focus:bg-white transition autofill:shadow-[0_0_0_30px_white_inset] [-webkit-text-fill-color:#0f172a]"
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="password"
                  name="password"
                  id="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full h-11 rounded-xl bg-white dark:bg-white border border-slate-200 dark:border-slate-200 pl-10 pr-4 text-sm text-slate-900 dark:text-slate-900 placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition autofill:shadow-[0_0_0_30px_white_inset] [-webkit-text-fill-color:#0f172a]"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Confirm Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="password"
                  name="confirm-password"
                  id="confirm-password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full h-11 rounded-xl bg-white dark:bg-white border border-slate-200 dark:border-slate-200 pl-10 pr-4 text-sm text-slate-900 dark:text-slate-900 placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition autofill:shadow-[0_0_0_30px_white_inset] [-webkit-text-fill-color:#0f172a]"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-full font-semibold text-sm text-white bg-slate-900 hover:bg-slate-800 transition shadow-lg shadow-slate-900/10 inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="text-slate-900 hover:underline font-medium">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
