import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/soroban", () => ({
  buildFeeBumpTransaction: vi.fn(() => {
    throw new Error(
      "Internal SDK detail: sponsor keypair checksum mismatch at byte 12",
    );
  }),
  sorobanService: {
    getFactoryPools: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/lib/feeBumpGuard", () => ({
  assertSponsorableInnerTransaction: vi.fn(),
  feeBumpRateLimiter: { tryConsume: vi.fn(() => true) },
}));

vi.mock("@stellar/stellar-sdk", async () => {
  const actual = await vi.importActual<typeof import("@stellar/stellar-sdk")>(
    "@stellar/stellar-sdk",
  );
  return {
    ...actual,
    Keypair: {
      fromSecret: vi.fn(() => ({
        publicKey: () => "GATESTSPONSORPUBLICKEY",
      })),
    },
    TransactionBuilder: {
      ...actual.TransactionBuilder,
      fromXDR: vi.fn(() => ({})),
    },
  };
});

const { POST } = await import("./route");

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/sign-fee-bump", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/sign-fee-bump", () => {
  beforeEach(() => {
    process.env.STELLAR_FEE_SPONSOR_SECRET =
      "SCE5D5DUEXQDIB6E3AZ6RN53JIGNVAP6JMOZQTXNMXFACLA6MU5V4QGB";
  });

  it("returns a generic message for unexpected server errors instead of the raw error detail", async () => {
    const response = await POST(makeRequest({ innerTxXdr: "AAAA" }));
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(500);
    expect(body.error).toBe("Internal server error");
    expect(body.error).not.toContain("checksum mismatch");
    expect(body.error).not.toContain("byte 12");
  });

  it("still returns a detailed message for a 4xx client error (missing field)", async () => {
    const response = await POST(makeRequest({}));
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Missing innerTxXdr in request body");
  });
});
