/**
 * Leaderboard invalidation (#761).
 *
 * The leaderboard is not a react-query query, so the cache invalidations that
 * run after a stake or unlock never reached it and users kept seeing their old
 * rank until the 30s refresh. Actions that change rankings call
 * `invalidateLeaderboard()`; every mounted `useLeaderboard` refetches at once.
 *
 * Kept dependency-free so mutation hooks can import it without pulling in the
 * leaderboard hook (and `next/navigation`) as well.
 */
export const LEADERBOARD_INVALIDATE_EVENT = "smartdrop:leaderboard-invalidate";

export function invalidateLeaderboard(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(LEADERBOARD_INVALIDATE_EVENT));
}

/** Subscribes `onInvalidate`; returns the unsubscribe function. */
export function onLeaderboardInvalidated(onInvalidate: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(LEADERBOARD_INVALIDATE_EVENT, onInvalidate);
  return () => window.removeEventListener(LEADERBOARD_INVALIDATE_EVENT, onInvalidate);
}
