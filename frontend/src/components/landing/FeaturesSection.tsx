import {
  GitBranch, Users, BarChart3, Clock, Bell, ShieldCheck
} from "lucide-react";

const features = [
  {
    icon: GitBranch,
    title: "Task Hierarchy",
    description:
      "Nested task trees with subtask indentation, priority levels, and real-time status tracking across your entire organization.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Users,
    title: "Role-Based Workflow",
    description:
      "Admin, Manager, and Employee roles with granular permissions. Each user sees exactly what they need — nothing more.",
    color: "bg-accent/10 text-accent",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description:
      "Sprint velocity charts, task distribution graphs, and productivity metrics updated live as your team works.",
    color: "bg-secondary/60 text-accent-foreground",
  },
  {
    icon: Clock,
    title: "Attendance Tracking",
    description:
      "Live session timers, punch-in/out with geolocation, daily hour reports, and automated payroll-ready logs.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description:
      "Contextual alerts for task assignments, deadline reminders, approval requests, and system events — all in one bell.",
    color: "bg-accent/10 text-accent",
  },
  {
    icon: ShieldCheck,
    title: "Collaboration System",
    description:
      "Cross-department task sharing, comment threads, approval chains, and real-time team status visibility.",
    color: "bg-secondary/60 text-accent-foreground",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-28 bg-secondary dark:bg-background-soft relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-48 h-48 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
      
      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card glow-sm
                          text-primary text-xs font-semibold uppercase tracking-widest mb-5">
            Platform Features
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-5">
            Everything Your Team{" "}
            <span className="text-gradient-primary">Needs to Thrive</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            A complete workforce management suite built for modern, distributed teams.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, description, color }, i) => (
            <div
              key={title}
              className="group relative p-7 rounded-2xl glass-card glass-card-hover overflow-hidden
                         hover:-translate-y-2 transition-all duration-400
                         cursor-default"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className={`relative h-12 w-12 rounded-xl glass-light flex items-center justify-center mb-5 ${color}
                               group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                <Icon size={22} />
              </div>
              <h3 className="relative text-lg font-bold text-foreground mb-2">{title}</h3>
              <p className="relative text-muted-foreground text-sm leading-relaxed">{description}</p>

              {/* Accent line */}
              <div className="relative mt-5 h-0.5 w-8 rounded-full bg-gradient-to-r from-primary to-accent group-hover:w-16
                               transition-all duration-400" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
