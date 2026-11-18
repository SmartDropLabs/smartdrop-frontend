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

/**
 * Tracks an analytics event with optional sanitization of sensitive data.
 * 
 * If a `publicKey` property is present, it will be hashed using SHA-256
 * before sending to analytics providers for privacy protection.
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

  const payload = { ...sanitized, timestamp: Date.now() };
  const w = window as AnalyticsWindow;

  try {
    if (typeof w.gtag === "function") {
      w.gtag("event", name, payload);
    } else if (Array.isArray(w.dataLayer)) {
      w.dataLayer.push({ event: name, ...payload });
    }
    if (process.env.NODE_ENV !== "production") {
      console.debug("[analytics] " + name, payload);
    }
  } catch {
    // Analytics must never break the app.
  }
}
