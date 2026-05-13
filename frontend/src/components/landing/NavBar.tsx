"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, Menu, X, Zap } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BookDemoModal } from "./BookDemoModal";

export function NavBar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-nav">
      <div className="h-16 px-6 md:px-8 relative flex items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 relative z-20">
          <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center shadow-primary">
            <Zap size={18} className="text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            WorkForce <span className="text-gradient-primary">Pro</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-10 text-sm font-medium text-muted-foreground absolute left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <a href="#features" className="hover:text-primary transition-colors pointer-events-auto">Features</a>
          <a href="#how-it-works" className="hover:text-primary transition-colors pointer-events-auto">How It Works</a>
          <a href="#ai-vision" className="hover:text-primary transition-colors pointer-events-auto">AI Vision</a>
        </nav>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-3 absolute right-6 md:right-8 top-1/2 -translate-y-1/2 z-30 pointer-events-auto">
          <ThemeToggle />
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-semibold rounded-full text-primary border border-primary/30
                       hover:bg-primary/10 transition-all duration-200"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 text-sm font-semibold rounded-full text-primary-foreground gradient-primary shadow-primary hover:shadow-xl hover:scale-105 active:scale-95 border-0 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            Get Started
          </Link>
          <BookDemoModal
            buttonClassName="demo-cta px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200"
            buttonIcon={<CalendarDays size={14} className="opacity-75 transition-opacity duration-200" aria-hidden="true" />}
          />
        </div>

        {/* Mobile */}
        <div className="flex md:hidden items-center gap-2 ml-auto relative z-30">
          <ThemeToggle />
          <BookDemoModal buttonClassName="demo-cta px-3 py-2 text-sm font-semibold rounded-full" buttonIcon={<CalendarDays size={14} className="opacity-75 transition-opacity duration-200" aria-hidden="true" />} />
          <button
            onClick={() => setOpen(!open)}
            className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden glass-panel px-6 py-4 space-y-3">
          {["#features", "#how-it-works", "#ai-vision"].map((href) => (
            <a
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="block py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors capitalize"
            >
              {href.replace("#", "").replace("-", " ")}
            </a>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            <Link href="/login" className="w-full text-center py-2.5 text-sm font-semibold rounded-xl border border-primary/30 text-primary">Log In</Link>
            <Link href="/signup" className="w-full text-center py-2.5 text-sm font-semibold rounded-xl text-primary-foreground gradient-primary">Get Started</Link>
          </div>
        </div>
      )}
    </header>
  );
}
