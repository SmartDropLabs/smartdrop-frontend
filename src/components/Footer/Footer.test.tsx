import { ChakraProvider } from "@chakra-ui/react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Footer from "./Footer";

function renderFooter() {
  return render(
    <ChakraProvider>
      <Footer />
    </ChakraProvider>,
  );
}

describe("Footer", () => {
  it("renders as a footer landmark with the SmartDrop brand", () => {
    renderFooter();

    expect(screen.getByRole("contentinfo")).toBeTruthy();
    expect(screen.getByText("SmartDrop")).toBeTruthy();
  });

  it("renders a Contributors link pointing at /contributors", () => {
    renderFooter();

    const link = screen.getByRole("link", { name: "Contributors" });
    expect(link.getAttribute("href")).toBe("/contributors");
  });

  it("shows the current copyright year", () => {
    renderFooter();

    expect(screen.getByText(`© ${new Date().getFullYear()}`)).toBeTruthy();
  });
});
