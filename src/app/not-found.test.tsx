import { render, screen, waitFor } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { replaceMock } = vi.hoisted(() => ({ replaceMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => "/",
}));

import NotFound from "./not-found";

function renderNotFound(pathname: string) {
  window.history.replaceState(null, "", pathname);
  return render(
    <ChakraProvider>
      <NotFound />
    </ChakraProvider>,
  );
}

describe("not-found (#444)", () => {
  beforeEach(() => {
    replaceMock.mockReset();
  });

  it("redirects the legacy /leaderbord typo URL to /leaderboard", async () => {
    renderNotFound("/leaderbord");

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/leaderboard"),
    );
  });

  it("redirects /leaderbord with a trailing slash", async () => {
    renderNotFound("/leaderbord/");

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/leaderboard"),
    );
  });

  it("renders the 404 body without redirecting other paths", () => {
    renderNotFound("/no-such-page");

    expect(screen.getByText("404")).toBeTruthy();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
