import { beforeEach, describe, expect, it } from "vitest";
import {
  MAX_RECENT_PAGES,
  RECENT_PAGES_KEY,
  forgetRecentPage,
  getRecentPages,
  labelForPath,
  recordRecentPage,
} from "./recentPages";

// src/lib tests run in the node environment (no window), so storage is
// passed explicitly.
function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => Array.from(data.keys())[index] ?? null,
    removeItem: (key: string) => {
      data.delete(key);
    },
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

describe("recentPages (#784)", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = memoryStorage();
  });

  it("records known routes most-recent first, without duplicates", () => {
    recordRecentPage("/farm", storage);
    recordRecentPage("/leaderboard", storage);
    recordRecentPage("/farm/", storage);

    expect(getRecentPages(storage).map((p) => p.path)).toEqual(["/farm", "/leaderboard"]);
  });

  it("ignores paths that are not app routes", () => {
    recordRecentPage("/no-such-page", storage);
    recordRecentPage("/leaderbord", storage);

    expect(getRecentPages(storage)).toEqual([]);
  });

  it("keeps at most MAX_RECENT_PAGES entries", () => {
    for (const path of ["/", "/airdrops", "/alerts", "/analytics", "/farm", "/history"]) {
      recordRecentPage(path, storage);
    }

    const pages = getRecentPages(storage);
    expect(pages).toHaveLength(MAX_RECENT_PAGES);
    expect(pages[0].path).toBe("/history");
  });

  it("labels routes, including nested ones", () => {
    expect(labelForPath("/")).toBe("Home");
    expect(labelForPath("/prices")).toBe("Prices");
    expect(labelForPath("/farm/xlm-usdc")).toBe("Farm · xlm-usdc");
    expect(labelForPath("/farmers")).toBeNull();
  });

  it("forgets a path that turned out to 404", () => {
    recordRecentPage("/farm/typo", storage);
    recordRecentPage("/prices", storage);
    forgetRecentPage("/farm/typo", storage);

    expect(getRecentPages(storage).map((p) => p.path)).toEqual(["/prices"]);
  });

  it("survives corrupt or unavailable storage", () => {
    storage.setItem(RECENT_PAGES_KEY, "{not json");
    expect(getRecentPages(storage)).toEqual([]);

    const throwing = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    } as unknown as Storage;
    expect(() => recordRecentPage("/farm", throwing)).not.toThrow();
    expect(() => forgetRecentPage("/farm", throwing)).not.toThrow();
    expect(getRecentPages(throwing)).toEqual([]);
  });

  it("is a no-op without storage (server render)", () => {
    expect(getRecentPages(undefined)).toEqual([]);
    expect(() => recordRecentPage("/farm", undefined)).not.toThrow();
  });
});
