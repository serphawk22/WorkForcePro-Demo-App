"use client";

import { useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight } from "lucide-react";
import TextType from "@/components/TextType";
import ScrollFloat from "@/components/ScrollFloat";

const PixelBlast = dynamic(() => import("@/components/PixelBlast"), {
  ssr: false,
  loading: () => <div className="w-full h-screen bg-white" />
});

export default function Home() {
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (token && role) {
      window.location.replace(role === "admin" ? "/admin/dashboard" : "/employee-dashboard");
    }
  }, []);

  return (
    <div className="relative min-h-screen bg-white overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <PixelBlast
          variant="circle"
          pixelSize={6}
          color="#B497CF"
          patternScale={3}
          patternDensity={1.2}
          pixelSizeJitter={0.5}
          enableRipples
          rippleSpeed={0.4}
          rippleThickness={0.12}
          rippleIntensityScale={1.5}
          liquid
          liquidStrength={0.12}
          liquidRadius={1.2}
          liquidWobbleSpeed={5}
          speed={0.6}
          edgeFade={0.25}
          transparent
        />
      </div>
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50">
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
          <TextType
            as="h1"
            text={["Experience liftoff with workforce pro"]}
            typingSpeed={60}
            pauseDuration={2000}
            showCursor={true}
            cursorCharacter="|"
            loop={false}
            className="text-5xl md:text-7xl lg:text-8xl font-medium text-gray-900 mb-8 leading-tight tracking-tight"
          />

          <p className="text-base md:text-lg text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Manage tasks, track attendance, and streamline workflows with AI-powered intelligence — all in one platform.
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
            <ScrollFloat
              containerClassName="mb-4"
              textClassName="text-3xl md:text-4xl font-medium text-gray-900 whitespace-nowrap"
              animationDuration={1}
              ease="back.inOut(2)"
              scrollStart="center bottom+=50%"
              scrollEnd="bottom bottom-=40%"
              stagger={0.02}
            >
              Built for us!
            </ScrollFloat>
            <p className="text-lg text-gray-600">Everything you need in one intelligent platform</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Smart Task Management",
                description: "Hierarchical task creation with AI-powered assignments and tracking"
              },
              {
                title: "Real-time Attendance",
                description: "Accurate punch in/out with detailed analytics and insights"
              },
              {
                title: "Team Collaboration",
                description: "Seamless workflows and communication across your organization"
              },
              {
                title: "Analytics Dashboard",
                description: "Comprehensive reports on productivity and team performance"
              },
              {
                title: "Payroll Integration",
                description: "Streamlined salary management and payment processing"
              },
              {
                title: "AI Approvals",
                description: "Intelligent approval workflows that save time and reduce errors"
              }
            ].map((feature, idx) => (
              <div
                key={idx}
                className="p-8 rounded-2xl border border-gray-200 hover:border-gray-900 hover:shadow-lg transition bg-white group"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
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
