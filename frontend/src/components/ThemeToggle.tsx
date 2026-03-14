"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        aria-label="Toggle theme"
        className="h-9 w-9 rounded-xl flex items-center justify-center
                   bg-white/60 border border-primary/20 text-primary"
      >
        <Moon size={16} />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={[
        "h-9 w-9 rounded-xl flex items-center justify-center",
        "transition-all duration-200 hover:scale-110 active:scale-95",
        isDark
          ? // Dark mode: subtle transparent look with light icon
          "bg-white/10 border border-white/20 text-muted-foreground hover:text-primary hover:bg-white/15 hover:border-primary/30"
          : // Light mode: white background so the dark purple icon is clearly readable
          "bg-white/70 border border-primary/25 text-primary hover:bg-white/90 hover:border-primary/40 shadow-sm",
      ].join(" ")}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
