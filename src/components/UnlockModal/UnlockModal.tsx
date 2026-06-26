"use client";

import {
    poolContractId,
    stellarNetwork,
} from "@/config";
import { useErrorHandler } from "@/context/ErrorContext";
import { useStellarWallet } from "@/context/StellarWalletContext";
import { useCountdown } from "@/hooks/useCountdown";
import { trackEvent } from "@/lib/analytics";
import { stellarExpertTxUrl, unlockAssets, computePartialUnlockPreview } from "@/lib/soroban";
import { useFarmStore } from "@/store/farmStore";
import { unlockAvailableAt } from "@/types/farm";
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
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";

export default function UnlockModal() {
  const selectedPosition = useFarmStore((s) => s.selectedPosition);
  const isUnlock = useFarmStore((s) => s.activeModal === "unlock");
  const close = useFarmStore((s) => s.close);
  const position = selectedPosition;
  const { publicKey, walletApi } = useStellarWallet();
  const toast = useErrorHandler();
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
    numericAmount >= 0.01 &&
    !!position &&
    numericAmount <= position.lockedAmount;

  // Reset transient state whenever the modal opens for a (new) position.
  useEffect(() => {
    if (isUnlock && position) {
      setAmount(String(position.lockedAmount));
      setPending(false);
      setError(null);
      setTxHash(null);

      // Focus on amount input when modal opens for better accessibility
      setTimeout(() => {
        const amountInput = document.querySelector('input[type="number"]') as HTMLInputElement;
        if (amountInput) {
          amountInput.focus();
          amountInput.select();
        }
      }, 100);
    }
  }, [isUnlock, position]);

  const explorerUrl = useMemo(
    () => (txHash ? stellarExpertTxUrl(txHash, stellarNetwork) : null),
    [txHash]
  );

  if (!position) return null;

  const handleClose = () => {
    if (pending) return;
    close();
  };

  const setMax = () => setAmount(String(position.lockedAmount));
  const set50Pct = () => setAmount(String(position.lockedAmount / 2));

  const numericDailyRate = parseFloat(position.dailyRate) || 0;
  const { remainingStake, newDailyRate } = computePartialUnlockPreview(
    position.lockedAmount,
    numericAmount,
    numericDailyRate,
  );

  const handleUnlock = async () => {
    if (!publicKey || !walletApi) {
      setError("Connect your Freighter wallet to unlock.");
      return;
    }
    if (!canUnlock) {
      setError("Lock period has not elapsed yet.");
      return;
    }
    if (!amountValid) {
      setError(`Enter an amount between 0.01 and ${position.lockedAmount}.`);
      return;
    }

    // Additional validation for minimum unlock amount
    if (numericAmount < 0.01) {
      setError("Minimum unlock amount is 0.01.");
      return;
    }

    setError(null);
    setPending(true);
    const trackingStartTime = Date.now();
    trackEvent("unlock_initiated", {
      farm: position.name,
      symbol: position.symbol,
      amount: numericAmount,
      partial: numericAmount < position.lockedAmount,
      lockPeriodElapsed: canUnlock,
      timeRemaining: countdown.remainingMs,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    });

    try {
      const result = await unlockAssets({
        poolContractId,
        publicKey,
        amount,
        walletApi,
      });
      const hash = result.hash || result.transactionHash;
      setTxHash(hash || null);
      toast.success(
        "Unlock Submitted",
        `${numericAmount} ${position.symbol} unlock transaction submitted successfully`
      );
      trackEvent("unlock_succeeded", {
        farm: position.name,
        symbol: position.symbol,
        amount: numericAmount,
        hash,
        partial: numericAmount < position.lockedAmount,
        processingTime: Date.now() - trackingStartTime,
      });
      // TODO(#28): optimistic queryClient.getQueryData update attaches here pending
      //            maintainer confirmation — see issue discussion
      toast.success(
        "Unlock submitted",
        `${numericAmount} ${position.symbol} unlock request sent.`
      );
      close();
    } catch (err) {
      const normalizedError = toast.handleError(err, "Unlock Transaction");
      setError(normalizedError.userMessage);
      trackEvent("unlock_failed", {
        farm: position.name,
        symbol: position.symbol,
        amount: numericAmount,
        reason: normalizedError.code,
        errorMessage: normalizedError.message,
      });
    } finally {
      setPending(false);
    }
  };

  const infoRow = (label: string, value: React.ReactNode) => (
    <Flex justify="space-between" fontSize="sm" py={1}>
      <Text color="app.muted">{label}</Text>
      <Text>{value}</Text>
    </Flex>
  );

  return (
    <Modal isOpen={isUnlock} onClose={handleClose}>
      <ModalOverlay backdropFilter="blur(3px)" />
      <ModalContent
        bg="app.surface"
        color="app.text"
        borderRadius="3xl"
        mx={{ base: 4, md: "auto" }}
      >
        <ModalHeader mx="auto">Unlock {position.symbol}</ModalHeader>
        <ModalCloseButton isDisabled={pending} />
        <ModalBody p={{ base: 4, md: 8 }}>
          {txHash ? (
            <Flex direction="column" gap={4} align="center" textAlign="center">
              <Badge colorScheme="green" borderRadius="full" px={3} py={1}>
                Unlock confirmed
              </Badge>
                <Text fontSize="sm" color="app.muted">
                {numericAmount} {position.symbol} unlock transaction submitted successfully.
                Your assets will be available in your wallet shortly.
              </Text>
              <Box
                w="100%"
                border="1px solid"
                borderColor="app.border"
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
                    <Link href={explorerUrl} isExternal color="app.accent">
                      View on Stellar Expert
                    </Link>
                  )}
              </Box>
              <Button
                borderRadius="2xl"
                w="full"
                bg="app.accent"
                color="app.onAccent"
                _hover={{ opacity: 0.9 }}
                onClick={handleClose}
              >
                Done
              </Button>
            </Flex>
          ) : (
            <Flex direction="column" gap={6}>
              <Box border="1px solid" borderColor="app.border" borderRadius="2xl" p={3}>
                {infoRow(
                  "Amount locked",
                  `${position.lockedAmount} ${position.symbol}`
                )}
                {infoRow(
                  "Time remaining",
                  <Text color={canUnlock ? "app.accent" : "app.text"}>
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
                  Assets are time-locked for security. You can unlock once the countdown
                  reaches zero to protect against impulsive withdrawals.
                </Alert>
              )}

              <Flex direction="column" gap={2}>
                <Text fontSize="2xs" color="app.muted">
                  Amount to unlock (partial allowed)
                </Text>
                <Box position="relative" w="100%">
                  <Input
                    type="number"
                    borderRadius="2xl"
                    placeholder="Amount"
                    h="50px"
                    w="full"
                    pr="120px"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    isDisabled={!canUnlock || pending}
                    borderColor="app.border"
                    bg="app.inputBg"
                    color="app.text"
                    _placeholder={{ color: "app.muted" }}
                    _hover={{ borderColor: "app.accent" }}
                    _focus={{ boxShadow: "none", borderColor: "app.accent" }}
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
                      color="app.accent"
                      cursor={canUnlock ? "pointer" : "not-allowed"}
                      onClick={canUnlock ? set50Pct : undefined}
                      _hover={canUnlock ? { opacity: 0.8 } : {}}
                      transition="opacity 0.2s"
                    >
                      50%
                    </Text>
                    <Text
                      fontSize="xs"
                      color={ACCENT}
                      cursor={canUnlock ? "pointer" : "not-allowed"}
                      onClick={canUnlock ? setMax : undefined}
                      _hover={canUnlock ? { opacity: 0.8 } : {}}
                      transition="opacity 0.2s"
                    >
                      Max
                    </Text>
                  </Flex>
                </Box>
              </Flex>

              {amountValid && (
                <Box border="1px solid #303030" borderRadius="2xl" p={3}>
                  {infoRow(
                    "Remaining stake",
                    `${remainingStake.toFixed(4)} ${position.symbol}`,
                  )}
                  {infoRow(
                    "New daily rate",
                    `${newDailyRate.toFixed(6)} credits/day`,
                  )}
                </Box>
              )}

              {amountValid &&
                !!position.minDepositAmount &&
                remainingStake > 0 &&
                remainingStake < position.minDepositAmount && (
                  <Alert
                    status="warning"
                    borderRadius="2xl"
                    bg="#2a2412"
                    color="#f6c453"
                    fontSize="sm"
                  >
                    <AlertIcon color="#f6c453" />
                    Warning: remaining stake below minimum — the contract will close this position entirely
                  </Alert>
                )}

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
                bg="app.accent"
                color="app.onAccent"
                _hover={{ opacity: 0.9 }}
                isDisabled={!canUnlock || !amountValid || pending}
                onClick={() => void handleUnlock()}
                w="full"
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
