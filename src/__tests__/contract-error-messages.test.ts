import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { getContractErrorMessage, CONTRACT_ERROR_MESSAGES } from "@/lib/soroban";

describe("Contract Error Code Translation (#146)", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("translates code '1' to 'Assets are still locked'", () => {
    expect(getContractErrorMessage("1")).toBe("Assets are still locked");
    expect(getContractErrorMessage("0x01")).toBe("Assets are still locked");
  });

  it("translates all documented contract error codes in the mapping table", () => {
    for (const [code, expectedMessage] of Object.entries(CONTRACT_ERROR_MESSAGES)) {
      expect(getContractErrorMessage(code)).toBe(expectedMessage);
    }
  });

  it("warns on unmapped contract error codes and returns undefined", () => {
    const warnSpy = vi.spyOn(console, "warn");
    const result = getContractErrorMessage("99");

    expect(result).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      "[SmartDrop] Unmapped contract error code:",
      "99"
    );
  });

  it("returns undefined without warning when no error code is provided", () => {
    const warnSpy = vi.spyOn(console, "warn");
    expect(getContractErrorMessage(undefined)).toBeUndefined();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
