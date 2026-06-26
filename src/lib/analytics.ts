export type AnalyticsProps = Record<string, unknown>;

type GtagFn = (command: "event", name: string, props?: AnalyticsProps) => void;

type AnalyticsWindow = Window & {
  gtag?: GtagFn;
  dataLayer?: AnalyticsProps[];
};

function hashPublicKey(publicKey: string): string {
  if (typeof window === "undefined" || !publicKey) return "";
  const encoder = new TextEncoder();
  const data = encoder.encode(publicKey);
  return Array.from(new Uint8Array(data.slice(0, 4)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 8);
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
