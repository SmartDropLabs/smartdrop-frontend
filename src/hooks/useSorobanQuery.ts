/**
 * Custom React Query hooks for Soroban contract interactions
 * Provides caching, error handling, and automatic refetching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sorobanService, type PoolInfo, type UserPosition, type TransactionResult } from '@/lib/soroban';
import { useStellarWallet } from '@/context/StellarWalletContext';
import { useToast } from '@chakra-ui/react';

// Query Keys
export const QUERY_KEYS = {
  POOLS: 'pools',
  USER_POSITION: 'userPosition',
  USER_CREDITS: 'userCredits',
  PLATFORM_STATS: 'platformStats',
  BOOST_CONFIG: 'boostConfig',
} as const;

/**
 * Hook to fetch all available farming pools
 */
export const usePools = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.POOLS],
    queryFn: () => sorobanService.getFactoryPools(),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

/**
 * Hook to fetch user position for a specific pool
 */
export const useUserPosition = (poolId: string, enabled: boolean = true) => {
  const { publicKey } = useStellarWallet();

  return useQuery({
    queryKey: [QUERY_KEYS.USER_POSITION, poolId, publicKey],
    queryFn: () => sorobanService.getUserPosition(poolId, publicKey!),
    enabled: enabled && !!publicKey && !!poolId,
    staleTime: 15000, // 15 seconds
    refetchInterval: 30000, // 30 seconds
    retry: 2,
  });
};

/**
 * Hook to calculate user credits for a specific pool
 */
export const useUserCredits = (poolId: string, enabled: boolean = true) => {
  const { publicKey } = useStellarWallet();

  return useQuery({
    queryKey: [QUERY_KEYS.USER_CREDITS, poolId, publicKey],
    queryFn: () => sorobanService.calculateUserCredits(poolId, publicKey!),
    enabled: enabled && !!publicKey && !!poolId,
    staleTime: 5000, // 5 seconds (credits change frequently)
    refetchInterval: 10000, // 10 seconds
    retry: 2,
  });
};

/**
 * Hook to fetch platform statistics
 */
export const usePlatformStats = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.PLATFORM_STATS],
    queryFn: () => sorobanService.getPlatformStats(),
    staleTime: 60000, // 1 minute
    refetchInterval: 120000, // 2 minutes
    retry: 3,
  });
};

/**
 * Hook to lock assets in a pool
 */
export const useLockAssets = () => {
  const { walletApi, publicKey } = useStellarWallet();
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({
      poolId,
      amount,
    }: {
      poolId: string;
      amount: string;
    }) => {
      if (!walletApi || !publicKey) {
        throw new Error('Wallet not connected');
      }
      return sorobanService.lockAssets(poolId, publicKey, amount, walletApi);
    },
    onSuccess: (result: TransactionResult, variables) => {
      if (result.success) {
        toast({
          title: 'Assets Locked Successfully',
          description: `Transaction: ${result.transactionHash?.slice(0, 8)}...`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });

        // Invalidate related queries to refetch data
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.USER_POSITION, variables.poolId],
        });
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.USER_CREDITS, variables.poolId],
        });
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.PLATFORM_STATS],
        });
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.POOLS],
        });
      } else {
        toast({
          title: 'Lock Assets Failed',
          description: result.error || 'Unknown error occurred',
          status: 'error',
          duration: 8000,
          isClosable: true,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Transaction Error',
        description: error.message,
        status: 'error',
        duration: 8000,
        isClosable: true,
      });
    },
  });
};

/**
 * Hook to unlock assets from a pool
 */
export const useUnlockAssets = () => {
  const { walletApi, publicKey } = useStellarWallet();
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({
      poolId,
      amount,
    }: {
      poolId: string;
      amount: string;
    }) => {
      if (!walletApi || !publicKey) {
        throw new Error('Wallet not connected');
      }
      return sorobanService.unlockAssets(poolId, publicKey, amount, walletApi);
    },
    onSuccess: (result: TransactionResult, variables) => {
      if (result.success) {
        toast({
          title: 'Assets Unlocked Successfully',
          description: `Transaction: ${result.transactionHash?.slice(0, 8)}...`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });

        // Invalidate related queries
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.USER_POSITION, variables.poolId],
        });
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.USER_CREDITS, variables.poolId],
        });
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.PLATFORM_STATS],
        });
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.POOLS],
        });
      } else {
        toast({
          title: 'Unlock Assets Failed',
          description: result.error || 'Unknown error occurred',
          status: 'error',
          duration: 8000,
          isClosable: true,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Transaction Error',
        description: error.message,
        status: 'error',
        duration: 8000,
        isClosable: true,
      });
    },
  });
};

/**
 * Hook to set boost configuration
 */
export const useSetBoost = () => {
  const { walletApi, publicKey } = useStellarWallet();
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({
      poolId,
      allocationPercentage,
    }: {
      poolId: string;
      allocationPercentage: number;
    }) => {
      if (!walletApi || !publicKey) {
        throw new Error('Wallet not connected');
      }
      return sorobanService.setBoost(poolId, publicKey, allocationPercentage, walletApi);
    },
    onSuccess: (result: TransactionResult, variables) => {
      if (result.success) {
        toast({
          title: 'Boost Configuration Updated',
          description: `Boost set to ${variables.allocationPercentage}%`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });

        // Invalidate related queries
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.USER_POSITION, variables.poolId],
        });
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.USER_CREDITS, variables.poolId],
        });
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.BOOST_CONFIG, variables.poolId],
        });
      } else {
        toast({
          title: 'Boost Configuration Failed',
          description: result.error || 'Unknown error occurred',
          status: 'error',
          duration: 8000,
          isClosable: true,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Transaction Error',
        description: error.message,
        status: 'error',
        duration: 8000,
        isClosable: true,
      });
    },
  });
};

/**
 * Hook to get all user positions across all pools
 */
export const useAllUserPositions = () => {
  const { publicKey } = useStellarWallet();
  const { data: pools } = usePools();

  return useQuery({
    queryKey: [QUERY_KEYS.USER_POSITION, 'all', publicKey],
    queryFn: async () => {
      if (!publicKey || !pools) return [];

      const positions = await Promise.allSettled(
        pools.map(pool => sorobanService.getUserPosition(pool.id, publicKey))
      );

      return positions
        .map((result, index) => ({
          pool: pools[index],
          position: result.status === 'fulfilled' ? result.value : null,
        }))
        .filter(item => item.position !== null);
    },
    enabled: !!publicKey && !!pools && pools.length > 0,
    staleTime: 15000,
    refetchInterval: 30000,
  });
};

/**
 * Hook to get total user credits across all pools
 */
export const useTotalUserCredits = () => {
  const { publicKey } = useStellarWallet();
  const { data: pools } = usePools();

  return useQuery({
    queryKey: [QUERY_KEYS.USER_CREDITS, 'total', publicKey],
    queryFn: async () => {
      if (!publicKey || !pools) return '0';

      const credits = await Promise.allSettled(
        pools.map(pool => sorobanService.calculateUserCredits(pool.id, publicKey))
      );

      const totalCredits = credits.reduce((total, result) => {
        if (result.status === 'fulfilled') {
          return total + parseFloat(result.value);
        }
        return total;
      }, 0);

      return totalCredits.toString();
    },
    enabled: !!publicKey && !!pools && pools.length > 0,
    staleTime: 10000,
    refetchInterval: 15000,
  });
};

/**
 * Hook for real-time updates with optimistic UI updates
 */
export const useOptimisticUpdate = () => {
  const queryClient = useQueryClient();

  const updateUserPosition = (
    poolId: string,
    userAddress: string,
    updateFn: (old: UserPosition | null) => UserPosition | null
  ) => {
    queryClient.setQueryData(
      [QUERY_KEYS.USER_POSITION, poolId, userAddress],
      updateFn
    );
  };

  const updateCredits = (
    poolId: string,
    userAddress: string,
    newCredits: string
  ) => {
    queryClient.setQueryData(
      [QUERY_KEYS.USER_CREDITS, poolId, userAddress],
      newCredits
    );
  };

  const updatePlatformStats = (
    updateFn: (old: any) => any
  ) => {
    queryClient.setQueryData([QUERY_KEYS.PLATFORM_STATS], updateFn);
  };

  return {
    updateUserPosition,
    updateCredits,
    updatePlatformStats,
  };
};

/**
 * Hook for managing loading states across multiple operations
 */
export const useTransactionStates = () => {
  const lockMutation = useLockAssets();
  const unlockMutation = useUnlockAssets();
  const boostMutation = useSetBoost();

  const isLoading = 
    lockMutation.isPending || 
    unlockMutation.isPending || 
    boostMutation.isPending;

  const hasError = 
    lockMutation.isError || 
    unlockMutation.isError || 
    boostMutation.isError;

  const error = 
    lockMutation.error || 
    unlockMutation.error || 
    boostMutation.error;

  const reset = () => {
    lockMutation.reset();
    unlockMutation.reset();
    boostMutation.reset();
  };

  return {
    isLoading,
    hasError,
    error,
    reset,
    lockAssets: lockMutation.mutate,
    unlockAssets: unlockMutation.mutate,
    setBoost: boostMutation.mutate,
  };
};