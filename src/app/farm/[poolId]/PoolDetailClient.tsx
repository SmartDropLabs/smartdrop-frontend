"use client";

import { useEffect, useMemo, useState } from "react";
import NextLink from "next/link";
import {
  Alert,
  AlertIcon,
  Box,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Button,
  Flex,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Skeleton,
  SkeletonText,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
  Input,
  Badge,
  Heading,
} from "@chakra-ui/react";
import { formatCredits } from "@/lib/soroban";
import type { PoolInfo } from "@/lib/soroban";
import TvlChart from "@/components/TvlChart/TvlChart";
import { useLockFlow } from "@/hooks/useLockFlow";
import { usePools, usePoolDepositors, useStellarBalance } from "@/hooks/useSorobanQuery";
import { useStellarWallet } from "@/context/StellarWalletContext";
import ConnectWalletButton from "@/components/ConnectWalletButton/ConnectWalletButton";
import { useOwnConnectButton } from "@/context/OwnConnectButtonContext";
import { isDepositPending, DEPOSIT_STEP_LABEL } from "@/types/farm";

type Depositor = {
  address: string;
  amount: number;
  credits: number;
};

function StatCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: string;
  loading: boolean;
}) {
  return (
    <Flex
      direction="column"
      gap={1}
      p={4}
      borderRadius="2xl"
      bg="app.surface"
      border="1px solid"
      borderColor="app.border"
      minW="120px"
      flex={1}
    >
      <Text fontSize="xs" color="app.muted" fontWeight="medium">
        {label}
      </Text>
      {loading ? (
        <Skeleton h="28px" w="70px" borderRadius="md" />
      ) : (
        <Text fontWeight="bold" fontSize="lg" color="app.text">
          {value}
        </Text>
      )}
    </Flex>
  );
}

export default function PoolDetailClient({ poolId }: { poolId: string }) {
  const [rawAmount, setRawAmount] = useState("0");

  const { isOpen, onOpen, onClose } = useDisclosure();
  const { publicKey, walletApi, isConnected, isNetworkMismatch } =
    useStellarWallet();

  const {
    data: pools,
    isLoading: poolLoading,
    isError: poolsError,
  } = usePools();

  const pool = useMemo(
    () =>
      pools?.find((p) => p.id === poolId || p.contractAddress === poolId) ??
      null,
    [pools, poolId],
  );

  const { data: depositors = [], isLoading: depositorsLoading } =
    usePoolDepositors(poolId, 20);

  const error = poolsError
    ? "Failed to load pool data."
    : !poolLoading && pools && !pool
      ? "Pool not found."
      : null;

  // Signal to AppShell that a Connect Wallet button is visible inside the
  // deposit modal — but ONLY while the modal is open and the wallet is
  // disconnected. When the modal is closed (or the wallet connects), the
  // floating global CTA should reappear (Issue #69).
  const signalOwnCTA = useOwnConnectButton();
  useEffect(() => {
    signalOwnCTA(isOpen && !isConnected);
    return () => signalOwnCTA(false);
  }, [isOpen, isConnected, signalOwnCTA]);

  const balanceQuery = useStellarBalance(publicKey ?? undefined);
  const availableBalance = balanceQuery.data;

  const isFeeSponsored =
    isConnected &&
    typeof availableBalance === "number" &&
    availableBalance < 1.0 &&
    !!process.env.NEXT_PUBLIC_FEE_SPONSOR_PUBLIC_KEY;

  const flow = useLockFlow({
    poolId,
    symbol: pool?.asset.code ?? "",
    publicKey: publicKey ?? "",
    walletApi,
  });

  const handleModalClose = () => {
    if (isDepositPending(flow.step)) return;
    flow.reset();
    setRawAmount("0");
    onClose();
  };

  const displayAmount = parseFloat(rawAmount);
  const amountValid = Number.isFinite(displayAmount) && displayAmount > 0;
  const isPending = isDepositPending(flow.step);

  if (error) {
    return (
      <Flex direction="column" align="center" gap={6} px={{ base: 4, md: 8 }} py={6}>
        <Alert status="error" borderRadius="2xl" maxW="600px" w="full">
          <AlertIcon />
          {error}
        </Alert>
        <Button as={NextLink} href="/farm" borderRadius="3xl">
          ← Back to Farm
        </Button>
      </Flex>
    );
  }

  return (
    <Flex
      direction="column"
      align="center"
      gap={6}
      px={{ base: 4, md: 8 }}
      py={6}
      maxW="1200px"
      mx="auto"
      w="full"
    >
      {/* Breadcrumb */}
      <Box w="full">
        <Breadcrumb fontSize="sm" color="app.muted">
          <BreadcrumbItem>
            <BreadcrumbLink as={NextLink} href="/farm" color="app.muted" _hover={{ color: "app.accent" }}>
              Farm
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>
            <BreadcrumbLink color="app.accent">
              {poolLoading ? poolId.slice(0, 8) + "…" : (pool?.asset.code ?? poolId.slice(0, 8) + "…")}
            </BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
      </Box>

      {/* Main Container */}
      <Flex direction="column" gap={8} w="full">
        {/* Pool Header */}
        <Flex
          direction={{ base: "column", md: "row" }}
          justify="space-between"
          align={{ base: "flex-start", md: "center" }}
          gap={4}
          p={6}
          borderRadius="2xl"
          bg="app.surface"
          border="1px solid"
          borderColor="app.border"
        >
          <Flex align="center" gap={4}>
            <Flex
              w="56px"
              h="56px"
              borderRadius="full"
              bg="rgba(74, 226, 146, 0.15)"
              align="center"
              justify="center"
              fontSize="2xl"
              flexShrink={0}
            >
              🌱
            </Flex>
            <Box>
              <Flex align="center" gap={2}>
                <Heading size="md" color="app.text">
                  {poolLoading ? (
                    <Skeleton h="28px" w="140px" borderRadius="md" />
                  ) : (
                    `${pool?.asset.code ?? "—"} Pool`
                  )}
                </Heading>
                {pool?.isActive && (
                  <Badge
                    bg="rgba(74, 226, 146, 0.15)"
                    color="app.accent"
                    borderRadius="full"
                    px={2.5}
                    py={0.5}
                    fontSize="xs"
                    fontWeight="semibold"
                  >
                    Active
                  </Badge>
                )}
              </Flex>
              <Text fontSize="xs" color="app.muted" mt={0.5} fontFamily="mono">
                {poolLoading ? (
                  <Skeleton h="16px" w="200px" borderRadius="md" mt={1} />
                ) : (
                  poolId
                )}
              </Text>
            </Box>
          </Flex>

          <Button
            bg="app.accent"
            color="app.onAccent"
            borderRadius="2xl"
            px={6}
            h="44px"
            fontWeight="semibold"
            _hover={{ opacity: 0.9 }}
            onClick={onOpen}
            isDisabled={poolLoading || !pool?.isActive}
          >
            Deposit
          </Button>
        </Flex>

        {/* Stats Row */}
        <Flex gap={4} wrap="wrap">
          <StatCard
            label="Reward Rate"
            value={poolLoading ? "—" : `${(pool?.dailyRate ?? 0).toFixed(4)} / day`}
            loading={poolLoading}
          />
          <StatCard
            label="Total Locked"
            value={poolLoading ? "—" : `${(pool?.totalLocked ?? 0).toLocaleString()} ${pool?.asset.code ?? ""}`}
            loading={poolLoading}
          />
          <StatCard
            label="Min Lock Period"
            value={poolLoading ? "—" : `${pool?.minLockPeriod ?? 0} days`}
            loading={poolLoading}
          />
          <StatCard
            label="Total Users"
            value={poolLoading ? "—" : String(pool?.totalUsers ?? 0)}
            loading={poolLoading}
          />
        </Flex>

        {/* TVL Chart */}
        <Box
          p={6}
          borderRadius="2xl"
          bg="app.surface"
          border="1px solid"
          borderColor="app.border"
        >
          <Heading size="sm" color="app.text" mb={4}>
            TVL History
          </Heading>
          <TvlChart poolId={poolId} />
        </Box>

        {/* Depositors Table */}
        <Box
          p={6}
          borderRadius="2xl"
          bg="app.surface"
          border="1px solid"
          borderColor="app.border"
        >
          <Heading size="sm" color="app.text" mb={4}>
            Recent Depositors
          </Heading>
          {depositorsLoading ? (
            <SkeletonText noOfLines={4} spacing={3} />
          ) : depositors.length === 0 ? (
            <Text fontSize="sm" color="app.muted">
              No depositors yet. Be the first to deposit!
            </Text>
          ) : (
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th borderColor="app.border" color="app.muted">Address</Th>
                  <Th borderColor="app.border" isNumeric color="app.muted">Staked</Th>
                  <Th borderColor="app.border" isNumeric color="app.muted">Credits</Th>
                </Tr>
              </Thead>
              <Tbody>
                {depositors.map((d) => (
                  <Tr key={d.address}>
                    <Td borderColor="app.border" color="app.text" fontFamily="mono">
                      {d.address.slice(0, 8)}…{d.address.slice(-6)}
                    </Td>
                    <Td borderColor="app.border" isNumeric color="app.text">{d.amount} {pool?.asset.code}</Td>
                    <Td borderColor="app.border" isNumeric color="app.accent">{formatCredits(String(d.credits))}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Box>
      </Flex>

      {/* Deposit Modal */}
      <Modal isOpen={isOpen} onClose={handleModalClose}>
        <ModalOverlay backdropFilter="blur(3px)" />
        <ModalContent bg="app.surface" color="app.text" borderRadius="3xl">
          <ModalHeader mx="auto">{pool?.asset.code ?? "Pool"}</ModalHeader>
          <ModalCloseButton isDisabled={isPending} />
          <ModalBody p={8}>
            <Flex direction="column" gap={6}>
              <Text color="app.muted" fontSize="sm">
                Lock {pool?.asset.code} to earn credits from this pool.
              </Text>

              <Flex direction="column" gap={2}>
                <Text fontSize="sm">Amount ({pool?.asset.code})</Text>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  placeholder="0"
                  value={rawAmount}
                  onChange={(e) => setRawAmount(e.target.value)}
                  isDisabled={isPending}
                  borderRadius="2xl"
                  h="50px"
                  borderColor="app.border"
                  bg="app.inputBg"
                  _placeholder={{ color: "app.muted" }}
                  _hover={{ borderColor: "app.accent" }}
                  _focus={{ boxShadow: "none", borderColor: "app.accent" }}
                />
                {rawAmount !== "0" && rawAmount !== "" && !amountValid && (
                  <Text fontSize="xs" color="#ff8080">
                    Enter an amount greater than 0.
                  </Text>
                )}
              </Flex>

              {isPending && (
                <Flex align="center" gap={3} bg="app.inputBg" borderRadius="2xl" p={4} border="1px solid" borderColor="app.border">
                  <Spinner size="sm" color="app.accent" />
                  <Text fontSize="sm" color="app.muted">
                    {DEPOSIT_STEP_LABEL[flow.step]}
                  </Text>
                </Flex>
              )}

              {flow.step === "error" && flow.error && (
                <Alert status="error" borderRadius="2xl" bg="#2a1414" color="#ff8080" fontSize="sm">
                  <AlertIcon color="#ff8080" />
                  {flow.error}
                </Alert>
              )}

              {isFeeSponsored && (
                <Alert status="warning" borderRadius="2xl" bg="#2d2216" color="#ffb86c" fontSize="sm" border="1px solid #7c5c24">
                  <AlertIcon color="#ffb86c" />
                  Your fees are sponsored for this transaction
                </Alert>
              )}

              {!isConnected && (
                <ConnectWalletButton
                  label="Connect Wallet to Deposit"
                  position="static"
                  bottom="auto"
                  right="auto"
                  left="auto"
                  w="full"
                />
              )}

              <Button
                borderRadius="2xl"
                bg="app.accent"
                color="app.onAccent"
                _hover={{ opacity: isPending ? 1 : 0.9 }}
                isDisabled={
                  !amountValid || !isConnected || isPending || isNetworkMismatch
                }
                onClick={() => void flow.execute(displayAmount)}
                w="full"
              >
                {isPending ? (
                  <Flex align="center" gap={2}>
                    <Spinner size="xs" />
                    <Text>
                      {flow.step === "signing" ? "Waiting for signature…" : "Processing…"}
                    </Text>
                  </Flex>
                ) : (
                  `Lock ${amountValid ? displayAmount : ""} ${pool?.asset.code ?? ""}`
                )}
              </Button>

              {flow.step === "error" && (
                <Button variant="ghost" size="sm" color="app.muted" onClick={flow.reset}>
                  Try again
                </Button>
              )}
            </Flex>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Flex>
  );
}
