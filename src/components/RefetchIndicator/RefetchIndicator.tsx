"use client";

import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { Flex, Spinner, Text, IconButton } from "@chakra-ui/react";
import { CloseIcon } from "@chakra-ui/icons";

interface RefetchIndicatorProps {
  /** Narrow to a specific query key; omit to watch all queries. */
  queryKey?: unknown[];
}

export default function RefetchIndicator({ queryKey }: RefetchIndicatorProps) {
  const filters = queryKey ? { queryKey } : undefined;
  const isFetching = useIsFetching(filters);
  const queryClient = useQueryClient();

  if (!isFetching) return null;

  const handleCancel = () => {
    queryClient.cancelQueries(filters);
  };

  return (
    <Flex
      align="center"
      gap={2}
      px={3}
      py={1}
      borderRadius="md"
      bg="app.surface"
      border="1px solid"
      borderColor="app.border"
      role="status"
      aria-live="polite"
      aria-label="Background data refresh in progress"
    >
      <Spinner size="xs" color="app.accent" />
      <Text fontSize="xs" color="app.text">
        Refreshing…
      </Text>
      <IconButton
        aria-label="Cancel refresh"
        icon={<CloseIcon boxSize={2} />}
        size="xs"
        variant="ghost"
        color="app.text"
        onClick={handleCancel}
      />
    </Flex>
  );
}
