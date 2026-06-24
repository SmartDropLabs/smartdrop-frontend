"use client";
import { useEffect, useMemo, useState } from "react";
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
import { unlockAvailableAt, type FarmPosition } from "@/types/farm";
import { useAllUserPositions, usePools } from "@/hooks/useSorobanQuery";
import { useSorobanEvents } from "@/hooks/useSorobanEvents";
import type { PoolInfo, UserPosition } from "@/lib/soroban";

const DAY_MS = 24 * 60 * 60 * 1000;

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
  const [unlockPosition, setUnlockPosition] = useState<FarmPosition | null>(null);
  const [isUnlockOpen, setIsUnlockOpen] = useState(false);
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

  const handleLockClick = async () => {
    setSubmitPending(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setSubmitPending(false);
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
          <Spinner size="xl" color="#4AE292" />
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
          <Spinner size="xl" color="#4AE292" />
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

      <Modal isOpen={isModalOpen} onClose={handleModalClose}>
        <ModalOverlay backdropFilter="blur(3px)" />
        <ModalContent bgColor="#171717" color="#fff" borderRadius="3xl">
          <ModalHeader mx="auto">{selectedFarm?.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody p={8}>
            <Flex direction="column" gap={6}>
              <Text color="#A2A2A2">
                Deposit to earn points from this pool via Soroban.
              </Text>
              <Box>
                <Text fontSize="md" mb={2}>
                  Amount
                </Text>
                <Box mb={4}>
                  <input
                    type="number"
                    value={sliderValue}
                    onChange={(event) => setSliderValue(Number(event.target.value))}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "16px",
                      background: "#121212",
                      border: "1px solid #454545",
                      color: "#fff",
                    }}
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

      <UnlockModal
        isOpen={isUnlockOpen}
        onClose={handleUnlockClose}
        onUnlocked={handleUnlocked}
        position={unlockPosition}
      />
    </Flex>
  );
}

