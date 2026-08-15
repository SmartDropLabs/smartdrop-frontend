import { describe, expect, it, vi, beforeEach } from "vitest";
import { hashPublicKey, trackEvent } from "@/lib/analytics";

describe("Analytics Public Key Privacy & Hashing (#148)", () => {
  const addrA = "GBJGVZ7E43G2Z3P6N6W557LNYN5H23DY6Y4W63X4Z3P6N6W557LNYN5H";
  const addrB = "GBJGVZ99999999999999999999999999999999999999999999999999";

  it("is deterministic for identical inputs", () => {
    const hash1 = hashPublicKey(addrA);
    const hash2 = hashPublicKey(addrA);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(16);
  });

  it("produces distinct hashes for different addresses sharing identical prefixes", () => {
    const hashA = hashPublicKey(addrA);
    const hashB = hashPublicKey(addrB);
    expect(hashA).not.toBe(hashB);
  });

  it("returns empty string for falsy/empty public key", () => {
    expect(hashPublicKey("")).toBe("");
  });

  it("sanitizes publicKey in trackEvent before forwarding to dataLayer", () => {
    const mockDataLayer: Record<string, unknown>[] = [];
    (window as unknown as { dataLayer: Record<string, unknown>[] }).dataLayer = mockDataLayer;

    trackEvent("wallet_connected", {
      publicKey: addrA,
      network: "testnet",
    });

    expect(mockDataLayer).toHaveLength(1);
    const event = mockDataLayer[0];
    expect(event.event).toBe("wallet_connected");
    expect(event.publicKey).toBe(hashPublicKey(addrA));
    expect(event.publicKey).not.toBe(addrA);
    expect(event.publicKey).not.toContain("GBJG");
  });
});
