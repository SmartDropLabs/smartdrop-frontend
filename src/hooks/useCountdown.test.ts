import { act, renderHook } from "@/test/renderHook";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCountdown } from "./useCountdown";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useCountdown", () => {
  it("Test 1 — Accuracy over 60 ticks: remainingMs stays within 50 ms of expected", () => {
    const now = Date.now();
    // Target 2 minutes ahead so the hook is still ticking after 60 ticks
    const unlockAtMs = now + 120_000;

    const { result } = renderHook(() => useCountdown(unlockAtMs));

    // Advance 60 full 1-second ticks; wrap in act so React state updates flush
    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    // Wall-clock formula: unlockAtMs - Date.now() after 60 s of fake-timer advance
    const expected = Math.max(0, unlockAtMs - Date.now());
    const drift = Math.abs(result.current.remainingMs - expected);
    expect(drift).toBeLessThanOrEqual(50);
  });

  it("Test 2 — Catches exact expiry: isElapsed true and remainingMs 0 at target", () => {
    const unlockAtMs = Date.now() + 5000;

    const { result } = renderHook(() => useCountdown(unlockAtMs));

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.isElapsed).toBe(true);
    expect(result.current.remainingMs).toBe(0);
  });

  it("Test 3 — Already-elapsed target: returns isElapsed true immediately, no interval started", () => {
    // unlockAtMs is 1 second in the past
    const unlockAtMs = Date.now() - 1000;

    const { result } = renderHook(() => useCountdown(unlockAtMs));

    expect(result.current.isElapsed).toBe(true);
    expect(result.current.remainingMs).toBe(0);
    // No interval should have been registered
    expect(vi.getTimerCount()).toBe(0);
  });

  it("Test 4 — No memory leak on unmount: interval is cleared after unmount", () => {
    const unlockAtMs = Date.now() + 10_000;

    const { unmount } = renderHook(() => useCountdown(unlockAtMs));

    // Interval should exist while mounted
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    unmount();

    // Interval should be cleared after unmount
    expect(vi.getTimerCount()).toBe(0);
  });

  it("Test 5 — Label formatting: 90 061 000 ms formats as '1d 01h 01m 01s'", () => {
    const remainingMs = 90_061_000;
    const unlockAtMs = Date.now() + remainingMs;

    const { result } = renderHook(() => useCountdown(unlockAtMs));

    expect(result.current.label).toBe("1d 01h 01m 01s");
  });

  it("Test 6 — pause freezes the countdown and resume picks the real clock back up (#763)", () => {
    const unlockAtMs = Date.now() + 60_000;
    const { result } = renderHook(() => useCountdown(unlockAtMs));

    act(() => {
      result.current.pause();
    });
    expect(result.current.isPaused).toBe(true);
    const frozen = result.current.remainingMs;

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.remainingMs).toBe(frozen);
    expect(vi.getTimerCount()).toBe(0);

    act(() => {
      result.current.resume();
    });
    expect(result.current.isPaused).toBe(false);
    expect(result.current.remainingMs).toBeLessThanOrEqual(frozen - 10_000 + 50);
  });

  it("Test 8 — invokes onComplete callback once when countdown reaches zero (#794)", () => {
    const onComplete = vi.fn();
    const unlockAtMs = Date.now() + 3_000;

    const { result } = renderHook(() => useCountdown(unlockAtMs, { onComplete }));
    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(result.current.isElapsed).toBe(true);
    expect(onComplete).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("Test 7 — togglePause flips between paused and running", () => {
    const { result } = renderHook(() => useCountdown(Date.now() + 5_000));

    act(() => {
      result.current.togglePause();
    });
    expect(result.current.isPaused).toBe(true);

    act(() => {
      result.current.togglePause();
    });
    expect(result.current.isPaused).toBe(false);
  });
});
