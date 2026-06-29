import { afterEach, describe, expect, it, vi } from 'vitest';

const { assembleTransactionMock } = vi.hoisted(() => ({
  assembleTransactionMock: vi.fn(),
}));

vi.mock('@stellar/stellar-sdk', async importOriginal => {
  const actual = await importOriginal<typeof import('@stellar/stellar-sdk')>();

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
  type FeeBumpTransaction,
  StrKey,
  type Transaction,
  nativeToScVal,
  scValToNative,
  xdr,
} from '@stellar/stellar-sdk';
import {
  SorobanService,
  formatAssetAmount,
  formatCredits,
  formatLockTime,
  parseCreditsFromXdrResult,
  parsePoolsFromXdrResult,
  sorobanService,
  unlockAssets,
} from './soroban';

const POOL_CONTRACT_ID = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4';
const USER_PUBLIC_KEY = StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 7));
const POOL_ID = 'pool-xlm';

type MockRpcServer = {
  getAccount: ReturnType<typeof vi.fn>;
  simulateTransaction: ReturnType<typeof vi.fn>;
  sendTransaction: ReturnType<typeof vi.fn>;
  getTransaction: ReturnType<typeof vi.fn>;
};

function makePoolNative(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pool-xlm',
    contract_address: POOL_CONTRACT_ID,
    asset_code: 'XLM',
    is_native: true,
    daily_rate: BigInt(5_000_000),
    min_lock_period: BigInt(86_400),
    total_locked: BigInt(100_000_000),
    total_users: BigInt(3),
    is_active: true,
    created_at: BigInt(1_700_000_000),
    ...overrides,
  };
}

function invokeContractFromOperation(op: xdr.Operation) {
  return op
    .body()
    .invokeHostFunctionOp()
    .hostFunction()
    .invokeContract();
}

function makeAuthEntry(functionName: string, contractId = POOL_CONTRACT_ID) {
  const contractFn = new xdr.InvokeContractArgs({
    contractAddress: Address.fromString(contractId).toScAddress(),
    functionName,
    args: [],
  });

  return new xdr.SorobanAuthorizationEntry({
    credentials: xdr.SorobanCredentials.sorobanCredentialsSourceAccount(),
    rootInvocation: new xdr.SorobanAuthorizedInvocation({
      function: xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(contractFn),
      subInvocations: [],
    }),
  });
}

function makeMockRpcServer(overrides: Partial<MockRpcServer> = {}): MockRpcServer {
  return {
    getAccount: vi.fn().mockResolvedValue(new Account(USER_PUBLIC_KEY, '0')),
    simulateTransaction: vi.fn(),
    sendTransaction: vi.fn(),
    getTransaction: vi.fn().mockResolvedValue({ status: 'SUCCESS' }),
    ...overrides,
  };
}

function makeService({
  factory = false,
  pool = true,
  rpcServer = makeMockRpcServer(),
}: {
  factory?: boolean;
  pool?: boolean;
  rpcServer?: MockRpcServer;
} = {}) {
  const service = new SorobanService();
  const svc = service as unknown as {
    factoryContract?: Contract;
    poolContracts: Map<string, Contract>;
    rpcServer: MockRpcServer;
  };

  svc.rpcServer = rpcServer;
  if (factory) svc.factoryContract = new Contract(POOL_CONTRACT_ID);
  else svc.factoryContract = undefined;
  if (pool) svc.poolContracts.set(POOL_ID, new Contract(POOL_CONTRACT_ID));

  return { service, rpcServer };
}

function mockAssembleTransactionPassthrough() {
  assembleTransactionMock.mockImplementation((transaction: Transaction | FeeBumpTransaction) => ({
    build: () => transaction,
  }));
  return assembleTransactionMock;
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  assembleTransactionMock.mockReset();
});

describe('soroban formatters', () => {
  it('formats credits below 1000, thousands, and millions', () => {
    expect(formatCredits('999.4')).toBe('999');
    expect(formatCredits('1500')).toBe('1.5K');
    expect(formatCredits('2500000')).toBe('2.5M');
  });

  it('formats lock time with fake timers for past, day, hour, and sub-hour cases', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-27T12:00:00.000Z'));

    const now = Date.now();

    expect(formatLockTime(now - 1)).toBe('Unlockable now');
    expect(formatLockTime(now + 2 * 24 * 60 * 60 * 1000)).toBe('2 days remaining');
    expect(formatLockTime(now + 3 * 60 * 60 * 1000)).toBe('3 hours remaining');
    expect(formatLockTime(now + 30 * 60 * 1000)).toBe('Less than 1 hour');
  });

  it('formats native and issued asset amounts with the asset code suffix', () => {
    expect(formatAssetAmount('12.5', { code: 'XLM', isNative: true })).toBe('12.5 XLM');

    const issued = formatAssetAmount('1234.5', {
      code: 'USDC',
      issuer: USER_PUBLIC_KEY,
      isNative: false,
    });

    expect(issued).toMatch(/^(1,234\.5|1234\.5) USDC$/);
  });
});

describe('soroban XDR wrappers', () => {
  it('parses a valid ScVec of pool maps into PoolInfo entries', () => {
    const scVal = nativeToScVal([makePoolNative()]);

    const pools = parsePoolsFromXdrResult(scVal);

    expect(pools).toHaveLength(1);
    expect(pools[0]).toMatchObject({
      id: 'pool-xlm',
      contractAddress: POOL_CONTRACT_ID,
      asset: { code: 'XLM', isNative: true },
      dailyRate: '0.5000000',
      minLockPeriod: 86_400,
      totalLocked: '10.0000000',
      totalUsers: 3,
      isActive: true,
      createdAt: 1_700_000_000,
    });
  });

  it('returns an empty array for an empty ScVec', () => {
    expect(parsePoolsFromXdrResult(nativeToScVal([]))).toEqual([]);
  });

  it('skips malformed entries and warns while keeping valid pools', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const scVal = nativeToScVal([
      makePoolNative({ id: 'valid-1' }),
      'malformed-entry',
      makePoolNative({ id: 'valid-2' }),
    ]);

    const pools = parsePoolsFromXdrResult(scVal);

    expect(pools.map(pool => pool.id)).toEqual(['valid-1', 'valid-2']);
    expect(warnSpy).toHaveBeenCalledWith(
      '[SmartDrop] parsePoolsFromXdr: skipping malformed pool at index 1:',
      expect.any(TypeError),
    );
  });

  it('parses i128 credit stroops into display units', () => {
    const credits = nativeToScVal(BigInt(25_000_000), { type: 'i128' });

    expect(parseCreditsFromXdrResult(credits)).toBe('2.5000000');
  });
});

describe('soroban transaction builders', () => {
  it('builds lock_assets with the user ScAddress and amount as i128', async () => {
    const { service, rpcServer } = makeService();
    rpcServer.simulateTransaction.mockResolvedValue({ error: 'stop before signing' });
    const callSpy = vi.spyOn(Contract.prototype, 'call');

    const result = await service.lockAssets(POOL_ID, USER_PUBLIC_KEY, '123456789', {
      signTransaction: vi.fn(),
    });

    expect(result).toEqual({
      success: false,
      status: 'FAILED',
      error: 'Simulation failed: stop before signing',
    });
    expect(callSpy).toHaveBeenCalledWith(
      'lock_assets',
      expect.any(xdr.ScVal),
      expect.any(xdr.ScVal),
    );

    const op = callSpy.mock.results[0].value as xdr.Operation;
    const invokeContract = invokeContractFromOperation(op);
    const [addressArg, amountArg] = invokeContract.args();

    expect(invokeContract.functionName().toString()).toBe('lock_assets');
    expect(addressArg.switch()).toBe(xdr.ScValType.scvAddress());
    expect(addressArg.address().switch()).toBe(xdr.ScAddressType.scAddressTypeAccount());
    expect(scValToNative(addressArg)).toBe(USER_PUBLIC_KEY);
    expect(amountArg.switch()).toBe(xdr.ScValType.scvI128());
    expect(scValToNative(amountArg)).toBe(BigInt(123_456_789) * BigInt(10_000_000));
  });

  it('converts unlock display units to stroops before delegating', async () => {
    const walletApi = { signTransaction: vi.fn() };
    const unlockSpy = vi
      .spyOn(sorobanService, 'unlockAssets')
      .mockResolvedValue({ success: true, transactionHash: 'abc123' });

    await expect(
      unlockAssets({
        poolContractId: 'pool-xlm',
        publicKey: USER_PUBLIC_KEY,
        amount: '1.2345678',
        walletApi,
      }),
    ).resolves.toEqual({ success: true, transactionHash: 'abc123' });

    expect(unlockSpy).toHaveBeenCalledWith(
      'pool-xlm',
      USER_PUBLIC_KEY,
      '12345678',
      walletApi,
      { onHash: undefined, onStep: undefined },
    );
  });
});

describe('SorobanService RPC reads', () => {
  it('getFactoryPools returns parsed pools from a simulated factory call', async () => {
    const { service, rpcServer } = makeService({ factory: true, pool: false });
    rpcServer.simulateTransaction.mockResolvedValue({
      result: { retval: nativeToScVal([makePoolNative({ id: 'factory-pool' })]) },
    });

    const pools = await service.getFactoryPools();

    expect(pools).toHaveLength(1);
    expect(pools[0]).toMatchObject({
      id: 'factory-pool',
      contractAddress: POOL_CONTRACT_ID,
      totalLocked: '10.0000000',
    });
    expect(rpcServer.getAccount).toHaveBeenCalledWith(
      'GBQ3WPTHKJ5XKWLOKUZJLZL2GVXR6RWQCXUVDQZWM7Q2YNLDRVGM5ZWJ',
    );
    expect(rpcServer.simulateTransaction).toHaveBeenCalledTimes(1);
  });

  it('getFactoryPools returns an empty list when the factory is not initialized', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { service, rpcServer } = makeService({ factory: false, pool: false });

    await expect(service.getFactoryPools()).resolves.toEqual([]);

    expect(warnSpy).toHaveBeenCalledWith(
      'Factory contract not initialized; returning empty pool list',
    );
    expect(rpcServer.getAccount).not.toHaveBeenCalled();
  });

  it('getFactoryPools returns an empty list when simulation reports an error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { service, rpcServer } = makeService({ factory: true, pool: false });
    rpcServer.simulateTransaction.mockResolvedValue({ error: 'factory unavailable' });

    await expect(service.getFactoryPools()).resolves.toEqual([]);
  });

  it('getUserPosition returns a parsed user position from a simulated pool call', async () => {
    const { service, rpcServer } = makeService();
    rpcServer.simulateTransaction.mockResolvedValue({
      result: {
        retval: nativeToScVal({
          amount: BigInt(75_000_000),
          locked_at: BigInt(1_700_000_000),
          credits: BigInt(15_000_000),
          is_locked: true,
          unlockable_at: BigInt(1_700_086_400),
          boost_allocation: 25,
        }),
      },
    });

    const position = await service.getUserPosition(POOL_ID, USER_PUBLIC_KEY);

    expect(position).toMatchObject({
      user: USER_PUBLIC_KEY,
      poolId: POOL_ID,
      amount: '7.5000000',
      lockedAt: 1_700_000_000,
      credits: '1.5000000',
      isLocked: true,
      unlockableAt: 1_700_086_400,
      boostAllocation: 25,
    });
  });

  it('getUserPosition returns null when the pool is not registered', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { service, rpcServer } = makeService({ pool: false });

    await expect(service.getUserPosition('missing-pool', USER_PUBLIC_KEY)).resolves.toBeNull();

    expect(warnSpy).toHaveBeenCalledWith('Pool contract not found for ID: missing-pool');
    expect(rpcServer.getAccount).not.toHaveBeenCalled();
  });

  it('getUserPosition returns null when simulation reports an error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { service, rpcServer } = makeService();
    rpcServer.simulateTransaction.mockResolvedValue({ error: 'position failed' });

    await expect(service.getUserPosition(POOL_ID, USER_PUBLIC_KEY)).resolves.toBeNull();
  });

  it('calculateUserCredits returns parsed credit display units', async () => {
    const { service, rpcServer } = makeService();
    rpcServer.simulateTransaction.mockResolvedValue({
      result: { retval: nativeToScVal(BigInt(12_345_678), { type: 'i128' }) },
    });

    await expect(service.calculateUserCredits(POOL_ID, USER_PUBLIC_KEY)).resolves.toBe(
      '1.2345678',
    );
  });

  it('calculateUserCredits returns zero when the pool is not registered', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { service, rpcServer } = makeService({ pool: false });

    await expect(service.calculateUserCredits('missing-pool', USER_PUBLIC_KEY)).resolves.toBe('0');

    expect(warnSpy).toHaveBeenCalledWith('Pool contract not found for ID: missing-pool');
    expect(rpcServer.getAccount).not.toHaveBeenCalled();
  });

  it('calculateUserCredits returns zero when simulation reports an error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { service, rpcServer } = makeService();
    rpcServer.simulateTransaction.mockResolvedValue({ error: 'credit failed' });

    await expect(service.calculateUserCredits(POOL_ID, USER_PUBLIC_KEY)).resolves.toBe('0');
  });
});

describe('SorobanService RPC writes', () => {
  it('lockAssets signs and submits an assembled transaction on success', async () => {
    const { service, rpcServer } = makeService();
    const assembleSpy = mockAssembleTransactionPassthrough();
    rpcServer.simulateTransaction.mockResolvedValue({
      result: { auth: [makeAuthEntry('lock_assets')] },
      minResourceFee: '321',
    });
    rpcServer.sendTransaction.mockResolvedValue({ status: 'PENDING', hash: 'lock-hash' });
    const walletApi = { signTransaction: vi.fn(async (xdrEnvelope: string) => xdrEnvelope) };

    const result = await service.lockAssets(POOL_ID, USER_PUBLIC_KEY, '50000000', walletApi);

    expect(result).toEqual({
      success: true,
      transactionHash: 'lock-hash',
      hash: 'lock-hash',
      status: 'SUCCESS',
      resultXdr: undefined,
      gasUsed: '321',
    });
    expect(assembleSpy).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ minResourceFee: '321' }),
    );
    expect(walletApi.signTransaction).toHaveBeenCalledWith(expect.any(String), {
      networkPassphrase: expect.any(String),
    });
    expect(rpcServer.sendTransaction).toHaveBeenCalledTimes(1);
  });

  it('unlockAssets signs and submits an assembled transaction on success', async () => {
    const { service, rpcServer } = makeService();
    mockAssembleTransactionPassthrough();
    rpcServer.simulateTransaction.mockResolvedValue({
      result: { auth: [makeAuthEntry('unlock_assets')] },
      minResourceFee: '654',
    });
    rpcServer.sendTransaction.mockResolvedValue({ status: 'PENDING', hash: 'unlock-hash' });
    const walletApi = { signTransaction: vi.fn(async (xdrEnvelope: string) => xdrEnvelope) };

    const result = await service.unlockAssets(POOL_ID, USER_PUBLIC_KEY, '25000000', walletApi);

    expect(result).toEqual({
      success: true,
      transactionHash: 'unlock-hash',
      hash: 'unlock-hash',
      status: 'SUCCESS',
      resultXdr: undefined,
      gasUsed: '654',
    });
    expect(walletApi.signTransaction).toHaveBeenCalledTimes(1);
    expect(rpcServer.sendTransaction).toHaveBeenCalledTimes(1);
  });

  it('unlockAssets throws when the pool is not registered', async () => {
    const { service, rpcServer } = makeService({ pool: false });

    await expect(
      service.unlockAssets('missing-pool', USER_PUBLIC_KEY, '10000000', {
        signTransaction: vi.fn(),
      }),
    ).rejects.toThrow('Pool contract not found for ID: missing-pool');
    expect(rpcServer.getAccount).not.toHaveBeenCalled();
  });

  it('setBoost signs and submits an assembled transaction on success', async () => {
    const { service, rpcServer } = makeService();
    mockAssembleTransactionPassthrough();
    rpcServer.simulateTransaction.mockResolvedValue({
      result: { auth: [makeAuthEntry('set_boost')] },
      minResourceFee: '777',
    });
    rpcServer.sendTransaction.mockResolvedValue({ status: 'PENDING', hash: 'boost-hash' });
    const walletApi = { signTransaction: vi.fn(async (xdrEnvelope: string) => xdrEnvelope) };

    const result = await service.setBoost(POOL_ID, USER_PUBLIC_KEY, 40, walletApi);

    expect(result).toEqual({
      success: true,
      transactionHash: 'boost-hash',
      hash: 'boost-hash',
      gasUsed: '777',
    });
    expect(walletApi.signTransaction).toHaveBeenCalledTimes(1);
    expect(rpcServer.sendTransaction).toHaveBeenCalledTimes(1);
  });

  it('setBoost rejects invalid allocation percentages before RPC calls', async () => {
    const { service, rpcServer } = makeService();

    await expect(service.setBoost(POOL_ID, USER_PUBLIC_KEY, 101, {
      signTransaction: vi.fn(),
    })).resolves.toEqual({
      success: false,
      error: 'Allocation percentage must be between 0 and 100',
    });
    expect(rpcServer.getAccount).not.toHaveBeenCalled();
  });
});

describe('SorobanService platform stats', () => {
  it('getPlatformStats aggregates pool totals from getFactoryPools', async () => {
    const { service } = makeService({ pool: false });
    vi.spyOn(service, 'getFactoryPools').mockResolvedValue([
      {
        id: 'pool-1',
        contractAddress: POOL_CONTRACT_ID,
        asset: { code: 'XLM', isNative: true },
        dailyRate: '0.5000000',
        minLockPeriod: 86_400,
        totalLocked: '1000',
        totalUsers: 25,
        isActive: true,
        createdAt: 1,
      },
      {
        id: 'pool-2',
        contractAddress: POOL_CONTRACT_ID,
        asset: { code: 'USDC', issuer: USER_PUBLIC_KEY, isNative: false },
        dailyRate: '0.2500000',
        minLockPeriod: 43_200,
        totalLocked: '2500',
        totalUsers: 15,
        isActive: true,
        createdAt: 2,
      },
    ]);

    await expect(service.getPlatformStats()).resolves.toEqual({
      totalValueLocked: '$3,500',
      totalUsers: 40,
      onlineUsers: 4,
      totalPools: 2,
    });
  });

  it('getPlatformStats returns zero stats when getFactoryPools throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { service } = makeService({ pool: false });
    vi.spyOn(service, 'getFactoryPools').mockRejectedValue(new Error('stats failed'));

    await expect(service.getPlatformStats()).resolves.toEqual({
      totalValueLocked: '$0',
      totalUsers: 0,
      onlineUsers: 0,
      totalPools: 0,
    });
  });
});
