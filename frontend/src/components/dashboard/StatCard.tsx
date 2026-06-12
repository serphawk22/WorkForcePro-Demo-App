import { LucideIcon, ArrowUpRight } from "lucide-react";
import Link from "next/link";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  trendType?: "up" | "down" | "stable";
  iconColor?: string;
  shadowColor?: string;
  href?: string;
  enablePremiumHover?: boolean;
}

const trendColors = {
  up: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
  down: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
  stable: "bg-slate-50 text-slate-700 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
};

export default function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  trend,
  trendType = "stable",
  iconColor,
  href,
}: StatCardProps) {
  const inner = (
    <div
      className={`group relative rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-foreground/20 hover:shadow-sm ${href ? "cursor-pointer" : ""}`}
    >
      <div className="relative flex items-start justify-between mb-4">
        <div
          className={`rounded-lg p-2.5 ${iconColor || "bg-secondary text-foreground"}`}
        >
          <Icon size={18} />
        </div>
        <div className="flex items-center gap-2">
          {trend && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${trendColors[trendType]}`}>
              {trendType === "up" ? "↑" : trendType === "down" ? "↓" : "•"} {trend}
            </span>
          )}
          {href && (
            <span className="flex items-center justify-center w-7 h-7 rounded-full text-muted-foreground group-hover:text-foreground transition-colors">
              <ArrowUpRight size={14} />
            </span>
          )}
        </div>
      </div>
      <p className="text-2xl font-semibold text-card-foreground">{value}</p>
      <p className="text-sm font-medium text-card-foreground mt-1">{label}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }

  return inner;
}
