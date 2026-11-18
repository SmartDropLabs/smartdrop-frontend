import { act, render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import OfflineBanner from "./OfflineBanner";

function setOnline(value: boolean) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(value);
}

function renderBanner() {
  return render(
    <ChakraProvider>
      <OfflineBanner />
    </ChakraProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("OfflineBanner (#528)", () => {
  it("renders nothing while online", () => {
    setOnline(true);
    renderBanner();
    expect(screen.queryByText(/you're offline/i)).toBeNull();
  });

  it("shows the banner when the browser goes offline and hides it on reconnect", () => {
    setOnline(true);
    renderBanner();

    setOnline(false);
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByText(/you're offline/i)).toBeTruthy();
    expect(screen.getByRole("status")).toBeTruthy();

    setOnline(true);
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(screen.queryByText(/you're offline/i)).toBeNull();
  });

  it("renders immediately when mounted offline", () => {
    setOnline(false);
    renderBanner();
    expect(screen.getByText(/you're offline/i)).toBeTruthy();
  });
});
