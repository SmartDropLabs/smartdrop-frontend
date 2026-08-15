import { describe, expect, it } from "vitest";
import { parsePoolEntry, bigintToDisplayAmount } from "@/lib/soroban-parsers";
import { amountToStroops } from "@/lib/soroban";

describe("Asset Decimals Precision & Scaling (#136)", () => {
  it("parses custom token decimals from pool contract entries", () => {
    const entry18 = {
      id: "pool-eth",
      contract_address: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4",
      asset: {
        code: "ETH",
        issuer: "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
        is_native: false,
        decimals: 18,
      },
      daily_rate: 1000000000000000000n,
      total_locked: 50000000000000000000n,
      total_users: 10,
    };

    const parsed18 = parsePoolEntry(entry18, 0);
    expect(parsed18.asset.decimals).toBe(18);
    expect(parsed18.dailyRate).toBe("1.000000000000000000");
    expect(parsed18.totalLocked).toBe("50.000000000000000000");

    const entry6 = {
      id: "pool-usdc",
      contract_address: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4",
      asset_code: "USDC",
      asset_decimals: 6,
      daily_rate: 1000000n,
      total_locked: 250000000n,
    };

    const parsed6 = parsePoolEntry(entry6, 1);
    expect(parsed6.asset.decimals).toBe(6);
    expect(parsed6.dailyRate).toBe("1.000000");
    expect(parsed6.totalLocked).toBe("250.000000");
  });

  it("defaults to 7 decimals for native XLM and standard SAC contracts", () => {
    const entryNative = {
      id: "pool-xlm",
      is_native: true,
      daily_rate: 10000000n,
    };

    const parsedNative = parsePoolEntry(entryNative, 0);
    expect(parsedNative.asset.decimals).toBe(7);
    expect(parsedNative.dailyRate).toBe("1.0000000");
  });

  it("converts bigint raw values to correct display amounts across different decimal scales", () => {
    expect(bigintToDisplayAmount(1234567890123456789n, 18)).toBe("1.234567890123456789");
    expect(bigintToDisplayAmount(500000n, 6)).toBe("0.500000");
    expect(bigintToDisplayAmount(10000000n, 7)).toBe("1.0000000");
  });

  it("converts input amounts to raw unit stroops scaled by token decimals", () => {
    expect(amountToStroops("100", 18)).toBe(100n * 10n ** 18n);
    expect(amountToStroops("1.5", 6)).toBe(1500000n);
    expect(amountToStroops("10", 7)).toBe(100000000n);
  });
});
