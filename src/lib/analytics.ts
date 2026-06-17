/**
 * Lightweight, dependency-free analytics shim.
 *
 * Forwards events to whatever analytics layer is present at runtime
 * (`window.gtag` or `window.dataLayer`) and always logs in development so
 * events are observable without a provider configured. Calls are no-ops when
 * running on the server.
 */

export type AnalyticsProps = Record<string, unknown>;

type GtagFn = (command: "event", name: string, props?: AnalyticsProps) => void;

type AnalyticsWindow = Window & {
  gtag?: GtagFn;
  dataLayer?: AnalyticsProps[];
};

export function trackEvent(name: string, props: AnalyticsProps = {}): void {
  if (typeof window === "undefined") return;

  const w = window as AnalyticsWindow;
  const payload = { ...props, timestamp: Date.now() };

  try {
    if (typeof w.gtag === "function") {
      w.gtag("event", name, payload);
    } else if (Array.isArray(w.dataLayer)) {
      w.dataLayer.push({ event: name, ...payload });
    }

    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.debug(`[analytics] ${name}`, payload);
    }
  } catch {
    // Analytics must never break the app.
  }
}
