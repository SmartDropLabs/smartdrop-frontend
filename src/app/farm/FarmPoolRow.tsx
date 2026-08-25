"use client";

import NextLink from "next/link";
import { Box, Button, Flex, Text } from "@chakra-ui/react";
import { MetricColumn } from "./EarningRow";
import { memo } from "react";
import { useCountdown } from "@/hooks/useCountdown";
import { generatePoolSlug } from "@/lib/pool-slugs";

type LivePoolRow = {
  id: string;
  contractAddress: string;
  name: string;
  earned: string;
  stake: string;
  dailyRate: string;
  totalStakedLiquidity: string;
  symbol: string;
  lockedAmount: number;
  lockedAt: number;
  lockPeriodSeconds: number;
};

type FarmPoolRowProps = {
  farm: LivePoolRow;
  isConnected: boolean;
  isNetworkMismatch: boolean;
  onDeposit: (farm: LivePoolRow) => void;
};

function farmPoolRowPropsAreEqual(
  previous: FarmPoolRowProps,
  next: FarmPoolRowProps,
) {
  return (
    previous.farm.id === next.farm.id &&
    previous.farm.name === next.farm.name &&
    previous.farm.earned === next.farm.earned &&
    previous.farm.stake === next.farm.stake &&
    previous.farm.dailyRate === next.farm.dailyRate &&
    previous.farm.totalStakedLiquidity === next.farm.totalStakedLiquidity &&
    previous.farm.symbol === next.farm.symbol &&
    previous.farm.lockedAmount === next.farm.lockedAmount &&
    previous.farm.lockedAt === next.farm.lockedAt &&
    previous.farm.lockPeriodSeconds === next.farm.lockPeriodSeconds &&
    previous.isConnected === next.isConnected &&
    previous.isNetworkMismatch === next.isNetworkMismatch
  );
}

export const FarmPoolRow = memo(function FarmPoolRow({
  farm,
  isConnected,
  isNetworkMismatch,
  onDeposit,
}: FarmPoolRowProps) {
  // Issue #234: surface lock status here too, not just in "My Earnings" —
  // a user browsing the full pool list shouldn't have to click into a pool
  // they already have a position in just to see when it unlocks.
  const hasStake = farm.lockedAmount > 0;
  const countdown = useCountdown(farm.lockedAt + farm.lockPeriodSeconds * 1000);

  return (
    <Flex
      display={{ base: "flex", md: "flex" }}
      flexDirection={{ base: "column", md: "row" }}
      w="full"
      minH={20}
      align={{ base: "stretch", md: "center" }}
      justify={{ base: "flex-start", md: "space-between" }}
      gap={{ base: 4, md: 0 }}
      border="1px solid"
      borderColor="app.border"
      borderRadius="card"
      bg="app.surface"
      boxShadow="card"
      transition="all 0.2s ease"
      _hover={{ borderColor: "app.borderHover", boxShadow: "cardHover" }}
      px={5}
      py={{ base: 4, md: 0 }}
    >
      <NextLink href={`/farm/${generatePoolSlug({ asset: { code: farm.symbol }, id: farm.id } as any)}`} style={{ textDecoration: "none" }}>
        <Text
          fontWeight="bold"
          w={{ base: "full", md: "auto" }}
          _hover={{ color: "app.accent" }}
          cursor="pointer"
        >
          {farm.name}
        </Text>
      </NextLink>
      <MetricColumn label="Earned" value={farm.earned} />
      <MetricColumn label="My Stake" value={farm.stake} />
      <MetricColumn label="Daily Rate" value={farm.dailyRate} />
      <MetricColumn
        label="Total Staked Liquidity"
        value={farm.totalStakedLiquidity}
        minW="180px"
      />
      {hasStake && (
        <Box
          display="block"
          w={{ base: "full", md: "auto" }}
          minW={{ md: "150px" }}
          textAlign="center"
          border="1px solid"
          borderColor="app.border"
          borderRadius="2xl"
          bg="app.inputBg"
          px={3}
          py={3}
        >
          <Text fontSize="2xs" color="app.muted" textTransform="uppercase">
            Unlock status
          </Text>
          <Text fontSize="lg" fontWeight="bold">
            {countdown.label}
          </Text>
        </Box>
      )}
      {isConnected && (
        <Button
          borderRadius="3xl"
          bg="app.accent"
          color="app.onAccent"
          _hover={{ opacity: 0.9 }}
          onClick={() => onDeposit(farm)}
          isDisabled={isNetworkMismatch}
          w={{ base: "full", md: "auto" }}
        >
          + Deposit
        </Button>
      )}
    </Flex>
  );
}, farmPoolRowPropsAreEqual);

FarmPoolRow.displayName = "FarmPoolRow";
