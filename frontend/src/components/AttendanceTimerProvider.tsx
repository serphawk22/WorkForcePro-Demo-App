"use client";

/**
 * AttendanceTimerProvider
 *
 * A single global timer that lives in the root layout.
 * - One setInterval, never destroyed on navigation.
 * - Derives elapsed time from punch_in timestamp stored in localStorage
 *   so the counter survives page refreshes without any server roundtrip.
 * - Syncs with the server every 60 seconds to detect session changes.
 * - All pages that need the timer simply call useAttendanceTimer().
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { getAttendanceStatus, punchIn as apiPunchIn, punchOut as apiPunchOut, getToken } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";

// ── Storage keys ──────────────────────────────────────────────────────────────
const LS_PUNCH_IN_KEY = "wfp_punch_in_iso"; // ISO string of punch-in time
const LS_TIMER_START_KEY = "wfp_timer_start"; // Browser timestamp when we started counting
const LS_BASE_ELAPSED_KEY = "wfp_base_elapsed"; // Base elapsed seconds at timer start

// ── Module-level timer state (survives React remounts) ────────────────────────
// This is the SOURCE OF TRUTH for whether timer is running
const moduleState = {
  isRunning: false,
  timerStart: null as number | null,
  baseElapsed: 0,
  punchInISO: null as string | null,
  intervalId: null as ReturnType<typeof setInterval> | null,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getStoredPunchIn(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LS_PUNCH_IN_KEY);
}

function getStoredTimerStart(): number | null {
  if (typeof window === "undefined") return null;
  const val = localStorage.getItem(LS_TIMER_START_KEY);
  return val ? parseInt(val, 10) : null;
}

function getStoredBaseElapsed(): number {
  if (typeof window === "undefined") return 0;
  const val = localStorage.getItem(LS_BASE_ELAPSED_KEY);
  return val ? parseInt(val, 10) : 0;
}

function setStoredTimer(iso: string, browserStart: number, baseElapsed: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_PUNCH_IN_KEY, iso);
  localStorage.setItem(LS_TIMER_START_KEY, String(browserStart));
  localStorage.setItem(LS_BASE_ELAPSED_KEY, String(baseElapsed));
}

function clearStoredPunchIn(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LS_PUNCH_IN_KEY);
  localStorage.removeItem(LS_TIMER_START_KEY);
  localStorage.removeItem(LS_BASE_ELAPSED_KEY);
  // Also clear legacy key used by older pages so they don't conflict
  localStorage.removeItem("workforce_timer_state");
}

export function formatTimerDisplay(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// ── Context type ──────────────────────────────────────────────────────────────
interface AttendanceTimerContextValue {
  /** Live elapsed seconds since punch-in (0 when not working) */
  seconds: number;
  /** True while a session is in progress */
  isActive: boolean;
  /** True while punching in or out */
  isPunching: boolean;
  /** ISO punch-in timestamp (null when not working) */
  punchInTime: string | null;
  /** Call to punch in */
  handlePunchIn: () => Promise<void>;
  /** Call to punch out */
  handlePunchOut: () => Promise<void>;
  /** Force a re-sync with server (useful after navigating to attendance page) */
  syncNow: () => Promise<void>;
}

const AttendanceTimerContext = createContext<AttendanceTimerContextValue | null>(null);

export function useAttendanceTimer(): AttendanceTimerContextValue {
  const ctx = useContext(AttendanceTimerContext);
  if (!ctx) throw new Error("useAttendanceTimer must be inside <AttendanceTimerProvider>");
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function AttendanceTimerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPunching, setIsPunching] = useState(false);
  const [punchInTime, setPunchInTime] = useState<string | null>(null);

  // ── Start the module-level timer tick ─────────────────────────────────────
  const startModuleTick = useCallback((setSecondsFn: (s: number) => void) => {
    // Clear any existing interval first
    if (moduleState.intervalId) {
      clearInterval(moduleState.intervalId);
    }
    
    const tick = () => {
      if (moduleState.isRunning && moduleState.timerStart !== null) {
        const delta = Math.floor((Date.now() - moduleState.timerStart) / 1000);
        const total = moduleState.baseElapsed + delta;
        console.log(`[TIMER TICK] base=${moduleState.baseElapsed}, delta=${delta}, total=${total}`);
        setSecondsFn(total);
      }
    };
    
    tick(); // immediate first tick
    moduleState.intervalId = setInterval(tick, 1000);
  }, []);

  // ── Activate / deactivate ─────────────────────────────────────────────────
  const activate = useCallback(
    (punchInISO: string, serverElapsed: number = 0) => {
      // GUARD: If module timer is already running, don't re-activate!
      if (moduleState.isRunning) {
        console.log(`[TIMER ACTIVATE] BLOCKED - timer already running at moduleState`);
        return;
      }
      
      console.log(`[TIMER ACTIVATE] Starting timer with serverElapsed=${serverElapsed}`);
      const now = Date.now();
      
      // Update module state FIRST (source of truth)
      moduleState.isRunning = true;
      moduleState.timerStart = now;
      moduleState.baseElapsed = serverElapsed;
      moduleState.punchInISO = punchInISO;
      
      // Persist to localStorage
      setStoredTimer(punchInISO, now, serverElapsed);
      
      // Update React state for UI
      setPunchInTime(punchInISO);
      setSeconds(serverElapsed);
      setIsActive(true);
      
      // Start ticking
      startModuleTick(setSeconds);
    },
    [startModuleTick]
  );

  const deactivate = useCallback(
    (finalSeconds?: number) => {
      console.log(`[TIMER DEACTIVATE] finalSeconds=${finalSeconds}`);
      
      // Clear module state FIRST
      moduleState.isRunning = false;
      moduleState.timerStart = null;
      moduleState.baseElapsed = 0;
      moduleState.punchInISO = null;
      if (moduleState.intervalId) {
        clearInterval(moduleState.intervalId);
        moduleState.intervalId = null;
      }
      
      // Clear localStorage
      clearStoredPunchIn();
      
      // Update React state
      setPunchInTime(null);
      setIsActive(false);
      if (finalSeconds !== undefined) setSeconds(finalSeconds);
    },
    []
  );

  // ── Server sync ───────────────────────────────────────────────────────────
  const syncNow = useCallback(async () => {
    // Never call the API when unauthenticated — avoids 401 → redirect flicker
    if (!getToken()) return;
    
    // DEBUG: Log module state at start of sync
    console.log(`[TIMER SYNC START] moduleState.isRunning=${moduleState.isRunning}, timerStart=${moduleState.timerStart}, baseElapsed=${moduleState.baseElapsed}`);
    
    try {
      const result = await getAttendanceStatus();
      if (!result.data) return;

      const { status, punch_in, elapsed_seconds } = result.data;
      const serverElapsed = Math.max(0, elapsed_seconds ?? 0);
      console.log(`[TIMER SYNC] status=${status}, serverElapsed=${serverElapsed}, moduleState.isRunning=${moduleState.isRunning}`);

      if (status === "working" && punch_in) {
        // CRITICAL: Use module-level state as THE source of truth
        if (moduleState.isRunning) {
          // Timer is already running - DO NOT call activate(), just check drift
          if (moduleState.timerStart !== null) {
            const localDelta = Math.floor((Date.now() - moduleState.timerStart) / 1000);
            const localTotal = moduleState.baseElapsed + localDelta;
            const drift = Math.abs(serverElapsed - localTotal);
            
            console.log(`[TIMER SYNC] Already running. localTotal=${localTotal}, serverElapsed=${serverElapsed}, drift=${drift}`);
            
            // Only correct if drift > 30 seconds AND server is ahead
            if (drift > 30 && serverElapsed > localTotal) {
              console.log(`[TIMER SYNC] Correcting large drift`);
              const now = Date.now();
              moduleState.baseElapsed = serverElapsed;
              moduleState.timerStart = now;
              setStoredTimer(punch_in, now, serverElapsed);
              setSeconds(serverElapsed);
            }
            // Otherwise, let local timer continue - DO NOTHING
          }
        } else {
          // Timer not running - activate it
          console.log(`[TIMER SYNC] Fresh activation with elapsed=${serverElapsed}`);
          activate(punch_in, serverElapsed);
        }
      } else if (status === "completed") {
        deactivate(Math.max(0, elapsed_seconds ?? 0));
      } else {
        // not_started
        if (moduleState.isRunning) {
          deactivate(0);
        }
      }
    } catch {
      // Network error — keep running from stored value
    }
  }, [activate, deactivate]);

  // ── Bootstrap on mount ────────────────────────────────────────────────────
  useEffect(() => {
    // 1. If module timer is already running (e.g., from a previous mount), just sync UI
    if (moduleState.isRunning) {
      console.log(`[TIMER BOOTSTRAP] Module timer already running - syncing UI`);
      setPunchInTime(moduleState.punchInISO);
      setIsActive(true);
      // Start ticking to update React state
      startModuleTick(setSeconds);
    } else {
      // 2. Check localStorage for persisted timer
      const storedPunchIn = getStoredPunchIn();
      const storedStart = getStoredTimerStart();
      const storedBase = getStoredBaseElapsed();
      
      if (storedPunchIn && storedStart) {
        console.log(`[TIMER BOOTSTRAP] Restoring from localStorage`);
        // Set module state from localStorage
        moduleState.isRunning = true;
        moduleState.timerStart = storedStart;
        moduleState.baseElapsed = storedBase;
        moduleState.punchInISO = storedPunchIn;
        
        // Update React state
        setPunchInTime(storedPunchIn);
        setIsActive(true);
        
        // Calculate and display current elapsed
        const delta = Math.max(0, Math.floor((Date.now() - storedStart) / 1000));
        const totalElapsed = storedBase + delta;
        console.log(`[TIMER BOOTSTRAP] storedBase=${storedBase}, delta=${delta}, total=${totalElapsed}`);
        setSeconds(totalElapsed);
        
        // Start ticking
        startModuleTick(setSeconds);
      }
    }

    // 3. Verify with server in the background (only when authenticated)
    if (getToken()) {
      syncNow();
    }

    // 4. Periodic server sync every 60 s — skip silently when not authenticated
    const syncInterval = setInterval(() => {
      if (getToken()) syncNow();
    }, 60_000);

    // 5. Re-sync when tab becomes visible
    const onVisible = () => {
      if (document.visibilityState === "visible" && getToken()) syncNow();
    };
    document.addEventListener("visibilitychange", onVisible);

    // 6. Re-sync when auth token is written to localStorage (post-login, client-side nav)
    const onStorage = (e: StorageEvent) => {
      if ((e.key === "token" || e.key === "access_token") && e.newValue) {
        syncNow();
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      clearInterval(syncInterval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("storage", onStorage);
      // Note: We do NOT stop module timer on unmount - it persists across remounts
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Re-sync when user logs in (same-tab, client-side navigation) ───────────
  const prevUserRef = useRef<typeof user>(null);
  useEffect(() => {
    if (user && !prevUserRef.current) {
      // User just logged in — sync to pick up any existing session
      syncNow();
    }
    prevUserRef.current = user;
  }, [user, syncNow]);

  // ── Punch-in handler ──────────────────────────────────────────────────────
  const handlePunchIn = useCallback(async () => {
    if (moduleState.isRunning) return;
    setIsPunching(true);
    try {
      const result = await apiPunchIn();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      // Start the timer immediately from the punch_in timestamp in the response.
      const punchInISO = result.data?.punch_in;
      if (punchInISO) {
        activate(punchInISO);
      } else {
        // Fallback if the response somehow lacks punch_in
        await syncNow();
      }
      toast.success("Punched in successfully!");
    } finally {
      setIsPunching(false);
    }
  }, [activate, syncNow]);

  // ── Punch-out handler ─────────────────────────────────────────────────────
  const handlePunchOut = useCallback(async () => {
    if (!moduleState.isRunning) return;
    setIsPunching(true);
    try {
      const result = await apiPunchOut();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      // Stop the timer immediately; use total_hours from response as final value.
      const finalSeconds = result.data?.total_hours != null
        ? Math.round(result.data.total_hours * 3600)
        : undefined;
      deactivate(finalSeconds);
      toast.success("Punched out successfully!");
    } finally {
      setIsPunching(false);
    }
  }, [deactivate]);

  return (
    <AttendanceTimerContext.Provider
      value={{
        seconds,
        isActive,
        isPunching,
        punchInTime,
        handlePunchIn,
        handlePunchOut,
        syncNow,
      }}
    >
      {children}
    </AttendanceTimerContext.Provider>
  );
}
