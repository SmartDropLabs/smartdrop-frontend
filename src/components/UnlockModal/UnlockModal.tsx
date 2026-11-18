"use client";

import {
    poolContractId,
    stellarNetwork,
} from "@/config";
import FieldError from "@/components/FieldError/FieldError";
import TransactionConfirmModal from "@/components/TransactionConfirmModal/TransactionConfirmModal";
import { useErrorHandler } from "@/context/ErrorContext";
import { useStellarWallet } from "@/context/StellarWalletContext";
import { useCountdown } from "@/hooks/useCountdown";
import { useDynamicFocusTrap } from "@/hooks/useDynamicFocusTrap";
import { trackEvent } from "@/lib/analytics";
import {
    stellarExpertTxUrl,
    unlockAssets,
    computePartialUnlockPreview,
    getContractErrorMessage,
    type UserPosition,
} from "@/lib/soroban";
import { QUERY_KEYS, useUnlockAssetsFeePreview } from "@/hooks/useSorobanQuery";
import { formatFeeEstimate } from "@/lib/fees";
import { useFarmStore } from "@/store/farmStore";
import { unlockAvailableAt } from "@/types/farm";
import { useQueryClient } from "@tanstack/react-query";
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
import { useEffect, useId, useMemo, useRef, useState } from "react";

type UnlockStep =
  | "idle"
  | "simulating"
  | "signing"
  | "submitting"
  | "confirming"
  | "success"
  | "timeout"
  | "error";

const UNLOCK_STEP_LABEL: Record<UnlockStep, string> = {
  idle: "",
  simulating: "Simulating transaction...",
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
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<UnlockStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);
  // Callback-ref state (not useRef): ModalContent mounts inside a portal after
  // the first effect pass, so the trap needs a re-render once it exists.
  const [contentEl, setContentEl] = useState<HTMLElement | null>(null);
  const selectedPoolContractId = position?.contractAddress || poolContractId;

  const unlockAt = position ? unlockAvailableAt(position) : 0;
  const countdown = useCountdown(unlockAt);
  const canUnlock = Boolean(position) && countdown.isElapsed;
  const isProcessing =
    step === "simulating" || step === "signing" || step === "submitting" || step === "confirming";

  const numericAmount = Number(amount);
  const amountValid =
    Number.isFinite(numericAmount) &&
    numericAmount >= 0.01 &&
    !!position &&
    numericAmount <= position.lockedAmount;
  const amountError =
    !!amount && !amountValid && position
      ? numericAmount < 0.01
        ? `Minimum unlock amount is 0.01 ${position.symbol}.`
        : numericAmount > position.lockedAmount
          ? `Amount exceeds locked balance of ${position.lockedAmount} ${position.symbol}.`
          : "Enter a valid amount."
      : null;
  const amountErrorId = useId();

  const feePreview = useUnlockAssetsFeePreview({
    publicKey,
    poolContractId: selectedPoolContractId,
    amount: amountValid ? amount : "",
  });

  // Reset transient state whenever the modal opens for a (new) position.
  useEffect(() => {
    if (isUnlock && position) {
      setAmount(String(position.lockedAmount));
      setStep("idle");
      setError(null);
      setTxHash(null);
      setIsConfirmOpen(false);
    }
  }, [isUnlock, position]);

  // Re-anchor focus inside the dialog when its content changes (form ↔ success
  // view, controls disabling mid-transaction) so it can't fall back to <body>.
  useDynamicFocusTrap(contentEl, isUnlock);

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

  const handleConfirmUnlock = () => {
    setIsConfirmOpen(false);
    void handleUnlock();
  };

  const handleUnlock = async () => {
    if (!publicKey || !walletApi) {
      setError("Connect your Freighter wallet to unlock.");
      setStep("error");
      return;
    }
    if (isNetworkMismatch) {
      setError(`Switch Freighter to ${stellarNetwork} to unlock.`);
      setStep("error");
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
    setStep("simulating");
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

    // Snapshot the current position so we can rollback on failure.
    const positionKey = [QUERY_KEYS.USER_POSITION, selectedPoolContractId, publicKey];
    const previousPosition = queryClient.getQueryData<UserPosition>(positionKey);

    // Optimistically reduce the locked amount in the cache so the UI
    // reflects the unlock immediately, before the ledger confirms.
    if (previousPosition) {
      const prevAmount = Number(previousPosition.amount);
      const unlockedAmount = Math.min(numericAmount, prevAmount);
      const newAmount = Math.max(0, prevAmount - unlockedAmount);
      queryClient.setQueryData<UserPosition>(positionKey, {
        ...previousPosition,
        amount: String(newAmount),
        isLocked: false,
        unlockableAt: 0,
      });
    }

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
        // Roll back the optimistic update for definitive failures.
        // On TIMEOUT the transaction may still land, so keep the
        // optimistic state — the next refetch will correct it.
        if (result.status !== "TIMEOUT" && previousPosition) {
          queryClient.setQueryData<UserPosition>(positionKey, previousPosition);
        }

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

      // Invalidate so the next refetch picks up the real ledger state
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USER_POSITION, selectedPoolContractId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USER_POSITION, 'all', publicKey] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USER_CREDITS, selectedPoolContractId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.POOLS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PLATFORM_STATS] });
    } catch (err) {
      // Roll back the optimistic update on thrown errors
      if (previousPosition) {
        queryClient.setQueryData<UserPosition>(positionKey, previousPosition);
      }

      // Issue #250: let the user retry the same unlock straight from the
      // error toast instead of having to reopen the modal and re-enter
      // the amount.
      const normalizedError = toast.handleError(err, "Unlock Transaction", () => void handleUnlock());
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
    <Modal
      isOpen={isUnlock}
      onClose={handleClose}
      lockScrollAcrossViewports
      // Keep keyboard focus inside the dialog (WCAG 2.1.2 / 2.4.3), start on the
      // amount field, and hand focus back to the trigger when the dialog closes.
      trapFocus
      returnFocusOnClose
      initialFocusRef={amountInputRef}
    >
      <ModalOverlay backdropFilter="blur(3px)" />
      <ModalContent
        ref={setContentEl}
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
                    ref={amountInputRef}
                    onFocus={(e) => e.currentTarget.select()}
                    type="number"
                    borderRadius="2xl"
                    placeholder="Amount"
                    h="50px"
                    w="full"
                    pr="120px"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    isDisabled={!canUnlock || isProcessing}
                    isInvalid={Boolean(amountError)}
                    aria-describedby={amountErrorId}
                    borderColor="app.border"
                    bg="app.inputBg"
                    color="app.text"
                    _placeholder={{ color: "app.muted" }}
                    _hover={{ borderColor: "app.accent" }}
                    _focus={{ boxShadow: "none", borderColor: "app.accent" }}
                  />
                  {/* Tab order (#591): these controls sit visually on the right of
                      the amount field and come right after it in the DOM, so Tab
                      walks input → 50% → Max → actions. Real buttons (not click
                      handlers on Text) so keyboard users can actually reach them. */}
                  <Flex
                    position="absolute"
                    top="50%"
                    right="12px"
                    transform="translateY(-50%)"
                    gap={2}
                    align="center"
                  >
                    <Text fontSize="sm">{position.symbol}</Text>
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      color="app.accent"
                      minW="auto"
                      h="auto"
                      px={1}
                      fontSize="xs"
                      isDisabled={!canUnlock || isProcessing}
                      onClick={set50Pct}
                    >
                      50%
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      color="app.accent"
                      minW="auto"
                      h="auto"
                      px={1}
                      fontSize="xs"
                      isDisabled={!canUnlock || isProcessing}
                      onClick={setMax}
                    >
                      Max
                    </Button>
                  </Flex>
                </Box>
              </Flex>

              <FieldError id={amountErrorId} message={amountError} />

              {amountValid && (
                <Box border="1px solid #303030" borderRadius="2xl" p={3}>
                  {infoRow(
                    "Estimated receive",
                    `${numericAmount.toFixed(4)} ${position.symbol}`,
                  )}
                  {infoRow(
                    "Remaining stake",
                    `${remainingStake.toFixed(4)} ${position.symbol}`,
                  )}
                  {infoRow(
                    "New daily rate",
                    `${newDailyRate.toFixed(6)} credits/day`,
                  )}
                  {infoRow(
                    "Estimated Soroban fee",
                    feePreview.isFetching
                      ? "Simulating..."
                      : feePreview.data
                        ? formatFeeEstimate(feePreview.data.feePreview) ?? "Unavailable"
                        : "Unavailable",
                  )}
                </Box>
              )}

              {isProcessing && (
                <Alert status="info" borderRadius="2xl" bg="app.inputBg" color="app.text">
                  <Flex align="center" gap={3} w="full">
                    <Spinner size="sm" color="app.accent" />
                    <Box>
                      <Text fontSize="sm" fontWeight="semibold" aria-live="polite" aria-atomic="true">
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

              {step === "timeout" && (
                <Alert status="warning" borderRadius="2xl" bg="app.warningBg" color="app.warningFg" aria-live="assertive" aria-atomic="true">
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
                  aria-live="assertive"
                  aria-atomic="true"
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
                onClick={() => setIsConfirmOpen(true)}
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
      <TransactionConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmUnlock}
        title="Confirm Unlock"
        description="Review the details below. You'll be asked to sign this transaction in Freighter."
        details={[
          { label: "Pool", value: position.name },
          { label: "Unlock amount", value: `${numericAmount} ${position.symbol}` },
          { label: "Remaining stake", value: `${remainingStake.toFixed(4)} ${position.symbol}` },
          { label: "New daily rate", value: `${newDailyRate.toFixed(6)} credits/day` },
        ]}
        fee={{
          minResourceFee: feePreview.data?.feePreview,
          isLoading: feePreview.isFetching,
          isError: feePreview.isError,
        }}
        warning={
          numericAmount < position.lockedAmount
            ? "Unlocked assets stop earning credits once the transaction confirms."
            : "This closes your entire position. Unlocked assets stop earning credits once the transaction confirms."
        }
        confirmLabel="Confirm Unlock"
      />
    </Modal>
  );
}
