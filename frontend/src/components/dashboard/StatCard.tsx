import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  trendType?: "up" | "down" | "stable";
  iconColor?: string;
}

const trendColors = {
  up: "text-green-500",
  down: "text-red-500",
  stable: "text-muted-foreground",
};

export default function StatCard({ icon: Icon, label, value, subtitle, trend, trendType = "stable", iconColor }: StatCardProps) {
  return (
    <div className="group relative rounded-xl glass-card glass-card-hover p-5 transition-all duration-300 overflow-hidden">
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      {/* Glow effect */}
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative flex items-start justify-between mb-4">
        <div className={`rounded-xl p-2.5 backdrop-blur-sm ${iconColor || "bg-secondary/80 text-accent"} group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={20} />
        </div>
        {trend && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full glass-light ${trendColors[trendType]}`}>
            {trendType === "up" ? "↑" : trendType === "down" ? "↓" : "•"} {trend}
          </span>
        )}
      </div>
      <p className="relative text-2xl font-bold text-card-foreground">{value}</p>
      <p className="relative text-sm font-medium text-card-foreground/80 mt-1">{label}</p>
      {subtitle && <p className="relative text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}
