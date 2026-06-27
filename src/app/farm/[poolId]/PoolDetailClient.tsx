"use client";

import { useEffect, useState } from "react";
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
} from "@chakra-ui/react";
import { sorobanService } from "@/lib/soroban";
import type { PoolInfo } from "@/lib/soroban";
import TvlChart from "@/components/TvlChart/TvlChart";
import { useLockFlow } from "@/hooks/useLockFlow";
import { useStellarWallet } from "@/context/StellarWalletContext";
import ConnectWalletButton from "@/components/ConnectWalletButton/ConnectWalletButton";
import { isDepositPending, DEPOSIT_STEP_LABEL } from "@/types/farm";
import { Input } from "@chakra-ui/react";

const ACCENT = "#4ae292";

interface Depositor {
  address: string;
  amount: string;
  credits: string;
}

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
      border="1px solid"
      borderColor="app.border"
      borderRadius="2xl"
      minW="140px"
      flex="1"
    >
      <Text fontSize="2xs" color="app.muted" textTransform="uppercase">
        {label}
      </Text>
      {loading ? (
        <Skeleton height="24px" w="80%" borderRadius="md" />
      ) : (
        <Text fontWeight="semibold" fontSize="lg">
          {value}
        </Text>
      )}
    </Flex>
  );
}

export default function PoolDetailClient({ poolId }: { poolId: string }) {
  const [pool, setPool] = useState<PoolInfo | null>(null);
  const [depositors, setDepositors] = useState<Depositor[]>([]);
  const [poolLoading, setPoolLoading] = useState(true);
  const [depositorsLoading, setDepositorsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawAmount, setRawAmount] = useState("0");

  const { isOpen, onOpen, onClose } = useDisclosure();
  const { publicKey, walletApi, isConnected } = useStellarWallet();

  const flow = useLockFlow({
    poolId,
    symbol: pool?.asset.code ?? "",
    publicKey: publicKey ?? "",
    walletApi,
  });

  useEffect(() => {
    let cancelled = false;
    setPoolLoading(true);
    sorobanService
      .getFactoryPools()
      .then((pools) => {
        if (cancelled) return;
        const found = pools.find((p) => p.id === poolId) ?? null;
        setPool(found);
        if (!found) setError("Pool not found.");
        setPoolLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to load pool data.");
          setPoolLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [poolId]);

  useEffect(() => {
    let cancelled = false;
    setDepositorsLoading(true);
    sorobanService
      .getPoolDepositors(poolId, 20)
      .then((list) => {
        if (!cancelled) {
          setDepositors(list);
          setDepositorsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setDepositorsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [poolId]);

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
            <BreadcrumbLink as={NextLink} href="/farm" color="app.muted" _hover={{ color: ACCENT }}>
              Farm
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>
            <BreadcrumbLink color={ACCENT}>
              {poolLoading ? poolId.slice(0, 8) + "…" : (pool?.asset.code ?? poolId.slice(0, 8) + "…")}
            </BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
      </Box>

      {/* Header */}
      <Flex w="full" justify="space-between" align="center" flexWrap="wrap" gap={4}>
        {poolLoading ? (
          <Skeleton height="40px" w="200px" borderRadius="xl" />
        ) : (
          <Text fontSize="3xl" fontWeight="bold" textTransform="uppercase">
            {pool?.asset.code ?? "Pool"} Pool
          </Text>
        )}
        <Button
          borderRadius="3xl"
          bg={ACCENT}
          color="#000"
          _hover={{ opacity: 0.9 }}
          onClick={onOpen}
          size="lg"
          isDisabled={poolLoading}
        >
          Deposit
        </Button>
      </Flex>

      {/* Stats */}
      <Flex w="full" gap={3} flexWrap="wrap">
        <StatCard
          label="Daily Rate"
          value={pool?.dailyRate ?? "—"}
          loading={poolLoading}
        />
        <StatCard
          label="Min Lock Period"
          value={
            pool
              ? pool.minLockPeriod >= 86400
                ? `${Math.floor(pool.minLockPeriod / 86400)}d`
                : `${Math.floor(pool.minLockPeriod / 3600)}h`
              : "—"
          }
          loading={poolLoading}
        />
        <StatCard
          label="Total Users"
          value={pool ? String(pool.totalUsers) : "—"}
          loading={poolLoading}
        />
        <StatCard
          label="Total Locked"
          value={pool ? `$${Number(pool.totalLocked).toLocaleString()}` : "—"}
          loading={poolLoading}
        />
      </Flex>

      {/* TVL Chart */}
      <Box
        w="full"
        p={5}
        border="1px solid"
        borderColor="app.border"
        borderRadius="2xl"
      >
        <Text fontSize="sm" fontWeight="semibold" mb={4} color="app.muted" textTransform="uppercase">
          7-Day TVL
        </Text>
        <TvlChart poolId={poolId} />
      </Box>

      {/* Top Depositors */}
      <Box w="full" p={5} border="1px solid" borderColor="app.border" borderRadius="2xl">
        <Text fontSize="sm" fontWeight="semibold" mb={4} color="app.muted" textTransform="uppercase">
          Top 20 Depositors
        </Text>
        {depositorsLoading ? (
          <Flex direction="column" gap={2}>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonText key={i} noOfLines={1} skeletonHeight="32px" borderRadius="md" />
            ))}
          </Flex>
        ) : depositors.length === 0 ? (
          <Text color="app.muted" fontSize="sm">
            No depositors yet.
          </Text>
        ) : (
          <Box overflowX="auto">
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th color="app.muted" borderColor="app.border">#</Th>
                  <Th color="app.muted" borderColor="app.border">Address</Th>
                  <Th color="app.muted" borderColor="app.border" isNumeric>Amount</Th>
                  <Th color="app.muted" borderColor="app.border" isNumeric>Credits</Th>
                </Tr>
              </Thead>
              <Tbody>
                {depositors.map((d, i) => (
                  <Tr key={d.address} _hover={{ bg: "app.inputBg" }}>
                    <Td borderColor="app.border" color="app.muted">{i + 1}</Td>
                    <Td borderColor="app.border" fontFamily="mono" fontSize="xs">
                      {d.address.slice(0, 6)}…{d.address.slice(-4)}
                    </Td>
                    <Td borderColor="app.border" isNumeric>{d.amount}</Td>
                    <Td borderColor="app.border" isNumeric color={ACCENT}>{d.credits}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </Box>

      {/* Deposit Modal */}
      <Modal isOpen={isOpen} onClose={handleModalClose}>
        <ModalOverlay backdropFilter="blur(3px)" />
        <ModalContent bgColor="#171717" color="#fff" borderRadius="3xl">
          <ModalHeader mx="auto">{pool?.asset.code ?? "Pool"}</ModalHeader>
          <ModalCloseButton isDisabled={isPending} />
          <ModalBody p={8}>
            <Flex direction="column" gap={6}>
              <Text color="#A2A2A2" fontSize="sm">
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
                  borderColor="#454545"
                  _placeholder={{ color: "#A2A2A2" }}
                  _hover={{ borderColor: ACCENT }}
                  _focus={{ boxShadow: "none", borderColor: ACCENT }}
                />
                {rawAmount !== "0" && rawAmount !== "" && !amountValid && (
                  <Text fontSize="xs" color="#ff8080">
                    Enter an amount greater than 0.
                  </Text>
                )}
              </Flex>

              {isPending && (
                <Flex align="center" gap={3} bg="#1e1e1e" borderRadius="2xl" p={4} border="1px solid #333">
                  <Spinner size="sm" color={ACCENT} />
                  <Text fontSize="sm" color="#A2A2A2">
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
                bg={ACCENT}
                color="#000"
                _hover={{ opacity: isPending ? 1 : 0.9 }}
                isDisabled={!amountValid || !isConnected || isPending}
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
                <Button variant="ghost" size="sm" color="#A2A2A2" onClick={flow.reset}>
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
