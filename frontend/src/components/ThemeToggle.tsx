"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        aria-label="Toggle theme"
        className="h-9 w-9 rounded-xl flex items-center justify-center
                   bg-primary/10 border border-primary/20 text-primary"
      >
        <Sun size={16} />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="h-9 w-9 rounded-xl flex items-center justify-center
                 bg-primary/10 hover:bg-primary/20 border border-primary/20
                 text-primary transition-all duration-200 hover:scale-110 active:scale-95"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
