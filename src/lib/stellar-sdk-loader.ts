/**
 * Lazy loader for @stellar/stellar-sdk — keeps the ~400 KB XDR bundle
 * out of the initial JS chunk until a contract interaction is needed.
 */

export type StellarSdkModule = typeof import('@stellar/stellar-sdk');

let sdkPromise: Promise<StellarSdkModule> | null = null;

export function loadStellarSdk(): Promise<StellarSdkModule> {
  if (!sdkPromise) {
    sdkPromise = import('@stellar/stellar-sdk');
  }
  return sdkPromise;
}
