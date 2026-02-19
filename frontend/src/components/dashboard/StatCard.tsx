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
    <div className="group rounded-xl border border-border bg-card p-5 card-shadow hover:card-shadow-hover transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className={`rounded-lg p-2.5 ${iconColor || "bg-secondary text-accent"}`}>
          <Icon size={20} />
        </div>
        {trend && (
          <span className={`text-xs font-medium ${trendColors[trendType]}`}>
            {trendType === "up" ? "↑" : trendType === "down" ? "↓" : "•"} {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-card-foreground">{value}</p>
      <p className="text-sm font-medium text-card-foreground/80 mt-1">{label}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}
