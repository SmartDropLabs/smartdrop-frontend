import { describe, expect, it } from "vitest";
import { buildShareText, buildShareUrl } from "./share-url";

const POOL = "https://smartdrop.example/farm/xlm-usdc";

describe("buildShareUrl (#520)", () => {
  it("tags testnet links with network=testnet", () => {
    expect(buildShareUrl(POOL, "TESTNET", undefined)).toBe(`${POOL}?network=testnet`);
  });

  it("tags futurenet links with network=futurenet", () => {
    expect(buildShareUrl(POOL, "FUTURENET", undefined)).toBe(`${POOL}?network=futurenet`);
  });

  it("leaves mainnet links untagged and strips a stale tag", () => {
    expect(buildShareUrl(POOL, "PUBLIC", undefined)).toBe(POOL);
    expect(buildShareUrl(`${POOL}?network=testnet`, "PUBLIC", undefined)).toBe(POOL);
  });

  it("preserves existing query params and hash", () => {
    expect(buildShareUrl(`${POOL}?tab=stats#top`, "TESTNET", undefined)).toBe(
      `${POOL}?tab=stats&network=testnet#top`,
    );
  });

  it("does not duplicate an existing network param", () => {
    expect(buildShareUrl(`${POOL}?network=testnet`, "TESTNET", undefined)).toBe(
      `${POOL}?network=testnet`,
    );
  });

  it("rebases onto NEXT_PUBLIC_SITE_URL when configured", () => {
    expect(
      buildShareUrl("http://localhost:3000/leaderboard", "TESTNET", "https://testnet.smartdrop.example"),
    ).toBe("https://testnet.smartdrop.example/leaderboard?network=testnet");
  });

  it("keeps the original origin when NEXT_PUBLIC_SITE_URL is malformed", () => {
    expect(buildShareUrl(POOL, "TESTNET", "not a url")).toBe(`${POOL}?network=testnet`);
  });

  it("returns empty and unparseable input unchanged", () => {
    expect(buildShareUrl("", "TESTNET", undefined)).toBe("");
    expect(buildShareUrl("/relative", "TESTNET", undefined)).toBe("/relative");
  });
});

describe("buildShareText (#520)", () => {
  it("labels non-mainnet share text", () => {
    expect(buildShareText("Check out XLM", "TESTNET")).toBe("[Testnet] Check out XLM");
    expect(buildShareText("Check out XLM", "FUTURENET")).toBe("[Futurenet] Check out XLM");
  });

  it("leaves mainnet share text unchanged", () => {
    expect(buildShareText("Check out XLM", "PUBLIC")).toBe("Check out XLM");
  });
});
