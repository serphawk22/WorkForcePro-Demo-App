"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20" />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
      className="relative h-9 w-9 rounded-xl flex items-center justify-center
                 bg-primary/10 hover:bg-primary/20 border border-primary/20
                 text-primary transition-all duration-300 hover:scale-110 active:scale-95"
    >
      <span
        className="absolute transition-all duration-300"
        style={{ opacity: isDark ? 0 : 1, transform: isDark ? "rotate(90deg) scale(0)" : "rotate(0deg) scale(1)" }}
      >
        <Sun size={16} />
      </span>
      <span
        className="absolute transition-all duration-300"
        style={{ opacity: isDark ? 1 : 0, transform: isDark ? "rotate(0deg) scale(1)" : "rotate(-90deg) scale(0)" }}
      >
        <Moon size={16} />
      </span>
    </button>
  );
}
