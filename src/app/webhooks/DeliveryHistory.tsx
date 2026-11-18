"use client";

import { Badge, Box, Flex, Spinner, Text } from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import { backendQueryRetry, listWebhookDeliveries, type WebhookDelivery } from "@/lib/backend";
import { QueryErrorAlert } from "@/components/QueryErrorAlert/QueryErrorAlert";

export const DELIVERY_HISTORY_LIMIT = 20;

function statusScheme(status: string): string {
  if (status === "delivered" || status === "success") return "green";
  if (status === "failed" || status === "dead" || status === "dead_letter") return "red";
  return "yellow";
}

function formatTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function DeliveryRow({ delivery }: { delivery: WebhookDelivery }) {
  return (
    <Flex
      as="li"
      justify="space-between"
      align="center"
      gap={3}
      py={2}
      borderTop="1px solid"
      borderColor="app.border"
      flexWrap="wrap"
    >
      <Box minW={0}>
        <Text fontFamily="mono" fontSize="sm">{delivery.event_type}</Text>
        <Text fontSize="xs" color="app.muted">
          {formatTime(delivery.last_attempt_at ?? delivery.created_at)} · {delivery.attempts}{" "}
          attempt{delivery.attempts === 1 ? "" : "s"}
          {delivery.response_status != null ? ` · HTTP ${delivery.response_status}` : ""}
          {delivery.last_error ? ` · ${delivery.last_error}` : ""}
        </Text>
      </Box>
      <Badge colorScheme={statusScheme(delivery.status)} borderRadius="full" px={2}>
        {delivery.status}
      </Badge>
    </Flex>
  );
}

/**
 * Recent delivery attempts for one webhook (#778), so a misbehaving endpoint
 * can be debugged from the UI instead of only from server logs.
 */
export function DeliveryHistory({ webhookId }: { webhookId: string }) {
  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ["webhook-deliveries", webhookId],
    queryFn: () => listWebhookDeliveries(webhookId, DELIVERY_HISTORY_LIMIT),
    ...backendQueryRetry,
  });

  if (isLoading) {
    return (
      <Flex justify="center" py={4}>
        <Spinner color="app.accent" size="sm" />
      </Flex>
    );
  }
  if (isError) {
    return (
      <QueryErrorAlert
        error={error}
        onRetry={() => refetch()}
        isRetrying={isFetching}
        fallbackMessage="Failed to load delivery history"
      />
    );
  }
  if (!data || data.deliveries.length === 0) {
    return <Text fontSize="sm" color="app.muted" py={2}>No deliveries yet.</Text>;
  }
  return (
    <Box as="ul" listStyleType="none" m={0} p={0} aria-label="Delivery history">
      {data.deliveries.map((delivery) => (
        <DeliveryRow key={delivery.id} delivery={delivery} />
      ))}
    </Box>
  );
}
