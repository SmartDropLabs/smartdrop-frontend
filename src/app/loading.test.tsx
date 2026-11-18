import { act, render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/farm",
}));

import Loading from "./loading";

describe("loading (#783)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function renderLoading() {
    return render(
      <ChakraProvider>
        <Loading />
      </ChakraProvider>,
    );
  }

  it("shows a progress indicator alongside the route skeleton", () => {
    renderLoading();

    expect(screen.getByRole("progressbar", { name: "Loading page" })).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("tells the user when loading is taking longer than usual", () => {
    renderLoading();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByRole("status").textContent).toContain("taking longer than usual");
  });
});
