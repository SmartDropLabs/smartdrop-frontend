"use client";

import { useEffect, useState } from "react";
import { Box, Skeleton, Text } from "@chakra-ui/react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const ACCENT = "#4ae292";

// Issue #214: a fixed 180px is tall relative to viewport width on small
// phones; shrink it below the sm breakpoint instead. Expressed as a
// responsive CSS value (not useBreakpointValue) so the skeleton, empty
// state and chart all resolve to the same height on first paint — the JS
// breakpoint hook falls back to "sm" until hydration, which made the
// skeleton render at 180px and then jump to 140px on phones.
const CHART_HEIGHT = { base: "140px", sm: "180px" };

interface TvlDataPoint {
  date: string;
  tvl: string;
  truncated?: boolean;
}

interface TvlChartProps {
  poolId: string;
}

export default function TvlChart({ poolId }: TvlChartProps) {
  const [data, setData] = useState<TvlDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    import("@/lib/soroban")
      .then(({ sorobanService }) => sorobanService.getPoolHistory(poolId, 7))
      .then((history) => {
        if (!cancelled) {
          setData(history);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [poolId]);

  if (loading) {
    return <Skeleton h={CHART_HEIGHT} borderRadius="2xl" startColor="app.border" endColor="app.surfaceHover" />;
  }

  if (data.length === 0) {
    return (
      <Box
        h={CHART_HEIGHT}
        display="flex"
        alignItems="center"
        justifyContent="center"
        borderRadius="2xl"
        border="1px solid"
        borderColor="app.border"
      >
        <Text color="app.muted" fontSize="sm">
          No TVL history available
        </Text>
      </Box>
    );
  }

  return (
    <Box h={CHART_HEIGHT}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="tvlGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={ACCENT} stopOpacity={0.3} />
              <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#A2A2A2" }}
            tickFormatter={(v: string) =>
              new Date(v).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })
            }
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#A2A2A2" }}
            tickFormatter={(v: number) =>
              v >= 1_000_000
                ? `$${(v / 1_000_000).toFixed(1)}M`
                : v >= 1_000
                ? `$${(v / 1_000).toFixed(0)}K`
                : `$${v}`
            }
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip
            contentStyle={{
              background: "var(--chakra-colors-app-surface)",
              border: "1px solid var(--chakra-colors-app-border)",
              borderRadius: "12px",
              fontSize: "12px",
              color: "var(--chakra-colors-app-text)",
            }}
            labelFormatter={(label) =>
              new Date(String(label)).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })
            }
            formatter={(value) => [`$${Number(value).toLocaleString()}`, "TVL"]}
          />
          <Area
            type="monotone"
            dataKey="tvl"
            stroke={ACCENT}
            strokeWidth={2}
            fill="url(#tvlGradient)"
            dot={false}
            activeDot={{ r: 4, fill: ACCENT }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
}
