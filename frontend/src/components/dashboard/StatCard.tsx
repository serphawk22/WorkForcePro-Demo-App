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
  href?: string;
}

const trendColors = {
  up: "bg-green-500/20 text-green-300 border border-green-500/30",
  down: "bg-red-500/20 text-red-300 border border-red-500/30",
  stable: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
};

export default function StatCard({ icon: Icon, label, value, subtitle, trend, trendType = "stable", iconColor, href }: StatCardProps) {
  const inner = (
    <div className={`group relative rounded-xl glass-card glass-card-hover p-5 transition-all duration-300 overflow-hidden hover:scale-[1.02] glow-sm hover:glow-md ${href ? "cursor-pointer active:scale-[0.97]" : ""}`}>
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      {/* Enhanced glow effect */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative flex items-start justify-between mb-4">
        <div className={`rounded-xl p-3 backdrop-blur-sm ${iconColor || "bg-gradient-to-br from-secondary/80 to-accent/60 text-white shadow-lg"} group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-primary/50 transition-all duration-300`}>
          <Icon size={20} className="glow-icon" />
        </div>
        <div className="flex items-center gap-2">
          {trend && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${trendColors[trendType]}`}>
              {trendType === "up" ? "↑" : trendType === "down" ? "↓" : "•"} {trend}
            </span>
          )}
          {href && (
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-white/10 text-white/50 group-hover:bg-primary/40 group-hover:text-white group-hover:shadow-lg group-hover:shadow-primary/40 group-hover:animate-bounce group-active:scale-75 transition-all duration-200">
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
