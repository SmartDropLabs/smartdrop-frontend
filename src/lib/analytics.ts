export type AnalyticsProps = Record<string, unknown>;

type GtagFn = (command: "event", name: string, props?: AnalyticsProps) => void;

type AnalyticsWindow = Window & {
  gtag?: GtagFn;
  dataLayer?: AnalyticsProps[];
};

function fallbackHash(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 16777619);
    h2 = Math.imul(h2 ^ code, 0x01000193);
  }
  const part1 = (h1 >>> 0).toString(16).padStart(8, "0");
  const part2 = (h2 >>> 0).toString(16).padStart(8, "0");
  return (part1 + part2).slice(0, 16);
}

/**
 * Hashes a public key using SHA-256 over the entire string digest.
 * Returns a 16-character hex pseudonymous identifier.
 */
export async function hashPublicKey(publicKey: string): Promise<string> {
  if (!publicKey || typeof publicKey !== "string") return "";

  const cryptoObj =
    typeof window !== "undefined" && window.crypto?.subtle
      ? window.crypto
      : typeof globalThis !== "undefined" && globalThis.crypto?.subtle
      ? globalThis.crypto
      : null;

  if (cryptoObj?.subtle) {
    try {
      const data = new TextEncoder().encode(publicKey);
      const hashBuffer = await cryptoObj.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .slice(0, 16);
    } catch {
      // Fall through to fallback hash if Web Crypto digest fails
    }
  }

  return fallbackHash(publicKey);
}

export async function trackEvent(name: string, props: AnalyticsProps = {}): Promise<void> {
  if (typeof window === "undefined") return;

  const sanitized = { ...props };
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
