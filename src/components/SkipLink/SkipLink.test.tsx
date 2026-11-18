import { ChakraProvider } from "@chakra-ui/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SkipLink, { MAIN_CONTENT_ID } from "./SkipLink";

function renderWithMain() {
  return render(
    <ChakraProvider>
      <SkipLink />
      <nav>
        <a href="/farm">Farm</a>
      </nav>
      <main id={MAIN_CONTENT_ID} tabIndex={-1}>
        content
      </main>
    </ChakraProvider>,
  );
}

describe("SkipLink (#575)", () => {
  it("is the first focusable element and points at the main landmark", () => {
    renderWithMain();
    const link = screen.getByRole("link", { name: "Skip to main content" });
    expect(link.getAttribute("href")).toBe(`#${MAIN_CONTENT_ID}`);

    const focusables = document.querySelectorAll("a[href], button");
    expect(focusables[0]).toBe(link);
  });

  it("moves keyboard focus into <main> when activated", () => {
    renderWithMain();
    fireEvent.click(screen.getByRole("link", { name: "Skip to main content" }));
    expect(document.activeElement).toBe(screen.getByRole("main"));
  });
});
