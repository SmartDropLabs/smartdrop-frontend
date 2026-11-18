"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Minimum time an announcement stays in the live region before a queued one
 * replaces it (#765). Screen readers read a live region after it settles; a
 * message overwritten sooner than this is often never spoken.
 */
export const ANNOUNCEMENT_MIN_MS = 1000;

/**
 * Holds the text for an aria-live region, only updating when the message
 * value itself changes. A parent can recompute the same announcement on
 * every render (e.g. a keystroke before search-debounce settles, or an
 * unrelated poll tick) without that re-deriving a new state update or
 * risking a redundant announcement — the effect's dependency comparison
 * is a plain string-value check, so same-text renders are no-ops.
 *
 * Rapid changes are queued rather than overwriting each other (#765): a new
 * message is shown immediately when the region is idle, otherwise it waits
 * until the current one has been shown for `minDisplayMs`.
 *
 * Note for future readers (#456): `message` is a `string`, not an object,
 * so React's dependency-array comparison (`Object.is`) here IS a
 * value comparison, not a reference one — two calls with equal text are
 * always `===`, regardless of how each string was constructed (template
 * literal, concatenation, etc.). The reference-vs-value distinction only
 * matters for object/array dependencies; it doesn't apply to a `string`
 * param like this one. See `useLiveAnnouncer.test.ts`'s "re-rendering with
 * the same message value is a no-op" test for a runtime proof of this.
 */
export function useLiveAnnouncer(
  message: string,
  minDisplayMs: number = ANNOUNCEMENT_MIN_MS,
): string {
  const [announcement, setAnnouncement] = useState(message);
  const queue = useRef<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    // The initial message is already in state; only later changes queue.
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    const hold = () => {
      timer.current = setTimeout(() => {
        const next = queue.current.shift();
        if (next === undefined) {
          timer.current = null;
          return;
        }
        setAnnouncement(next);
        hold();
      }, minDisplayMs);
    };

    if (timer.current === null) {
      setAnnouncement(message);
      hold();
    } else if (queue.current[queue.current.length - 1] !== message) {
      queue.current.push(message);
    }
  }, [message, minDisplayMs]);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  return announcement;
}
