'use client';

import React from 'react';
import { SimpleGrid, Stat, StatLabel, StatNumber, Box, Skeleton } from '@chakra-ui/react';
import { usePlatformStats, UIPlatformStats } from '@/hooks/useSorobanQuery';

const formatCredits = (value: string): string => {
  const num = parseFloat(value) || 0;
  return `${(num / 1_000_000).toFixed(1)}M XLM`;
};

interface PlatformStatsProps {
  initialData?: UIPlatformStats;
}

export const PlatformStats: React.FC<PlatformStatsProps> = ({ initialData }) => {
  const { data, isLoading } = usePlatformStats(initialData);
  const stats = data || initialData;

  return (
    <SimpleGrid columns={{ base: 2, md: 4 }} spacing={5} mb={8} width="100%">
      <Box p={5} shadow="sm" borderWidth="1px" borderRadius="lg" bg="white">
        <Stat>
          <StatLabel color="gray.500">Total Value Locked</StatLabel>
          <Skeleton isLoaded={!isLoading || !!stats}>
            <StatNumber fontSize="2xl" fontWeight="bold">
              {stats ? formatCredits(stats.tvl) : '0.0M XLM'}
            </StatNumber>
          </Skeleton>
        </Stat>
      </Box>

      <Box p={5} shadow="sm" borderWidth="1px" borderRadius="lg" bg="white">
        <Stat>
          <StatLabel color="gray.500">Active Pools</StatLabel>
          <Skeleton isLoaded={!isLoading || !!stats}>
            <StatNumber fontSize="2xl" fontWeight="bold">
              {stats ? stats.activePools : 0}
            </StatNumber>
          </Skeleton>
        </Stat>
      </Box>

      <Box p={5} shadow="sm" borderWidth="1px" borderRadius="lg" bg="white">
        <Stat>
          <StatLabel color="gray.500">Total Farmers</StatLabel>
          <Skeleton isLoaded={!isLoading || !!stats}>
            <StatNumber fontSize="2xl" fontWeight="bold">
              {stats ? stats.totalFarmers.toLocaleString() : 0}
            </StatNumber>
          </Skeleton>
        </Stat>
      </Box>

      <Box p={5} shadow="sm" borderWidth="1px" borderRadius="lg" bg="white">
        <Stat>
          <StatLabel color="gray.500">24h Credit Velocity</StatLabel>
          <Skeleton isLoaded={!isLoading || !!stats}>
            <StatNumber fontSize="2xl" fontWeight="bold">
              {stats ? formatCredits(stats.creditVelocity) : '0.0M XLM'}
            </StatNumber>
          </Skeleton>
        </Stat>
      </Box>
    </SimpleGrid>
  );
};
