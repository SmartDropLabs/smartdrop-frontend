"use client";

import {
    poolContractId,
    stellarNetwork,
} from "@/config";
import { useErrorHandler } from "@/context/ErrorContext";
import { useStellarWallet } from "@/context/StellarWalletContext";
import { useCountdown } from "@/hooks/useCountdown";
import { trackEvent } from "@/lib/analytics";
import {
    stellarExpertTxUrl,
    unlockAssets,
    computePartialUnlockPreview,
    getContractErrorMessage,
} from "@/lib/soroban";
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

type UnlockStep =
  | "idle"
  | "signing"
  | "submitting"
  | "confirming"
  | "success"
  | "timeout"
  | "error";

const UNLOCK_STEP_LABEL: Record<UnlockStep, string> = {
  idle: "",
  signing: "Waiting for Freighter signature...",
  submitting: "Submitting transaction to Stellar...",
  confirming: "Confirming transaction on Stellar...",
  success: "Unlock confirmed",
  timeout: "Confirmation is taking longer than expected.",
  error: "Unlock failed",
};

export default function UnlockModal() {
  const selectedPosition = useFarmStore((s) => s.selectedPosition);
  const isUnlock = useFarmStore((s) => s.activeModal === "unlock");
  const close = useFarmStore((s) => s.close);
  const position = selectedPosition;
  const { publicKey, walletApi, isNetworkMismatch } = useStellarWallet();
  const toast = useErrorHandler();
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<UnlockStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const selectedPoolContractId = position?.contractAddress || poolContractId;

  const unlockAt = position ? unlockAvailableAt(position) : 0;
  const countdown = useCountdown(unlockAt);
  const canUnlock = Boolean(position) && countdown.isElapsed;
  const isProcessing =
    step === "signing" || step === "submitting" || step === "confirming";

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
      setStep("idle");
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
    () => (txHash ? stellarExpertTxUrl(txHash, stellarNetwork.toLowerCase()) : null),
    [txHash]
  );

  if (!position) return null;

  const handleClose = () => {
    if (isProcessing) return;
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
      setStep("error");
      return;
    }
    if (isNetworkMismatch) {
      setError(`Switch Freighter to ${stellarNetwork} to unlock.`);
      return;
    }
    if (!selectedPoolContractId) {
      setError("Pool contract is not configured.");
      setStep("error");
      return;
    }
    if (!canUnlock) {
      setError("Lock period has not elapsed yet.");
      setStep("error");
      return;
    }
    if (!amountValid) {
      setError(`Enter an amount between 0.01 and ${position.lockedAmount}.`);
      setStep("error");
      return;
    }

    // Additional validation for minimum unlock amount
    if (numericAmount < 0.01) {
      setError("Minimum unlock amount is 0.01.");
      setStep("error");
      return;
    }

    setError(null);
    setTxHash(null);
    setStep("signing");
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
        poolContractId: selectedPoolContractId,
        publicKey,
        amount,
        walletApi,
        onHash: (hash) => setTxHash(hash),
        onStep: (nextStep) => setStep(nextStep),
      });
      const hash = result.hash || result.transactionHash;
      setTxHash(hash || null);

      if (!result.success) {
        const userMessage =
          result.status === "TIMEOUT"
            ? "Confirmation is taking longer than expected. You can check the transaction manually on Stellar Expert."
            : getContractErrorMessage(result.errorCode) ??
              result.error ??
              "Unlock transaction failed.";

        setError(userMessage);
        setStep(result.status === "TIMEOUT" ? "timeout" : "error");
        trackEvent("unlock_failed", {
          farm: position.name,
          symbol: position.symbol,
          amount: numericAmount,
          reason: result.status ?? result.errorCode ?? "FAILED",
          errorMessage: userMessage,
        });
        return;
      }

      setStep("success");
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
    } catch (err) {
      const normalizedError = toast.handleError(err, "Unlock Transaction");
      setError(normalizedError.userMessage);
      setStep("error");
      trackEvent("unlock_failed", {
        farm: position.name,
        symbol: position.symbol,
        amount: numericAmount,
        reason: normalizedError.code,
        errorMessage: normalizedError.message,
      });
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
        <ModalCloseButton isDisabled={isProcessing} />
        <ModalBody p={{ base: 4, md: 8 }}>
          {step === "success" ? (
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
                  bg="app.warningBg"
                  color="app.warningFg"
                  fontSize="sm"
                >
                  <AlertIcon color="app.warningFg" />
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
                    placeholder="0.00"
                    type="number"
                    min="0"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    isInvalid={!amountValid}
                    disabled={!canUnlock || isProcessing}
                    bg="app.inputBg"
                    borderColor="app.border"
                    borderRadius="2xl"
                    fontSize="sm"
                    pr="16"
                    _focus={{ borderColor: "app.borderHover" }}
                  />
                  {canUnlock && (
                    <Button
                      size="xs"
                      position="absolute"
                      right="2"
                      top="50%"
                      transform="translateY(-50%)"
                      variant="ghost"
                      color="app.accent"
                      onClick={() => setAmount(String(maxUnlockable))}
                    >
                      MAX
                    </Button>
                  )}
                </Box>
                {amount && (
                  <Text fontSize="2xs" color={amountValid ? "app.muted" : "app.errorFg"}>
                    Remaining after unlock: {remainingStake} {position.symbol}
                  </Text>
                )}
              </Flex>

              {amount && !amountValid && (
                <Text fontSize="xs" color="app.errorFg">
                  Amount must be greater than 0 and at most {maxUnlockable}{" "}
                  {position.symbol}
                </Text>
              )}

              {/* Warnings and errors */}
              {isNetworkMismatch && (
                <Alert status="warning" borderRadius="2xl" bg="app.warningBg" color="app.warningFg" fontSize="sm">
                  <AlertIcon color="app.warningFg" />
                  Please switch Freighter to {stellarNetwork} before unlocking
                </Alert>
              )}

              {step === "timeout" && (
                <Alert status="warning" borderRadius="2xl" bg="app.warningBg" color="app.warningFg">
                  <AlertIcon color="app.warningFg" />
                  <Flex direction="column" gap={1}>
                    <Text>Confirmation is taking longer than expected.</Text>
                    {explorerUrl && (
                      <Link href={explorerUrl} isExternal color="app.accent">
                        Check the transaction on Stellar Expert
                      </Link>
                    )}
                  </Flex>
                </Alert>
              )}

              {isProcessing && (
                <Alert status="info" borderRadius="2xl" bg="app.inputBg" color="app.text">
                  <Flex align="center" gap={3} w="full">
                    <Spinner size="sm" color="app.accent" />
                    <Box>
                      <Text fontSize="sm" fontWeight="semibold">
                        {UNLOCK_STEP_LABEL[step]}
                      </Text>
                      {step === "confirming" && txHash && explorerUrl && (
                        <Link href={explorerUrl} isExternal color="app.accent" fontSize="sm">
                          View transaction on Stellar Expert
                        </Link>
                      )}
                    </Box>
                  </Flex>
                </Alert>
              )}

              {amountValid &&
                !!position.minDepositAmount &&
                remainingStake > 0 &&
                remainingStake < position.minDepositAmount && (
                  <Alert
                    status="warning"
                    borderRadius="2xl"
                    bg="app.warningBg"
                    color="app.warningFg"
                    fontSize="sm"
                  >
                    <AlertIcon color="app.warningFg" />
                    Warning: remaining stake below minimum — the contract will close this position entirely
                  </Alert>
                )}

              {error && step !== "timeout" && (
                <Alert
                  status="error"
                  borderRadius="2xl"
                  bg="app.errorBg"
                  color="app.errorFg"
                  fontSize="sm"
                >
                  <AlertIcon color="app.errorFg" />
                  {error}
                </Alert>
              )}

              <Button
                borderRadius="2xl"
                bg="app.accent"
                color="app.onAccent"
                _hover={{ opacity: 0.9 }}
                isDisabled={!canUnlock || !amountValid || isProcessing || isNetworkMismatch}
                onClick={() => void handleUnlock()}
                w="full"
              >
                {isProcessing ? (
                  <Flex align="center" gap={2}>
                    <Spinner size="sm" />
                    <Text>{UNLOCK_STEP_LABEL[step]}</Text>
                  </Flex>
                ) : (
                  "Unlock with Freighter"
                )}
              </Button>
            </Flex>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
