// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PERSISTED_QUERY_MAX_AGE_MS,
  clearPersistedQuery,
  readPersistedQuery,
  writePersistedQuery,
} from "./queryPersistence";

describe("queryPersistence (#788)", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("round-trips data with its saved timestamp", () => {
    writePersistedQuery("pools", [{ id: "p1" }], 1_000);

    expect(readPersistedQuery("pools", PERSISTED_QUERY_MAX_AGE_MS, 2_000)).toEqual({
      savedAt: 1_000,
      data: [{ id: "p1" }],
    });
  });

  it("returns nothing for a missing key", () => {
    expect(readPersistedQuery("missing")).toBeUndefined();
  });

  it("drops entries older than the max age", () => {
    writePersistedQuery("pools", [1], 0);

    expect(readPersistedQuery("pools", 10, 11)).toBeUndefined();
    expect(readPersistedQuery("pools", PERSISTED_QUERY_MAX_AGE_MS, 1)).toBeUndefined();
  });

  it("drops entries timestamped in the future", () => {
    writePersistedQuery("pools", [1], 5_000);

    expect(readPersistedQuery("pools", PERSISTED_QUERY_MAX_AGE_MS, 1_000)).toBeUndefined();
  });

  it("ignores and removes corrupt entries", () => {
    window.localStorage.setItem("smartdrop:query-cache:v1:pools", "{not json");
    expect(readPersistedQuery("pools")).toBeUndefined();

    window.localStorage.setItem("smartdrop:query-cache:v1:pools", JSON.stringify({ data: 1 }));
    expect(readPersistedQuery("pools")).toBeUndefined();
    expect(window.localStorage.getItem("smartdrop:query-cache:v1:pools")).toBeNull();
  });

  it("skips data that cannot be serialised instead of throwing", () => {
    expect(() => writePersistedQuery("big", { value: BigInt(1) })).not.toThrow();
    expect(readPersistedQuery("big")).toBeUndefined();
  });

  it("does not throw when storage itself throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => writePersistedQuery("pools", [1])).not.toThrow();
  });

  it("clears an entry", () => {
    writePersistedQuery("pools", [1]);
    clearPersistedQuery("pools");

    expect(readPersistedQuery("pools")).toBeUndefined();
  });
});
