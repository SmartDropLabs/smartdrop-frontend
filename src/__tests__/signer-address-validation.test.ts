import { afterEach, describe, expect, it, vi } from "vitest";

const { assembleTransactionMock } = vi.hoisted(() => ({
  assembleTransactionMock: vi.fn(),
}));

vi.mock("@stellar/stellar-sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stellar/stellar-sdk")>();
  return {
    ...actual,
    rpc: {
      ...actual.rpc,
      assembleTransaction: assembleTransactionMock,
    },
  };
});

import {
  Account,
  Address,
  Contract,
  StrKey,
  xdr,
} from "@stellar/stellar-sdk";
import {
  SorobanService,
  SecurityError,
  type FreighterWalletApi,
} from "@/lib/soroban";

const POOL_CONTRACT_ID =
  "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4";
const USER_PUBLIC_KEY = StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 7));
const ROGUE_PUBLIC_KEY = StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 9));
const POOL_ID = "pool-xlm";

function makeAuthEntry(functionName: string, contractId = POOL_CONTRACT_ID) {
  const contractFn = new xdr.InvokeContractArgs({
    contractAddress: Address.fromString(contractId).toScAddress(),
    functionName,
    args: [],
  });

  return new xdr.SorobanAuthorizationEntry({
    credentials: xdr.SorobanCredentials.sorobanCredentialsSourceAccount(),
    rootInvocation: new xdr.SorobanAuthorizedInvocation({
      function:
        xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
          contractFn,
        ),
      subInvocations: [],
    }),
  });
}

function makeService() {
  const service = new SorobanService();
  const svc = service as unknown as {
    poolContracts: Map<string, Contract>;
    rpcServer: {
      getAccount: ReturnType<typeof vi.fn>;
      simulateTransaction: ReturnType<typeof vi.fn>;
      sendTransaction: ReturnType<typeof vi.fn>;
    };
  };

  svc.rpcServer = {
    getAccount: vi.fn().mockResolvedValue(new Account(USER_PUBLIC_KEY, "0")),
    simulateTransaction: vi.fn().mockResolvedValue({
      result: { auth: [makeAuthEntry("lock_assets")] },
      minResourceFee: "321",
    }),
    sendTransaction: vi.fn().mockResolvedValue({
      status: "PENDING",
      hash: "lock-hash",
    }),
  };
  svc.poolContracts.set(POOL_ID, new Contract(POOL_CONTRACT_ID));

  return { service, rpcServer: svc.rpcServer };
}

afterEach(() => {
  vi.restoreAllMocks();
  assembleTransactionMock.mockReset();
});

describe("Signer Address Pinning & Validation (#139)", () => {
  it("passes address in options and succeeds when signerAddress matches connected user", async () => {
    const { service } = makeService();
    assembleTransactionMock.mockImplementation((tx: any) => ({
      build: () => tx,
    }));

    const walletApi: FreighterWalletApi = {
      signTransaction: vi.fn(async (xdrEnvelope: string) => ({
        signedTxXdr: xdrEnvelope,
        signerAddress: USER_PUBLIC_KEY,
      })),
    };

    // @ts-expect-error Mocking pollTransactionStatus
    service.pollTransactionStatus = vi.fn().mockResolvedValue({
      status: "SUCCESS",
      hash: "lock-hash",
    });

    const result = await service.lockAssets(
      POOL_ID,
      USER_PUBLIC_KEY,
      "50000000",
      walletApi,
    );

    expect(walletApi.signTransaction).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ address: USER_PUBLIC_KEY })
    );
    expect(result.success).toBe(true);
  });

  it("rejects with SecurityError if signerAddress is mismatched and never submits to RPC", async () => {
    const { service, rpcServer } = makeService();
    assembleTransactionMock.mockImplementation((tx: any) => ({
      build: () => tx,
    }));

    const walletApi: FreighterWalletApi = {
      signTransaction: vi.fn(async (xdrEnvelope: string) => ({
        signedTxXdr: xdrEnvelope,
        signerAddress: ROGUE_PUBLIC_KEY,
      })),
    };

    await expect(
      service.lockAssets(POOL_ID, USER_PUBLIC_KEY, "50000000", walletApi)
    ).rejects.toThrow(SecurityError);

    expect(rpcServer.sendTransaction).not.toHaveBeenCalled();
  });
});
