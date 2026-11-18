import { ChakraProvider } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PricesPage from "./page";
import { getPrice } from "@/lib/backend";

vi.mock("@/lib/backend", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/backend")>()),
  getPrice: vi.fn(),
}));

const price = (asset_code: string, price_usd: number) => ({
  asset_code,
  price_usd,
  source: "dex",
  fetched_at: "2026-10-16T00:00:00Z",
  is_stale: false,
  stale_warning: null,
  sources_attempted: ["dex"],
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ChakraProvider>
      <QueryClientProvider client={client}>
        <PricesPage />
      </QueryClientProvider>
    </ChakraProvider>,
  );
}

describe("PricesPage lookups (#567)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps the previous price on screen (no spinner swap) while a new lookup loads", async () => {
    let resolveUsdc: (v: unknown) => void = () => {};
    vi.mocked(getPrice)
      .mockResolvedValueOnce(price("XLM", 0.12) as never)
      .mockImplementationOnce(() => new Promise((r) => (resolveUsdc = r)) as never);

    renderPage();
    expect(await screen.findByText("XLM")).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText("XLM, USDC…"), { target: { value: "USDC" } });
    fireEvent.click(screen.getByRole("button", { name: /look up/i }));

    // While USDC is in flight, the XLM card is still rendered and the region is busy.
    expect(await screen.findByText("XLM")).toBeTruthy();
    const region = screen.getByText("XLM").closest("[aria-busy]");
    expect(region?.getAttribute("aria-busy")).toBe("true");

    await act(async () => resolveUsdc(price("USDC", 1)));
    expect(await screen.findByText("USDC")).toBeTruthy();
  });
});
