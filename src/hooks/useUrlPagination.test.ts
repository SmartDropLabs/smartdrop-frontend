import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@/test/renderHook";
import { useUrlPagination } from "./useUrlPagination";

const replace = vi.fn();

function mockSearchParams(initial: string) {
  return new URLSearchParams(initial);
}

let search = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/airdrops",
  useSearchParams: () => mockSearchParams(search),
}));

describe("useUrlPagination", () => {
  beforeEach(() => {
    replace.mockClear();
    search = "";
  });

  it("defaults to page 1 with no query param", () => {
    const { result } = renderHook(() => useUrlPagination());
    expect(result.current.page).toBe(1);
  });

  it("reads a valid page from the URL", () => {
    search = "page=3";
    const { result } = renderHook(() => useUrlPagination());
    expect(result.current.page).toBe(3);
  });

  it("falls back to page 1 for invalid page values", () => {
    search = "page=banana";
    const { result } = renderHook(() => useUrlPagination());
    expect(result.current.page).toBe(1);

    search = "page=0";
    const { result: zero } = renderHook(() => useUrlPagination());
    expect(zero.current.page).toBe(1);
  });

  it("writes page to the URL and drops it on page 1", () => {
    const { result } = renderHook(() => useUrlPagination());
    act(() => result.current.setPage(2));
    expect(replace).toHaveBeenCalledWith("/airdrops?page=2", { scroll: false });

    replace.mockClear();
    search = "page=2";
    const { result: page2 } = renderHook(() => useUrlPagination());
    act(() => page2.current.setPage(1));
    expect(replace).toHaveBeenCalledWith("/airdrops", { scroll: false });
  });

  it("accepts a functional updater", () => {
    search = "page=2";
    const { result } = renderHook(() => useUrlPagination());
    act(() => result.current.setPage((p) => p + 1));
    expect(replace).toHaveBeenCalledWith("/airdrops?page=3", { scroll: false });
  });
});
