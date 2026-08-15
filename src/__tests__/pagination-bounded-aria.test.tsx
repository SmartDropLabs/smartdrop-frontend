import { render, screen, fireEvent } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import Pagination, { getPageWindow } from "@/components/Pagination/Pagination";

describe("Pagination Component (#135)", () => {
  const renderWithChakra = (ui: React.ReactElement) => {
    return render(<ChakraProvider>{ui}</ChakraProvider>);
  };

  describe("getPageWindow math helper", () => {
    it("returns [1] for 1 page", () => {
      expect(getPageWindow(1, 1)).toEqual([1]);
    });

    it("returns all pages when totalPages <= 7", () => {
      expect(getPageWindow(3, 5)).toEqual([1, 2, 3, 4, 5]);
    });

    it("bounds large page numbers with right ellipsis when near beginning", () => {
      const window = getPageWindow(2, 100);
      expect(window).toEqual([1, 2, 3, 4, 5, "ellipsis-right", 100]);
      expect(window.length).toBeLessThan(10);
    });

    it("bounds large page numbers with left ellipsis when near end", () => {
      const window = getPageWindow(99, 100);
      expect(window).toEqual([1, "ellipsis-left", 96, 97, 98, 99, 100]);
      expect(window.length).toBeLessThan(10);
    });

    it("bounds large page numbers with both ellipses when in the middle", () => {
      const window = getPageWindow(50, 100);
      expect(window).toEqual([1, "ellipsis-left", 49, 50, 51, "ellipsis-right", 100]);
      expect(window.length).toBeLessThan(10);
    });
  });

  describe("ARIA and Accessibility", () => {
    it("sets aria-current='page' only on the active page button", () => {
      const onPageChange = vi.fn();
      renderWithChakra(
        <Pagination
          currentPage={3}
          totalPages={10}
          onPageChange={onPageChange}
        />
      );

      const activeBtn = screen.getByRole("button", { current: "page" });
      expect(activeBtn).toBeDefined();
      expect(activeBtn.textContent).toBe("3");
    });

    it("provides descriptive aria-labels for screen readers", () => {
      const onPageChange = vi.fn();
      renderWithChakra(
        <Pagination
          currentPage={1}
          totalPages={50}
          onPageChange={onPageChange}
        />
      );

      expect(screen.getByLabelText("Go to previous page")).toBeDefined();
      expect(screen.getByLabelText("Go to next page")).toBeDefined();
      expect(screen.getByLabelText("Page 1, current page")).toBeDefined();
      expect(screen.getByLabelText("Go to page 2")).toBeDefined();
    });

    it("invokes onPageChange with correct target page when clicked", () => {
      const onPageChange = vi.fn();
      renderWithChakra(
        <Pagination
          currentPage={2}
          totalPages={10}
          onPageChange={onPageChange}
        />
      );

      fireEvent.click(screen.getByLabelText("Go to page 3"));
      expect(onPageChange).toHaveBeenCalledWith(3);

      fireEvent.click(screen.getByLabelText("Go to previous page"));
      expect(onPageChange).toHaveBeenCalledWith(1);

      fireEvent.click(screen.getByLabelText("Go to next page"));
      expect(onPageChange).toHaveBeenCalledWith(3);
    });

    it("renders nothing when totalPages <= 1", () => {
      renderWithChakra(
        <Pagination currentPage={1} totalPages={1} onPageChange={vi.fn()} />
      );
      expect(screen.queryByRole("navigation")).toBeNull();
    });
  });
});
