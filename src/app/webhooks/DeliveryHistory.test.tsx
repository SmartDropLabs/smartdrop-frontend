import { render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BackendApiError, type WebhookDelivery } from "@/lib/backend";
import { DELIVERY_HISTORY_LIMIT, DeliveryHistory } from "./DeliveryHistory";

vi.mock("@/lib/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/backend")>();
  return { ...actual, listWebhookDeliveries: vi.fn() };
});

const { listWebhookDeliveries } = await import("@/lib/backend");
const listDeliveriesMock = vi.mocked(listWebhookDeliveries);

function renderHistory() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ChakraProvider>
      <QueryClientProvider client={queryClient}>
        <DeliveryHistory webhookId="wh1" />
      </QueryClientProvider>
    </ChakraProvider>,
  );
}

function makeDelivery(overrides: Partial<WebhookDelivery>): WebhookDelivery {
  return {
    id: "d1",
    webhook_id: "wh1",
    event_id: "e1",
    event_type: "pool.created",
    status: "success",
    attempts: 1,
    last_error: null,
    last_attempt_at: "2026-01-01T00:00:00Z",
    next_retry_at: null,
    response_status: 200,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("DeliveryHistory (#778)", () => {
  beforeEach(() => {
    listDeliveriesMock.mockReset();
  });

  it("requests the webhook's recent deliveries", async () => {
    listDeliveriesMock.mockResolvedValue({ deliveries: [] });
    renderHistory();

    expect(await screen.findByText("No deliveries yet.")).toBeInTheDocument();
    expect(listDeliveriesMock).toHaveBeenCalledWith("wh1", DELIVERY_HISTORY_LIMIT);
  });

  it("lists each delivery with its event, status, attempts and HTTP status", async () => {
    listDeliveriesMock.mockResolvedValue({
      deliveries: [
        makeDelivery({}),
        makeDelivery({
          id: "d2",
          event_type: "price.alert",
          status: "failed",
          attempts: 3,
          response_status: 500,
          last_error: "error_response",
        }),
      ],
    });
    renderHistory();

    expect(await screen.findByText("pool.created")).toBeInTheDocument();
    expect(screen.getByText("price.alert")).toBeInTheDocument();
    expect(screen.getByText("success")).toBeInTheDocument();
    expect(screen.getByText("failed")).toBeInTheDocument();
    expect(screen.getByText(/3 attempts · HTTP 500 · error_response/)).toBeInTheDocument();
    expect(screen.getByText(/1 attempt · HTTP 200/)).toBeInTheDocument();
  });

  it("shows an error with retry when the history cannot be loaded", async () => {
    // A 4xx is not retried by backendQueryRetry, so the error renders at once.
    listDeliveriesMock.mockRejectedValue(new BackendApiError("Webhook not found", 404));
    renderHistory();

    expect(await screen.findByText("Webhook not found")).toBeInTheDocument();
  });
});
