import { describe, expect, it } from "vitest";
import { BACKOFF_JITTER_RATIO, jitteredBackoff } from "./backoff";

describe("jitteredBackoff (#756)", () => {
  it("doubles per attempt and caps at maxMs before jitter", () => {
    const noJitter = () => 0;
    expect(jitteredBackoff(0, { maxMs: 30_000 }, noJitter)).toBe(1000);
    expect(jitteredBackoff(3, { maxMs: 30_000 }, noJitter)).toBe(8000);
    expect(jitteredBackoff(20, { maxMs: 30_000 }, noJitter)).toBe(30_000);
  });

  it("adds at most BACKOFF_JITTER_RATIO of the delay", () => {
    const delay = jitteredBackoff(2, { maxMs: 30_000 }, () => 0.999999);
    expect(delay).toBeGreaterThan(4000);
    expect(delay).toBeLessThan(4000 * (1 + BACKOFF_JITTER_RATIO));
  });

  it("spreads two callers that fail on the same attempt", () => {
    const a = jitteredBackoff(2, { maxMs: 30_000 }, () => 0.1);
    const b = jitteredBackoff(2, { maxMs: 30_000 }, () => 0.9);
    expect(a).not.toBe(b);
  });
});
