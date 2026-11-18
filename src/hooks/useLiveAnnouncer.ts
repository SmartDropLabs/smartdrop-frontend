"use client";

import { useEffect, useState } from "react";

/**
 * Holds the text for an aria-live region, only updating when the message
 * value itself changes. A parent can recompute the same announcement on
 * every render (e.g. a keystroke before search-debounce settles, or an
 * unrelated poll tick) without that re-deriving a new state update or
 * risking a redundant announcement — the effect's dependency comparison
 * is a plain string-value check, so same-text renders are no-ops.
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
export function useLiveAnnouncer(message: string): string {
  const [announcement, setAnnouncement] = useState(message);

  useEffect(() => {
    setAnnouncement(message);
  }, [message]);

  return announcement;
}
