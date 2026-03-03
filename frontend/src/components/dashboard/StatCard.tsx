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
  up: "text-green-400 drop-shadow-[0_0_6px_rgba(74,222,128,0.8)]",
  down: "text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.8)]",
  stable: "text-blue-400 drop-shadow-[0_0_4px_rgba(96,165,250,0.6)]",
};

export default function StatCard({ icon: Icon, label, value, subtitle, trend, trendType = "stable", iconColor }: StatCardProps) {
  return (
    <div className="group relative rounded-xl glass-card glass-card-hover p-5 transition-all duration-300 overflow-hidden hover:scale-[1.02] glow-sm hover:glow-md">
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      {/* Enhanced glow effect */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative flex items-start justify-between mb-4">
        <div className={`rounded-xl p-3 backdrop-blur-sm ${iconColor || "bg-gradient-to-br from-secondary/80 to-accent/60 text-white shadow-lg"} group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-primary/50 transition-all duration-300`}>
          <Icon size={20} className="glow-icon" />
        </div>
        {trend && (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full glass-light ${trendColors[trendType]} backdrop-blur-md shadow-lg`}>
            {trendType === "up" ? "↑" : trendType === "down" ? "↓" : "•"} {trend}
          </span>
        )}
      </div>
      <p className="relative text-3xl font-bold text-card-foreground drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">{value}</p>
      <p className="relative text-sm font-bold text-card-foreground/90 mt-1">{label}</p>
      {subtitle && <p className="relative text-xs text-muted-foreground/80 mt-1 font-medium">{subtitle}</p>}
    </div>
  );
}
