import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { hashPublicKey, trackEvent } from "./analytics";

describe("analytics module", () => {
  const addr1 = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWX";
  const addr2 = "GABCZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ";
  const addr3 = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWY"; // 1 char diff at end

  describe("hashPublicKey", () => {
    it("returns empty string for invalid or missing inputs", async () => {
      expect(await hashPublicKey("")).toBe("");
      expect(await hashPublicKey(null as unknown as string)).toBe("");
      expect(await hashPublicKey(undefined as unknown as string)).toBe("");
    });

    it("is deterministic (same input produces identical hash)", async () => {
      const hashA = await hashPublicKey(addr1);
      const hashB = await hashPublicKey(addr1);
      expect(hashA).toBe(hashB);
      expect(hashA.length).toBe(16);
    });

    it("hashes the full input so addresses sharing the same first 4 chars yield different outputs", async () => {
      const hash1 = await hashPublicKey(addr1);
      const hash2 = await hashPublicKey(addr2);

      // Both start with 'GABC', but total strings differ drastically
      expect(addr1.slice(0, 4)).toBe("GABC");
      expect(addr2.slice(0, 4)).toBe("GABC");
      expect(hash1).not.toBe(hash2);
    });

    it("exhibits avalanche effect for single character variations at the end", async () => {
      const hash1 = await hashPublicKey(addr1);
      const hash3 = await hashPublicKey(addr3);
      expect(hash1).not.toBe(hash3);
    });

    it("does not leak the raw ASCII byte hex representation of the address prefix", async () => {
      const hash = await hashPublicKey(addr1);
      // Raw ASCII hex of 'GABC' is '47414243'
      expect(hash).not.toContain("47414243");
      expect(hash.startsWith("47414243")).toBe(false);
    });
  });

  describe("trackEvent", () => {
    const originalWindow = globalThis.window;

    beforeEach(() => {
      // Setup a window environment with mock gtag and dataLayer
      const mockWindow = {
        gtag: vi.fn(),
        dataLayer: [],
      };
      vi.stubGlobal("window", mockWindow);
    });

    afterEach(() => {
      vi.stubGlobal("window", originalWindow);
    });

    it("sanitizes publicKey in props using hashPublicKey before dispatching to gtag", async () => {
      await trackEvent("test_event", { publicKey: addr1, amount: 100 });

      const w = window as unknown as { gtag: ReturnType<typeof vi.fn> };
      expect(w.gtag).toHaveBeenCalledTimes(1);

      const [command, eventName, payload] = w.gtag.mock.calls[0];
      expect(command).toBe("event");
      expect(eventName).toBe("test_event");
      expect(payload.amount).toBe(100);
      expect(typeof payload.timestamp).toBe("number");

      // Verify publicKey is sanitized and no longer contains raw address
      expect(payload.publicKey).not.toBe(addr1);
      expect(payload.publicKey).toBe(await hashPublicKey(addr1));
    });

    it("pushes to dataLayer if gtag is not present", async () => {
      const dataLayer: Record<string, unknown>[] = [];
      vi.stubGlobal("window", { dataLayer });

      await trackEvent("data_layer_event", { publicKey: addr2 });

      expect(dataLayer.length).toBe(1);
      expect(dataLayer[0].event).toBe("data_layer_event");
      expect(dataLayer[0].publicKey).toBe(await hashPublicKey(addr2));
    });

    it("does not throw if window.gtag throws an error", async () => {
      vi.stubGlobal("window", {
        gtag: () => {
          throw new Error("Gtag error");
        },
      });

      await expect(
        trackEvent("error_event", { publicKey: addr1 })
      ).resolves.not.toThrow();
    });
  });
});
