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
  Input,
  Box,
  Spinner,
  Link,
  Alert,
  AlertIcon,
  Badge,
} from "@chakra-ui/react";
import { useStellarWallet } from "@/context/StellarWalletContext";
import {
  networkPassphrase,
  poolContractId,
  sorobanRpcUrl,
  stellarNetwork,
} from "@/config";
import { trackEvent } from "@/lib/analytics";
import { UnlockError, stellarExpertTxUrl, unlockAssets } from "@/lib/soroban";
import { useCountdown } from "@/hooks/useCountdown";
import { unlockAvailableAt, type FarmPosition } from "@/types/farm";

type UnlockModalProps = {
  isOpen: boolean;
  position: FarmPosition | null;
  onClose: () => void;
  /** Called after a confirmed unlock with the amount removed from the stake. */
  onUnlocked: (position: FarmPosition, amount: number) => void;
};

const ACCENT = "#4ae292";

export default function UnlockModal({
  isOpen,
  position,
  onClose,
  onUnlocked,
}: UnlockModalProps) {
  const { publicKey } = useStellarWallet();
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const unlockAt = position ? unlockAvailableAt(position) : 0;
  const countdown = useCountdown(unlockAt);
  const canUnlock = Boolean(position) && countdown.isElapsed;

  const numericAmount = Number(amount);
  const amountValid =
    Number.isFinite(numericAmount) &&
    numericAmount > 0 &&
    !!position &&
    numericAmount <= position.lockedAmount;

  // Reset transient state whenever the modal opens for a (new) position.
  useEffect(() => {
    if (isOpen && position) {
      setAmount(String(position.lockedAmount));
      setPending(false);
      setError(null);
      setTxHash(null);
    }
  }, [isOpen, position]);

  const explorerUrl = useMemo(
    () => (txHash ? stellarExpertTxUrl(txHash, stellarNetwork) : null),
    [txHash]
  );

  if (!position) return null;

  const handleClose = () => {
    if (pending) return;
    onClose();
  };

  const setMax = () => setAmount(String(position.lockedAmount));

  const handleUnlock = async () => {
    if (!publicKey) {
      setError("Connect your Freighter wallet to unlock.");
      return;
    }
    if (!canUnlock) {
      setError("Lock period has not elapsed yet.");
      return;
    }
    if (!amountValid) {
      setError(`Enter an amount between 0 and ${position.lockedAmount}.`);
      return;
    }

    setError(null);
    setPending(true);
    trackEvent("unlock_initiated", {
      farm: position.name,
      symbol: position.symbol,
      amount: numericAmount,
      partial: numericAmount < position.lockedAmount,
    });

    try {
      const { hash } = await unlockAssets({
        poolContractId,
        publicKey,
        amount,
        networkPassphrase,
        rpcUrl: sorobanRpcUrl,
      });
      setTxHash(hash);
      trackEvent("unlock_succeeded", {
        farm: position.name,
        symbol: position.symbol,
        amount: numericAmount,
        hash,
      });
      onUnlocked(position, numericAmount);
    } catch (err) {
      const message =
        err instanceof UnlockError
          ? err.message
          : "Unlock failed. Please try again.";
      setError(message);
      trackEvent("unlock_failed", {
        farm: position.name,
        symbol: position.symbol,
        amount: numericAmount,
        reason: err instanceof UnlockError ? err.code : "UNKNOWN",
      });
    } finally {
      setPending(false);
    }
  };

  const infoRow = (label: string, value: React.ReactNode) => (
    <Flex justify="space-between" fontSize="sm" py={1}>
      <Text color="#A2A2A2">{label}</Text>
      <Text>{value}</Text>
    </Flex>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <ModalOverlay backdropFilter="blur(3px)" />
      <ModalContent bgColor="#171717" color="#fff" borderRadius="3xl">
        <ModalHeader mx="auto">Unlock {position.symbol}</ModalHeader>
        <ModalCloseButton isDisabled={pending} />
        <ModalBody p={8}>
          {txHash ? (
            <Flex direction="column" gap={4} align="center" textAlign="center">
              <Badge colorScheme="green" borderRadius="full" px={3} py={1}>
                Unlock confirmed
              </Badge>
              <Text fontSize="sm" color="#A2A2A2">
                {numericAmount} {position.symbol} is on its way back to your
                wallet.
              </Text>
              <Box
                w="100%"
                border="1px solid #454545"
                borderRadius="2xl"
                p={3}
              >
                {infoRow(
                  "Remaining stake",
                  `${Math.max(0, position.lockedAmount - numericAmount)} ${
                    position.symbol
                  }`
                )}
                {explorerUrl &&
                  infoRow(
                    "Transaction",
                    <Link href={explorerUrl} isExternal color={ACCENT}>
                      View on Stellar Expert
                    </Link>
                  )}
              </Box>
              <Button
                borderRadius="2xl"
                w="100%"
                bg={ACCENT}
                color="#000"
                _hover={{ opacity: 0.9 }}
                onClick={onClose}
              >
                Done
              </Button>
            </Flex>
          ) : (
            <Flex direction="column" gap={6}>
              <Box border="1px solid #454545" borderRadius="2xl" p={3}>
                {infoRow(
                  "Amount locked",
                  `${position.lockedAmount} ${position.symbol}`
                )}
                {infoRow(
                  "Time remaining",
                  <Text color={canUnlock ? ACCENT : "white"}>
                    {countdown.label}
                  </Text>
                )}
                {infoRow(
                  "Available to unlock",
                  `${canUnlock ? position.lockedAmount : 0} ${position.symbol}`
                )}
              </Box>

              {!canUnlock && (
                <Alert
                  status="warning"
                  borderRadius="2xl"
                  bg="#2a2412"
                  color="#f6c453"
                  fontSize="sm"
                >
                  <AlertIcon color="#f6c453" />
                  Assets are time-locked. You can unlock once the countdown
                  reaches zero.
                </Alert>
              )}

              <Flex direction="column" gap={2}>
                <Text fontSize="2xs" color="#A2A2A2">
                  Amount to unlock (partial allowed)
                </Text>
                <Box position="relative" w="100%">
                  <Input
                    type="number"
                    borderRadius="2xl"
                    placeholder="Amount"
                    h="50px"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    isDisabled={!canUnlock || pending}
                    borderColor="#454545"
                    _placeholder={{ color: "#A2A2A2" }}
                    _hover={{ borderColor: ACCENT }}
                    _focus={{ boxShadow: "none", borderColor: ACCENT }}
                  />
                  <Flex
                    position="absolute"
                    top="50%"
                    right="12px"
                    transform="translateY(-50%)"
                    gap={3}
                    align="center"
                  >
                    <Text fontSize="sm">{position.symbol}</Text>
                    <Text
                      fontSize="xs"
                      color={ACCENT}
                      cursor={canUnlock ? "pointer" : "not-allowed"}
                      onClick={canUnlock ? setMax : undefined}
                    >
                      Max
                    </Text>
                  </Flex>
                </Box>
              </Flex>

              {error && (
                <Alert
                  status="error"
                  borderRadius="2xl"
                  bg="#2a1414"
                  color="#ff8080"
                  fontSize="sm"
                >
                  <AlertIcon color="#ff8080" />
                  {error}
                </Alert>
              )}

              <Button
                borderRadius="2xl"
                bg={ACCENT}
                color="#000"
                _hover={{ opacity: 0.9 }}
                isDisabled={!canUnlock || !amountValid || pending}
                onClick={() => void handleUnlock()}
              >
                {pending ? <Spinner size="sm" /> : "Unlock with Freighter"}
              </Button>
            </Flex>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
