/**
 * Stats fetcher: TVL, total users, and a 24-h sparkline.
 *
 * When NEXT_PUBLIC_FACTORY_CONTRACT_ID is set, replace the stub below with
 * real Soroban RPC calls to enumerate pools and aggregate locked amounts.
 * Until then this returns plausible demo data so the UI is fully exercisable.
 */

export type StatsData = {
  /** Formatted TVL string, e.g. "$302M". */
  tvl: string;
  /** Raw TVL in USD. */
  tvlRaw: number;
  /** Total unique staker addresses across all pools. */
  totalUsers: number;
  /** 24 hourly TVL values (USD millions) for the sparkline, oldest → newest. */
  sparkline: number[];
  /** ISO timestamp of the last successful data refresh. */
  lastUpdated: string;
  /** "live" once real contract queries are wired; "demo" until then. */
  source: "live" | "demo";
};

/** Minimal LCG so the demo sparkline is deterministic per hour-slot. */
function lcg(seed: number): number {
  return ((seed * 1664525 + 1013904223) >>> 0) / 0x1_0000_0000;
}

/**
 * Generate 24 synthetic hourly TVL samples anchored to `baseMillions`.
 * Values drift ±4 % so the chart looks like realistic organic movement.
 */
function buildSparkline(baseMillions: number): number[] {
  const hourBucket = Math.floor(Date.now() / 3_600_000);
  let current = baseMillions;
  return Array.from({ length: 24 }, (_, i) => {
    const seed = hourBucket - 23 + i;
    // random walk: each step ±2 %
    const delta = (lcg(seed * 7919) - 0.5) * 0.04 * baseMillions;
    current = Math.max(baseMillions * 0.9, Math.min(baseMillions * 1.1, current + delta));
    return Math.round(current * 10) / 10;
  });
}

/** Format a raw USD amount to a compact string: 302_000_000 → "$302M". */
function formatUsd(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${Math.round(amount / 1_000_000)}M`;
  if (amount >= 1_000) return `$${Math.round(amount / 1_000)}K`;
  return `$${amount}`;
}

export async function fetchStats(): Promise<StatsData> {
  const factoryId = process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ID;

  if (factoryId) {
    try {
      const { sorobanService } = await import("@/lib/soroban");
      const platformStats = await sorobanService.getPlatformStats();
      const tvlRaw = Number(platformStats.tvl.replace(/[^0-9.-]+/g, "")) || 0;
      const tvlMillions = tvlRaw > 0 ? tvlRaw / 1_000_000 : 0;
      const sparkline = buildSparkline(tvlMillions > 0 ? tvlMillions : 1);

      return {
        tvl: platformStats.tvl || formatUsd(tvlRaw),
        tvlRaw,
        totalUsers: platformStats.totalUsers ?? platformStats.totalFarmers ?? 0,
        sparkline,
        lastUpdated: new Date().toISOString(),
        source: "live",
      };
    } catch (err) {
      console.warn("[SmartDrop] live stats fetch failed, falling back to demo:", err);
    }
  }

  // ── Demo mode ──────────────────────────────────────────────────────────────
  // Returns realistic numbers so the dashboard is fully usable before contracts
  // are deployed.
  const BASE_TVL_MILLIONS = 302;
  const BASE_USERS = 30_738;

  const sparkline = buildSparkline(BASE_TVL_MILLIONS);
  const tvlRaw = Math.round(sparkline[sparkline.length - 1] * 1_000_000);

  return {
    tvl: formatUsd(tvlRaw),
    tvlRaw,
    totalUsers: BASE_USERS,
    sparkline,
    lastUpdated: new Date().toISOString(),
    source: "demo",
  };
}
