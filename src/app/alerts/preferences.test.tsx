import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Alert } from "@/lib/backend";
import AlertsPage from "./page";

vi.mock("@/lib/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/backend")>();
  return { ...actual, listAlerts: vi.fn(), createAlert: vi.fn() };
});

const { listAlerts, createAlert } = await import("@/lib/backend");
const listAlertsMock = vi.mocked(listAlerts);
const createAlertMock = vi.mocked(createAlert);

const API_KEY = "test-api-key-0123456789";

function makeAlert(overrides: Partial<Alert>): Alert {
  return {
    id: "al1",
    asset: "XLM",
    type: "above",
    threshold_usd: 0.2,
    webhook_url: "https://example.com/hook",
    repeat: false,
    created_at: "2024-01-01T00:00:00Z",
    last_fired_at: null,
    ...overrides,
  };
}

function renderWithKey() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <ChakraProvider>
      <QueryClientProvider client={queryClient}>
        <AlertsPage />
      </QueryClientProvider>
    </ChakraProvider>,
  );
  fireEvent.change(screen.getByPlaceholderText(/smartdrop-backend api key/i), {
    target: { value: API_KEY },
  });
}

const pagination = { page: 1, limit: 20, total: 2, total_pages: 1 };

describe("AlertsPage notification preferences (#780)", () => {
  beforeEach(() => {
    listAlertsMock.mockReset();
    createAlertMock.mockReset();
  });

  it("shows each alert's delivery preference", async () => {
    listAlertsMock.mockResolvedValue({
      data: [makeAlert({ id: "a1", asset: "XLM", repeat: true }), makeAlert({ id: "a2", asset: "USDC" })],
      pagination,
    });
    renderWithKey();

    expect(await screen.findByText("Repeats")).toBeInTheDocument();
    expect(screen.getByText("Once")).toBeInTheDocument();
  });

  it("sends the repeat preference when creating an alert", async () => {
    listAlertsMock.mockResolvedValue({ data: [], pagination });
    createAlertMock.mockResolvedValue(makeAlert({ repeat: true }));
    renderWithKey();

    fireEvent.change(screen.getByPlaceholderText("XLM"), { target: { value: "xlm" } });
    fireEvent.change(screen.getByPlaceholderText("0.15"), { target: { value: "0.3" } });
    fireEvent.change(screen.getByPlaceholderText("https://example.com/alerts"), {
      target: { value: "https://example.com/alerts" },
    });
    const secret = screen.getByText("Webhook secret (min 8 characters)").nextElementSibling as HTMLInputElement;
    fireEvent.change(secret, { target: { value: "supersecret" } });
    fireEvent.click(screen.getByLabelText("Notify every time the threshold is crossed"));
    fireEvent.click(screen.getByRole("button", { name: "Create alert" }));

    await waitFor(() => expect(createAlertMock).toHaveBeenCalled());
    expect(createAlertMock).toHaveBeenCalledWith(
      API_KEY,
      expect.objectContaining({ asset: "XLM", repeat: true }),
    );
  });

  it("defaults to notifying once", async () => {
    listAlertsMock.mockResolvedValue({ data: [], pagination });
    renderWithKey();

    const repeat = await screen.findByLabelText("Notify every time the threshold is crossed");
    expect(repeat).not.toBeChecked();
    expect(screen.getByText(/fires once/)).toBeInTheDocument();
  });

  it("can hide alerts already marked as read", async () => {
    listAlertsMock.mockResolvedValue({
      data: [makeAlert({ id: "a1", asset: "XLM" }), makeAlert({ id: "a2", asset: "USDC" })],
      pagination,
    });
    renderWithKey();

    fireEvent.click(await screen.findByLabelText("Select alert for XLM"));
    fireEvent.click(screen.getByRole("button", { name: "Mark 1 as read" }));
    fireEvent.click(screen.getByLabelText("Hide read alerts"));

    expect(screen.queryByText("XLM")).not.toBeInTheDocument();
    expect(screen.getByText("USDC")).toBeInTheDocument();
  });
});
