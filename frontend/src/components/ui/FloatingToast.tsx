"use client";

import React from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export type FloatingToastType = "error" | "success" | "info";

type FloatingToastArgs = {
  message: string;
  type: FloatingToastType;
  durationMs?: number;
};

/**
 * Premium floating toast helper used across pages.
 * Relies on the global `<Toaster />` mounted in `frontend/src/app/layout.tsx`.
 */
export function showFloatingToast({ message, type, durationMs = 3500 }: FloatingToastArgs) {
  const Icon = type === "success" ? CheckCircle2 : type === "info" ? Info : AlertTriangle;
  const variant = type === "error" ? "destructive" : type === "success" ? "success" : "info";

  toast({
    variant: variant as any,
    duration: durationMs,
    title: (
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" />
        <span>{message}</span>
      </div>
    ),
  });
}

