"use client";
import { Flex, Text, Skeleton, Badge, Tooltip } from "@chakra-ui/react";
import { useStellarWallet } from "@/context/StellarWalletContext";
import { useStats } from "@/hooks/useStats";
import { Sparkline } from "@/components/Sparkline/Sparkline";

/** Format a number like 30738 → "30,738". */
function formatCount(n: number): string {
  return new Intl.NumberFormat().format(n);
}

/** Relative "last updated" label: "just now", "2 min ago", etc. */
function relativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const secs = Math.floor(diffMs / 1000);
  if (secs < 10) return "just now";
  if (secs < 60) return `${secs}s ago`;
  return `${Math.floor(secs / 60)}m ago`;
}

export default function Home() {
  const { isConnected } = useStellarWallet();
  const { data: stats, isLoading } = useStats();

  return isConnected ? (
    <Flex direction="column" px={16} py={8} align="center">
      <Flex direction="column" w="100%">
        <Text fontSize="6xl" fontWeight="bold" align="left">
          YOU
        </Text>
        <Text fontSize="6xl" fontWeight="bold">
          CURRENTLY
        </Text>
        <Flex justify="space-between" w="100%">
          <Text fontSize="6xl" fontWeight="bold">
            HAVE EARNED:
          </Text>
          <Text fontSize="6xl" fontWeight="bold">
            202 CREDITS
          </Text>
        </Flex>
      </Flex>

      <Flex direction="row" w="100%" py={8}>
        {/* Total Users */}
        <Flex
          w="33%"
          border="1px solid #454545"
          justify="center"
          direction="column"
        >
          <Flex direction="column" p={2}>
            <Text color="#D1D1D1">Total Users</Text>
            {isLoading ? (
              <Skeleton height="28px" w="80px" mt={1} startColor="#2a2a2a" endColor="#3a3a3a" />
            ) : (
              <Text color="#4AE292" fontWeight="bold" fontSize="xl">
                {stats ? formatCount(stats.totalUsers) : "—"}
              </Text>
            )}
          </Flex>
        </Flex>

        {/* TVL + sparkline */}
        <Flex
          w="33%"
          border="1px solid #454545"
          justify="center"
          direction="column"
        >
          <Flex direction="column" p={2}>
            <Flex align="center" gap={2}>
              <Text color="#D1D1D1">Total Value Locked</Text>
              {stats?.source === "demo" && (
                <Tooltip label="Live data available once pool contracts are deployed" hasArrow bg="#222" color="#fff">
                  <Badge
                    fontSize="2xs"
                    colorScheme="yellow"
                    variant="subtle"
                    cursor="help"
                  >
                    Demo
                  </Badge>
                </Tooltip>
              )}
            </Flex>
            {isLoading ? (
              <Skeleton height="28px" w="80px" mt={1} startColor="#2a2a2a" endColor="#3a3a3a" />
            ) : (
              <Flex align="center" justify="space-between">
                <Text color="#4AE292" fontWeight="bold" fontSize="xl">
                  {stats?.tvl ?? "—"}
                </Text>
                {stats && stats.sparkline.length >= 2 && (
                  <Sparkline data={stats.sparkline} width={100} height={28} />
                )}
              </Flex>
            )}
          </Flex>
        </Flex>

        {/* Last Updated */}
        <Flex
          w="33%"
          border="1px solid #454545"
          justify="center"
          direction="column"
        >
          <Flex direction="column" p={2}>
            <Text color="#D1D1D1">Last Updated</Text>
            {isLoading ? (
              <Skeleton height="28px" w="72px" mt={1} startColor="#2a2a2a" endColor="#3a3a3a" />
            ) : (
              <Text color="#4AE292" fontWeight="bold" fontSize="xl">
                {stats ? relativeTime(stats.lastUpdated) : "—"}
              </Text>
            )}
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  ) : (
    <></>
  );
}
