"use client";

import { Bell, Moon, Sun, User, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import GlobalSearch from "@/components/dashboard/GlobalSearch";
import { getApiBaseUrl } from "@/lib/api";

export default function TopBar() {
  const { theme, setTheme } = useTheme();
  const { logout, user } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

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
    if (user.profile_picture.startsWith("data:")) return user.profile_picture;
    if (user.profile_picture.startsWith("http")) return user.profile_picture;
    return `${getApiBaseUrl()}${user.profile_picture}`;
  };

  const profilePictureUrl = getProfilePictureUrl();

  return (
    <div className="flex items-center px-4 pt-3 pb-1 w-full">
      <div className="flex-1 hidden md:block" />

      <div className="w-full max-w-[820px] rounded-full border border-border bg-card">
        <header className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-foreground text-sm tabular-nums tracking-tight">{time}</span>
            <span className="hidden sm:block w-px h-3.5 bg-border" />
            <span className="hidden sm:block text-[10px] tracking-widest text-muted-foreground font-medium">{date}</span>
          </div>

          <div className="flex items-center gap-0.5">
            {mounted && (
              <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="topbar-icon-btn"
                title={isDark ? "Switch to light" : "Switch to dark"}
                aria-label={isDark ? "Switch to light" : "Switch to dark"}
              >
                {isDark ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            )}
            <NotificationDropdown />
            <button
              onClick={() => router.push("/profile")}
              className="topbar-icon-btn"
              title="Profile"
              aria-label="Open profile"
            >
              {profilePictureUrl ? (
                <Image
                  src={profilePictureUrl}
                  alt={user?.name ? `${user.name}'s profile picture` : "User profile picture"}
                  width={24}
                  height={24}
                  className="h-6 w-6 rounded-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-foreground text-[10px] font-semibold">
                  {user?.name?.[0]?.toUpperCase() || <User size={14} />}
                </div>
              )}
            </button>
            <button
              onClick={logout}
              className="topbar-icon-btn hover:!text-destructive hover:!bg-destructive/10"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={15} />
            </button>
          </div>
        </header>
      </div>

      <div className="flex-1 hidden md:flex justify-end pr-2 md:pr-4">
        <GlobalSearch />
      </div>
    </div>
  );
}
