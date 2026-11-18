import { ChakraProvider } from "@chakra-ui/react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/context/StellarWalletContext", () => ({
  useStellarWallet: () => ({ isConnected: false }),
}));

const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  clear: () => store.clear(),
});

import OnboardingOverlay from "./OnboardingOverlay";

function renderOverlay() {
  return render(
    <ChakraProvider>
      <OnboardingOverlay />
    </ChakraProvider>,
  );
}

describe("OnboardingOverlay", () => {
  beforeEach(() => {
    store.clear();
  });

  it("closes when Escape is pressed", async () => {
    renderOverlay();

    expect(await screen.findByText("Welcome to SmartDrop")).toBeTruthy();

    fireEvent.keyDown(screen.getByRole("dialog"), {
      key: "Escape",
      code: "Escape",
    });

    await waitFor(() => {
      expect(screen.queryByText("Welcome to SmartDrop")).toBeNull();
    });
  });

  it("traps focus within the dialog while open", async () => {
    renderOverlay();

    const dialog = await screen.findByRole("dialog");
    expect(dialog.contains(document.activeElement)).toBe(true);
  });
});
