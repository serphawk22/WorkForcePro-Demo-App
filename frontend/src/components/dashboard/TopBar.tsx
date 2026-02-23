"use client";

import { Bell, Moon, Sun, User, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { NotificationDropdown } from "@/components/NotificationDropdown";

export default function TopBar() {
  const { theme, setTheme } = useTheme();
  const { logout, user } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  // Debug: Log when user changes
  useEffect(() => {
    console.log('[TopBar] User state changed:', user?.email || 'null');
    console.log('[TopBar] Profile picture:', user?.profile_picture ? '✓ Present' : '✗ Missing');
  }, [user]);

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }));
      setDate(now.toLocaleDateString("en-US", { weekday: "short", day: "2-digit", month: "short" }).toUpperCase());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isDark = theme === "dark";

  const getProfilePictureUrl = () => {
    if (!user?.profile_picture) return null;
    // If it's a data URI (base64), return it directly
    if (user.profile_picture.startsWith("data:")) return user.profile_picture;
    // Otherwise treat as URL
    if (user.profile_picture.startsWith("http")) return user.profile_picture;
    return `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${user.profile_picture}`;
  };

  return (
    <header className="flex items-center justify-between glass-nav px-6 py-3">
      {/* Time & Date */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-foreground text-lg">{time}</span>
        </div>
        <span className="text-xs tracking-wide">{date}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {mounted && (
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="rounded-lg p-2 text-muted-foreground glass-light hover:text-foreground transition-colors"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        )}
        <NotificationDropdown />
        <button 
          onClick={() => router.push("/profile")}
          className="rounded-lg p-1.5 text-muted-foreground glass-light hover:text-foreground transition-colors"
          title="Profile"
        >
          {getProfilePictureUrl() ? (
            <img
              src={getProfilePictureUrl()!}
              alt={user?.name || "User"}
              className="h-7 w-7 rounded-full object-cover"
            />
          ) : (
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
              {user?.name?.[0] || <User size={18} />}
            </div>
          )}
        </button>
        <button 
          onClick={logout}
          className="rounded-lg p-2 text-muted-foreground glass-light hover:bg-destructive/10 hover:text-destructive transition-colors"
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
