/**
 * Hook for displaying errors and other notifications to the user.
 * Uses Chakra UI toast for consistent, accessible notifications.
 */

"use client";

import {
    type RetryConfig,
    errorLogger,
    normalizeError,
    withRetry
} from "@/lib/error-handler";
import { Box, Button, Text, useColorModeValue, useToast as useChakraToast } from "@chakra-ui/react";
import { useCallback } from "react";

export type NotificationType = "success" | "error" | "info" | "warning";

interface ToastOptions {
  duration?: number;
  isClosable?: boolean;
  position?: "top" | "top-right" | "top-left" | "bottom" | "bottom-right" | "bottom-left";
}

const DEFAULT_TOAST_OPTIONS: ToastOptions = {
  duration: 5000,
  isClosable: true,
  position: "bottom-right",
};

export function useToast() {
  const chakraToast = useChakraToast();

  // Retry-button colors inside the error toast (issue #450). The toast is a
  // solid Alert: light mode paints red.600 with white text, dark mode paints
  // red.200 with near-black text — so a single hardcoded whiteAlpha pair can
  // only ever match one of them. Derive both from the active color mode.
  const retryBorderColor = useColorModeValue("whiteAlpha.600", "blackAlpha.400");
  const retryHoverBg = useColorModeValue("whiteAlpha.200", "blackAlpha.100");

  /**
   * Show a success notification.
   */
  const success = useCallback(
    (title: string, description?: string, options: ToastOptions = {}) => {
      chakraToast({
        title,
        description,
        status: "success",
        ...DEFAULT_TOAST_OPTIONS,
        ...options,
      });
    },
    [chakraToast]
  );

  /**
   * Show an error notification.
   */
  const error = useCallback(
    (title: string, description?: string, options: ToastOptions = {}) => {
      chakraToast({
        title,
        description,
        status: "error",
        ...DEFAULT_TOAST_OPTIONS,
        ...options,
      });
    },
    [chakraToast]
  );

  /**
   * Show an info notification.
   */
  const info = useCallback(
    (title: string, description?: string, options: ToastOptions = {}) => {
      chakraToast({
        title,
        description,
        status: "info",
        ...DEFAULT_TOAST_OPTIONS,
        ...options,
      });
    },
    [chakraToast]
  );

  /**
   * Show a warning notification.
   */
  const warning = useCallback(
    (title: string, description?: string, options: ToastOptions = {}) => {
      chakraToast({
        title,
        description,
        status: "warning",
        ...DEFAULT_TOAST_OPTIONS,
        ...options,
      });
    },
    [chakraToast]
  );

  /**
   * Handle and display an error to the user.
   * Automatically logs the error and shows a user-friendly message.
   *
   * Pass `onRetry` (issue #250) to render a "Retry" action inside the toast
   * itself, so the user can re-attempt the same operation without manually
   * dismissing the toast and re-triggering the flow from scratch. Omit it
   * for errors that genuinely aren't retryable (e.g. validation failures).
   */
  const handleError = useCallback(
    (error: unknown, context?: string, onRetry?: () => void) => {
      const normalized = normalizeError(error, context);
      errorLogger.log(normalized, context);

      if (onRetry) {
        chakraToast({
          title: "Error",
          status: "error",
          ...DEFAULT_TOAST_OPTIONS,
          duration: 8000,
          description: (
            <Box>
              <Text>{normalized.userMessage}</Text>
              <Button
                size="sm"
                mt={2}
                variant="outline"
                borderColor={retryBorderColor}
                color="inherit"
                _hover={{ bg: retryHoverBg }}
                onClick={() => {
                  chakraToast.closeAll();
                  onRetry();
                }}
              >
                Retry
              </Button>
            </Box>
          ),
        });
      } else {
        chakraToast({
          title: "Error",
          description: normalized.userMessage,
          status: "error",
          ...DEFAULT_TOAST_OPTIONS,
          duration: 6000, // Slightly longer for errors
        });
      }

      return normalized;
    },
    [chakraToast, retryBorderColor, retryHoverBg]
  );

  /**
   * Execute a function with automatic error handling and success notification.
   * Shows a loading toast while executing.
   */
  const withErrorHandling = useCallback(
    async <T,>(
      fn: () => Promise<T>,
      options: {
        loadingMessage?: string;
        successMessage?: string;
        errorContext?: string;
        toastOptions?: ToastOptions;
        retryConfig?: Partial<RetryConfig>;
      } = {}
    ): Promise<T | null> => {
      const {
        loadingMessage,
        successMessage,
        errorContext,
        toastOptions = {},
        retryConfig,
      } = options;

      const toastId = loadingMessage
        ? chakraToast({
            title: loadingMessage,
            status: "info",
            duration: null, // Don't auto-close while loading
            isClosable: false,
            ...DEFAULT_TOAST_OPTIONS,
            ...toastOptions,
          })
        : null;

      try {
        // Execute with retry if configured
        const result = retryConfig
          ? await withRetry(fn, retryConfig)
          : await fn();

        // Close loading toast if it exists
        if (toastId) chakraToast.close(toastId);

        // Show success notification
        if (successMessage) {
          chakraToast({
            title: "Success",
            description: successMessage,
            status: "success",
            ...DEFAULT_TOAST_OPTIONS,
            ...toastOptions,
          });
        }

        return result;
      } catch (err) {
        // Close loading toast if it exists
        if (toastId) chakraToast.close(toastId);

        // Handle and display error
        handleError(err, errorContext);
        return null;
      }
    },
    [chakraToast, handleError]
  );

  return {
    success,
    error,
    info,
    warning,
    handleError,
    withErrorHandling,
  };
}

export type UseToastReturn = ReturnType<typeof useToast>;
