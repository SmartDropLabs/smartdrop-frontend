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

// Soroban RPC Configuration
const RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org:443';
const NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';
const NETWORK_PASSPHRASE = process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE || Networks.TESTNET;

// Contract Addresses (will be set via environment variables in production)
const FACTORY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS || '';
const DEFAULT_POOL_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_DEFAULT_POOL_CONTRACT_ADDRESS || '';

// Initialize Soroban RPC Server
const rpcServer = new rpc.Server(RPC_URL);

export interface AssetInfo {
  code: string;
  issuer?: string;
  isNative?: boolean;
}

export interface PoolInfo {
  id: string;
  contractAddress: string;
  asset: AssetInfo;
  dailyRate: string;
  minLockPeriod: number;
  totalLocked: string;
  totalUsers: number;
  isActive: boolean;
  createdAt: number;
}

export interface UserPosition {
  user: string;
  poolId: string;
  amount: string;
  lockedAt: number;
  credits: string;
  isLocked: boolean;
  unlockableAt: number;
  boostAllocation?: number;
}

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
  async lockAssets(
    poolId: string, 
    userAddress: string, 
    amount: string,
    walletApi: any // Freighter API instance
  ): Promise<TransactionResult> {
    const poolContract = this.poolContracts.get(poolId);
    if (!poolContract) {
      throw new Error(`Pool contract not found for ID: ${poolId}`);
    }

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

      return {
        success: true,
        transactionHash: submissionResult.hash,
          hash: submissionResult.hash,
          gasUsed: simulation.minResourceFee || '0',

  /**
   * Unlock assets from a pool
   */
  async unlockAssets(
    poolId: string,
    userAddress: string,
    amount: string,
    walletApi: any
  ): Promise<TransactionResult> {
    const poolContract = this.poolContracts.get(poolId);
    if (!poolContract) {
      throw new Error(`Pool contract not found for ID: ${poolId}`);
    }

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
    const poolContract = this.poolContracts.get(poolId);
    if (!poolContract) {
      throw new Error(`Pool contract not found for ID: ${poolId}`);
    }

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

  // Helper methods for parsing XDR data
  private parsePoolsFromXdr(xdrResult: xdr.ScVal): PoolInfo[] {
    // Actual contract parsing should be implemented here when the Soroban result schema is available.
    return [];
  }

  private parseUserPositionFromXdr(
    xdrResult: xdr.ScVal,
    poolId: string,
    userAddress: string
  ): UserPosition | null {
    // Actual contract parsing should be implemented here when the Soroban result schema is available.
    return null;
  }

  private parseCreditsFromXdr(xdrResult: xdr.ScVal): string {
    // Actual contract parsing should be implemented here when the Soroban result schema is available.
    return '0';
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
}) => sorobanService.unlockAssets(poolContractId, publicKey, amount, walletApi);

export const stellarExpertTxUrl = (hash: string, network: string) =>
  `https://stellar.expert/explorer/${network}/tx/${hash}`;
