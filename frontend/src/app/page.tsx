"use client";

import { useEffect } from "react";
import { NavBar } from "@/components/landing/NavBar";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { AIVisionSection } from "@/components/landing/AIVisionSection";
import { FooterSection } from "@/components/landing/FooterSection";

export default function Home() {
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (token && role) {
      window.location.replace(role === "admin" ? "/admin/dashboard" : "/employee-dashboard");
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <AIVisionSection />
      </main>
      <FooterSection />
    </div>
  );
}
