import { afterEach, describe, expect, it } from "vitest";
import { getRpcServer, resetRpcPool } from "./rpc-pool";

afterEach(() => resetRpcPool());

describe("getRpcServer (#754)", () => {
  it("returns the same client for the same URL", () => {
    const url = "https://soroban-testnet.stellar.org";
    expect(getRpcServer(url)).toBe(getRpcServer(url));
  });

  it("returns separate clients for different URLs", () => {
    expect(getRpcServer("https://soroban-testnet.stellar.org")).not.toBe(
      getRpcServer("https://soroban.stellar.org"),
    );
  });

  it("creates a fresh client after the pool is reset", () => {
    const url = "https://soroban-testnet.stellar.org";
    const first = getRpcServer(url);
    resetRpcPool();
    expect(getRpcServer(url)).not.toBe(first);
  });
});
