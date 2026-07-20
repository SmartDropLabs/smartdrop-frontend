import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import NetworkMismatchBanner from "./NetworkMismatchBanner";
import {
  StellarWalletProvider,
  useStellarWallet,
} from "@/context/StellarWalletContext";

const freighterMock = vi.hoisted(() => ({
  getAddress: vi.fn(),
  getNetworkDetails: vi.fn(),
  isAllowed: vi.fn(),
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  signTransaction: vi.fn(),
}));

vi.mock("@stellar/freighter-api", () => freighterMock);

const TEST_PUBLIC_KEY =
  "GA3CD2PYXOQCXW7ZVQW3MOA3JFZCE4F4IG2FD66I55TQASPCNKYYEFRN";

function ConnectHarness() {
  const { connect } = useStellarWallet();

  return <button onClick={() => void connect()}>Connect</button>;
}

function renderBannerHarness() {
  return render(
    <ChakraProvider>
      <StellarWalletProvider>
        <NetworkMismatchBanner />
        <ConnectHarness />
      </StellarWalletProvider>
    </ChakraProvider>,
  );
}

describe("NetworkMismatchBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    freighterMock.isConnected.mockResolvedValue({ isConnected: true });
    freighterMock.isAllowed.mockResolvedValue({ isAllowed: true });
    freighterMock.getAddress.mockResolvedValue({ address: TEST_PUBLIC_KEY });
    freighterMock.requestAccess.mockResolvedValue({ address: TEST_PUBLIC_KEY });
    freighterMock.getNetworkDetails.mockResolvedValue({
      network: "PUBLIC",
      networkUrl: "https://horizon.stellar.org",
      networkPassphrase: "Public Global Stellar Network ; September 2015",
    });
  });

  it("shows a warning when Freighter is connected to a mismatched network", async () => {
    renderBannerHarness();

    fireEvent.click(screen.getByRole("button", { name: "Connect" }));

    expect(
      await screen.findByText(
        /Freighter is set to PUBLIC\. Switch to TESTNET to use SmartDrop\./,
      ),
    ).toBeTruthy();
    expect(freighterMock.getNetworkDetails).toHaveBeenCalledTimes(1);
  });

  it("refreshes network details when the tab becomes visible again", async () => {
    freighterMock.getNetworkDetails
      .mockResolvedValueOnce({
        network: "PUBLIC",
        networkUrl: "https://horizon.stellar.org",
        networkPassphrase: "Public Global Stellar Network ; September 2015",
      })
      .mockResolvedValueOnce({
        network: "TESTNET",
        networkUrl: "https://horizon-testnet.stellar.org",
        networkPassphrase: "Test SDF Network ; September 2015",
      });

    renderBannerHarness();

    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    await screen.findByText(
      /Freighter is set to PUBLIC\. Switch to TESTNET to use SmartDrop\./,
    );

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));

    await waitFor(() => {
      expect(
        screen.queryByText(
          /Freighter is set to PUBLIC\. Switch to TESTNET to use SmartDrop\./,
        ),
      ).toBeNull();
    });
    expect(freighterMock.getNetworkDetails).toHaveBeenCalledTimes(2);
  });
});
