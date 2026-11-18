// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ANALYTICS_BATCH_SIZE,
  ANALYTICS_FLUSH_INTERVAL_MS,
  flushAnalytics,
  resetAnalyticsQueue,
  trackEvent,
} from "./analytics";

type TestWindow = Window & { gtag?: unknown; dataLayer?: unknown[] };

describe("analytics event batching (#750)", () => {
  let gtag: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    resetAnalyticsQueue();
    gtag = vi.fn();
    (window as TestWindow).gtag = gtag;
    vi.spyOn(console, "debug").mockImplementation(() => {});
  });

  afterEach(() => {
    resetAnalyticsQueue();
    delete (window as TestWindow).gtag;
    delete (window as TestWindow).dataLayer;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("queues events instead of sending each one immediately", async () => {
    await trackEvent("a");
    await trackEvent("b");

    expect(gtag).not.toHaveBeenCalled();
  });

  it("flushes the queue after the flush interval", async () => {
    await trackEvent("a");
    await trackEvent("b");

    vi.advanceTimersByTime(ANALYTICS_FLUSH_INTERVAL_MS);

    expect(gtag).toHaveBeenCalledTimes(2);
    expect(gtag.mock.calls.map((call) => call[1])).toEqual(["a", "b"]);
  });

  it("flushes as soon as the batch size is reached", async () => {
    for (let i = 0; i < ANALYTICS_BATCH_SIZE; i++) {
      await trackEvent(`e${i}`);
    }

    expect(gtag).toHaveBeenCalledTimes(ANALYTICS_BATCH_SIZE);
  });

  it("flushes queued events when the page is hidden", async () => {
    await trackEvent("a");

    window.dispatchEvent(new Event("pagehide"));

    expect(gtag).toHaveBeenCalledTimes(1);
  });

  it("pushes the whole batch to dataLayer when gtag is absent", async () => {
    delete (window as TestWindow).gtag;
    const dataLayer: unknown[] = [];
    (window as TestWindow).dataLayer = dataLayer;

    await trackEvent("a", { pool: "p1" });
    await trackEvent("b");
    flushAnalytics();

    expect(dataLayer).toEqual([
      expect.objectContaining({ event: "a", pool: "p1" }),
      expect.objectContaining({ event: "b" }),
    ]);
  });

  it("never sends a raw public key", async () => {
    await trackEvent("lock", { publicKey: "GABC" });
    flushAnalytics();

    const payload = gtag.mock.calls[0][2] as Record<string, unknown>;
    expect(payload.publicKey).not.toBe("GABC");
  });
});
