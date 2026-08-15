import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChakraProvider } from "@chakra-ui/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AirdropsPage from "@/app/airdrops/page";
import * as backendModule from "@/lib/backend";

describe("AirdropsPage Pagination (#131)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  it("does not render pagination controls when total_pages is 1", async () => {
    vi.spyOn(backendModule, "listAirdrops").mockResolvedValue({
      airdrops: [
        {
          id: "air-1",
          name: "Test Airdrop 1",
          total_amount: 1000,
          asset: "XLM",
          expiry_ledger: 500000,
          status: "completed",
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        total_pages: 1,
      },
    } as any);

    render(
      <ChakraProvider>
        <QueryClientProvider client={queryClient}>
          <AirdropsPage />
        </QueryClientProvider>
      </ChakraProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Airdrop 1")).toBeDefined();
    });

    expect(screen.queryByText("Next")).toBeNull();
    expect(screen.queryByText("Prev")).toBeNull();
  });

  it("renders pagination controls and navigates to page 2 when Next is clicked", async () => {
    const listSpy = vi.spyOn(backendModule, "listAirdrops").mockImplementation(async (page) => ({
      airdrops: [
        {
          id: `air-${page}`,
          name: `Airdrop Page ${page}`,
          total_amount: 5000,
          asset: "XLM",
          expiry_ledger: 600000,
          status: "executing",
        },
      ],
      pagination: {
        page,
        limit: 20,
        total: 45,
        total_pages: 3,
      },
    } as any));

    render(
      <ChakraProvider>
        <QueryClientProvider client={queryClient}>
          <AirdropsPage />
        </QueryClientProvider>
      </ChakraProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Airdrop Page 1")).toBeDefined();
    });

    const prevBtn = screen.getByText("Prev");
    const nextBtn = screen.getByText("Next");

    expect(prevBtn).toBeDefined();
    expect(nextBtn).toBeDefined();
    expect(prevBtn.hasAttribute("disabled")).toBe(true);
    expect(nextBtn.hasAttribute("disabled")).toBe(false);

    // Click Next to navigate to Page 2
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(2, 20);
    });

    await waitFor(() => {
      expect(screen.getByText("Airdrop Page 2")).toBeDefined();
    });
  });
});
