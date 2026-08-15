import { describe, expect, it, vi, beforeEach } from "vitest";
import { fetchStats } from "@/lib/stats";
import { GET } from "@/app/api/stats/route";
import * as sorobanModule from "@/lib/soroban";

describe("Stats Subsystem (#130)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns live on-chain stats when factory contract is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_FACTORY_CONTRACT_ID", "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4");

    vi.spyOn(sorobanModule.sorobanService, "getPlatformStats").mockResolvedValue({
      tvl: "$4.2M",
      tvlRaw: 4200000,
      totalUsers: 840,
      totalFarmers: 840,
      activePools: 5,
      creditVelocity: "100",
    } as any);

    const stats = await fetchStats();

    expect(stats.source).toBe("live");
    expect(stats.tvl).toBe("$4.2M");
    expect(stats.totalUsers).toBe(840);
    expect(stats.sparkline.length).toBe(24);
  });

  it("falls back to demo mode when factory contract is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_FACTORY_CONTRACT_ID", "");

    const stats = await fetchStats();

    expect(stats.source).toBe("demo");
    expect(stats.totalUsers).toBe(30738);
    expect(stats.tvl).toMatch(/^\$\d+M$/);
    expect(stats.sparkline.length).toBe(24);
  });

  it("GET /api/stats returns stats with HTTP 200", async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.source).toBeDefined();
    expect(data.tvl).toBeDefined();
    expect(data.totalUsers).toBeDefined();
  });
});
