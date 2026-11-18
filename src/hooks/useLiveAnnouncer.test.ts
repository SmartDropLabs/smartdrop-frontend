import { act, renderHook } from "@/test/renderHook";
import { describe, expect, it, vi } from "vitest";
import { ANNOUNCEMENT_MIN_MS, useLiveAnnouncer } from "./useLiveAnnouncer";

describe("useLiveAnnouncer", () => {
  it("Test 1 — returns the initial message on first render", () => {
    const { result } = renderHook(() => useLiveAnnouncer("hello"));
    expect(result.current).toBe("hello");
  });

  it("Test 2 — updates once the message value actually changes", () => {
    let message = "first";
    const { result, rerender } = renderHook(() => useLiveAnnouncer(message));
    expect(result.current).toBe("first");

    message = "second";
    rerender();

    expect(result.current).toBe("second");
  });

  it("Test 3 — re-rendering with the same message value is a no-op (still returns that value)", () => {
    const message = "stable";
    const { result, rerender } = renderHook(() => useLiveAnnouncer(message));
    expect(result.current).toBe("stable");

    rerender();
    rerender();

    expect(result.current).toBe("stable");
  });

  it("Test 4 — an empty string is a valid message (used to represent 'nothing to announce yet')", () => {
    const { result } = renderHook(() => useLiveAnnouncer(""));
    expect(result.current).toBe("");
  });
});

describe("useLiveAnnouncer queue (#765)", () => {
  it("queues rapid announcements instead of overwriting them", () => {
    vi.useFakeTimers();
    try {
      let message = "start";
      const { result, rerender } = renderHook(() => useLiveAnnouncer(message));

      message = "one";
      rerender();
      expect(result.current).toBe("one");

      message = "two";
      rerender();
      message = "three";
      rerender();
      // "one" is still being held; the others wait their turn.
      expect(result.current).toBe("one");

      act(() => {
        vi.advanceTimersByTime(ANNOUNCEMENT_MIN_MS);
      });
      expect(result.current).toBe("two");

      act(() => {
        vi.advanceTimersByTime(ANNOUNCEMENT_MIN_MS);
      });
      expect(result.current).toBe("three");
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows a message immediately once the queue has drained", () => {
    vi.useFakeTimers();
    try {
      let message = "start";
      const { result, rerender } = renderHook(() => useLiveAnnouncer(message));

      message = "one";
      rerender();
      act(() => {
        vi.advanceTimersByTime(ANNOUNCEMENT_MIN_MS);
      });

      message = "later";
      rerender();
      expect(result.current).toBe("later");
    } finally {
      vi.useRealTimers();
    }
  });
});
