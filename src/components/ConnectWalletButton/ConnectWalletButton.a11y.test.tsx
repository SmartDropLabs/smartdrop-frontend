import { ChakraProvider } from "@chakra-ui/react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ConnectWalletButton from "./ConnectWalletButton";

const PUBLIC_KEY = "GA3CD2PYXOQCXW7ZVQW3MOA3JFZCE4F4IG2FD66I55TQASPCNKYYEFRN";

vi.mock("@/context/StellarWalletContext", () => ({
  useStellarWallet: () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    publicKey: PUBLIC_KEY,
    isConnected: true,
  }),
}));
vi.mock("@/context/ErrorContext", () => ({
  useErrorHandler: () => ({ success: vi.fn(), handleError: vi.fn() }),
}));

describe("ConnectWalletButton connected address (#571)", () => {
  it("renders the truncated address as a focusable button naming the full key", () => {
    render(
      <ChakraProvider>
        <ConnectWalletButton />
      </ChakraProvider>,
    );

    const copy = screen.getByRole("button", {
      name: `Copy wallet address ${PUBLIC_KEY}`,
    });
    expect(copy.tagName).toBe("BUTTON");
    expect(copy.textContent).toBe("GA3C...EFRN");
  });
});
