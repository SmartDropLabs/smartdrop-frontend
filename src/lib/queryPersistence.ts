/**
 * Minimal localStorage persistence for public React Query data (#788), so a
 * refresh shows the last-known pools/stats immediately instead of an empty
 * loading state while the Soroban RPC round trip completes.
 *
 * Only public, wallet-independent data should be persisted here: nothing
 * keyed by a public key, and never anything secret. Every storage access is
 * wrapped so private browsing, a full quota, blocked storage or data that
 * can't be serialised (e.g. a bigint) degrades to "no cache" — never a crash.
 */

const STORAGE_PREFIX = "smartdrop:query-cache:v1:";

/** Entries older than this are ignored and removed rather than shown. */
export const PERSISTED_QUERY_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface PersistedQueryEntry<T> {
  savedAt: number;
  data: T;
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readPersistedQuery<T>(
  key: string,
  maxAgeMs: number = PERSISTED_QUERY_MAX_AGE_MS,
  now: number = Date.now(),
): PersistedQueryEntry<T> | undefined {
  const store = storage();
  if (!store) return undefined;
  try {
    const raw = store.getItem(STORAGE_PREFIX + key);
    if (!raw) return undefined;
    const entry = JSON.parse(raw) as Partial<PersistedQueryEntry<T>>;
    if (typeof entry.savedAt !== "number" || !("data" in entry)) {
      store.removeItem(STORAGE_PREFIX + key);
      return undefined;
    }
    if (now - entry.savedAt > maxAgeMs || entry.savedAt > now) {
      store.removeItem(STORAGE_PREFIX + key);
      return undefined;
    }
    return { savedAt: entry.savedAt, data: entry.data as T };
  } catch {
    return undefined;
  }
}

export function writePersistedQuery<T>(key: string, data: T, savedAt: number = Date.now()): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(STORAGE_PREFIX + key, JSON.stringify({ savedAt, data }));
  } catch {
    // Quota exceeded, storage blocked, or unserialisable data: skip caching.
  }
}

export function clearPersistedQuery(key: string): void {
  try {
    storage()?.removeItem(STORAGE_PREFIX + key);
  } catch {
    // ignore
  }
}
