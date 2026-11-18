"use client";

import {
    AlertDialog,
    AlertDialogBody,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogOverlay,
    Box,
    Button,
    Flex,
    Spinner,
    Text,
} from "@chakra-ui/react";
import { useRef, type ReactNode } from "react";
import { formatFeeEstimate } from "@/lib/fees";

export interface TransactionDetail {
    label: string;
    value: ReactNode;
}

export interface TransactionFeeEstimate {
    /** Simulated Soroban `minResourceFee` in stroops. */
    minResourceFee?: string | null;
    isLoading?: boolean;
    isError?: boolean;
    /** The fee is paid by the SmartDrop fee sponsor, not the user. */
    isSponsored?: boolean;
}

export interface TransactionConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description?: ReactNode;
    details: TransactionDetail[];
    /** Extra caution shown above the actions, e.g. irreversibility notes. */
    warning?: ReactNode;
    /**
     * Estimated network fee, shown as its own row. Confirm stays disabled
     * while the estimate is loading so users never sign without seeing it.
     */
    fee?: TransactionFeeEstimate;
    confirmLabel?: string;
    cancelLabel?: string;
}

/**
 * Last-chance review step shown before a transaction is handed to Freighter.
 * Focus starts on Cancel so a stray Enter press can't submit by accident.
 */
export default function TransactionConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    details,
    warning,
    fee,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
}: TransactionConfirmModalProps) {
    const cancelRef = useRef<HTMLButtonElement>(null);
    const feeLabel = fee ? formatFeeEstimate(fee.minResourceFee) : null;
    const isFeeLoading = !!fee?.isLoading;

    return (
        <AlertDialog
            isOpen={isOpen}
            onClose={onClose}
            leastDestructiveRef={cancelRef}
            isCentered
            lockScrollAcrossViewports
            returnFocusOnClose
        >
            <AlertDialogOverlay backdropFilter="blur(3px)" />
            <AlertDialogContent
                bg="app.surface"
                color="app.text"
                borderRadius="3xl"
                mx={{ base: 4, md: "auto" }}
            >
                <AlertDialogHeader textAlign="center">{title}</AlertDialogHeader>
                <AlertDialogBody>
                    <Flex direction="column" gap={4}>
                        {description && (
                            <Text fontSize="sm" color="app.muted">
                                {description}
                            </Text>
                        )}
                        <Box
                            as="dl"
                            border="1px solid"
                            borderColor="app.border"
                            borderRadius="2xl"
                            p={3}
                        >
                            {details.map((detail) => (
                                <Flex
                                    key={detail.label}
                                    justify="space-between"
                                    fontSize="sm"
                                    py={1}
                                    gap={4}
                                >
                                    <Text as="dt" color="app.muted">
                                        {detail.label}
                                    </Text>
                                    <Text as="dd" textAlign="right" fontWeight="semibold">
                                        {detail.value}
                                    </Text>
                                </Flex>
                            ))}
                            {fee && (
                                <Flex
                                    justify="space-between"
                                    fontSize="sm"
                                    py={1}
                                    gap={4}
                                >
                                    <Text as="dt" color="app.muted">
                                        Estimated network fee
                                    </Text>
                                    <Text
                                        as="dd"
                                        textAlign="right"
                                        fontWeight="semibold"
                                        aria-live="polite"
                                        aria-busy={isFeeLoading}
                                    >
                                        {isFeeLoading ? (
                                            <Flex as="span" align="center" gap={2}>
                                                <Spinner size="xs" />
                                                Estimating…
                                            </Flex>
                                        ) : fee.isError || !feeLabel ? (
                                            "Unavailable"
                                        ) : fee.isSponsored ? (
                                            `${feeLabel} (sponsored)`
                                        ) : (
                                            feeLabel
                                        )}
                                    </Text>
                                </Flex>
                            )}
                        </Box>
                        {fee && !isFeeLoading && (
                            <Text fontSize="xs" color="app.muted">
                                {fee.isError || !feeLabel
                                    ? "We couldn't estimate the network fee. Freighter will show the final fee before you sign."
                                    : "Estimated from a simulation of this transaction. The final fee is set by the network and may differ slightly."}
                            </Text>
                        )}
                        {warning && (
                            <Box
                                borderRadius="2xl"
                                bg="app.warningBg"
                                color="app.warningFg"
                                fontSize="xs"
                                p={3}
                            >
                                {warning}
                            </Box>
                        )}
                    </Flex>
                </AlertDialogBody>
                <AlertDialogFooter gap={2}>
                    <Button
                        ref={cancelRef}
                        variant="ghost"
                        borderRadius="2xl"
                        onClick={onClose}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        borderRadius="2xl"
                        bg="app.accent"
                        color="app.onAccent"
                        _hover={{ opacity: 0.9 }}
                        onClick={onConfirm}
                        isDisabled={isFeeLoading}
                    >
                        {confirmLabel}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
