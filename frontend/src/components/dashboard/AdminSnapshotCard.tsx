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

export default function AdminSnapshotCard({
  title,
  value,
  subtitle,
  icon: Icon,
  redirectUrl,
}: AdminSnapshotCardProps) {
  const router = useRouter();
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = () => {
    setIsClicked(true);
    setTimeout(() => {
      router.push(redirectUrl);
    }, 100);
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
      className={`group relative overflow-hidden rounded-xl border border-border bg-card p-5 cursor-pointer select-none transition-all duration-200 hover:border-foreground/20 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${isClicked ? "scale-[0.98]" : ""}`}
    >
      <div className="absolute top-3 right-3 h-7 w-7 rounded-full bg-secondary flex items-center justify-center opacity-50 group-hover:opacity-100 transition-opacity duration-200">
        <ArrowUpRight className="h-4 w-4 text-foreground" />
      </div>

      <div className="relative">
        <div className="mb-3 inline-flex rounded-xl bg-secondary p-2 text-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-2xl font-semibold text-foreground">{value}</div>
        <div className="text-xs font-medium text-muted-foreground mt-1">{subtitle}</div>
      </div>
    </div>
  );
}
