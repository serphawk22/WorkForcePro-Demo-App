import Link from "next/link";
import { ArrowRight, PlayCircle, Sparkles, Brain, Clock, RefreshCw } from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AI Task Creation 🤖",
    description: "Create tasks, assign employees, and structure workflows instantly using AI.",
    gradient: "from-purple-500 via-pink-400 to-pink-300",
  },
  {
    icon: Clock,
    title: "Smart Attendance Tracking ⏱️",
    description: "Real-time punch-in/out tracking with productivity insights.",
    gradient: "from-blue-500 via-purple-500 to-purple-300",
  },
  {
    icon: RefreshCw,
    title: "Recurring Task Automation 🔁",
    description: "Automate weekly/monthly tasks and never miss repetitive workflows.",
    gradient: "from-orange-400 via-pink-500 to-pink-300",
  },
];

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden bg-background">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full bg-gradient-to-br from-background via-primary/5 to-accent/10 dark:from-background dark:via-background dark:to-background" />
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/80 to-background/60" />
      </div>

      {/* Decorative orbs */}
      <div className="absolute top-32 right-16 w-72 h-72 rounded-full bg-primary/15 blur-3xl animate-float" />
      <div className="absolute bottom-24 left-8 w-56 h-56 rounded-full bg-accent/15 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <div className="relative z-10 container mx-auto px-6 py-24">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card glow-sm
                          text-primary text-xs font-semibold uppercase tracking-widest mb-8
                          animate-fade-in">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Workforce Intelligence Platform
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6 animate-fade-in-up"
              style={{ animationDelay: "0.1s" }}>
            Manage Your{" "}
            <span className="text-gradient-primary">Workforce</span>
            {" "}Smarter
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up"
             style={{ animationDelay: "0.2s" }}>
            WorkForce Pro unifies task hierarchies, real-time attendance, role-based workflows,
            and AI-powered approvals — all in one premium dashboard.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in-up"
               style={{ animationDelay: "0.3s" }}>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl text-base font-bold
                         text-primary-foreground gradient-primary shadow-primary glow-primary
                         hover:shadow-glow hover:scale-105 active:scale-95 transition-all duration-300"
            >
              Get Started Free <ArrowRight size={18} />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl text-base font-bold
                         text-primary glass-card glass-card-hover
                         transition-all duration-300"
            >
              <PlayCircle size={18} /> See How It Works
            </a>
          </div>

          {/* Feature-driven cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 animate-fade-in-up" style={{ animationDelay: "0.45s" }}>
            {features.map(({ icon: Icon, title, description, gradient }, i) => (
              <div
                key={title}
                className="group relative p-8 rounded-3xl bg-white/60 dark:bg-background/70 shadow-xl border border-border/30 dark:border-border/50 backdrop-blur-lg overflow-hidden flex flex-col items-center gap-4 transition-all duration-300 hover:-translate-y-3 hover:shadow-2xl hover:border-accent/60 cursor-pointer"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                {/* Animated gradient glow on hover */}
                <div className={`absolute -inset-1 z-0 rounded-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500`} style={{ boxShadow: '0 0 48px 0 rgba(133,79,108,0.18)' }}>
                  <div className={`w-full h-full rounded-3xl bg-gradient-to-br ${gradient} opacity-40 blur-2xl`} />
                </div>
                {/* Icon with glass background and subtle shadow */}
                <div className="relative z-10 h-16 w-16 rounded-2xl flex items-center justify-center mb-2 bg-gradient-to-br from-white/80 via-background/60 to-accent/10 shadow-lg group-hover:scale-110 group-hover:rotate-2 transition-all duration-300">
                  <Icon size={32} className="text-primary drop-shadow-lg" />
                </div>
                <h3 className="relative z-10 text-xl font-extrabold text-foreground text-center mb-1 tracking-tight group-hover:text-primary transition-colors duration-200">{title}</h3>
                <p className="relative z-10 text-muted-foreground text-base leading-relaxed text-center font-medium">{description}</p>
                {/* Accent line for premium feel */}
                <div className={`relative z-10 mt-4 h-1 w-16 rounded-full bg-gradient-to-r ${gradient} opacity-80 group-hover:w-24 transition-all duration-400`} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Wave divider */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <svg viewBox="0 0 1440 60" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"
             className="w-full fill-secondary dark:fill-background-soft" style={{ height: "60px" }}>
          <path d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" />
        </svg>
      </div>
    </section>
  );
}
