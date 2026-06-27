/**
 * Comprehensive Soroban Contract Integration Layer
 * Handles all smart contract interactions for SmartDrop
 */

import {
  Contract,
  Networks,
  Operation,
  TransactionBuilder,
  BASE_FEE,
  Memo,
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
  rpc,
} from '@stellar/stellar-sdk';
import {
  bigintToDisplayAmount,
  parsePoolsFromNative,
  parseUserPositionFromNative,
} from './soroban-parsers';
export type { AssetInfo, PoolInfo, UserPosition } from './soroban-parsers';

// Soroban RPC Configuration
const RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org:443';
const NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';
const NETWORK_PASSPHRASE = process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE || Networks.TESTNET;

// Contract Addresses (will be set via environment variables in production)
const FACTORY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS || '';
const DEFAULT_POOL_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_DEFAULT_POOL_CONTRACT_ADDRESS || '';

// Initialize Soroban RPC Server
const rpcServer = new rpc.Server(RPC_URL);

export interface BoostConfig {
  multiplier: number;
  allocationPercentage: number;
  isActive: boolean;
}

export interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  hash?: string;
  error?: string;
  gasUsed?: string;
}

export interface ContractCallOptions {
  caller?: string;
  fee?: number;
  memo?: string;
}

// ── XDR-level wrappers (pure parsing logic lives in ./soroban-parsers) ───────

export function parsePoolsFromXdrResult(xdrResult: xdr.ScVal): PoolInfo[] {
  let native: unknown;
  try {
    native = scValToNative(xdrResult);
  } catch (err) {
    console.warn('[SmartDrop] parsePoolsFromXdr: failed to deserialise ScVal:', err);
    return [];
  }
  if (!Array.isArray(native)) {
    console.warn('[SmartDrop] parsePoolsFromXdr: expected Vec (array), got', typeof native);
    return [];
  }
  return parsePoolsFromNative(native);
}

export function parseUserPositionFromXdrResult(
  xdrResult: xdr.ScVal,
  poolId: string,
  userAddress: string,
): UserPosition | null {
  let native: unknown;
  try {
    native = scValToNative(xdrResult);
  } catch (err) {
    console.warn('[SmartDrop] parseUserPositionFromXdr: failed to deserialise ScVal:', err);
    return null;
  }

  if (native == null) return null;

  if (typeof native !== 'object' || Array.isArray(native)) {
    console.warn('[SmartDrop] parseUserPositionFromXdr: expected Map (object), got', typeof native);
    return null;
  }

  return parseUserPositionFromNative(native as Record<string, unknown>, poolId, userAddress);
}

export function parseCreditsFromXdrResult(xdrResult: xdr.ScVal): string {
  try {
    const native = scValToNative(xdrResult);
    return bigintToDisplayAmount(native);
  } catch (err) {
    console.warn('[SmartDrop] parseCreditsFromXdr: failed to parse:', err);
    return '0';
  }
}

// ── SorobanService class ──────────────────────────────────────────────────────

/**
 * SorobanService class - Main interface for contract interactions
 */
export class SorobanService {
  private rpcServer: rpc.Server;
  private factoryContract?: Contract;
  private poolContracts: Map<string, Contract> = new Map();

  constructor() {
    this.rpcServer = rpcServer;
    if (FACTORY_CONTRACT_ADDRESS) {
      this.factoryContract = new Contract(FACTORY_CONTRACT_ADDRESS);
    }
  }

  /**
   * Initialize the service with contract addresses
   */
  async initialize(factoryAddress?: string) {
    if (factoryAddress) {
      this.factoryContract = new Contract(factoryAddress);
    }
    
    // Load existing pools
    await this.loadPoolContracts();
  }

  /**
   * Load all pool contracts from the factory
   */
  private async loadPoolContracts() {
    try {
      const pools = await this.getFactoryPools();
      pools.forEach(pool => {
        this.poolContracts.set(pool.id, new Contract(pool.contractAddress));
      });
    } catch (error) {
      console.warn('Failed to load pool contracts:', error);
    }
  }

  /**
   * Get all pools from the factory contract
   */
  async getFactoryPools(): Promise<PoolInfo[]> {
    if (!this.factoryContract) {
      console.warn('Factory contract not initialized; returning empty pool list');
      return [];
    }

    try {
      const call = this.factoryContract.call("get_pools");

      const account = await this.rpcServer.getAccount(
        'GBQ3WPTHKJ5XKWLOKUZJLZL2GVXR6RWQCXUVDQZWM7Q2YNLDRVGM5ZWJ'
      );
      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(call)
        .setTimeout(30)
        .build();

      const simulation = await this.rpcServer.simulateTransaction(transaction);

      if ("error" in simulation) {
        throw new Error(`Simulation failed: ${simulation.error}`);
      }

      const result = simulation.result?.retval;
      if (!result) {
        return [];
      }

      return this.parsePoolsFromXdr(result);
    } catch (error) {
      console.error('Error fetching factory pools:', error);
      return [];
    }
  }

  /**
   * Get user position for a specific pool
   */
  async getUserPosition(
    poolId: string,
    userAddress: string
  ): Promise<UserPosition | null> {
    const poolContract = this.poolContracts.get(poolId);
    if (!poolContract) {
      console.warn(`Pool contract not found for ID: ${poolId}`);
      return null;
    }

    try {
      const call = poolContract.call(
        "get_user_position",
        Address.fromString(userAddress).toScVal(),
      );

      const account = await this.rpcServer.getAccount(
        'GBQ3WPTHKJ5XKWLOKUZJLZL2GVXR6RWQCXUVDQZWM7Q2YNLDRVGM5ZWJ'
      );
      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(call)
        .setTimeout(30)
        .build();

      const simulation = await this.rpcServer.simulateTransaction(transaction);

      if ("error" in simulation) {
        throw new Error(`Failed to get user position: ${simulation.error}`);
      }

      const result = simulation.result?.retval;
      if (!result) {
        return null;
      }

      return this.parseUserPositionFromXdr(result, poolId, userAddress);
    } catch (error) {
      console.error('Error fetching user position:', error);
      return null;
    }
  }

  /**
   * Calculate user credits for a specific pool
   */
  async calculateUserCredits(
    poolId: string,
    userAddress: string
  ): Promise<string> {
    const poolContract = this.poolContracts.get(poolId);
    if (!poolContract) {
      console.warn(`Pool contract not found for ID: ${poolId}`);
      return '0';
    }

    try {
      const call = poolContract.call(
        "calculate_credits",
        Address.fromString(userAddress).toScVal(),
      );

      const account = await this.rpcServer.getAccount(
        'GBQ3WPTHKJ5XKWLOKUZJLZL2GVXR6RWQCXUVDQZWM7Q2YNLDRVGM5ZWJ'
      );
      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(call)
        .setTimeout(30)
        .build();

      const simulation = await this.rpcServer.simulateTransaction(transaction);

      if ("error" in simulation) {
        throw new Error(`Failed to calculate credits: ${simulation.error}`);
      }

      const result = simulation.result?.retval;
      if (!result) {
        return '0';
      }

      return this.parseCreditsFromXdr(result);
    } catch (error) {
      console.error('Error calculating credits:', error);
      return '0';
    }
  }

  /**
   * Lock assets in a pool
   */
  /**
   * Resolve a pool contract from the cache or directly from a contract address.
   * Falls back to constructing a Contract on the fly when the pool was discovered
   * outside the factory (e.g. via the NEXT_PUBLIC_POOL_CONTRACT_ID env var).
   */
  private resolvePoolContract(poolId: string): Contract {
    const cached = this.poolContracts.get(poolId);
    if (cached) return cached;
    // Stellar contract IDs start with 'C' and are 56 characters long.
    if (poolId.startsWith('C') && poolId.length >= 56) {
      const contract = new Contract(poolId);
      this.poolContracts.set(poolId, contract);
      return contract;
    }
    throw new Error(`Pool contract not found for ID: ${poolId}`);
  }

  /**
   * Poll getTransaction until the tx is no longer PENDING or NOT_FOUND.
   * Throws if the tx fails or the poll limit is exceeded.
   */
  async waitForConfirmation(
    hash: string,
    maxAttempts = 30,
    intervalMs = 2000,
  ): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const tx = await this.rpcServer.getTransaction(hash);
      if (tx.status === rpc.Api.GetTransactionStatus.SUCCESS) return;
      if (tx.status === rpc.Api.GetTransactionStatus.FAILED) {
        throw new Error(`Transaction ${hash} failed on-chain`);
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    throw new Error(`Transaction ${hash} not confirmed after ${maxAttempts} attempts`);
  }

  async lockAssets(
    poolId: string,
    userAddress: string,
    amount: string,
    walletApi: any // Freighter API instance
  ): Promise<TransactionResult> {
    const poolContract = this.resolvePoolContract(poolId);

    try {
      // Build the lock_assets call
      const call = poolContract.call(
        "lock_assets",
        Address.fromString(userAddress).toScVal(),
        nativeToScVal(BigInt(amount), { type: "i128" }),
      );

      // Get user account for transaction building
      const account = await this.rpcServer.getAccount(userAddress);
      
      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(call)
        .setTimeout(300) // 5 minutes
        .build();

      // Simulate first to get fee estimation
      const simulation = await this.rpcServer.simulateTransaction(transaction);
      
      if ("error" in simulation) {
        return {
          success: false,
          error: `Simulation failed: ${simulation.error}`,
        };
      }

      // Prepare transaction for signing
      const preparedTransaction = rpc.assembleTransaction(transaction, simulation).build();

      // Request signature from Freighter
      const signedTransaction = await walletApi.signTransaction(
        preparedTransaction.toXDR(),
        {
          networkPassphrase: NETWORK_PASSPHRASE,
        }
      );

      // Submit transaction
      const submissionResult = await this.rpcServer.sendTransaction(
        TransactionBuilder.fromXDR(signedTransaction, NETWORK_PASSPHRASE)
      );

      if (submissionResult.status === 'ERROR') {
        return {
          success: false,
          error: `Transaction failed: ${submissionResult.errorResult}`,
        };
      }

      // Poll until the transaction is confirmed (status leaves PENDING)
      await this.waitForConfirmation(submissionResult.hash);

      return {
        success: true,
        transactionHash: submissionResult.hash,
        hash: submissionResult.hash,
        gasUsed: simulation.minResourceFee || '0',
      };

    } catch (error) {
      console.error('Error locking assets:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error locking assets',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Unlock assets from a pool
   */
  async unlockAssets(
    poolId: string,
    userAddress: string,
    amount: string,
    walletApi: any
  ): Promise<TransactionResult> {
    const poolContract = this.resolvePoolContract(poolId);

    try {
      const call = poolContract.call(
        "unlock_assets",
        Address.fromString(userAddress).toScVal(),
        nativeToScVal(BigInt(amount), { type: "i128" }),
      );

      const account = await this.rpcServer.getAccount(userAddress);
      
      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(call)
        .setTimeout(300)
        .build();

      const simulation = await this.rpcServer.simulateTransaction(transaction);
      
      if ("error" in simulation) {
        return {
          success: false,
          error: `Simulation failed: ${simulation.error}`,
        };
      }

      const preparedTransaction = rpc.assembleTransaction(transaction, simulation).build();

      const signedTransaction = await walletApi.signTransaction(
        preparedTransaction.toXDR(),
        {
          networkPassphrase: NETWORK_PASSPHRASE,
        }
      );

      const submissionResult = await this.rpcServer.sendTransaction(
        TransactionBuilder.fromXDR(signedTransaction, NETWORK_PASSPHRASE)
      );

      if (submissionResult.status === 'ERROR') {
        return {
          success: false,
          error: `Transaction failed: ${submissionResult.errorResult}`,
        };
      }

      await this.waitForConfirmation(submissionResult.hash);

      return {
        success: true,
        transactionHash: submissionResult.hash,
        hash: submissionResult.hash,
        gasUsed: simulation.minResourceFee || '0',
      };

    } catch (error) {
      console.error('Error unlocking assets:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Set boost configuration for a user
   */
  async setBoost(
    poolId: string,
    userAddress: string,
    allocationPercentage: number,
    walletApi: any
  ): Promise<TransactionResult> {
    const poolContract = this.resolvePoolContract(poolId);

    if (allocationPercentage < 0 || allocationPercentage > 100) {
      return {
        success: false,
        error: 'Allocation percentage must be between 0 and 100',
      };
    }

    try {
      const call = poolContract.call(
        "set_boost",
        Address.fromString(userAddress).toScVal(),
        nativeToScVal(allocationPercentage, { type: "u32" }),
      );

      const account = await this.rpcServer.getAccount(userAddress);
      
      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(call)
        .setTimeout(300)
        .build();

      const simulation = await this.rpcServer.simulateTransaction(transaction);
      
      if ("error" in simulation) {
        return {
          success: false,
          error: `Simulation failed: ${simulation.error}`,
        };
      }

      const preparedTransaction = rpc.assembleTransaction(transaction, simulation).build();

      const signedTransaction = await walletApi.signTransaction(
        preparedTransaction.toXDR(),
        {
          networkPassphrase: NETWORK_PASSPHRASE,
        }
      );

      const submissionResult = await this.rpcServer.sendTransaction(
        TransactionBuilder.fromXDR(signedTransaction, NETWORK_PASSPHRASE)
      );

      if (submissionResult.status === 'ERROR') {
        return {
          success: false,
          error: `Transaction failed: ${submissionResult.errorResult}`,
        };
      }

      return {
        success: true,
        transactionHash: submissionResult.hash,
        hash: submissionResult.hash,
        gasUsed: simulation.minResourceFee || '0',
      };
      
    } catch (error) {
      console.error('Error setting boost:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get total platform statistics
   */
  async getPlatformStats(): Promise<{
    totalValueLocked: string;
    totalUsers: number;
    onlineUsers: number;
    totalPools: number;
  }> {
    try {
      const pools = await this.getFactoryPools();
      
      let totalTVL = 0;
      let totalUsers = 0;
      
      pools.forEach(pool => {
        totalTVL += parseFloat(pool.totalLocked);
        totalUsers += pool.totalUsers;
      });

      return {
        totalValueLocked: totalTVL.toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }),
        totalUsers,
        onlineUsers: Math.floor(totalUsers * 0.1),
        totalPools: pools.length,
      };
    } catch (error) {
      console.error('Error fetching platform stats:', error);
      return {
        totalValueLocked: '$0',
        totalUsers: 0,
        onlineUsers: 0,
        totalPools: 0,
      };
    }
  }

  /**
   * Resolve a pool contract either from the cached map or directly from a
   * contract ID string.  Allows the deposit flow to work even when the factory
   * is not configured and pools were discovered another way.
   */
  private resolvePoolContract(poolId: string): Contract {
    const cached = this.poolContracts.get(poolId);
    if (cached) return cached;

    // If the poolId itself looks like a Stellar contract address (C…) treat it
    // as a contract ID and create a Contract on the fly.
    if (poolId.startsWith('C') && poolId.length >= 56) {
      const contract = new Contract(poolId);
      this.poolContracts.set(poolId, contract);
      return contract;
    }

    throw new Error(`Pool contract not found for ID: ${poolId}`);
  }

  /**
   * Poll until a submitted transaction leaves the PENDING state.
   * Returns true when the transaction is confirmed (SUCCESS), throws on failure.
   */
  async waitForConfirmation(
    hash: string,
    maxAttempts = 30,
    intervalMs = 2000,
  ): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const tx = await this.rpcServer.getTransaction(hash);

      if (tx.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        return;
      }
      if (tx.status === rpc.Api.GetTransactionStatus.FAILED) {
        throw new Error(`Transaction ${hash} failed on-chain`);
      }
      // NOT_FOUND or PENDING — keep polling
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    throw new Error(`Transaction ${hash} not confirmed after ${maxAttempts} attempts`);
  }


  /**
   * Get 7-day TVL history for a pool by scanning lock/unlock events.
   * Returns synthetic daily snapshots derived from on-chain events.
   * Falls back to empty array if the RPC is unreachable.
   */
  async getPoolHistory(
    poolId: string,
    days: number = 7,
  ): Promise<{ date: string; tvl: string }[]> {
    try {
      const latest = await this.rpcServer.getLatestLedger();
      // ~5 s per ledger; days * 86400 / 5
      const ledgersPerDay = Math.floor(86400 / 5);
      const startLedger = Math.max(1, latest.sequence - days * ledgersPerDay);

      const { xdr, scValToNative } = await import('@stellar/stellar-sdk');
      const lockSym = xdr.ScVal.scvSymbol('lock_assets').toXDR('base64');
      const unlockSym = xdr.ScVal.scvSymbol('unlock_assets').toXDR('base64');

      const response = await this.rpcServer.getEvents({
        startLedger,
        filters: [
          {
            type: 'contract',
            contractIds: [poolId],
            topics: [[lockSym, '*'], [unlockSym, '*']],
          },
        ],
        pagination: { limit: 500 },
      });

      // Build a running TVL map keyed by ISO date string
      const dailyMap = new Map<string, number>();
      let runningTvl = 0;

      // Seed today and past N days so chart always has points
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dailyMap.set(d.toISOString().slice(0, 10), 0);
      }

      for (const evt of response.events) {
        if (!evt.inSuccessfulContractCall) continue;
        const topics = (evt.topic as import('@stellar/stellar-sdk').xdr.ScVal[]).map(scValToNative);
        const action = topics[0] as string;
        const valueNative = scValToNative(evt.value as import('@stellar/stellar-sdk').xdr.ScVal);
        let amount = 0;
        if (Array.isArray(valueNative)) amount = Number(valueNative[0] ?? 0);
        else if (valueNative && typeof valueNative === 'object') {
          amount = Number((valueNative as Record<string, unknown>)['amount'] ?? 0);
        }
        const amountDisplay = amount / 10_000_000;
        if (action === 'lock_assets') runningTvl += amountDisplay;
        else if (action === 'unlock_assets') runningTvl = Math.max(0, runningTvl - amountDisplay);

        const dateKey = (evt.ledgerClosedAt as string).slice(0, 10);
        if (dailyMap.has(dateKey)) dailyMap.set(dateKey, runningTvl);
      }

      return Array.from(dailyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, tvl]) => ({ date, tvl: String(tvl) }));
    } catch (err) {
      console.warn('[SmartDrop] getPoolHistory failed:', err);
      return [];
    }
  }

  /**
   * Get top N depositors for a pool by scanning lock events.
   * Returns depositors sorted by amount descending.
   * Falls back to empty array if the RPC is unreachable.
   */
  async getPoolDepositors(
    poolId: string,
    limit: number = 20,
  ): Promise<{ address: string; amount: string; credits: string }[]> {
    try {
      const latest = await this.rpcServer.getLatestLedger();
      const startLedger = Math.max(1, latest.sequence - 120960); // ~7 days

      const { xdr, scValToNative } = await import('@stellar/stellar-sdk');
      const lockSym = xdr.ScVal.scvSymbol('lock_assets').toXDR('base64');
      const unlockSym = xdr.ScVal.scvSymbol('unlock_assets').toXDR('base64');

      const response = await this.rpcServer.getEvents({
        startLedger,
        filters: [
          {
            type: 'contract',
            contractIds: [poolId],
            topics: [[lockSym, '*'], [unlockSym, '*']],
          },
        ],
        pagination: { limit: 500 },
      });

      const balances = new Map<string, number>();

      for (const evt of response.events) {
        if (!evt.inSuccessfulContractCall) continue;
        const topics = (evt.topic as import('@stellar/stellar-sdk').xdr.ScVal[]).map(scValToNative);
        const action = topics[0] as string;
        const address = String(topics[1] ?? '');
        if (!address) continue;

        const valueNative = scValToNative(evt.value as import('@stellar/stellar-sdk').xdr.ScVal);
        let amount = 0;
        if (Array.isArray(valueNative)) amount = Number(valueNative[0] ?? 0);
        else if (valueNative && typeof valueNative === 'object') {
          amount = Number((valueNative as Record<string, unknown>)['amount'] ?? 0);
        }
        const amountDisplay = amount / 10_000_000;

        const current = balances.get(address) ?? 0;
        if (action === 'lock_assets') balances.set(address, current + amountDisplay);
        else if (action === 'unlock_assets') balances.set(address, Math.max(0, current - amountDisplay));
      }

      return Array.from(balances.entries())
        .filter(([, amt]) => amt > 0)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([address, amount]) => ({
          address,
          amount: amount.toLocaleString(undefined, { maximumFractionDigits: 7 }),
          credits: '—',
        }));
    } catch (err) {
      console.warn('[SmartDrop] getPoolDepositors failed:', err);
      return [];
    }
  }

  // Helper methods for parsing XDR data
  private parsePoolsFromXdr(xdrResult: xdr.ScVal): PoolInfo[] {
    return parsePoolsFromXdrResult(xdrResult);
  }

  private parseUserPositionFromXdr(
    xdrResult: xdr.ScVal,
    poolId: string,
    userAddress: string,
  ): UserPosition | null {
    return parseUserPositionFromXdrResult(xdrResult, poolId, userAddress);
  }

  private parseCreditsFromXdr(xdrResult: xdr.ScVal): string {
    return parseCreditsFromXdrResult(xdrResult);
  }
}

// Export singleton instance
export const sorobanService = new SorobanService();

// Initialize on import
sorobanService.initialize();

// Utility functions
export const formatCredits = (credits: string): string => {
  const num = parseFloat(credits);
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toFixed(0);
};

export const formatLockTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = timestamp - now;
  
  if (diff <= 0) {
    return 'Unlockable now';
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} remaining`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} remaining`;
  } else {
    return 'Less than 1 hour';
  }
};

export const formatAssetAmount = (amount: string, asset: AssetInfo): string => {
  const num = parseFloat(amount);
  return `${num.toLocaleString()} ${asset.code}`;
};

/** Convenience wrapper — call lock_assets on a pool and await on-chain confirmation. */
export const lockAssets = async ({
  poolContractId,
  publicKey,
  amount,
  walletApi,
}: {
  poolContractId: string;
  publicKey: string;
  amount: string;
  walletApi: any;
}) => sorobanService.lockAssets(poolContractId, publicKey, amount, walletApi);

export const unlockAssets = async ({
  poolContractId,
  publicKey,
  amount,
  walletApi,
}: {
  poolContractId: string;
  publicKey: string;
  amount: string;
  walletApi: any;
}) => {
  // Convert display-unit amount to integer stroops before passing as i128.
  // 1 display unit = 10,000,000 stroops (Stellar's fixed-point precision).
  const stroops = Math.round(parseFloat(amount) * 10_000_000).toString();
  return sorobanService.unlockAssets(poolContractId, publicKey, stroops, walletApi);
};

export const stellarExpertTxUrl = (hash: string, network: string) =>
  `https://stellar.expert/explorer/${network}/tx/${hash}`;

/**
 * Compute live-preview values for a partial unlock.
 * All arguments and return values are in display units (not stroops).
 */
export function computePartialUnlockPreview(
  lockedAmount: number,
  unlockAmount: number,
  dailyRate: number,
): { remainingStake: number; newDailyRate: number } {
  const remainingStake = lockedAmount - unlockAmount;
  const newDailyRate =
    lockedAmount > 0 ? (remainingStake / lockedAmount) * dailyRate : 0;
  return { remainingStake, newDailyRate };
}

// ── Transaction history ───────────────────────────────────────────────────────

export interface TxHistoryEntry {
  date: string;
  action: 'lock' | 'unlock';
  amount: string;
  symbol: string;
  poolId: string;
  creditsEarned?: string;
  txHash: string;
}

// Ledger lookback window: ~7 days at ~5 s per ledger.
const HISTORY_LOOKBACK_LEDGERS = 120960;

interface SorobanRpcServer {
  getLatestLedger(): Promise<{ sequence: number }>;
  getEvents(request: Parameters<rpc.Server['getEvents']>[0]): ReturnType<rpc.Server['getEvents']>;
}

function parseTxHistoryEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evt: any,
  publicKey: string,
): TxHistoryEntry | null {
  try {
    if (!evt.inSuccessfulContractCall) return null;

    const topicNatives = (evt.topic as xdr.ScVal[]).map(scValToNative);
    const actionRaw = topicNatives[0] as string;
    if (actionRaw !== 'lock_assets' && actionRaw !== 'unlock_assets') return null;

    // topic[1] is the user's address — only include events for this wallet
    const userAddr = topicNatives[1] as string;
    if (userAddr !== publicKey) return null;

    const action: 'lock' | 'unlock' = actionRaw === 'lock_assets' ? 'lock' : 'unlock';

    const valueNative = scValToNative(evt.value as xdr.ScVal);
    let amount = '0';
    let symbol = 'XLM';
    let creditsEarned: string | undefined;

    if (Array.isArray(valueNative)) {
      amount = String(valueNative[0] ?? '0');
      symbol = String(valueNative[1] ?? 'XLM');
      if (action === 'unlock' && valueNative[2] != null) {
        creditsEarned = String(valueNative[2]);
      }
    } else if (valueNative && typeof valueNative === 'object') {
      const v = valueNative as Record<string, unknown>;
      amount = String(v['amount'] ?? '0');
      symbol = String(v['symbol'] ?? 'XLM');
      if (action === 'unlock' && v['credits_earned'] != null) {
        creditsEarned = String(v['credits_earned']);
      }
    }

    return {
      date: evt.ledgerClosedAt as string,
      action,
      amount,
      symbol,
      poolId: evt.contractId as string,
      creditsEarned,
      txHash: evt.txHash as string,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch a user's lock/unlock history by scanning Soroban contract events
 * emitted by the given pool contracts over the past ~7 days.
 *
 * Pass `rpcOverride` in tests to inject a mock RPC server.
 */
export async function getUserTransactionHistory(
  publicKey: string,
  poolContractIds: string[],
  rpcOverride?: SorobanRpcServer,
): Promise<TxHistoryEntry[]> {
  if (!publicKey || poolContractIds.length === 0) return [];

  const server: SorobanRpcServer = rpcOverride ?? rpcServer;

  try {
    const latest = await server.getLatestLedger();
    const startLedger = Math.max(1, latest.sequence - HISTORY_LOOKBACK_LEDGERS);

    const lockSymbol = xdr.ScVal.scvSymbol('lock_assets').toXDR('base64');
    const unlockSymbol = xdr.ScVal.scvSymbol('unlock_assets').toXDR('base64');

    const response = await server.getEvents({
      startLedger,
      filters: [
        {
          type: 'contract',
          contractIds: poolContractIds,
          topics: [
            [lockSymbol, '*'],
            [unlockSymbol, '*'],
          ],
        },
      ],
      pagination: { limit: 200 },
    });

    const entries: TxHistoryEntry[] = [];
    for (const evt of response.events) {
      const entry = parseTxHistoryEvent(evt, publicKey);
      if (entry) entries.push(entry);
    }

    // Newest first
    return entries.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    return [];
  }
}
