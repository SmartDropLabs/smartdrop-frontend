'use client';

import React from 'react';
import { SimpleGrid, Stat, StatLabel, StatNumber, Box, Skeleton, Tooltip } from '@chakra-ui/react';
import { usePlatformStats, UIPlatformStats } from '@/hooks/useSorobanQuery';
import { formatCredits } from '@/lib/soroban';

interface PlatformStatsProps {
  initialData?: UIPlatformStats;
}

/** Plain-language explanation shown for each metric (#769). */
export const METRIC_HELP = {
  tvl: 'Total value of assets currently locked in all farming pools, in USD.',
  activePools: 'Number of farming pools currently accepting deposits.',
  totalFarmers: 'Number of distinct wallets with an active position in any pool.',
  creditVelocity: 'Credits emitted to farmers across all pools in the last 24 hours.',
} as const;

const MetricLabel: React.FC<{ help: string; children: React.ReactNode }> = ({ help, children }) => (
  <Tooltip label={help} hasArrow fontSize="xs" openDelay={200}>
    <StatLabel color="app.muted" tabIndex={0}>
      {children}
    </StatLabel>
  </Tooltip>
);

const PlatformStatsSkeleton: React.FC = () => (
  <SimpleGrid columns={{ base: 2, md: 4 }} spacing={5} mb={8} width="100%">
    {Array.from({ length: 4 }).map((_, i) => (
      <Box key={i} {...cardProps}>
        <Skeleton height="16px" width="60%" mb={3} startColor="app.border" endColor="app.surfaceHover" />
        <Skeleton height="32px" width="80%" startColor="app.border" endColor="app.surfaceHover" />
      </Box>
    ))}
  </SimpleGrid>
);

const cardProps = {
  p: 5,
  borderWidth: '1px',
  borderColor: 'app.border',
  borderRadius: 'card',
  bg: 'app.surface',
  boxShadow: 'card',
  transition: 'all 0.2s ease',
  _hover: { borderColor: 'app.borderHover', transform: 'translateY(-2px)' },
} as const;

export const PlatformStats: React.FC<PlatformStatsProps> = ({ initialData }) => {
  const { data, isLoading } = usePlatformStats(initialData);
  const stats = data || initialData;

  if (isLoading && !stats) return <PlatformStatsSkeleton />;

  return (
    <SimpleGrid columns={{ base: 2, md: 4 }} spacing={5} mb={8} width="100%">
      <Box {...cardProps}>
        <Stat>
          <MetricLabel help={METRIC_HELP.tvl}>Total Value Locked</MetricLabel>
          <Skeleton isLoaded={!isLoading || !!stats} startColor="app.border" endColor="app.surfaceHover">
            <StatNumber fontSize="2xl" fontWeight="extrabold" color="app.accent">
              {stats ? stats.tvl : '$0'}
            </StatNumber>
          </Skeleton>
        </Stat>
      </Box>

      <Box {...cardProps}>
        <Stat>
          <MetricLabel help={METRIC_HELP.activePools}>Active Pools</MetricLabel>
          <Skeleton isLoaded={!isLoading || !!stats} startColor="app.border" endColor="app.surfaceHover">
            <StatNumber fontSize="2xl" fontWeight="extrabold" color="app.accent2">
              {stats ? stats.activePools : 0}
            </StatNumber>
          </Skeleton>
        </Stat>
      </Box>

      <Box {...cardProps}>
        <Stat>
          <MetricLabel help={METRIC_HELP.totalFarmers}>Total Farmers</MetricLabel>
          <Skeleton isLoaded={!isLoading || !!stats} startColor="app.border" endColor="app.surfaceHover">
            <StatNumber fontSize="2xl" fontWeight="extrabold" color="app.accent">
              {stats ? stats.totalFarmers.toLocaleString() : 0}
            </StatNumber>
          </Skeleton>
        </Stat>
      </Box>

      <Box {...cardProps}>
        <Stat>
          <MetricLabel help={METRIC_HELP.creditVelocity}>24h Credit Velocity</MetricLabel>
          <Skeleton isLoaded={!isLoading || !!stats} startColor="app.border" endColor="app.surfaceHover">
            <StatNumber fontSize="2xl" fontWeight="extrabold" color="app.accent2">
              {stats ? `${formatCredits(stats.creditVelocity)} XLM` : '0 XLM'}
            </StatNumber>
          </Skeleton>
        </Stat>
      </Box>
    </SimpleGrid>
  );
};
