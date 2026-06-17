"use client";
import { useState } from "react";
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
  Input,
  Box,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  SliderMark,
  chakra,
  Spinner,
  Tooltip,
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

const DAY_MS = 24 * 60 * 60 * 1000;

/** A single staked position row with a live-updating Unlock control. */
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
    >
      <Text px={8}>{position.name}</Text>
      <Flex direction="column">
        <Text fontSize="2xs">Earned</Text>
        <Text>{position.earned}</Text>
      </Flex>
      <Flex direction="column">
        <Text fontSize="2xs">My Stake</Text>
        <Text>{position.stake}</Text>
      </Flex>
      <Flex direction="column">
        <Text fontSize="2xs">Daily Rate</Text>
        <Text>{position.dailyRate}</Text>
      </Flex>
      <Flex direction="column">
        <Text fontSize="2xs">Total Staked Liquidity</Text>
        <Text>{position.totalStakedLiquidity}</Text>
      </Flex>
      <Flex gap={4}>
        <Button borderRadius="3xl" disabled>
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
          {/* Wrapper keeps the tooltip working while the button is disabled. */}
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
  const { publicKey } = useStellarWallet();
  const mockFarms = [
    {
      name: "BEAM",
      img: "",
      earned: "-",
      stake: "-",
      dailyRate: "0.00102",
      totalStakedLiquidity: "$141M",
    },
    {
      name: "BEAM",
      img: "",
      earned: "-",
      stake: "-",
      dailyRate: "0.00102",
      totalStakedLiquidity: "$141M",
    },
  ];

  const [positions, setPositions] = useState<FarmPosition[]>(() => [
    {
      id: "beam-1",
      name: "BEAM",
      img: "",
      earned: "12345",
      stake: "5.398",
      dailyRate: "0.00102",
      totalStakedLiquidity: "$141M",
      symbol: "BEAM",
      lockedAmount: 5.398,
      // Locked well beyond the minimum period → eligible to unlock now.
      lockedAt: Date.now() - 10 * DAY_MS,
      lockPeriodSeconds: minLockPeriodSeconds,
    },
    {
      id: "beam-2",
      name: "BEAM",
      img: "",
      earned: "210",
      stake: "2.5",
      dailyRate: "0.00102",
      totalStakedLiquidity: "$141M",
      symbol: "BEAM",
      lockedAmount: 2.5,
      // Locked recently → still time-locked, Unlock disabled with countdown.
      lockedAt: Date.now() - 2 * 60 * 1000,
      lockPeriodSeconds: minLockPeriodSeconds,
    },
  ]);

  const [selectedFarm, setSelectedFarm] = useState<(typeof mockFarms)[0] | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitPending, setSubmitPending] = useState<boolean>(false);

  const [unlockPosition, setUnlockPosition] = useState<FarmPosition | null>(
    null
  );
  const [isUnlockOpen, setIsUnlockOpen] = useState(false);

  const [sliderValue, setSliderValue] = useState(50);

  const handleDepositClick = (farm: (typeof mockFarms)[0]) => {
    setSelectedFarm(farm);
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

  // Reflect the reduced stake in the UI immediately after a confirmed unlock.
  const handleUnlocked = (position: FarmPosition, amount: number) => {
    setPositions((prev) =>
      prev.map((p) => {
        if (p.id !== position.id) return p;
        const remaining = Math.max(0, p.lockedAmount - amount);
        return {
          ...p,
          lockedAmount: remaining,
          stake: remaining > 0 ? String(remaining) : "-",
        };
      })
    );
  };

  const handleLockClick = async () => {
    setSubmitPending(true);
    // Wire to Soroban: build invoke transaction, sign with Freighter, submit to sorobanRpcUrl
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setSubmitPending(false);
  };

  return (
    <Flex direction="column" align="center">
      <Text fontSize="xs" color="#A2A2A2" mt={4} px={4} textAlign="center">
        Network: {stellarNetwork}
        {publicKey ? ` · ${publicKey.slice(0, 4)}…` : ""}
        {factoryContractId
          ? ` · Factory ${factoryContractId.slice(0, 8)}…`
          : " · Set NEXT_PUBLIC_FACTORY_CONTRACT_ID when your Soroban factory is deployed"}
        {" · "}
        {sorobanRpcUrl.replace(/^https:\/\//, "")}
      </Text>
      {positions.length > 0 ? (
        <>
          <Text
            my={8}
            textTransform="uppercase"
            fontSize="4xl"
            fontWeight="bold"
          >
            My earnings
          </Text>

          {positions.map((position) => (
            <EarningRow
              key={position.id}
              position={position}
              onUnlock={handleUnlockClick}
            />
          ))}
        </>
      ) : (
        <></>
      )}
      <Text my={8} textTransform="uppercase" fontSize="4xl" fontWeight="bold">
        Deposit to <chakra.span color="#4ae292">earn points</chakra.span>
      </Text>

      {mockFarms.map((farm, index) => (
        <Flex
          key={index}
          w="95%"
          h={20}
          mx="auto"
          align="center"
          justify="space-between"
          borderTop="1px solid #454545"
          borderBottom="1px solid #454545"
        >
          <Text px={8}>{farm.name}</Text>
          <Flex direction="column">
            <Text fontSize="2xs">Earned</Text>
            <Text>{farm.earned}</Text>
          </Flex>
          <Flex direction="column">
            <Text fontSize="2xs">My Stake</Text>
            <Text>{farm.stake}</Text>
          </Flex>
          <Flex direction="column">
            <Text fontSize="2xs">Daily Rate</Text>
            <Text>{farm.dailyRate}</Text>
          </Flex>
          <Flex direction="column">
            <Text fontSize="2xs">Total Staked Liquidity</Text>
            <Text>{farm.totalStakedLiquidity}</Text>
          </Flex>
          <Button borderRadius="3xl" onClick={() => handleDepositClick(farm)}>
            Deposit
          </Button>
        </Flex>
      ))}

      <Modal isOpen={isModalOpen} onClose={handleModalClose}>
        <ModalOverlay backdropFilter="blur(3px)" />
        <ModalContent bgColor="#171717" color="#fff" borderRadius="3xl">
          <ModalHeader mx="auto">{selectedFarm?.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody p={8}>
            <Flex direction="column">
              <Flex direction="column" gap={8}>
                <Flex direction="column" gap={2}>
                  <Text fontSize="2xs" color="#A2A2A2">
                    Deposit
                  </Text>
                  <Box position="relative" w="100%">
                    <Input
                      type="number"
                      borderRadius="2xl"
                      placeholder="Amount"
                      h="50px"
                      borderColor="#454545"
                      paddingBottom="16px"
                      _placeholder={{
                        color: "#A2A2A2",
                      }}
                      _hover={{
                        borderColor: "#4ae292",
                      }}
                      _focus={{
                        boxShadow: "none",
                        borderColor: "#4ae292",
                      }}
                      zIndex={1}
                    />
                    <Text
                      position="absolute"
                      bottom="4px"
                      left="16px"
                      fontSize="xs"
                      color="#A2A2A2"
                    >
                      $3,280.20
                    </Text>
                    <Text
                      position="absolute"
                      bottom="20px"
                      right="10px"
                      fontSize="md"
                      color="white"
                    >
                      BEAM
                    </Text>
                    <Flex position="absolute" bottom="5px" right="10px" gap={2}>
                      <Text fontSize="xs" color="#A2A2A2">
                        Balance: 0($0)
                      </Text>
                      <Text
                        fontSize="xs"
                        color="#4ae292"
                        cursor="pointer"
                        zIndex={2}
                      >
                        Max
                      </Text>
                    </Flex>
                  </Box>
                </Flex>

                <Flex
                  direction="column"
                  w="100%"
                  border="1px solid #454545"
                  borderRadius="2xl"
                  p={2}
                >
                  <Text fontSize="xs" color="#A2A2A2">
                    Boost allocation
                  </Text>

                  <Box py={6}>
                    <Slider
                      aria-label="slider-ex-6"
                      onChange={(val) => setSliderValue(val)}
                      pt={8}
                    >
                      <SliderMark
                        value={sliderValue}
                        textAlign="center"
                        fontSize="xs"
                        bg="#fff"
                        color="#000"
                        mt="-10"
                        ml="-5"
                        w="10"
                      >
                        {sliderValue}%
                      </SliderMark>
                      <SliderTrack>
                        <SliderFilledTrack bg="#4ae292" />
                      </SliderTrack>
                      <SliderThumb />
                    </Slider>
                    <Flex justify="space-between">
                      <Text fontSize="xs" mt="-5">
                        1%
                      </Text>
                      <Text fontSize="xs" mt="-5">
                        100%
                      </Text>
                    </Flex>
                  </Box>

                  <Flex justify="space-between" fontSize="xs" py={1}>
                    <Text color="#A2A2A2">Principal Stake</Text>
                    <Text>1,620,000 S</Text>
                  </Flex>

                  <Flex justify="space-between" fontSize="xs" py={1}>
                    <Text color="#A2A2A2">Virtual Stake</Text>
                    <Text>1,900,000 vS (380,000 x 5)</Text>
                  </Flex>

                  <Flex justify="space-between" fontSize="xs" py={1}>
                    <Text color="#A2A2A2">Total Stake</Text>
                    <Text>3,520,000 S</Text>
                  </Flex>
                </Flex>

                <Flex
                  w="100%"
                  border="1px solid #454545"
                  borderRadius="2xl"
                  p={2}
                  justify="space-between"
                  fontSize="xs"
                >
                  <Text color="#A2A2A2">Expected Reward Earned Daily</Text>
                  <Text fontSize="sm">3.255</Text>
                </Flex>

                <Button
                  borderRadius="2xl"
                  onClick={() => void handleLockClick()}
                  disabled={submitPending}
                >
                  {submitPending ? (
                    <Spinner />
                  ) : (
                    "Lock with Freighter (Soroban)"
                  )}
                </Button>
              </Flex>
            </Flex>
          </ModalBody>
        </ModalContent>
      </Modal>

      <UnlockModal
        isOpen={isUnlockOpen}
        position={unlockPosition}
        onClose={handleUnlockClose}
        onUnlocked={handleUnlocked}
      />
    </Flex>
  );
}
