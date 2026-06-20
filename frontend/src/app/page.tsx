"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const FEATURES = [
  { title: "Project Management", description: "Workspaces, parent/child nodes, tasks and subtasks in one clear hierarchy." },
  { title: "Workforce Management", description: "Attendance, leave, payroll and employee records in a single place." },
  { title: "Team Communication", description: "Workspace channels and direct messages to keep teams aligned." },
  { title: "Reports & Analytics", description: "Automatic weekly and monthly reports with CSV export." },
  { title: "Company Culture", description: "Lightweight daily reflections to keep a pulse on the team." },
  { title: "Roles & Permissions", description: "Clear admin and employee boundaries enforced end to end." },
];

export default function Home() {
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (token && role) {
      window.location.replace(role === "admin" ? "/admin/dashboard" : "/employee-dashboard");
    }
  }, []);

  return (
    <div className="relative min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-gray-900 font-semibold">
            <img
              src="/Serp_Hwak_Logo-removebg-preview.png"
              alt="SerpHawk Logo"
              className="h-8 w-8 object-contain"
            />
            WorkForce Pro
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium">
              Log In
            </Link>
            <Link href="/signup" className="px-4 py-2 bg-gray-900 text-white rounded-full text-sm font-semibold hover:bg-gray-800 transition">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative w-full min-h-screen flex items-center justify-center pt-24">
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-semibold text-gray-900 mb-8 leading-tight tracking-tight">
            The workforce and project platform for modern teams
          </h1>

          <p className="text-base md:text-lg text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Manage projects, attendance, payroll and team communication — all in one professional, fast platform.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition font-semibold text-sm">
              Get Started Free
              <ArrowRight size={16} />
            </Link>
            <a href="#features" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-900 rounded-full hover:bg-gray-200 transition font-semibold text-sm">
              Explore use cases
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-20 bg-white py-20 px-6 border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-4">Built for real companies</h2>
            <p className="text-lg text-gray-600">Everything your team needs in one platform</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {FEATURES.map((feature, idx) => (
              <div
                key={idx}
                className="p-8 rounded-2xl border border-gray-200 hover:border-gray-900 transition bg-white"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-20 bg-white border-t border-gray-100 py-8 px-6">
        <div className="max-w-7xl mx-auto text-center text-gray-600">
          <p>&copy; 2026 WorkForce Pro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
