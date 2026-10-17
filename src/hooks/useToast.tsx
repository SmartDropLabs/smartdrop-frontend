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
import { Box, Button, Text, useToast as useChakraToast } from "@chakra-ui/react";
import { useCallback, useMemo } from "react";

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

/**
 * Container style that ensures toasts stack vertically with spacing instead
 * of overlapping (#596). Chakra's default toast container uses absolute
 * positioning which can cause overlap at the same position.
 */
const TOAST_CONTAINER_STYLE = {
  maxWidth: "380px",
  gap: "8px",
  display: "flex",
  flexDirection: "column-reverse" as const,
};

export function useToast() {
  const chakraToast = useChakraToast();

  // Retry button inside the error toast (issues #450 and #478). The toast is a
  // solid Alert: light mode paints red.600 with white text, dark mode paints
  // red.200 with near-black text — so its border/hover tint comes from the
  // app.toastRetryBorder / app.toastRetryHoverBg semantic tokens, which flip
  // with the color mode instead of hardcoding a whiteAlpha/blackAlpha pair.

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
        containerStyle: TOAST_CONTAINER_STYLE,
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
        containerStyle: TOAST_CONTAINER_STYLE,
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
        containerStyle: TOAST_CONTAINER_STYLE,
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
        containerStyle: TOAST_CONTAINER_STYLE,
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
          containerStyle: TOAST_CONTAINER_STYLE,
          description: (
            <Box>
              <Text>{normalized.userMessage}</Text>
              <Button
                size="sm"
                mt={2}
                variant="outline"
                borderColor="app.toastRetryBorder"
                color="inherit"
                _hover={{ bg: "app.toastRetryHoverBg" }}
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
          containerStyle: TOAST_CONTAINER_STYLE,
        });
      }

      return normalized;
    },
    [chakraToast]
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
            containerStyle: TOAST_CONTAINER_STYLE,
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
            containerStyle: TOAST_CONTAINER_STYLE,
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

  // Memoized so the returned object keeps its identity across renders —
  // ErrorProvider hands it to every useErrorHandler() consumer via context,
  // and a fresh object here would re-render all of them on each render.
  return useMemo(
    () => ({
      success,
      error,
      info,
      warning,
      handleError,
      withErrorHandling,
    }),
    [success, error, info, warning, handleError, withErrorHandling],
  );
}

export type UseToastReturn = ReturnType<typeof useToast>;
