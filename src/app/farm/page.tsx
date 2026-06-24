"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  Input,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Text,
  Tooltip,
  useToast,
} from "@chakra-ui/react";
import { useStellarWallet } from "@/context/StellarWalletContext";
import {
  factoryContractId,
  minLockPeriodSeconds,
  sorobanRpcUrl,
  stellarNetwork,
} from "@/config";
import UnlockModal from "@/components/UnlockModal/UnlockModal";
import { useCountdown } from "@/hooks/useCountdown";
import { unlockAvailableAt, DEPOSIT_STEP_LABEL, isDepositPending, type FarmPosition } from "@/types/farm";
import { useAllUserPositions, usePools } from "@/hooks/useSorobanQuery";
import { useLockFlow } from "@/hooks/useLockFlow";
import { stellarExpertTxUrl } from "@/lib/soroban";
import type { UserPosition } from "@/lib/soroban";

const ACCENT = "#4AE292";

type LivePoolRow = {
  id: string;
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

function EarningRow({
  position,
  onUnlock,
}: {
  position: FarmPosition;
  onUnlock: (position: FarmPosition) => void;
}) {
  const countdown = useCountdown(unlockAvailableAt(position));
  const hasStake = position.lockedAmount > 0;
  const canUnlock = hasStake && countdown.isElapsed;

  return (
    <Flex
      w="95%"
      h={20}
      mx="auto"
      align="center"
      justify="space-between"
      borderTop="1px solid #454545"
      borderBottom="1px solid #454545"
      px={4}
    >
      <Text>{position.name}</Text>
      <Flex direction="column" minW="110px" align="flex-start">
        <Text fontSize="2xs">Earned</Text>
        <Text>{position.earned}</Text>
      </Flex>
      <Flex direction="column" minW="110px" align="flex-start">
        <Text fontSize="2xs">My Stake</Text>
        <Text>{position.stake}</Text>
      </Flex>
      <Flex direction="column" minW="110px" align="flex-start">
        <Text fontSize="2xs">Daily Rate</Text>
        <Text>{position.dailyRate}</Text>
      </Flex>
      <Flex direction="column" minW="180px" align="flex-start">
        <Text fontSize="2xs">Total Staked Liquidity</Text>
        <Text>{position.totalStakedLiquidity}</Text>
      </Flex>
      <Flex gap={4}>
        <Button
          borderRadius="3xl"
          disabled
          opacity={0.6}
          cursor="not-allowed"
          _hover={{ opacity: 0.6 }}
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
          bg="#222"
          color="#fff"
        >
          <Box>
            <Button
              borderRadius="3xl"
              onClick={() => onUnlock(position)}
              isDisabled={!canUnlock}
            >
              Unlock
            </Button>
          </Box>
        </Tooltip>
      </Flex>
    </Flex>
  );
}

/** Deposit modal — delegates all transaction logic to useLockFlow. */
function DepositModal({
  farm,
  isOpen,
  onClose,
}: {
  farm: LivePoolRow | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { publicKey, walletApi, isConnected } = useStellarWallet();
  const [rawAmount, setRawAmount] = useState("0");

  const flow = useLockFlow({
    poolId: farm?.id ?? "",
    symbol: farm?.symbol ?? "",
    publicKey: publicKey ?? "",
    walletApi,
  });

  // Reset amount and flow state whenever the modal opens for a new pool.
  useEffect(() => {
    if (isOpen) {
      setRawAmount("0");
      flow.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, farm?.id]);

  const displayAmount = parseFloat(rawAmount);
  const amountValid = Number.isFinite(displayAmount) && displayAmount > 0;
  const isPending = isDepositPending(flow.step);

  const handleClose = () => {
    if (isPending) return;
    onClose();
  };

  const explorerUrl = flow.record?.txHash
    ? stellarExpertTxUrl(flow.record.txHash, stellarNetwork.toLowerCase())
    : null;

  if (!farm) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <ModalOverlay backdropFilter="blur(3px)" />
      <ModalContent bgColor="#171717" color="#fff" borderRadius="3xl">
        <ModalHeader mx="auto">{farm.name}</ModalHeader>
        <ModalCloseButton isDisabled={isPending} />
        <ModalBody p={8}>

          {/* ── Success screen ──────────────────────────────────────────── */}
          {flow.step === "success" && flow.record ? (
            <Flex direction="column" gap={4} align="center" textAlign="center">
              <Badge colorScheme="green" borderRadius="full" px={3} py={1} fontSize="sm">
                Deposit confirmed
              </Badge>
              <Text fontSize="sm" color="#A2A2A2">
                {flow.record.displayAmount} {farm.symbol} locked. Your stake updates below.
              </Text>
              <Box w="100%" border="1px solid #454545" borderRadius="2xl" p={3}>
                <Flex justify="space-between" fontSize="sm" py={1}>
                  <Text color="#A2A2A2">Amount deposited</Text>
                  <Text>{flow.record.displayAmount} {farm.symbol}</Text>
                </Flex>
                {flow.record.txHash && (
                  <Flex justify="space-between" fontSize="sm" py={1}>
                    <Text color="#A2A2A2">Tx hash</Text>
                    <Text fontFamily="mono" fontSize="xs">
                      {flow.record.txHash.slice(0, 12)}…
                    </Text>
                  </Flex>
                )}
                {explorerUrl && (
                  <Flex justify="space-between" fontSize="sm" py={1}>
                    <Text color="#A2A2A2">Explorer</Text>
                    <Link href={explorerUrl} isExternal color={ACCENT} fontSize="sm">
                      Stellar Expert ↗
                    </Link>
                  </Flex>
                )}
              </Box>
              <Button
                borderRadius="2xl"
                w="100%"
                bg={ACCENT}
                color="#000"
                _hover={{ opacity: 0.9 }}
                onClick={handleClose}
              >
                Done
              </Button>
            </Flex>

          ) : (
            /* ── Input / in-progress / error screen ──────────────────── */
            <Flex direction="column" gap={6}>
              <Text color="#A2A2A2" fontSize="sm">
                Lock {farm.symbol} to earn credits from this pool. Assets are time-locked for the pool's minimum period.
              </Text>

              {/* Amount input */}
              <Flex direction="column" gap={2}>
                <Text fontSize="sm">Amount ({farm.symbol})</Text>
                <Box position="relative">
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    placeholder="0"
                    value={rawAmount}
                    onChange={(e) => {
                      setRawAmount(e.target.value);
                    }}
                    isDisabled={isPending}
                    borderRadius="2xl"
                    h="50px"
                    borderColor="#454545"
                    _placeholder={{ color: "#A2A2A2" }}
                    _hover={{ borderColor: ACCENT }}
                    _focus={{ boxShadow: "none", borderColor: ACCENT }}
                    pr="64px"
                  />
                  <Text
                    position="absolute"
                    top="50%"
                    right="14px"
                    transform="translateY(-50%)"
                    fontSize="xs"
                    color="#A2A2A2"
                    pointerEvents="none"
                  >
                    {farm.symbol}
                  </Text>
                </Box>
                {rawAmount !== "0" && rawAmount !== "" && !amountValid && (
                  <Text fontSize="xs" color="#ff8080">
                    Enter an amount greater than 0.
                  </Text>
                )}
              </Flex>

              {/* Step indicator while pending */}
              {isPending && (
                <Flex
                  align="center"
                  gap={3}
                  bg="#1e1e1e"
                  borderRadius="2xl"
                  p={4}
                  border="1px solid #333"
                >
                  <Spinner size="sm" color={ACCENT} />
                  <Text fontSize="sm" color="#A2A2A2">
                    {DEPOSIT_STEP_LABEL[flow.step]}
                  </Text>
                </Flex>
              )}

              {/* Error banner */}
              {flow.step === "error" && flow.error && (
                <Alert status="error" borderRadius="2xl" bg="#2a1414" color="#ff8080" fontSize="sm">
                  <AlertIcon color="#ff8080" />
                  {flow.error}
                </Alert>
              )}

              {/* Wallet not connected */}
              {!isConnected && (
                <Alert status="warning" borderRadius="2xl" bg="#2a2412" color="#f6c453" fontSize="sm">
                  <AlertIcon color="#f6c453" />
                  Connect your Freighter wallet to deposit.
                </Alert>
              )}

              {/* Primary CTA */}
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
                      {flow.step === "signing"
                        ? "Waiting for signature…"
                        : "Processing…"}
                    </Text>
                  </Flex>
                ) : (
                  `Lock ${amountValid ? displayAmount : ""} ${farm.symbol}`
                )}
              </Button>

              {/* Retry after error */}
              {flow.step === "error" && (
                <Button
                  variant="ghost"
                  size="sm"
                  color="#A2A2A2"
                  onClick={flow.reset}
                >
                  Try again
                </Button>
              )}
            </Flex>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

export default function Farm() {
  const { publicKey, isConnected } = useStellarWallet();
  const toast = useToast();

  const {
    data: pools,
    isLoading: poolsLoading,
    isError: poolsError,
    error: poolsErrorObj,
  } = usePools();

  const {
    data: userPositions,
    isLoading: positionsLoading,
    isError: positionsError,
    error: positionsErrorObj,
  } = useAllUserPositions();

  const [selectedFarm, setSelectedFarm] = useState<LivePoolRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [unlockPosition, setUnlockPosition] = useState<FarmPosition | null>(null);
  const [isUnlockOpen, setIsUnlockOpen] = useState(false);

  useEffect(() => {
    if (poolsError && poolsErrorObj) {
      toast({
        title: "Unable to load pools",
        description:
          poolsErrorObj instanceof Error
            ? poolsErrorObj.message
            : "Failed to fetch pool data from Soroban",
        status: "error",
        duration: 8000,
        isClosable: true,
      });
    }
  }, [poolsError, poolsErrorObj, toast]);

  useEffect(() => {
    if (positionsError && positionsErrorObj) {
      toast({
        title: "Unable to load positions",
        description:
          positionsErrorObj instanceof Error
            ? positionsErrorObj.message
            : "Failed to fetch user positions from Soroban",
        status: "error",
        duration: 8000,
        isClosable: true,
      });
    }
  }, [positionsError, positionsErrorObj, toast]);

  const myPositions = useMemo<FarmPosition[]>(() => {
    if (!userPositions) return [];
    return userPositions.map(({ pool, position }) => ({
      id: pool.id,
      name: pool.asset.code,
      img: "",
      earned: position?.credits ?? "-",
      stake: position?.amount ?? "-",
      dailyRate: pool.dailyRate,
      totalStakedLiquidity: `$${Number(pool.totalLocked).toLocaleString()}`,
      symbol: pool.asset.code,
      lockedAmount: position?.amount ? Number(position.amount) : 0,
      lockedAt: position?.lockedAt ?? 0,
      lockPeriodSeconds: position ? pool.minLockPeriod : minLockPeriodSeconds,
    }));
  }, [userPositions]);

  const availablePools = useMemo<LivePoolRow[]>(() => {
    if (!pools) return [];
    const positionMap = new Map<string, UserPosition | null>();
    userPositions?.forEach((item) => positionMap.set(item.pool.id, item.position));

    return pools.map((pool) => {
      const position = positionMap.get(pool.id);
      return {
        id: pool.id,
        name: pool.asset.code,
        earned: position?.credits ?? "-",
        stake: position?.amount ?? "-",
        dailyRate: pool.dailyRate,
        totalStakedLiquidity: `$${Number(pool.totalLocked).toLocaleString()}`,
        symbol: pool.asset.code,
        lockedAmount: position?.amount ? Number(position.amount) : 0,
        lockedAt: position?.lockedAt ?? 0,
        lockPeriodSeconds: pool.minLockPeriod,
      };
    });
  }, [pools, userPositions]);

  const handleDepositClick = (pool: LivePoolRow) => {
    setSelectedFarm(pool);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedFarm(null);
  };

  const handleUnlockClick = (position: FarmPosition) => {
    setUnlockPosition(position);
    setIsUnlockOpen(true);
  };

  const handleUnlockClose = () => {
    setIsUnlockOpen(false);
    setUnlockPosition(null);
  };

  const handleUnlocked = (position: FarmPosition, amount: number) => {
    setIsUnlockOpen(false);
    setUnlockPosition(null);
    toast({
      title: "Unlock submitted",
      description: `${amount} ${position.symbol} unlock request sent.`,
      status: "success",
      duration: 6000,
      isClosable: true,
    });
  };

  const hasPositions = myPositions.length > 0;

  return (
    <Flex direction="column" align="center" gap={6} px={8} py={6}>
      <Text fontSize="xs" color="#A2A2A2" textAlign="center">
        Network: {stellarNetwork}
        {publicKey ? ` · ${publicKey.slice(0, 6)}…` : ""}
        {factoryContractId
          ? ` · Factory ${factoryContractId.slice(0, 8)}…`
          : " · Set NEXT_PUBLIC_FACTORY_CONTRACT_ID when your Soroban factory is deployed"}
        {" · "}
        {sorobanRpcUrl.replace(/^https?:\/\//, "")}
      </Text>

      <Text fontSize="4xl" fontWeight="bold" textTransform="uppercase">
        Farm pools
      </Text>

      {poolsLoading ? (
        <Flex w="100%" justify="center" py={16}>
          <Spinner size="xl" color={ACCENT} />
        </Flex>
      ) : availablePools.length === 0 ? (
        <Alert status="info" borderRadius="2xl" w="95%" maxW="1200px">
          <AlertIcon /> No farm pools are currently available. Ensure your factory contract is deployed and the factory contract ID is configured.
        </Alert>
      ) : (
        availablePools.map((farm) => (
          <Flex
            key={farm.id}
            w="95%"
            h={20}
            mx="auto"
            align="center"
            justify="space-between"
            borderTop="1px solid #454545"
            borderBottom="1px solid #454545"
            px={4}
          >
            <Text>{farm.name}</Text>
            <Flex direction="column" minW="110px" align="flex-start">
              <Text fontSize="2xs">Earned</Text>
              <Text>{farm.earned}</Text>
            </Flex>
            <Flex direction="column" minW="110px" align="flex-start">
              <Text fontSize="2xs">My Stake</Text>
              <Text>{farm.stake}</Text>
            </Flex>
            <Flex direction="column" minW="110px" align="flex-start">
              <Text fontSize="2xs">Daily Rate</Text>
              <Text>{farm.dailyRate}</Text>
            </Flex>
            <Flex direction="column" minW="180px" align="flex-start">
              <Text fontSize="2xs">Total Staked Liquidity</Text>
              <Text>{farm.totalStakedLiquidity}</Text>
            </Flex>
            <Button borderRadius="3xl" onClick={() => handleDepositClick(farm)}>
              Deposit
            </Button>
          </Flex>
        ))
      )}

      <Text fontSize="4xl" fontWeight="bold" textTransform="uppercase" mt={10}>
        My earnings
      </Text>

      {positionsLoading ? (
        <Flex w="100%" justify="center" py={16}>
          <Spinner size="xl" color={ACCENT} />
        </Flex>
      ) : !isConnected ? (
        <Alert status="info" borderRadius="2xl" w="95%" maxW="1200px">
          <AlertIcon /> Connect your Freighter wallet to view your positions.
        </Alert>
      ) : !hasPositions ? (
        <Alert status="info" borderRadius="2xl" w="95%" maxW="1200px">
          <AlertIcon /> No active positions found for the connected wallet.
        </Alert>
      ) : (
        myPositions.map((position) => (
          <EarningRow
            key={position.id}
            position={position}
            onUnlock={handleUnlockClick}
          />
        ))
      )}

      <DepositModal
        farm={selectedFarm}
        isOpen={isModalOpen}
        onClose={handleModalClose}
      />

      <UnlockModal
        isOpen={isUnlockOpen}
        onClose={handleUnlockClose}
        onUnlocked={handleUnlocked}
        position={unlockPosition}
      />
    </Flex>
  );
}
