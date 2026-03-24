import { LucideIcon, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";

type DashboardHoverAccentStyle = CSSProperties & {
  "--admin-card-accent"?: string;
  "--admin-card-accent-secondary"?: string;
};

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
  hoverAccentStyle?: DashboardHoverAccentStyle;
}

const trendColors = {
  up: "bg-green-500/20 text-green-300 border border-green-500/30",
  down: "bg-red-500/20 text-red-300 border border-red-500/30",
  stable: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
};

export default function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  trend,
  trendType = "stable",
  iconColor,
  shadowColor,
  href,
  enablePremiumHover = false,
  hoverAccentStyle,
}: StatCardProps) {
  const inner = (
    <div
      className={`group relative rounded-xl glass-card ${enablePremiumHover ? "admin-dashboard-card" : "glass-card-hover"} p-5 transition-all duration-300 overflow-hidden glow-sm ${enablePremiumHover ? "dark:hover:glow-md" : "hover:scale-[1.02] hover:glow-md"} ${href ? "cursor-pointer active:scale-[0.97]" : ""}`}
      style={hoverAccentStyle}
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      {/* Enhanced glow effect */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative flex items-start justify-between mb-4">
        <div 
          className={`${enablePremiumHover ? "admin-dashboard-card-icon" : "group-hover:scale-110"} dashboard-card-icon-shell rounded-xl p-3 transition-all duration-300 ${iconColor}`}
          style={{
            boxShadow: `0 4px 14px ${shadowColor || 'rgba(0,0,0,0.25)'}, 0 8px 24px -4px ${shadowColor || 'rgba(0,0,0,0.15)'}`
          }}
        >
          <Icon size={20} className="relative z-10 text-white" />
        </div>
        <div className="flex items-center gap-2">
          {trend && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${trendColors[trendType]}`}>
              {trendType === "up" ? "↑" : trendType === "down" ? "↓" : "•"} {trend}
            </span>
          )}
          {href && (
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary/50 group-hover:bg-primary/20 group-hover:text-primary group-hover:shadow-md group-hover:shadow-primary/25 dark:bg-white/10 dark:text-white/50 dark:group-hover:bg-primary/40 dark:group-hover:text-white dark:group-hover:shadow-lg dark:group-hover:shadow-primary/40 group-hover:animate-bounce group-active:scale-75 transition-all duration-200">
              <ArrowUpRight size={14} />
            </span>
          )}
        </div>
      </div>
      <p className="relative text-3xl font-bold text-card-foreground drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">{value}</p>
      <p className="relative text-sm font-bold text-card-foreground/90 mt-1">{label}</p>
      {subtitle && <p className="relative text-xs text-muted-foreground/80 mt-1 font-medium">{subtitle}</p>}
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
