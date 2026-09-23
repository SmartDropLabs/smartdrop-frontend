import { StrKey } from "@stellar/stellar-sdk";
import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchAccountBalances, fetchHorizonAccount } from "./stellar";

const USER_PUBLIC_KEY = StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 7));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchHorizonAccount", () => {
  it("returns null on a 404 instead of throwing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    await expect(fetchHorizonAccount(USER_PUBLIC_KEY)).resolves.toBeNull();
  });

  it("throws for a non-404 non-OK response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    await expect(fetchHorizonAccount(USER_PUBLIC_KEY)).rejects.toThrow(
      "Unable to fetch Stellar balance from Horizon (500).",
    );
  });
});

describe("fetchAccountBalances", () => {
  it("returns an empty array when the account does not exist (404)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    await expect(fetchAccountBalances(USER_PUBLIC_KEY)).resolves.toEqual([]);
  });

  it("returns the account's balances on success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        balances: [{ asset_type: "native", balance: "42.0000000" }],
      }),
    } as Response);

    await expect(fetchAccountBalances(USER_PUBLIC_KEY)).resolves.toEqual([
      { asset_type: "native", balance: "42.0000000" },
    ]);
  });
});
