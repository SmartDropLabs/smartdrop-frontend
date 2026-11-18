"use client";

import { useCallback, useRef, useEffect, useState } from "react";

/**
 * Keyboard navigation hook for data tables.
 *
 * Supports arrow key navigation between table cells, Home/End for
 * row start/end, and PageUp/PageDown for multi-row scrolling.
 */
export function useTableKeyboardNav(rowCount: number, colCount: number) {
  const [activeCell, setActiveCell] = useState({ row: 0, col: 0 });
  const tableRef = useRef<HTMLTableElement>(null);

  const focusCell = useCallback(
    (row: number, col: number) => {
      const clampedRow = Math.max(0, Math.min(row, rowCount - 1));
      const clampedCol = Math.max(0, Math.min(col, colCount - 1));
      setActiveCell({ row: clampedRow, col: clampedCol });

      const cell = tableRef.current?.querySelector(
        `[data-row="${clampedRow}"][data-col="${clampedCol}"]`
      ) as HTMLElement | null;
      cell?.focus();
    },
    [rowCount, colCount]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTableElement>) => {
      const { row, col } = activeCell;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          focusCell(row - 1, col);
          break;
        case "ArrowDown":
          e.preventDefault();
          focusCell(row + 1, col);
          break;
        case "ArrowLeft":
          e.preventDefault();
          focusCell(row, col - 1);
          break;
        case "ArrowRight":
          e.preventDefault();
          focusCell(row, col + 1);
          break;
        case "Home":
          e.preventDefault();
          focusCell(row, 0);
          break;
        case "End":
          e.preventDefault();
          focusCell(row, colCount - 1);
          break;
        case "PageUp":
          e.preventDefault();
          focusCell(row - 5, col);
          break;
        case "PageDown":
          e.preventDefault();
          focusCell(row + 5, col);
          break;
      }
    },
    [activeCell, focusCell, colCount]
  );

  // Focus the first cell when the table mounts
  useEffect(() => {
    if (rowCount > 0 && colCount > 0) {
      const cell = tableRef.current?.querySelector(
        '[data-row="0"][data-col="0"]'
      ) as HTMLElement | null;
      cell?.focus();
    }
  }, [rowCount, colCount]);

  return {
    tableRef,
    activeCell,
    handleKeyDown,
    focusCell,
  };
}
