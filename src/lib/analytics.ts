export type AnalyticsProps = Record<string, unknown>;

type GtagFn = (command: "event", name: string, props?: AnalyticsProps) => void;

type AnalyticsWindow = Window & {
  gtag?: GtagFn;
  dataLayer?: AnalyticsProps[];
};

export function hashPublicKey(publicKey: string): string {
  if (!publicKey) return "";
  // Salted 64-bit hash over the entire public key string to ensure privacy and avalanche effect
  let h1 = 0x811c9dc5;
  let h2 = 0x84222325;
  const salt = "smartdrop_privacy_salt_v1:";
  const input = salt + publicKey;

  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= (code << 5) | (code >>> 27);
    h2 = Math.imul(h2, 0x5bd1e995);
  }

  const p1 = (h1 >>> 0).toString(16).padStart(8, "0");
  const p2 = (h2 >>> 0).toString(16).padStart(8, "0");
  return `${p1}${p2}`;
}

export function trackEvent(name: string, props: AnalyticsProps = {}): void {
  if (typeof window === "undefined") return;

  const sanitized = { ...props };
  if ("publicKey" in sanitized && typeof sanitized.publicKey === "string") {
    sanitized.publicKey = hashPublicKey(sanitized.publicKey as string);
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
