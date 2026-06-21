"use client";
import { useEffect } from "react";
import {
  Flex,
  Text,
  Spinner,
  Box,
  useToast,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import { useStellarWallet } from "@/context/StellarWalletContext";
import {
  usePlatformStats,
  useTotalUserCredits,
} from "@/hooks/useSorobanQuery";
import { sorobanRpcUrl, stellarNetwork } from "@/config";

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <Box
      w={["100%", "48%", "23%"]}
      border="1px solid #454545"
      borderRadius="2xl"
      p={6}
      bgColor="#111"
    >
      <Text color="#A2A2A2" fontSize="sm" mb={2}>
        {label}
      </Text>
      <Text fontSize="3xl" fontWeight="bold" color="#4AE292">
        {value}
      </Text>
    </Box>
  );
}

export default function Home() {
  const toast = useToast();
  const { publicKey, isConnected } = useStellarWallet();
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    error: statsErrorObj,
  } = usePlatformStats();

  const {
    data: totalCredits,
    isLoading: creditsLoading,
    isError: creditsError,
    error: creditsErrorObj,
  } = useTotalUserCredits();

  useEffect(() => {
    if (statsError && statsErrorObj) {
      toast({
        title: "Unable to load platform data",
        description:
          statsErrorObj instanceof Error
            ? statsErrorObj.message
            : "Failed to fetch dashboard data",
        status: "error",
        duration: 8000,
        isClosable: true,
      });
    }
  }, [statsError, statsErrorObj, toast]);

  useEffect(() => {
    if (creditsError && creditsErrorObj) {
      toast({
        title: "Unable to load credits",
        description:
          creditsErrorObj instanceof Error
            ? creditsErrorObj.message
            : "Failed to fetch user credits",
        status: "error",
        duration: 8000,
        isClosable: true,
      });
    }
  }, [creditsError, creditsErrorObj, toast]);

  const formatNumber = (value: number | undefined | null, fallback = "Not tracked") =>
    value || value === 0 ? value.toLocaleString() : fallback;

  return (
    <Flex direction="column" px={16} py={8} align="center" gap={8}>
      <Box w="100%" maxW="1200px">
        <Text fontSize="5xl" fontWeight="bold" mb={4}>
          SmartDrop Dashboard
        </Text>
        <Text color="#A2A2A2" mb={4}>
          Live Soroban RPC data with contract-driven TVL, pool counts, and user
          metrics.
        </Text>
        <Text fontSize="sm" color="#777" mb={2}>
          Network: {stellarNetwork} · RPC: {sorobanRpcUrl.replace(/^https?:\/\//, "")}
          {publicKey ? ` · Wallet ${publicKey.slice(0, 6)}…` : ""}
        </Text>
      </Box>

      <Flex direction="row" w="100%" maxW="1200px" flexWrap="wrap" gap={4}>
        {statsLoading ? (
          <Flex w="100%" justify="center" py={16}>
            <Spinner size="xl" color="#4AE292" />
          </Flex>
        ) : (
          <>
            <StatCard
              label="Total Value Locked"
              value={stats?.totalValueLocked ?? "Not available"}
            />
            <StatCard
              label="Active Pools"
              value={stats?.totalPools ?? "No pools found"}
            />
            <StatCard
              label="Total Users"
              value={formatNumber(stats?.totalUsers)}
            />
            <StatCard
              label="Users Online"
              value={formatNumber(stats?.onlineUsers)}
            />
          </>
        )}
      </Flex>

      <Box w="100%" maxW="1200px" border="1px solid #454545" borderRadius="2xl" p={8} bgColor="#111">
        <Text fontSize="3xl" fontWeight="bold" mb={3}>
          Your credits
        </Text>
        <Text color="#A2A2A2" mb={4}>
          Credits are calculated from your on-chain positions across all pools.
        </Text>

        {isConnected ? (
          creditsLoading ? (
            <Spinner size="lg" color="#4AE292" />
          ) : (
            <Text fontSize="4xl" fontWeight="bold" color="#4AE292">
              {totalCredits ?? "0"} Credits
            </Text>
          )
        ) : (
          <Alert status="info" borderRadius="xl">
            <AlertIcon /> Connect your Freighter wallet to fetch your user credits and positions.
          </Alert>
        )}
      </Box>
    </Flex>
  );
}
