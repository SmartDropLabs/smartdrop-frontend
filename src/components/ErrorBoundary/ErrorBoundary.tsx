/**
 * Error Boundary component for catching React component errors.
 * Prevents the entire app from crashing if a component fails.
 */

"use client";

import React, { Component, type ReactNode } from "react";
import { Box, Button, Heading, Text, VStack } from "@chakra-ui/react";
import { errorLogger } from "@/lib/error-handler";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error
    errorLogger.log(
      {
        code: "COMPONENT_ERROR",
        userMessage: "A component encountered an error",
        isTransient: false,
        isCritical: true,
        getLogContext: () => ({
          componentStack: errorInfo.componentStack,
          message: error.message,
          stack: error.stack,
        }),
      } as any,
      "React Error Boundary"
    );
  }

  retry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const { error } = this.state;

      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(error!, this.retry);
      }

      // Default fallback UI
      return (
        <Box
          w="100%"
          minH="100vh"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="black"
          color="white"
          p={4}
        >
          <VStack spacing={6} textAlign="center">
            <Heading size="lg">Something went wrong</Heading>
            <Text color="gray.400" maxW="md">
              We encountered an unexpected error. Please try again.
            </Text>
            {process.env.NODE_ENV === "development" && (
              <Box
                bg="gray.900"
                p={4}
                borderRadius="md"
                w="100%"
                maxW="md"
                textAlign="left"
                fontSize="sm"
                fontFamily="mono"
                overflowX="auto"
              >
                <Text color="red.400" fontWeight="bold" mb={2}>
                  {error?.name}: {error?.message}
                </Text>
                <Text color="gray.400" whiteSpace="pre-wrap" fontSize="xs">
                  {error?.stack}
                </Text>
              </Box>
            )}
            <Button
              onClick={this.retry}
              colorScheme="blue"
              size="lg"
              borderRadius="full"
            >
              Try Again
            </Button>
          </VStack>
        </Box>
      );
    }

    return this.props.children;
  }
}

/**
 * Wrapper component that wraps a specific region with error boundary.
 * Useful for isolating errors to specific parts of the app.
 */
export function ErrorBoundarySection({
  children,
  sectionName,
  fallback,
}: {
  children: ReactNode;
  sectionName?: string;
  fallback?: (error: Error, retry: () => void) => ReactNode;
}) {
  return (
    <ErrorBoundary
      fallback={
        fallback ||
        ((error, retry) => (
          <Box
            w="100%"
            p={6}
            borderRadius="md"
            bg="red.900"
            color="white"
            textAlign="center"
          >
            <Heading size="sm" mb={2}>
              {sectionName} Error
            </Heading>
            <Text mb={4}>Failed to load {sectionName}. Please try again.</Text>
            <Button
              onClick={retry}
              size="sm"
              colorScheme="red"
              variant="outline"
            >
              Retry
            </Button>
          </Box>
        ))
      }
    >
      {children}
    </ErrorBoundary>
  );
}
