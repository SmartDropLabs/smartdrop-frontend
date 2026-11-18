import { horizonUrl } from '@/config';
import { readJsonWithLimit } from './safe-fetch';

export interface AccountBalance {
  asset_type: string;
  balance: string;
  asset_code?: string;
  asset_issuer?: string;
}

interface HorizonAccount {
  balances?: AccountBalance[];
}

/**
 * Shared low-level Horizon `/accounts/:publicKey` fetch, used by both
 * fetchAccountBalances and soroban.ts's getStellarBalance so the URL
 * construction, non-OK handling, and response parsing live in one place.
 * Returns null on 404 (account not found) rather than throwing, leaving
 * callers to decide whether a missing account is an error for their case.
 */
export async function fetchHorizonAccount(
  publicKey: string,
  init?: RequestInit,
): Promise<HorizonAccount | null> {
  const response = await fetch(
    `${horizonUrl.replace(/\/$/, '')}/accounts/${publicKey}`,
    init,
  );

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(
      `Unable to fetch Stellar balance from Horizon (${response.status}).`,
    );
  }

  return readJsonWithLimit<HorizonAccount>(response);
}

/**
 * Fetch balances for a Stellar account from Horizon.
 * Returns an empty array if the account does not exist (404).
 */
export async function fetchAccountBalances(
  publicKey: string,
): Promise<AccountBalance[]> {
  try {
    const account = await fetchHorizonAccount(publicKey);
    return account?.balances || [];
  } catch (error) {
    console.error(`[Stellar] Error fetching balances for ${publicKey}:`, error);
    throw error;
  }
}
