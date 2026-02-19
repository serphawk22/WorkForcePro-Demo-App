import Link from "next/link";
import { ArrowRight, PlayCircle, Users, BarChart3, Clock } from "lucide-react";

const stats = [
  { icon: Users, label: "Active Teams", value: "2,400+" },
  { icon: BarChart3, label: "Tasks Tracked", value: "1.2M+" },
  { icon: Clock, label: "Hours Saved / mo", value: "18,000+" },
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
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30
                          bg-primary/10 text-primary text-xs font-semibold uppercase tracking-widest mb-8
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
              href="/login"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl text-base font-bold
                         text-primary-foreground gradient-primary shadow-primary
                         hover:shadow-glow hover:scale-105 active:scale-95 transition-all duration-300"
            >
              Get Started Free <ArrowRight size={18} />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl text-base font-bold
                         text-primary border-2 border-primary/30 bg-primary/5
                         hover:bg-primary/15 hover:border-primary/50 transition-all duration-300"
            >
              <PlayCircle size={18} /> See How It Works
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 animate-fade-in-up" style={{ animationDelay: "0.45s" }}>
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label}
                   className="p-5 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/60
                              shadow-card flex flex-col items-center gap-2 hover:shadow-primary/10
                              hover:-translate-y-1 transition-all duration-300">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon size={18} className="text-primary" />
                </div>
                <p className="text-2xl font-extrabold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground font-medium text-center">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Wave divider */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <svg viewBox="0 0 1440 60" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"
             className="w-full fill-background-soft" style={{ height: "60px" }}>
          <path d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" />
        </svg>
      </div>
    </section>
  );
}
