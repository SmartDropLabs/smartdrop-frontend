import { describe, expect, it, vi } from "vitest";
import type { KeyboardEvent } from "react";
import { act, renderHook } from "@/test/renderHook";
import { useTableKeyboardNav } from "./useTableKeyboardNav";

function key(name: string, mods: { ctrlKey?: boolean; metaKey?: boolean } = {}) {
  return {
    key: name,
    ctrlKey: mods.ctrlKey ?? false,
    metaKey: mods.metaKey ?? false,
    preventDefault: vi.fn(),
  } as unknown as KeyboardEvent<HTMLTableElement>;
}

function setup(rows = 10, cols = 4) {
  const { result } = renderHook(() => useTableKeyboardNav(rows, cols));
  const press = (event: KeyboardEvent<HTMLTableElement>) =>
    act(() => {
      result.current.handleKeyDown(event);
    });
  return { result, press };
}

describe("useTableKeyboardNav (#766)", () => {
  it("Home/End move to the first/last cell of the current row", () => {
    const { result, press } = setup();
    press(key("ArrowDown"));
    press(key("ArrowDown"));
    press(key("ArrowRight"));

    press(key("End"));
    expect(result.current.activeCell).toEqual({ row: 2, col: 3 });

    press(key("Home"));
    expect(result.current.activeCell).toEqual({ row: 2, col: 0 });
  });

  it("Ctrl+End jumps to the last row and Ctrl+Home back to the first", () => {
    const { result, press } = setup();
    press(key("ArrowDown"));
    press(key("ArrowRight"));

    press(key("End", { ctrlKey: true }));
    expect(result.current.activeCell).toEqual({ row: 9, col: 3 });

    press(key("Home", { ctrlKey: true }));
    expect(result.current.activeCell).toEqual({ row: 0, col: 0 });
  });

  it("treats Cmd (metaKey) like Ctrl for macOS", () => {
    const { result, press } = setup(5, 2);

    press(key("End", { metaKey: true }));
    expect(result.current.activeCell).toEqual({ row: 4, col: 1 });
  });

  it("prevents the default page scroll for Home/End", () => {
    const { press } = setup();
    const home = key("Home", { ctrlKey: true });
    const end = key("End");

    press(home);
    press(end);

    expect(home.preventDefault).toHaveBeenCalled();
    expect(end.preventDefault).toHaveBeenCalled();
  });
});
