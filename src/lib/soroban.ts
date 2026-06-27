/**
 * Comprehensive Soroban Contract Integration Layer
 * Handles all smart contract interactions for SmartDrop
 *
 * @stellar/stellar-sdk is loaded lazily via dynamic import() so the XDR
 * codegen (~400 KB minified) is not included in the initial JS bundle.
 */

import type { xdr } from '@stellar/stellar-sdk';
import { networkPassphrase } from '@/config';
import {
  bigintToDisplayAmount,
  parsePoolsFromNative,
  parseUserPositionFromNative,
  type AssetInfo,
  type PoolInfo,
  type UserPosition,
} from './soroban-parsers';
import { loadStellarSdk, type StellarSdkModule } from './stellar-sdk-loader';

export type { AssetInfo, PoolInfo, UserPosition };

// Soroban RPC Configuration
const RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org:443';
const NETWORK_PASSPHRASE = networkPassphrase;

// Contract Addresses (will be set via environment variables in production)
const FACTORY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS || '';

type RpcServer = InstanceType<StellarSdkModule['rpc']['Server']>;
type StellarContract = InstanceType<StellarSdkModule['Contract']>;

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

export async function parsePoolsFromXdrResult(xdrResult: xdr.ScVal): Promise<PoolInfo[]> {
  const { scValToNative } = await loadStellarSdk();
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

export async function parseUserPositionFromXdrResult(
  xdrResult: xdr.ScVal,
  poolId: string,
  userAddress: string,
): Promise<UserPosition | null> {
  const { scValToNative } = await loadStellarSdk();
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

export async function parseCreditsFromXdrResult(xdrResult: xdr.ScVal): Promise<string> {
  const { scValToNative } = await loadStellarSdk();
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
  private rpcServer: RpcServer | null = null;
  private factoryContract?: StellarContract;
  private poolContracts: Map<string, StellarContract> = new Map();
  private initPromise: Promise<void> | null = null;

  constructor() {
    // Factory contract is created lazily on first initialize()
  }

  private async getRpcServer(): Promise<RpcServer> {
    if (!this.rpcServer) {
      const { rpc } = await loadStellarSdk();
      this.rpcServer = new rpc.Server(RPC_URL);
    }
    return this.rpcServer;
  }

  private async setFactoryContract(address: string): Promise<void> {
    const { Contract } = await loadStellarSdk();
    this.factoryContract = new Contract(address);
  }

  private async ensureInitialized(factoryAddress?: string): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.initialize(factoryAddress);
    }
    await this.initPromise;
  }

  /**
   * Initialize the service with contract addresses
   */
  async initialize(factoryAddress?: string) {
    const address = factoryAddress || FACTORY_CONTRACT_ADDRESS;
    if (address) {
      await this.setFactoryContract(address);
    }

    await this.loadPoolContracts();
  }

  /**
   * Load all pool contracts from the factory
   */
  private async loadPoolContracts() {
    try {
      const pools = await this.fetchFactoryPools();
      const { Contract } = await loadStellarSdk();
      pools.forEach((pool) => {
        this.poolContracts.set(pool.id, new Contract(pool.contractAddress));
      });
    } catch (error) {
      console.warn('Failed to load pool contracts:', error);
    }
  }

  /**
   * Fetch pools from the factory contract (no ensureInitialized — used during init).
   */
  private async fetchFactoryPools(): Promise<PoolInfo[]> {
    if (!this.factoryContract) {
      console.warn('Factory contract not initialized; returning empty pool list');
      return [];
    }

    try {
      const { TransactionBuilder, BASE_FEE } = await loadStellarSdk();
      const rpcServer = await this.getRpcServer();
      const call = this.factoryContract.call('get_pools');

      const account = await rpcServer.getAccount(
        'GBQ3WPTHKJ5XKWLOKUZJLZL2GVXR6RWQCXUVDQZWM7Q2YNLDRVGM5ZWJ',
      );
      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(call)
        .setTimeout(30)
        .build();

      const simulation = await rpcServer.simulateTransaction(transaction);

      if ('error' in simulation) {
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
   * Get all pools from the factory contract
   */
  async getFactoryPools(): Promise<PoolInfo[]> {
    await this.ensureInitialized();

    if (!this.factoryContract) {
      console.warn('Factory contract not initialized; returning empty pool list');
      return [];
    }

    return this.fetchFactoryPools();
  }

  /**
   * Get user position for a specific pool
   */
  async getUserPosition(poolId: string, userAddress: string): Promise<UserPosition | null> {
    await this.ensureInitialized();

    const poolContract = this.poolContracts.get(poolId);
    if (!poolContract) {
      console.warn(`Pool contract not found for ID: ${poolId}`);
      return null;
    }

    try {
      const { TransactionBuilder, BASE_FEE, Address } = await loadStellarSdk();
      const rpcServer = await this.getRpcServer();
      const call = poolContract.call(
        'get_user_position',
        Address.fromString(userAddress).toScVal(),
      );

      const account = await rpcServer.getAccount(
        'GBQ3WPTHKJ5XKWLOKUZJLZL2GVXR6RWQCXUVDQZWM7Q2YNLDRVGM5ZWJ',
      );
      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(call)
        .setTimeout(30)
        .build();

      const simulation = await rpcServer.simulateTransaction(transaction);

      if ('error' in simulation) {
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
  async calculateUserCredits(poolId: string, userAddress: string): Promise<string> {
    await this.ensureInitialized();

    const poolContract = this.poolContracts.get(poolId);
    if (!poolContract) {
      console.warn(`Pool contract not found for ID: ${poolId}`);
      return '0';
    }

    try {
      const { TransactionBuilder, BASE_FEE, Address } = await loadStellarSdk();
      const rpcServer = await this.getRpcServer();
      const call = poolContract.call(
        'calculate_credits',
        Address.fromString(userAddress).toScVal(),
      );

      const account = await rpcServer.getAccount(
        'GBQ3WPTHKJ5XKWLOKUZJLZL2GVXR6RWQCXUVDQZWM7Q2YNLDRVGM5ZWJ',
      );
      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(call)
        .setTimeout(30)
        .build();

      const simulation = await rpcServer.simulateTransaction(transaction);

      if ('error' in simulation) {
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
   * Resolve a pool contract from the cache or directly from a contract address.
   */
  private async resolvePoolContract(poolId: string): Promise<StellarContract> {
    const cached = this.poolContracts.get(poolId);
    if (cached) return cached;
    if (poolId.startsWith('C') && poolId.length >= 56) {
      const { Contract } = await loadStellarSdk();
      const contract = new Contract(poolId);
      this.poolContracts.set(poolId, contract);
      return contract;
    }
    throw new Error(`Pool contract not found for ID: ${poolId}`);
  }

  /**
   * Poll getTransaction until the tx is no longer PENDING or NOT_FOUND.
   */
  async waitForConfirmation(
    hash: string,
    maxAttempts = 30,
    intervalMs = 2000,
  ): Promise<void> {
    const { rpc } = await loadStellarSdk();
    const rpcServer = await this.getRpcServer();

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const tx = await rpcServer.getTransaction(hash);
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
    walletApi: any,
  ): Promise<TransactionResult> {
    await this.ensureInitialized();

    const poolContract = await this.resolvePoolContract(poolId);

    try {
      const { TransactionBuilder, BASE_FEE, Address, nativeToScVal, rpc } =
        await loadStellarSdk();
      const rpcServer = await this.getRpcServer();

      const call = poolContract.call(
        'lock_assets',
        Address.fromString(userAddress).toScVal(),
        nativeToScVal(BigInt(amount), { type: 'i128' }),
      );

      const account = await rpcServer.getAccount(userAddress);

      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(call)
        .setTimeout(300)
        .build();

      const simulation = await rpcServer.simulateTransaction(transaction);

      if ('error' in simulation) {
        return {
          success: false,
          error: `Simulation failed: ${simulation.error}`,
        };
      }

      const preparedTransaction = rpc.assembleTransaction(transaction, simulation).build();

      const signedTransaction = await walletApi.signTransaction(preparedTransaction.toXDR(), {
        networkPassphrase: NETWORK_PASSPHRASE,
      });

      const submissionResult = await rpcServer.sendTransaction(
        TransactionBuilder.fromXDR(signedTransaction, NETWORK_PASSPHRASE),
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
      console.error('Error locking assets:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error locking assets',
      };
    }
  }

  async unlockAssets(
    poolId: string,
    userAddress: string,
    amount: string,
    walletApi: any,
  ): Promise<TransactionResult> {
    await this.ensureInitialized();

    const poolContract = await this.resolvePoolContract(poolId);

    try {
      const { TransactionBuilder, BASE_FEE, Address, nativeToScVal, rpc } =
        await loadStellarSdk();
      const rpcServer = await this.getRpcServer();

      const call = poolContract.call(
        'unlock_assets',
        Address.fromString(userAddress).toScVal(),
        nativeToScVal(BigInt(amount), { type: 'i128' }),
      );

      const account = await rpcServer.getAccount(userAddress);

      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(call)
        .setTimeout(300)
        .build();

      const simulation = await rpcServer.simulateTransaction(transaction);

      if ('error' in simulation) {
        return {
          success: false,
          error: `Simulation failed: ${simulation.error}`,
        };
      }

      const preparedTransaction = rpc.assembleTransaction(transaction, simulation).build();

      const signedTransaction = await walletApi.signTransaction(preparedTransaction.toXDR(), {
        networkPassphrase: NETWORK_PASSPHRASE,
      });

      const submissionResult = await rpcServer.sendTransaction(
        TransactionBuilder.fromXDR(signedTransaction, NETWORK_PASSPHRASE),
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

  async setBoost(
    poolId: string,
    userAddress: string,
    allocationPercentage: number,
    walletApi: any,
  ): Promise<TransactionResult> {
    await this.ensureInitialized();

    if (allocationPercentage < 0 || allocationPercentage > 100) {
      return {
        success: false,
        error: 'Allocation percentage must be between 0 and 100',
      };
    }

    const poolContract = await this.resolvePoolContract(poolId);

    try {
      const { TransactionBuilder, BASE_FEE, Address, nativeToScVal, rpc } =
        await loadStellarSdk();
      const rpcServer = await this.getRpcServer();

      const call = poolContract.call(
        'set_boost',
        Address.fromString(userAddress).toScVal(),
        nativeToScVal(allocationPercentage, { type: 'u32' }),
      );

      const account = await rpcServer.getAccount(userAddress);

      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(call)
        .setTimeout(300)
        .build();

      const simulation = await rpcServer.simulateTransaction(transaction);

      if ('error' in simulation) {
        return {
          success: false,
          error: `Simulation failed: ${simulation.error}`,
        };
      }

      const preparedTransaction = rpc.assembleTransaction(transaction, simulation).build();

      const signedTransaction = await walletApi.signTransaction(preparedTransaction.toXDR(), {
        networkPassphrase: NETWORK_PASSPHRASE,
      });

      const submissionResult = await rpcServer.sendTransaction(
        TransactionBuilder.fromXDR(signedTransaction, NETWORK_PASSPHRASE),
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

      pools.forEach((pool) => {
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

  private async parsePoolsFromXdr(xdrResult: xdr.ScVal): Promise<PoolInfo[]> {
    return parsePoolsFromXdrResult(xdrResult);
  }

  private async parseUserPositionFromXdr(
    xdrResult: xdr.ScVal,
    poolId: string,
    userAddress: string,
  ): Promise<UserPosition | null> {
    return parseUserPositionFromXdrResult(xdrResult, poolId, userAddress);
  }

  private async parseCreditsFromXdr(xdrResult: xdr.ScVal): Promise<string> {
    return parseCreditsFromXdrResult(xdrResult);
  }
}

// Export singleton instance (initialization is deferred until first contract call)
export const sorobanService = new SorobanService();

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
  const stroops = Math.round(parseFloat(amount) * 10_000_000).toString();
  return sorobanService.unlockAssets(poolContractId, publicKey, stroops, walletApi);
};

export const stellarExpertTxUrl = (hash: string, network: string) =>
  `https://stellar.expert/explorer/${network}/tx/${hash}`;

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

const HISTORY_LOOKBACK_LEDGERS = 120960;

interface SorobanRpcServer {
  getLatestLedger(): Promise<{ sequence: number }>;
  getEvents(
    request: Parameters<StellarSdkModule['rpc']['Server']['prototype']['getEvents']>[0],
  ): ReturnType<StellarSdkModule['rpc']['Server']['prototype']['getEvents']>;
}

async function parseTxHistoryEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evt: any,
  publicKey: string,
): Promise<TxHistoryEntry | null> {
  try {
    if (!evt.inSuccessfulContractCall) return null;

    const { scValToNative } = await loadStellarSdk();
    const topicNatives = evt.topic.map(scValToNative);
    const actionRaw = topicNatives[0] as string;
    if (actionRaw !== 'lock_assets' && actionRaw !== 'unlock_assets') return null;

    const userAddr = topicNatives[1] as string;
    if (userAddr !== publicKey) return null;

    const action: 'lock' | 'unlock' = actionRaw === 'lock_assets' ? 'lock' : 'unlock';

    const valueNative = scValToNative(evt.value);
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
      date: evt.ledgerClosedAt,
      action,
      amount,
      symbol,
      poolId: evt.contractId,
      creditsEarned,
      txHash: evt.txHash,
    };
  } catch {
    return null;
  }
}

export async function getUserTransactionHistory(
  publicKey: string,
  poolContractIds: string[],
  rpcOverride?: SorobanRpcServer,
): Promise<TxHistoryEntry[]> {
  if (!publicKey || poolContractIds.length === 0) return [];

  const { xdr, rpc } = await loadStellarSdk();
  const server: SorobanRpcServer =
    rpcOverride ?? (await (async () => {
      const rpcServer = new rpc.Server(RPC_URL);
      return rpcServer;
    })());

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
          topics: [[lockSymbol, '*'], [unlockSymbol, '*']],
        },
      ],
      limit: 200,
    });

    const entries: TxHistoryEntry[] = [];
    for (const evt of response.events) {
      const entry = await parseTxHistoryEvent(evt, publicKey);
      if (entry) entries.push(entry);
    }

    return entries.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    return [];
  }
}
