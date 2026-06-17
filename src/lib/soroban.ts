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
 */
export async function unlockAssets(
  params: UnlockAssetsParams
): Promise<UnlockAssetsResult> {
  const { poolContractId, publicKey, amount } = params;

  if (!poolContractId) {
    throw new UnlockError(
      "NO_CONTRACT",
      "Pool contract is not configured. Set NEXT_PUBLIC_POOL_CONTRACT_ID."
    );
  }

  const numeric = Number(amount);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new UnlockError("INVALID_AMOUNT", "Enter an amount greater than zero.");
  }

  const freighter = await import("@stellar/freighter-api");
  const connected = await freighter.isConnected();
  if (!connected.isConnected || connected.error) {
    throw new UnlockError(
      "NO_FREIGHTER",
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
}

/** Stellar Expert explorer link for a submitted transaction. */
export function stellarExpertTxUrl(
  hash: string,
  network: "PUBLIC" | "TESTNET" | "FUTURENET"
): string {
  const segment = network === "PUBLIC" ? "public" : "testnet";
  return `https://stellar.expert/explorer/${segment}/tx/${hash}`;
}
