import { ClipboardList, Activity, CheckSquare, ThumbsUp } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: ClipboardList,
    title: "Assign",
    description:
      "Admins or managers create tasks with priorities, deadlines, and assignees. Tasks can nest into full hierarchical trees.",
  },
  {
    number: "02",
    icon: Activity,
    title: "Track",
    description:
      "Employees clock in, update task statuses in real-time. Live timers and session analytics run automatically.",
  },
  {
    number: "03",
    icon: CheckSquare,
    title: "Review",
    description:
      "Managers review deliverables, add comments, and request changes through structured approval threads.",
  },
  {
    number: "04",
    icon: ThumbsUp,
    title: "Approve",
    description:
      "Final sign-off closes the loop. Attendance, productivity, and payroll data update automatically.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-28 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                      w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/25
                          bg-primary/8 text-primary text-xs font-semibold uppercase tracking-widest mb-5">
            Workflow
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-5">
            Simple 4-Step{" "}
            <span className="text-gradient-primary">Workflow</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            From task creation to final approval — streamlined and transparent.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Connector line */}
          <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-primary/20 via-primary/50 to-primary/20 z-0" />

          {steps.map(({ number, icon: Icon, title, description }, i) => (
            <div key={title} className="relative z-10 flex flex-col items-center text-center group">
              {/* Circle */}
              <div className="h-20 w-20 rounded-2xl gradient-primary flex items-center justify-center
                               shadow-primary group-hover:shadow-glow group-hover:scale-110
                               transition-all duration-300 mb-5">
                <Icon size={28} className="text-primary-foreground" />
              </div>

              {/* Step number */}
              <span className="text-xs font-black text-primary/40 tracking-[0.3em] uppercase mb-2">
                Step {number}
              </span>

              <h3 className="text-xl font-bold text-foreground mb-3">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
