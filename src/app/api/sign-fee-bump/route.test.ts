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
  Address,
  xdr,
} from "@stellar/stellar-sdk";
import { POST, resetRateLimits } from "./route";

function makeRequest(body: unknown, invalidJson = false): Request {
  return new Request("http://localhost:3000/api/sign-fee-bump", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: invalidJson ? "INVALID_NON_JSON{{" : JSON.stringify(body),
  });
}

describe("POST /api/sign-fee-bump Security Validation & Rate Limiting (#124)", () => {
  const sponsorSeed = Buffer.alloc(32, 5);
  const sponsorSecret = StrKey.encodeEd25519SecretSeed(sponsorSeed);
  const sponsorKeypair = Keypair.fromSecret(sponsorSecret);

  const sourceSeed = Buffer.alloc(32, 8);
  const sourceSecret = StrKey.encodeEd25519SecretSeed(sourceSeed);
  const sourceKeypair = Keypair.fromSecret(sourceSecret);

  const testPoolId = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4";

  beforeEach(() => {
    resetRateLimits();
    vi.stubEnv("STELLAR_FEE_SPONSOR_SECRET", sponsorSecret);
    vi.stubEnv("NEXT_PUBLIC_POOL_CONTRACT_ID", testPoolId);
  });

  function buildContractTx(options: {
    contractId?: string;
    functionName?: string;
    unsigned?: boolean;
    additionalOp?: boolean;
  } = {}) {
    const sourceAccount = new Account(sourceKeypair.publicKey(), "100");
    const builder = new TransactionBuilder(sourceAccount, {
      fee: "100",
      networkPassphrase: Networks.TESTNET,
    });

    const targetContract = options.contractId ?? testPoolId;
    const fnName = options.functionName ?? "lock_assets";

    const contractFn = new xdr.InvokeContractArgs({
      contractAddress: Address.fromString(targetContract).toScAddress(),
      functionName: fnName,
      args: [],
    });

    const hostFunction = xdr.HostFunction.hostFunctionTypeInvokeContract(contractFn);

    builder.addOperation(
      Operation.invokeHostFunction({
        func: hostFunction,
        auth: [],
      })
    );

    if (options.additionalOp) {
      builder.addOperation(
        Operation.payment({
          destination: sponsorKeypair.publicKey(),
          asset: Asset.native(),
          amount: "1",
        })
      );
    }

    builder.setTimeout(300);
    const tx = builder.build();
    if (!options.unsigned) {
      tx.sign(sourceKeypair);
    }
    return tx;
  }

  it("returns 400 when inner transaction is a Payment operation rather than Soroban contract call", async () => {
    const sourceAccount = new Account(sourceKeypair.publicKey(), "100");
    const paymentTx = new TransactionBuilder(sourceAccount, {
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

    paymentTx.sign(sourceKeypair);

    const res = await POST(makeRequest({ innerTxXdr: paymentTx.toXDR() }));
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toContain("Only Soroban contract interactions are eligible for fee sponsorship");
  });

  it("returns 400 when inner transaction has multiple operations (preventing fee amplification attack)", async () => {
    const multiOpTx = buildContractTx({ additionalOp: true });
    const res = await POST(makeRequest({ innerTxXdr: multiOpTx.toXDR() }));
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toContain("Sponsored transactions must contain exactly one operation");
  });

  it("returns 400 when inner transaction is unsigned", async () => {
    const unsignedTx = buildContractTx({ unsigned: true });
    const res = await POST(makeRequest({ innerTxXdr: unsignedTx.toXDR() }));
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toContain("Inner transaction must be signed by the user");
  });

  it("returns 400 when inner transaction invokes an unapproved function (e.g. transfer)", async () => {
    const invalidFnTx = buildContractTx({ functionName: "transfer" });
    const res = await POST(makeRequest({ innerTxXdr: invalidFnTx.toXDR() }));
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toContain("Function 'transfer' is not eligible for fee sponsorship");
  });

  it("returns 400 when inner transaction targets an unknown contract address", async () => {
    const unknownContractId = StrKey.encodeContract(Buffer.alloc(32, 9));
    const unauthorizedTx = buildContractTx({ contractId: unknownContractId });
    const res = await POST(makeRequest({ innerTxXdr: unauthorizedTx.toXDR() }));
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toContain("Target contract is not an authorized SmartDrop pool");
  });

  it("returns 429 when rate limit is exceeded for a source account", async () => {
    const validTx = buildContractTx();
    const validXdr = validTx.toXDR();

    // Fire 5 allowed requests
    for (let i = 0; i < 5; i++) {
      const res = await POST(makeRequest({ innerTxXdr: validXdr }));
      expect(res.status).toBe(200);
    }

    // 6th request should hit rate limit
    const throttledRes = await POST(makeRequest({ innerTxXdr: validXdr }));
    expect(throttledRes.status).toBe(429);

    const data = await throttledRes.json();
    expect(data.error).toContain("Too many fee-bump requests");
  });

  it("successfully sponsors and returns fee-bump envelope for valid lock_assets transaction", async () => {
    const validTx = buildContractTx({ functionName: "lock_assets" });
    const res = await POST(makeRequest({ innerTxXdr: validTx.toXDR() }));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.feeBumpTxXdr).toBeDefined();

    const feeBumpTx = TransactionBuilder.fromXDR(
      data.feeBumpTxXdr,
      Networks.TESTNET
    ) as FeeBumpTransaction;

    expect(feeBumpTx.feeSource).toBe(sponsorKeypair.publicKey());
    expect(feeBumpTx.signatures.length).toBe(1);
    expect(feeBumpTx.innerTransaction.toXDR()).toBe(validTx.toXDR());
  });

  it("successfully sponsors and returns fee-bump envelope for valid unlock_assets transaction", async () => {
    const validTx = buildContractTx({ functionName: "unlock_assets" });
    const res = await POST(makeRequest({ innerTxXdr: validTx.toXDR() }));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.feeBumpTxXdr).toBeDefined();
  });
});
