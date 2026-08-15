// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  Keypair,
  TransactionBuilder,
  Account,
  Operation,
  Asset,
  Networks,
  type FeeBumpTransaction,
  StrKey,
} from "@stellar/stellar-sdk";
import { POST } from "./route";

function makeRequest(body: unknown, invalidJson = false): Request {
  return new Request("http://localhost:3000/api/sign-fee-bump", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: invalidJson ? "INVALID_NON_JSON{{" : JSON.stringify(body),
  });
}

describe("POST /api/sign-fee-bump (#125)", () => {
  const sponsorSeed = Buffer.alloc(32, 5);
  const sponsorSecret = StrKey.encodeEd25519SecretSeed(sponsorSeed);
  const sponsorKeypair = Keypair.fromSecret(sponsorSecret);

  const sourceSeed = Buffer.alloc(32, 8);
  const sourceSecret = StrKey.encodeEd25519SecretSeed(sourceSeed);
  const sourceKeypair = Keypair.fromSecret(sourceSecret);

  beforeEach(() => {
    vi.stubEnv("STELLAR_FEE_SPONSOR_SECRET", sponsorSecret);
  });

  it("returns 500 when STELLAR_FEE_SPONSOR_SECRET is not configured", async () => {
    vi.stubEnv("STELLAR_FEE_SPONSOR_SECRET", "");
    const res = await POST(makeRequest({ innerTxXdr: "AAAA..." }));
    expect(res.status).toBe(500);

    const data = await res.json();
    expect(data.error).toBe("Sponsor secret key is not configured on the server");
  });

  it("returns 400 when request body contains invalid JSON", async () => {
    const res = await POST(makeRequest(null, true));
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe("Invalid JSON request body");
  });

  it("returns 400 when innerTxXdr is missing from request body", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe("Missing innerTxXdr in request body");
  });

  it("returns 500 when STELLAR_FEE_SPONSOR_SECRET has an invalid format", async () => {
    vi.stubEnv("STELLAR_FEE_SPONSOR_SECRET", "NOT_A_VALID_STELLAR_SECRET_SEED");
    const res = await POST(makeRequest({ innerTxXdr: "AAAA..." }));
    expect(res.status).toBe(500);

    const data = await res.json();
    expect(data.error).toBe("Invalid sponsor secret key configuration");
  });

  it("returns 400 when innerTxXdr is malformed or invalid XDR", async () => {
    const res = await POST(makeRequest({ innerTxXdr: "GARBAGE_XDR_NOT_VALID" }));
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toContain("Invalid inner transaction XDR");
  });

  it("successfully wraps and signs a valid inner transaction with the sponsor key", async () => {
    const sourceAccount = new Account(sourceKeypair.publicKey(), "100");
    const innerTx = new TransactionBuilder(sourceAccount, {
      fee: "100",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({
          destination: sponsorKeypair.publicKey(),
          asset: Asset.native(),
          amount: "1",
        })
      )
      .setTimeout(300)
      .build();

    innerTx.sign(sourceKeypair);

    const res = await POST(makeRequest({ innerTxXdr: innerTx.toXDR() }));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.feeBumpTxXdr).toBeDefined();

    const feeBumpTx = TransactionBuilder.fromXDR(
      data.feeBumpTxXdr,
      Networks.TESTNET
    ) as FeeBumpTransaction;

    expect(feeBumpTx.feeSource).toBe(sponsorKeypair.publicKey());
    expect(feeBumpTx.signatures.length).toBe(1);
    expect(feeBumpTx.innerTransaction.toXDR()).toBe(innerTx.toXDR());
  });
});
