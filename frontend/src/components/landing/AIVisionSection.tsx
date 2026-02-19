import { Brain, FileCheck, Sparkles, Bot } from "lucide-react";

const aiFeatures = [
  {
    icon: Brain,
    title: "Intelligent Leave Detection",
    description: "AI reads leave requests in natural language and routes them to the right approver instantly.",
  },
  {
    icon: FileCheck,
    title: "Paperless Approval System",
    description: "Zero paper, zero friction. Smart forms auto-populate from employee profiles and historical data.",
  },
  {
    icon: Bot,
    title: "Automated Workflow Triggers",
    description: "When a task closes, AI can auto-assign follow-ups, notify stakeholders, and update payroll records.",
  },
  {
    icon: Sparkles,
    title: "Predictive Analytics",
    description: "Forecast workload, flag burnout risks, and surface productivity bottlenecks before they escalate.",
  },
];

export function AIVisionSection() {
  return (
    <section id="ai-vision" className="py-28 relative overflow-hidden">
      {/* Purple gradient background */}
      <div className="absolute inset-0 gradient-primary opacity-95" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(330_30%_40%_/_0.3),_transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_hsl(270_60%_15%_/_0.5),_transparent_60%)]" />

      {/* Floating orbs */}
      <div className="absolute top-12 right-24 w-64 h-64 rounded-full bg-primary-foreground/5 blur-3xl animate-float" />
      <div className="absolute bottom-12 left-16 w-48 h-48 rounded-full bg-accent/20 blur-2xl animate-float" style={{ animationDelay: "2s" }} />

      <div className="relative z-10 container mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary-foreground/25
                          bg-primary-foreground/10 text-primary-foreground text-xs font-semibold uppercase tracking-widest mb-6">
            <Sparkles size={12} /> AI-Powered Future
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-primary-foreground mb-5">
            The Future of Workforce
            <br />
            <span className="opacity-80">Management is Intelligent</span>
          </h2>
          <p className="text-primary-foreground/70 text-lg leading-relaxed">
            WorkForce Pro is building toward a fully AI-automated leave and approval system —
            paperless, frictionless, and always compliant.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
          {aiFeatures.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="p-6 rounded-2xl bg-primary-foreground/10 border border-primary-foreground/20
                         backdrop-blur-sm hover:bg-primary-foreground/15 hover:-translate-y-1
                         transition-all duration-300 group"
            >
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 rounded-xl bg-primary-foreground/15 flex items-center justify-center
                                flex-shrink-0 group-hover:bg-primary-foreground/25 transition-colors">
                  <Icon size={20} className="text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-primary-foreground mb-1.5">{title}</h3>
                  <p className="text-sm text-primary-foreground/70 leading-relaxed">{description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA pill */}
        <div className="mt-14 text-center">
          <p className="text-primary-foreground/60 text-sm mb-4 uppercase tracking-widest font-medium">
            Coming Soon · Stay tuned
          </p>
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary-foreground/15
                           border border-primary-foreground/25 text-primary-foreground font-semibold text-sm
                           backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-primary-foreground/80 animate-pulse" />
            AI Beta launching Q3 2026
          </div>
        </div>
      </div>
    </section>
  );
}
