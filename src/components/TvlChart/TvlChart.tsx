"use client";

import { useEffect, useState } from "react";
import { Box, Skeleton, Text, useBreakpointValue, useColorModeValue } from "@chakra-ui/react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { sorobanService } from "@/lib/soroban";

const ACCENT_DARK = "#4ae292";
const ACCENT_LIGHT = "#0f7a4e";

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
  // Issue #214: a fixed 180px is tall relative to viewport width on small
  // phones; shrink it below the sm breakpoint instead.
  const chartHeight = useBreakpointValue({ base: 140, sm: 180 }, { fallback: "sm" }) ?? 180;

  const accentColor = useColorModeValue(ACCENT_LIGHT, ACCENT_DARK);
  const axisTickColor = useColorModeValue("#6b7280", "#A2A2A2");
  const tooltipBg = useColorModeValue("#ffffff", "#171717");
  const tooltipBorder = useColorModeValue("#e2e8f0", "#333333");
  const tooltipText = useColorModeValue("#171717", "#ffffff");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    sorobanService
      .getPoolHistory(poolId, 7)
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
    return <Skeleton height={`${chartHeight}px`} borderRadius="2xl" startColor="app.border" endColor="app.surfaceHover" />;
  }

  if (data.length === 0) {
    return (
      <Box
        h={`${chartHeight}px`}
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
    <ResponsiveContainer width="100%" height={chartHeight}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="tvlGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={accentColor} stopOpacity={0.3} />
            <stop offset="95%" stopColor={accentColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: axisTickColor }}
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
          tick={{ fontSize: 11, fill: axisTickColor }}
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
            backgroundColor: tooltipBg,
            borderColor: tooltipBorder,
            color: tooltipText,
            borderRadius: "12px",
            fontSize: "12px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          }}
          itemStyle={{
            color: tooltipText,
          }}
          labelStyle={{
            color: tooltipText,
            fontWeight: 600,
            marginBottom: "4px",
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
          stroke={accentColor}
          strokeWidth={2}
          fill="url(#tvlGradient)"
          dot={false}
          activeDot={{ r: 4, fill: accentColor }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
