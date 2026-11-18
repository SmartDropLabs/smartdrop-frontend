/**
 * Recently visited pages, shown on the 404 page so a user who followed a
 * broken link can get back to where they were (#784).
 *
 * Only real app routes are recorded: AppShell also wraps the 404 page, so
 * recording every pathname would store the broken URL itself and suggest it
 * on the next 404. Storage failures (private mode, disabled storage, SSR) are
 * swallowed — this is a convenience, never a reason to break navigation.
 */

export const RECENT_PAGES_KEY = "smartdrop:recent-pages";
export const MAX_RECENT_PAGES = 5;

export interface RecentPage {
  path: string;
  label: string;
}

const ROUTE_LABELS: Array<[prefix: string, label: string]> = [
  ["/airdrops", "Airdrops"],
  ["/alerts", "Alerts"],
  ["/analytics", "Analytics"],
  ["/contributors", "Contributors"],
  ["/farm", "Farm"],
  ["/history", "History"],
  ["/leaderboard", "Leaderboard"],
  ["/prices", "Prices"],
  ["/webhooks", "Webhooks"],
];

/** Label for a known app route, or null if `path` is not one. */
export function labelForPath(path: string): string | null {
  if (path === "/") return "Home";
  for (const [prefix, label] of ROUTE_LABELS) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return path === prefix ? label : `${label} · ${path.slice(prefix.length + 1)}`;
    }
  }
  return null;
}

function normalize(path: string): string {
  const trimmed = path.split(/[?#]/)[0].replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

export function getRecentPages(storage: Storage | undefined = safeStorage()): RecentPage[] {
  if (!storage) return [];
  try {
    const parsed: unknown = JSON.parse(storage.getItem(RECENT_PAGES_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p): p is string => typeof p === "string")
      .map((path) => ({ path, label: labelForPath(path) }))
      .filter((p): p is RecentPage => p.label !== null)
      .slice(0, MAX_RECENT_PAGES);
  } catch {
    return [];
  }
}

/** Records `path` as most recent, de-duplicated, if it is a known app route. */
export function recordRecentPage(
  path: string,
  storage: Storage | undefined = safeStorage(),
): void {
  if (!storage) return;
  const normalized = normalize(path);
  if (labelForPath(normalized) === null) return;
  try {
    const existing = getRecentPages(storage).map((p) => p.path);
    const next = [normalized, ...existing.filter((p) => p !== normalized)].slice(
      0,
      MAX_RECENT_PAGES,
    );
    storage.setItem(RECENT_PAGES_KEY, JSON.stringify(next));
  } catch {
    // Quota or access errors: skip recording rather than break navigation.
  }
}

/** Removes `path`, e.g. a URL under a known prefix that turned out to 404. */
export function forgetRecentPage(
  path: string,
  storage: Storage | undefined = safeStorage(),
): void {
  if (!storage) return;
  const normalized = normalize(path);
  try {
    const remaining = getRecentPages(storage)
      .map((p) => p.path)
      .filter((p) => p !== normalized);
    storage.setItem(RECENT_PAGES_KEY, JSON.stringify(remaining));
  } catch {
    // Same as recordRecentPage: never let storage errors surface.
  }
}

function safeStorage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}
