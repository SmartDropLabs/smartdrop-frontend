"use client";

import { useEffect, useState } from "react";

export type Countdown = {
  /** Milliseconds remaining until the target time (0 once elapsed). */
  remainingMs: number;
  /** True once the target time has passed. */
  isElapsed: boolean;
  /** Human-readable remaining time, e.g. "2d 04h 13m 09s" or "Unlocked". */
  label: string;
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
 * Ticks once per second toward `unlockAtMs` (a Unix epoch in ms). The timer
 * stops once the target is reached to avoid needless re-renders.
 */
export function useCountdown(unlockAtMs: number): Countdown {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (Date.now() >= unlockAtMs) {
      setNow(Date.now());
      return;
    }
    const id = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= unlockAtMs) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [unlockAtMs]);

  const remainingMs = Math.max(0, unlockAtMs - now);
  return {
    remainingMs,
    isElapsed: remainingMs <= 0,
    label: formatRemaining(remainingMs),
  };
}
