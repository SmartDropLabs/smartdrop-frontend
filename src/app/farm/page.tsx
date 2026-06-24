"use client";
import { memo, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Button,
  Text,
  Flex,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Box,
  Spinner,
  Tooltip,
  Alert,
  AlertIcon,
  Input,
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
import ConnectWalletButton from "@/components/ConnectWalletButton/ConnectWalletButton";
import { useCountdown } from "@/hooks/useCountdown";
import { unlockAvailableAt, type FarmPosition } from "@/types/farm";
import { useAllUserPositions, usePools } from "@/hooks/useSorobanQuery";
import { useSorobanEvents } from "@/hooks/useSorobanEvents";
import type { UserPosition } from "@/lib/soroban";
import { useFarmStore } from "@/store/farmStore";

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

function MetricColumn({
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

// Keep this synchronized with FarmPosition in src/types/farm.ts. Every rendered
// field must be compared, or memoization can hide row updates when fields change.
function earningRowPropsAreEqual(
  previous: EarningRowProps,
  next: EarningRowProps
) {
  const previousPosition = previous.position;
  const nextPosition = next.position;

  return (
    previousPosition.id === nextPosition.id &&
    previousPosition.name === nextPosition.name &&
    previousPosition.img === nextPosition.img &&
    previousPosition.earned === nextPosition.earned &&
    previousPosition.stake === nextPosition.stake &&
    previousPosition.dailyRate === nextPosition.dailyRate &&
    previousPosition.totalStakedLiquidity ===
      nextPosition.totalStakedLiquidity &&
    previousPosition.symbol === nextPosition.symbol &&
    previousPosition.lockedAmount === nextPosition.lockedAmount &&
    previousPosition.lockedAt === nextPosition.lockedAt &&
    previousPosition.lockPeriodSeconds === nextPosition.lockPeriodSeconds
  );
}

export const EarningRow = memo(function EarningRow({
  position,
}: EarningRowProps) {
  const openUnlock = useFarmStore((s) => s.openUnlock);
  const countdown = useCountdown(unlockAvailableAt(position));
  const hasStake = position.lockedAmount > 0;
  const canUnlock = hasStake && countdown.isElapsed;

  return (
    <Flex
      display={{ base: 'flex', md: 'flex' }}
      flexDirection={{ base: 'column', md: 'row' }}
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

  const poolContractIds = useMemo(
    () => (pools ?? []).map((p) => p.contractAddress).filter(Boolean),
    [pools]
  );

  useSorobanEvents(poolContractIds, [
    "lock_assets",
    "unlock_assets",
    "update_credits",
  ]);

  const [selectedFarm, setSelectedFarm] = useState<LivePoolRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitPending, setSubmitPending] = useState(false);
  const [sliderValue, setSliderValue] = useState(50);

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
    userPositions?.forEach((item) => {
      positionMap.set(item.pool.id, item.position);
    });

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

  const handleLockClick = async () => {
    setSubmitPending(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setSubmitPending(false);
  };

  const hasPositions = myPositions.length > 0;

  return (
    <Flex direction="column" align="center" gap={6} px={{ base: 4, md: 8 }} py={6}>
      <Text fontSize="xs" color="app.muted" textAlign="center" overflowWrap="anywhere">
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
          <Spinner size="xl" color="app.accent" />
        </Flex>
      ) : availablePools.length === 0 ? (
        <Alert status="info" borderRadius="2xl" w="95%" maxW="1200px">
          <AlertIcon /> No farm pools are currently available. Ensure your factory contract is deployed and the factory contract ID is configured.
        </Alert>
      ) : (
        availablePools.map((farm) => (
          <Flex
            key={farm.id}
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
              {farm.name}
            </Text>
            <MetricColumn label="Earned" value={farm.earned} />
            <MetricColumn label="My Stake" value={farm.stake} />
            <MetricColumn label="Daily Rate" value={farm.dailyRate} />
            <MetricColumn
              label="Total Staked Liquidity"
              value={farm.totalStakedLiquidity}
              minW="180px"
            />
            <Button
              borderRadius="3xl"
              onClick={() => handleDepositClick(farm)}
              w={{ base: "full", md: "auto" }}
            >
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
          <Spinner size="xl" color="app.accent" />
        </Flex>
      ) : !isConnected ? (
        <Alert
          status="info"
          borderRadius="2xl"
          w={{ base: "full", md: "95%" }}
          maxW="1200px"
          flexDirection={{ base: "column", md: "row" }}
          alignItems={{ base: "stretch", md: "center" }}
          gap={{ base: 3, md: 4 }}
        >
          <Flex
            flex="1"
            direction={{ base: "column", md: "row" }}
            align={{ base: "stretch", md: "center" }}
            justify="space-between"
            gap={4}
          >
            <Flex align="center" gap={2}>
              <AlertIcon m={0} />
              <Text>Connect your Freighter wallet to view your positions.</Text>
            </Flex>
            <ConnectWalletButton
              label="Connect Wallet"
              position="static"
              bottom="auto"
              right="auto"
              left="auto"
              w={{ base: "full", md: "auto" }}
            />
          </Flex>
        </Alert>
      ) : !hasPositions ? (
        <Alert status="info" borderRadius="2xl" w={{ base: "full", md: "95%" }} maxW="1200px">
          <AlertIcon /> No active positions found for the connected wallet.
        </Alert>
      ) : (
        myPositions.map((position) => (
          <EarningRow key={position.id} position={position} />
        ))
      )}

      <Modal isOpen={isModalOpen} onClose={handleModalClose}>
        <ModalOverlay backdropFilter="blur(3px)" />
        <ModalContent bg="app.surface" color="app.text" borderRadius="3xl">
          <ModalHeader mx="auto">{selectedFarm?.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody p={8}>
            <Flex direction="column" gap={6}>
              <Text color="app.muted">
                Deposit to earn points from this pool via Soroban.
              </Text>
              <Box>
                <Text fontSize="md" mb={2}>
                  Amount
                </Text>
                <Box mb={4}>
                  <Input
                    type="number"
                    value={sliderValue}
                    onChange={(event) => setSliderValue(Number(event.target.value))}
                    borderRadius="2xl"
                    bg="app.inputBg"
                    borderColor="app.border"
                    color="app.text"
                    _focus={{ boxShadow: "none", borderColor: "app.accent" }}
                    _hover={{ borderColor: "app.accent" }}
                  />
                </Box>
              </Box>
              <Button
                borderRadius="3xl"
                colorScheme="green"
                isLoading={submitPending}
                onClick={handleLockClick}
                w="full"
              >
                Deposit {sliderValue} {selectedFarm?.symbol ?? "tokens"}
              </Button>
            </Flex>
          </ModalBody>
        </ModalContent>
      </Modal>

      <UnlockModal />
    </Flex>
  );
}
