"use client";

import { Bell, Moon, Sun, User, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { getApiBaseUrl } from "@/lib/api";

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
    return `${getApiBaseUrl()}${user.profile_picture}`;
  };

  return (
    <div className="flex justify-center items-center px-4 pt-2.5 pb-1">
      {/* Gradient border wrapper — centered pill */}
      <div className="topbar-pill-border w-full max-w-[820px]">
        <header className="topbar-pill-inner flex items-center justify-between px-6 py-3">
          {/* Left: time + date */}
          <div className="flex items-center gap-3">
            <span className="font-semibold text-foreground text-sm tabular-nums tracking-tight">{time}</span>
            <span className="hidden sm:block w-px h-3.5 bg-border/50" />
            <span className="hidden sm:block text-[10px] tracking-widest text-muted-foreground font-medium">{date}</span>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-0.5">
            {mounted && (
              <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="topbar-icon-btn"
                title={isDark ? "Switch to light" : "Switch to dark"}
              >
                {isDark ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            )}
            <NotificationDropdown />
            <button
              onClick={() => router.push("/profile")}
              className="topbar-icon-btn"
              title="Profile"
            >
              {getProfilePictureUrl() ? (
                <img
                  src={getProfilePictureUrl()!}
                  alt={user?.name || "User"}
                  className="h-6 w-6 rounded-full object-cover"
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-semibold">
                  {user?.name?.[0] || <User size={14} />}
                </div>
              )}
            </button>
            <button
              onClick={logout}
              className="topbar-icon-btn hover:!text-destructive hover:!bg-destructive/10"
              title="Logout"
            >
              <LogOut size={15} />
            </button>
          </div>
        </header>
      </div>
    </div>
  );
}
