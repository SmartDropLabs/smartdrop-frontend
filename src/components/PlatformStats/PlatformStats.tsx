'use client';

import React from 'react';
import { SimpleGrid, Stat, StatLabel, StatNumber, Box, Skeleton } from '@chakra-ui/react';
import { usePlatformStats, UIPlatformStats } from '@/hooks/useSorobanQuery';
import { formatCredits } from '@/lib/soroban';

interface PlatformStatsProps {
  initialData?: UIPlatformStats;
}

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
          <StatLabel color="app.muted">Total Value Locked</StatLabel>
          <Skeleton isLoaded={!isLoading || !!stats} startColor="app.border" endColor="app.surfaceHover">
            <StatNumber fontSize="2xl" fontWeight="extrabold" color="app.accent">
              {stats ? stats.tvl : '$0'}
            </StatNumber>
          </Skeleton>
        </Stat>
      </Box>

      <Box {...cardProps}>
        <Stat>
          <StatLabel color="app.muted">Active Pools</StatLabel>
          <Skeleton isLoaded={!isLoading || !!stats} startColor="app.border" endColor="app.surfaceHover">
            <StatNumber fontSize="2xl" fontWeight="extrabold" color="app.accent2">
              {stats ? stats.activePools : 0}
            </StatNumber>
          </Skeleton>
        </Stat>
      </Box>

      <Box {...cardProps}>
        <Stat>
          <StatLabel color="app.muted">Total Farmers</StatLabel>
          <Skeleton isLoaded={!isLoading || !!stats} startColor="app.border" endColor="app.surfaceHover">
            <StatNumber fontSize="2xl" fontWeight="extrabold" color="app.accent">
              {stats ? stats.totalFarmers.toLocaleString() : 0}
            </StatNumber>
          </Skeleton>
        </Stat>
      </Box>

      <Box {...cardProps}>
        <Stat>
          <StatLabel color="app.muted">24h Credit Velocity</StatLabel>
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
