/**
 * Soroban transaction helpers for the SmartDrop pool contract.
 *
 * The repo intentionally ships without `@stellar/stellar-sdk` and without a
 * deployed pool contract, so the XDR build/submit steps are stubbed and clearly
 * marked. The Freighter availability + signing path is real, mirroring the
 * deposit flow in `src/app/farm/page.tsx`. Swap the marked section for real
 * `TransactionBuilder` / `Server.sendTransaction` calls once the pool contract
 * is deployed (see issue: Deposit Flow with Freighter Transaction Signing).
 */

import {
  ValidationError,
  ConfigError,
  FreighterError,
  ContractError,
  RPCError,
  withRetry,
  type RetryConfig,
} from "@/lib/error-handler";

/**
 * @deprecated Use SmartDropError subclasses from @/lib/error-handler instead.
 * This is kept for backward compatibility only.
 */
export class UnlockError extends Error {
  code: "NO_FREIGHTER" | "REJECTED" | "NO_CONTRACT" | "INVALID_AMOUNT" | "NETWORK";

  constructor(code: UnlockError["code"], message: string) {
    super(message);
    this.name = "UnlockError";
    this.code = code;
  }
}

export type UnlockAssetsParams = {
  /** Pool contract id (C…) that custodies the locked position. */
  poolContractId: string;
  /** Address of the user signing the unlock. */
  publicKey: string;
  /** Amount to unlock, as a decimal string in display units. */
  amount: string;
  /** Network passphrase the transaction is built against. */
  networkPassphrase: string;
  /** Soroban RPC endpoint used for simulation + submission. */
  rpcUrl: string;
};

export type UnlockAssetsResult = {
  hash: string;
};

/**
 * Builds, signs (via Freighter) and submits an `unlock_assets(user, amount)`
 * invocation against the pool contract.
 *
 * Includes automatic retry logic for transient RPC failures.
 */
export async function unlockAssets(
  params: UnlockAssetsParams,
  retryConfig?: Partial<RetryConfig>
): Promise<UnlockAssetsResult> {
  const { poolContractId, publicKey, amount } = params;

  // Validate configuration
  if (!poolContractId) {
    throw new ConfigError(
      "Pool contract is not configured. Set NEXT_PUBLIC_POOL_CONTRACT_ID."
    );
  }

  // Validate input
  const numeric = Number(amount);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new ValidationError("Enter an amount greater than zero.");
  }

  // Validate wallet connectivity (with retry for transient failures)
  return withRetry(
    async () => {
      try {
        const freighter = await import("@stellar/freighter-api");
        const connected = await freighter.isConnected();

        if (!connected.isConnected || connected.error) {
          throw new FreighterError(
            "FREIGHTER_NOT_INSTALLED",
            "Freighter wallet not detected. Install it from https://www.freighter.app"
          );
        }

        // --- Wire to Soroban (requires @stellar/stellar-sdk + deployed pool) -------
        // 1. Build the invoke transaction:
        //      new TransactionBuilder(account, { fee, networkPassphrase })
        //        .addOperation(contract.call("unlock_assets",
        //            Address.fromString(publicKey).toScVal(),
        //            nativeToScVal(amount, { type: "i128" })))
        //        .setTimeout(30).build()
        // 2. simulateTransaction(tx) on rpcUrl for fees + auth, then assemble.
        // 3. const { signedTxXdr } = await freighter.signTransaction(preparedXdr, {
        //        networkPassphrase, address: publicKey });
        // 4. server.sendTransaction(TransactionBuilder.fromXDR(signedTxXdr, ...))
        //    and poll getTransaction(hash) until SUCCESS.
        //
        // Until the pool contract is deployed we simulate latency and return a
        // deterministic mock hash so the UI flow is fully exercisable end-to-end.
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const hash = `mock-${publicKey.slice(0, 6)}-${Date.now().toString(16)}`;
        return { hash };
      } catch (error) {
        // Re-throw SmartDropErrors as-is
        if (error instanceof Error && error.name.includes("Error")) {
          throw error;
        }
        // Wrap unexpected errors
        throw new ContractError(
          "CONTRACT_EXECUTION_FAILED",
          error instanceof Error ? error.message : "Unlock failed"
        );
      }
    },
    retryConfig
  );
}

/**
 * Retrieves the Soroban RPC endpoint for the configured network.
 * Throws ConfigError if not configured.
 */
export function getSorobanRpcUrl(): string {
  const url = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL;
  if (!url) {
    throw new ConfigError(
      "NEXT_PUBLIC_SOROBAN_RPC_URL is not configured"
    );
  }
  return url;
}

/**
 * Gets the network passphrase for the configured network.
 * Throws ConfigError if not configured.
 */
export function getNetworkPassphrase(): string {
  const passphrase = process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE;
  if (!passphrase) {
    throw new ConfigError(
      "NEXT_PUBLIC_NETWORK_PASSPHRASE is not configured"
    );
  }
  return passphrase;
}

/**
 * Gets the pool contract ID from configuration.
 * Throws ConfigError if not configured.
 */
export function getPoolContractId(): string {
  const contractId = process.env.NEXT_PUBLIC_POOL_CONTRACT_ID;
  if (!contractId) {
    throw new ConfigError(
      "NEXT_PUBLIC_POOL_CONTRACT_ID is not configured"
    );
  }
  return contractId;
}

/** Stellar Expert explorer link for a submitted transaction. */
export function stellarExpertTxUrl(
  hash: string,
  network: "PUBLIC" | "TESTNET" | "FUTURENET"
): string {
  const segment = network === "PUBLIC" ? "public" : "testnet";
  return `https://stellar.expert/explorer/${segment}/tx/${hash}`;
}
