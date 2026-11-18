/**
 * In-flight deduplication for read-only Soroban calls (#757).
 *
 * React Query already dedupes requests that share a query key, but the same
 * contract read is also reached through *different* keys — e.g. a pool's
 * `getUserPosition` is fetched by `useUserPosition` (one pool) and by
 * `useAllUserPositions` (every pool) — so both fire the same RPC at once.
 * Callers that pass the same `key` while a call is in flight share its promise.
 */
const inFlight = new Map<string, Promise<unknown>>();

export function dedupeQuery<T>(key: string, queryFn: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key);
  if (existing) return existing as Promise<T>;
  const promise = queryFn().finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}
