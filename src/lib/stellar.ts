import { horizonUrl } from '@/config';

export interface AccountBalance {
  asset_type: string;
  balance: string;
  asset_code?: string;
  asset_issuer?: string;
}

/**
 * Fetch balances for a Stellar account from Horizon.
 * Returns an empty array if the account does not exist (404).
 */
export async function fetchAccountBalances(
  publicKey: string,
): Promise<AccountBalance[]> {
  try {
    const response = await fetch(
      `${horizonUrl.replace(/\/$/, '')}/accounts/${publicKey}`,
    );

    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(
        `Unable to fetch Stellar balance from Horizon (${response.status}).`,
      );
    }

    const account = (await response.json()) as {
      balances?: AccountBalance[];
    };

    return account.balances || [];
  } catch (error) {
    console.error(`[Stellar] Error fetching balances for ${publicKey}:`, error);
    throw error;
  }
}
