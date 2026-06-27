"use client";

import { memo, type ReactNode } from "react";
import { Box, Button, Flex, Text, Tooltip } from "@chakra-ui/react";
import { useCountdown } from "@/hooks/useCountdown";
import { useFarmStore } from "@/store/farmStore";
import { unlockAvailableAt, type FarmPosition } from "@/types/farm";

export function MetricColumn({
  label,
  value,
  minW = "110px",
}: {
  label: string;
  value: ReactNode;
  minW?: string;
}) {
  return (
    <Flex
      direction="column"
      minW={{ base: 0, md: minW }}
      w={{ base: "full", md: "auto" }}
      align={{ base: "stretch", md: "flex-start" }}
      gap={1}
    >
      <Text fontSize="2xs" color="app.muted" textTransform="uppercase">
        {label}
      </Text>
      <Text fontWeight={{ base: "semibold", md: "normal" }} overflowWrap="anywhere">
        {value}
      </Text>
    </Flex>
  );
}

type EarningRowProps = {
  position: FarmPosition;
};

function earningRowPropsAreEqual(previous: EarningRowProps, next: EarningRowProps) {
  const previousPosition = previous.position;
  const nextPosition = next.position;

  return (
    previousPosition.id === nextPosition.id &&
    previousPosition.name === nextPosition.name &&
    previousPosition.img === nextPosition.img &&
    previousPosition.earned === nextPosition.earned &&
    previousPosition.stake === nextPosition.stake &&
    previousPosition.dailyRate === nextPosition.dailyRate &&
    previousPosition.totalStakedLiquidity === nextPosition.totalStakedLiquidity &&
    previousPosition.symbol === nextPosition.symbol &&
    previousPosition.lockedAmount === nextPosition.lockedAmount &&
    previousPosition.lockedAt === nextPosition.lockedAt &&
    previousPosition.lockPeriodSeconds === nextPosition.lockPeriodSeconds
  );
}

export const EarningRow = memo(function EarningRow({ position }: EarningRowProps) {
  const openUnlock = useFarmStore((s) => s.openUnlock);
  const countdown = useCountdown(unlockAvailableAt(position));
  const hasStake = position.lockedAmount > 0;
  const canUnlock = hasStake && countdown.isElapsed;

  return (
    <Flex
      display={{ base: "flex", md: "flex" }}
      flexDirection={{ base: "column", md: "row" }}
      w={{ base: "full", md: "95%" }}
      h={{ base: "auto", md: 20 }}
      mx="auto"
      align={{ base: "stretch", md: "center" }}
      justify={{ base: "flex-start", md: "space-between" }}
      gap={{ base: 4, md: 0 }}
      borderTop="1px solid"
      borderBottom="1px solid"
      borderX={{ base: "1px solid", md: "0" }}
      borderColor="app.border"
      borderRadius={{ base: "2xl", md: "none" }}
      px={4}
      py={{ base: 4, md: 0 }}
    >
      <Text fontWeight={{ base: "bold", md: "normal" }} w={{ base: "full", md: "auto" }}>
        {position.name}
      </Text>
      <MetricColumn label="Earned" value={position.earned} />
      <MetricColumn label="My Stake" value={position.stake} />
      <MetricColumn label="Daily Rate" value={position.dailyRate} />
      <MetricColumn
        label="Total Staked Liquidity"
        value={position.totalStakedLiquidity}
        minW="180px"
      />
      {hasStake && !canUnlock && (
        <Box
          display={{ base: "block", md: "none" }}
          w="full"
          textAlign="center"
          border="1px solid"
          borderColor="app.border"
          borderRadius="2xl"
          bg="app.inputBg"
          px={3}
          py={3}
        >
          <Text fontSize="2xs" color="app.muted" textTransform="uppercase">
            Unlock countdown
          </Text>
          <Text fontSize="lg" fontWeight="bold">
            {countdown.label}
          </Text>
        </Box>
      )}
      <Flex
        gap={{ base: 3, md: 4 }}
        direction={{ base: "column", md: "row" }}
        w={{ base: "full", md: "auto" }}
      >
        <Button
          borderRadius="3xl"
          isDisabled
          opacity={0.6}
          cursor="not-allowed"
          _hover={{ opacity: 0.6 }}
          w={{ base: "full", md: "auto" }}
        >
          Boost
        </Button>
        <Tooltip
          label={
            !hasStake
              ? "No locked assets in this position"
              : `Locked for another ${countdown.label}`
          }
          isDisabled={canUnlock}
          hasArrow
          bg="app.tooltipBg"
          color="app.tooltipFg"
        >
          <Box w={{ base: "full", md: "auto" }}>
            <Button
              borderRadius="3xl"
              onClick={() => openUnlock(position)}
              isDisabled={!canUnlock}
              w={{ base: "full", md: "auto" }}
            >
              Unlock
            </Button>
          </Box>
        </Tooltip>
      </Flex>
    </Flex>
  );
}, earningRowPropsAreEqual);
