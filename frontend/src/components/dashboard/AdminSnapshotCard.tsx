"use client";

import { useRouter } from "next/navigation";
import { LucideIcon, ArrowUpRight } from "lucide-react";
import { useState } from "react";

interface AdminSnapshotCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  icon: LucideIcon;
  redirectUrl: string;
  gradientVariant: "primary" | "green" | "red" | "blue" | "yellow" | "purple";
}

const gradientClasses = {
  primary: "from-purple-500/20 via-pink-500/10 to-transparent",
  green: "from-green-500/20 via-emerald-500/10 to-transparent",
  red: "from-red-500/20 via-rose-500/10 to-transparent",
  blue: "from-blue-500/20 via-cyan-500/10 to-transparent",
  yellow: "from-yellow-500/20 via-amber-500/10 to-transparent",
  purple: "from-purple-600/20 via-violet-500/10 to-transparent",
};

const iconColors = {
  primary: "text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]",
  green: "text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]",
  red: "text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]",
  blue: "text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]",
  yellow: "text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]",
  purple: "text-violet-400 drop-shadow-[0_0_8px_rgba(167,139,250,0.8)]",
};

const glowColors = {
  primary: "hover:shadow-purple-500/40",
  green: "hover:shadow-green-500/40",
  red: "hover:shadow-red-500/40",
  blue: "hover:shadow-blue-500/40",
  yellow: "hover:shadow-yellow-500/40",
  purple: "hover:shadow-violet-500/40",
};

const arrowBgGradients = {
  primary: "from-purple-500/30 to-pink-500/10",
  green: "from-green-500/30 to-emerald-500/10",
  red: "from-red-500/30 to-rose-500/10",
  blue: "from-blue-500/30 to-cyan-500/10",
  yellow: "from-yellow-500/30 to-amber-500/10",
  purple: "from-purple-600/30 to-violet-500/10",
};

export default function AdminSnapshotCard({
  title,
  value,
  subtitle,
  icon: Icon,
  redirectUrl,
  gradientVariant,
}: AdminSnapshotCardProps) {
  const router = useRouter();
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = () => {
    setIsClicked(true);
    setTimeout(() => {
      router.push(redirectUrl);
    }, 150);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${title}: ${value}. Click to view details.`}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className={`
        group relative overflow-hidden rounded-xl glass-card p-5 
        cursor-pointer select-none
        transition-all duration-200 ease-out
        hover:-translate-y-2 hover:scale-[1.04] hover:shadow-2xl ${glowColors[gradientVariant]}
        focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2
        active:scale-95 active:translate-y-0.5 active:duration-75
        hover:glow-md
        ${isClicked ? "scale-95 translate-y-0.5" : ""}
      `}
    >
      {/* Background gradient glow - ENHANCED */}
      <div
        className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${gradientClasses[gradientVariant]} rounded-full blur-3xl transition-all duration-300 group-hover:w-32 group-hover:h-32 group-hover:opacity-100 opacity-60`}
      />

      {/* Shimmer effect on hover - ENHANCED */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />

      {/* Arrow icon - top right - ENHANCED */}
      <div
        className={`
          absolute top-3 right-3 h-7 w-7 rounded-full 
          bg-gradient-to-br ${arrowBgGradients[gradientVariant]}
          flex items-center justify-center shadow-lg
          opacity-40 group-hover:opacity-100
          transition-all duration-200
          group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:scale-125
        `}
      >
        <ArrowUpRight className={`h-4 w-4 ${iconColors[gradientVariant]}`} />
      </div>

      {/* Card content - ENHANCED */}
      <div className="relative">
        <Icon className={`h-6 w-6 ${iconColors[gradientVariant]} mb-3 transition-all duration-200 group-hover:scale-130 group-hover:-rotate-6 group-hover:drop-shadow-none`} />
        <div className="text-3xl font-bold text-foreground transition-colors duration-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
          {value}
        </div>
        <div className="text-xs font-medium text-muted-foreground/80 mt-1.5">{subtitle}</div>
      </div>

      {/* Hover gradient overlay - subtle */}
      <div
        className={`
          absolute inset-0 bg-gradient-to-br ${gradientClasses[gradientVariant]}
          opacity-0 group-hover:opacity-50 transition-opacity duration-300 rounded-xl
        `}
      />
    </div>
  );
}
