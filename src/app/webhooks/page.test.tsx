import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Webhook } from "@/lib/backend";
import WebhooksPage from "./page";

vi.mock("@/lib/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/backend")>();
  return { ...actual, listWebhooks: vi.fn(), testWebhook: vi.fn() };
});

const { listWebhooks, testWebhook } = await import("@/lib/backend");
const listWebhooksMock = vi.mocked(listWebhooks);
const testWebhookMock = vi.mocked(testWebhook);

function renderPage() {
  const queryClient = new QueryClient();
  return render(
    <ChakraProvider>
      <QueryClientProvider client={queryClient}>
        <WebhooksPage />
      </QueryClientProvider>
    </ChakraProvider>,
  );
}

function makeWebhook(overrides: Partial<Webhook>): Webhook {
  return {
    id: "wh1",
    url: "https://example.com/hook",
    events: ["pool.created"],
    active: true,
    description: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    secret_preview: null,
    ...overrides,
  };
}

describe("WebhooksPage test-ping loading state (#390)", () => {
  beforeEach(() => {
    listWebhooksMock.mockReset();
    testWebhookMock.mockReset();
  });

  it("only shows loading on the webhook actually being tested, not every webhook", async () => {
    listWebhooksMock.mockResolvedValue({
      webhooks: [
        makeWebhook({ id: "wh1", url: "https://example.com/one" }),
        makeWebhook({ id: "wh2", url: "https://example.com/two" }),
      ],
    });
    // Never resolves within this test, so isPending stays true for as long
    // as we need to inspect the loading state.
    testWebhookMock.mockReturnValue(new Promise(() => {}));

    renderPage();

    const rows = await screen.findAllByRole("button", { name: "Send test" });
    expect(rows).toHaveLength(2);

    fireEvent.click(rows[0]);

    await waitFor(() => {
      expect(rows[0].hasAttribute("data-loading")).toBe(true);
    });
    // The second webhook's button must NOT pick up the loading state that
    // belongs to the first -- this is exactly the bug #390 describes
    // (testMutation.variables compared against the wrong webhook.id).
    expect(rows[1].hasAttribute("data-loading")).toBe(false);

    expect(testWebhookMock).toHaveBeenCalledTimes(1);
    expect(testWebhookMock.mock.calls[0][0]).toBe("wh1");
  });
});
