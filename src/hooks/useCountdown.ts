"use client";

import { useCallback, useEffect, useState } from "react";

export type Countdown = {
  /** Milliseconds remaining until the target time (0 once elapsed). */
  remainingMs: number;
  /** True once the target time has passed. */
  isElapsed: boolean;
  /** Human-readable remaining time, e.g. "2d 04h 13m 09s" or "Unlocked". */
  label: string;
  /** True while ticking is paused (#763). */
  isPaused: boolean;
  /** Stops ticking; the displayed values freeze at the moment of pausing. */
  pause: () => void;
  /** Resumes ticking from the real clock. */
  resume: () => void;
  /** Pauses when running, resumes when paused. */
  togglePause: () => void;
};

function formatRemaining(ms: number): string {
  if (ms <= 0) return "Unlocked";

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, "0");
  const parts = days > 0 ? [`${days}d`] : [];
  parts.push(`${pad(hours)}h`, `${pad(minutes)}m`, `${pad(seconds)}s`);
  return parts.join(" ");
}

/**
 * Ticks toward `unlockAtMs` (a Unix epoch in ms) using a self-rescheduling
 * setTimeout so each tick fires at the next whole-second boundary rather than
 * drifting when the tab is backgrounded (#721).  setInterval accumulates
 * skipped ticks in throttled background tabs; setTimeout scheduled from the
 * *actual* remaining time corrects itself immediately when the tab is
 * foregrounded again.
 *
 * `pause()` stops ticking and freezes the returned values; `resume()` picks
 * the real clock back up (#763). The target is an absolute time, so pausing
 * only holds the display — the unlock moment itself does not move.
 */
export function useCountdown(unlockAtMs: number): Countdown {
  const [now, setNow] = useState(() => Date.now());
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const current = Date.now();
    setNow(current);
    if (current >= unlockAtMs) return;

    let handle: ReturnType<typeof setTimeout>;

    function schedule() {
      const remaining = unlockAtMs - Date.now();
      if (remaining <= 0) {
        setNow(Date.now());
        return;
      }
      // Fire at the next whole-second boundary so the display ticks cleanly,
      // but clamp to at least 50 ms to avoid a spin-loop near zero.
      const delay = Math.max(50, remaining % 1000 || 1000);
      handle = setTimeout(() => {
        setNow(Date.now());
        schedule();
      }, delay);
    }

    schedule();
    return () => clearTimeout(handle);
  }, [unlockAtMs, isPaused]);

  const pause = useCallback(() => setIsPaused(true), []);
  const resume = useCallback(() => setIsPaused(false), []);
  const togglePause = useCallback(() => setIsPaused((paused) => !paused), []);

  const remainingMs = Math.max(0, unlockAtMs - now);
  return {
    remainingMs,
    isElapsed: remainingMs <= 0,
    label: formatRemaining(remainingMs),
    isPaused,
    pause,
    resume,
    togglePause,
  };
}
