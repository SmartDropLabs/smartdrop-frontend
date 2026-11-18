import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@/test/renderHook";

const chakraToast = Object.assign(vi.fn(() => "toast-id"), {
  close: vi.fn(),
  closeAll: vi.fn(),
});

vi.mock("@chakra-ui/react", () => ({
  useToast: () => chakraToast,
  Box: () => null,
  Button: () => null,
  Text: () => null,
}));

const { useToast } = await import("./useToast");

function lastPosition() {
  const calls = chakraToast.mock.calls as unknown as Array<[{ position?: string }]>;
  return calls[calls.length - 1][0].position;
}

describe("useToast position (#759)", () => {
  beforeEach(() => {
    chakraToast.mockClear();
  });

  it("defaults to bottom-right", () => {
    const { result } = renderHook(() => useToast());
    result.current.success("Saved");
    expect(lastPosition()).toBe("bottom-right");
  });

  it("uses a hook-level default position for every toast", () => {
    const { result } = renderHook(() => useToast({ position: "top" }));
    result.current.info("Heads up");
    expect(lastPosition()).toBe("top");
    result.current.handleError(new Error("boom"));
    expect(lastPosition()).toBe("top");
  });

  it("lets a per-call position override the hook default", () => {
    const { result } = renderHook(() => useToast({ position: "top" }));
    result.current.warning("Careful", undefined, { position: "bottom-left" });
    expect(lastPosition()).toBe("bottom-left");
  });

  it("accepts a per-call position on handleError, with or without retry", () => {
    const { result } = renderHook(() => useToast());
    result.current.handleError(new Error("boom"), "ctx", undefined, { position: "top-left" });
    expect(lastPosition()).toBe("top-left");
    result.current.handleError(new Error("boom"), "ctx", () => {}, { position: "top-right" });
    expect(lastPosition()).toBe("top-right");
  });
});
