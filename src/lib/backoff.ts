/**
 * Fraction of the backoff delay added as random jitter (#756). Without it,
 * every client that failed at the same moment retries at the same moment
 * too — a thundering herd against a backend that is already struggling.
 */
export const BACKOFF_JITTER_RATIO = 0.1;

/**
 * Exponential backoff (`baseMs * 2^attemptIndex`, capped at `maxMs`) plus up
 * to `BACKOFF_JITTER_RATIO` of that delay in random jitter. `random` is
 * injectable so tests can pin the jitter.
 */
export function jitteredBackoff(
  attemptIndex: number,
  { baseMs = 1000, maxMs }: { baseMs?: number; maxMs: number },
  random: () => number = Math.random,
): number {
  const delay = Math.min(baseMs * 2 ** attemptIndex, maxMs);
  return delay + delay * BACKOFF_JITTER_RATIO * random();
}
