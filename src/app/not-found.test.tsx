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

  // #784
  it("suggests recently visited pages, leaving out the URL that 404'd", async () => {
    window.localStorage.setItem(
      "smartdrop:recent-pages",
      JSON.stringify(["/farm/typo", "/leaderboard", "/prices"]),
    );
    renderNotFound("/farm/typo");

    const nav = await screen.findByRole("navigation", { name: "Recently visited pages" });
    const links = Array.from(nav.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(links).toEqual(["/leaderboard", "/prices"]);
    await waitFor(() =>
      expect(JSON.parse(window.localStorage.getItem("smartdrop:recent-pages") ?? "[]")).toEqual([
        "/leaderboard",
        "/prices",
      ]),
    );
    window.localStorage.clear();
  });

  it("shows no suggestions when nothing has been visited", () => {
    window.localStorage.clear();
    renderNotFound("/no-such-page");

    expect(screen.queryByRole("navigation", { name: "Recently visited pages" })).toBeNull();
  });
});
