export type AnalyticsProps = Record<string, unknown>;

type GtagFn = (command: "event", name: string, props?: AnalyticsProps) => void;

type AnalyticsWindow = Window & {
  gtag?: GtagFn;
  dataLayer?: AnalyticsProps[];
};

/**
 * Hashes a Stellar public key using SHA-256 for analytics privacy.
 * 
 * SECURITY: Uses full SHA-256 hash (256 bits) instead of only 4 bytes (32 bits)
 * to prevent trivial brute-force attacks. Returns first 128 bits (32 hex chars)
 * which provides sufficient entropy (~2^128 keyspace).
 * 
 * @param publicKey - Stellar public key (G...)
 * @returns First 128 bits of SHA-256 hash as hex string, or empty string on error
 */
async function hashPublicKey(publicKey: string): Promise<string> {
  if (typeof window === "undefined" || !publicKey) return "";
  
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(publicKey);
    
    // Use Web Crypto API for SHA-256 (available in all modern browsers)
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    
    // Convert to hex and return first 128 bits (32 hex chars)
    // This provides ~2^128 entropy, sufficient for privacy while remaining compact
    return hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 32);
  } catch (error) {
    // Fallback: return empty string if hashing fails (e.g., unsupported browser)
    console.error("[analytics] Failed to hash public key:", error);
    return "";
  }
}

type QueuedEvent = { name: string; payload: AnalyticsProps };

/** Flush as soon as this many events are queued (#750). */
export const ANALYTICS_BATCH_SIZE = 10;
/** Otherwise flush this long after the first queued event (#750). */
export const ANALYTICS_FLUSH_INTERVAL_MS = 5000;

let eventQueue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let unloadListenerAttached = false;

/**
 * Sends every queued event to the analytics provider in one pass and empties
 * the queue (#750). Called automatically on batch size, on the flush
 * interval, and when the page is hidden, so queued events aren't lost on
 * navigation; exported for tests and for callers that must flush now.
 */
export function flushAnalytics(): void {
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (typeof window === "undefined" || eventQueue.length === 0) return;

  const batch = eventQueue;
  eventQueue = [];
  const w = window as AnalyticsWindow;

  try {
    if (typeof w.gtag === "function") {
      for (const { name, payload } of batch) w.gtag("event", name, payload);
    } else if (Array.isArray(w.dataLayer)) {
      w.dataLayer.push(...batch.map(({ name, payload }) => ({ event: name, ...payload })));
    }
    if (process.env.NODE_ENV !== "production") {
      console.debug(`[analytics] flushed ${batch.length} event(s)`, batch);
    }
  } catch {
    // Analytics must never break the app.
  }
}

function attachUnloadFlush(): void {
  if (unloadListenerAttached) return;
  unloadListenerAttached = true;
  window.addEventListener("pagehide", flushAnalytics);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushAnalytics();
  });
}

/** Test seam: drops queued events and any pending flush. */
export function resetAnalyticsQueue(): void {
  eventQueue = [];
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

/**
 * Tracks an analytics event with optional sanitization of sensitive data.
 *
 * If a `publicKey` property is present, it will be hashed using SHA-256
 * before sending to analytics providers for privacy protection.
 *
 * Events are queued and sent in batches (#750) — on reaching
 * ANALYTICS_BATCH_SIZE, after ANALYTICS_FLUSH_INTERVAL_MS, or when the page
 * is hidden — instead of one provider call per event.
 *
 * @param name - Event name
 * @param props - Event properties (publicKey will be auto-hashed if present)
 */
export async function trackEvent(name: string, props: AnalyticsProps = {}): Promise<void> {
  if (typeof window === "undefined") return;

  const sanitized = { ...props };

  // Hash public key if present (async operation)
  if ("publicKey" in sanitized && typeof sanitized.publicKey === "string") {
    sanitized.publicKey = await hashPublicKey(sanitized.publicKey as string);
  }

  eventQueue.push({ name, payload: { ...sanitized, timestamp: Date.now() } });
  attachUnloadFlush();

  if (eventQueue.length >= ANALYTICS_BATCH_SIZE) {
    flushAnalytics();
  } else if (flushTimer === null) {
    flushTimer = setTimeout(flushAnalytics, ANALYTICS_FLUSH_INTERVAL_MS);
  }
}
