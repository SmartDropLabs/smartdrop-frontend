import { describe, expect, it, vi } from "vitest";
import { dedupeQuery } from "./dedupe-query";

describe("dedupeQuery (#757)", () => {
  it("shares one in-flight call between callers with the same key", async () => {
    let resolve!: (value: string) => void;
    const queryFn = vi.fn(() => new Promise<string>((r) => (resolve = r)));

    const first = dedupeQuery("k", queryFn);
    const second = dedupeQuery("k", queryFn);
    resolve("result");

    await expect(first).resolves.toBe("result");
    await expect(second).resolves.toBe("result");
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it("runs separate calls for different keys", async () => {
    const queryFn = vi.fn(async () => "x");
    await Promise.all([dedupeQuery("a", queryFn), dedupeQuery("b", queryFn)]);
    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  it("calls again once the previous call has settled", async () => {
    const queryFn = vi.fn(async () => "x");
    await dedupeQuery("again", queryFn);
    await dedupeQuery("again", queryFn);
    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  it("clears the entry after a failure so the next call retries", async () => {
    const queryFn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("rpc down"))
      .mockResolvedValueOnce("ok");
    await expect(dedupeQuery("fail", queryFn)).rejects.toThrow("rpc down");
    await expect(dedupeQuery("fail", queryFn)).resolves.toBe("ok");
  });
});
