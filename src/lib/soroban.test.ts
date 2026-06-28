import { describe, expect, it, vi } from 'vitest';
import {
  Account,
  Address,
  Keypair,
  StrKey,
  scValToNative,
  type xdr,
} from '@stellar/stellar-sdk';
import { amountToStroops, buildLockAssetsTransaction } from './soroban';

vi.mock('@/config', () => ({
  factoryContractId: '',
  horizonUrl: 'https://horizon-testnet.stellar.org',
  networkPassphrase: 'Test SDF Network ; September 2015',
  sorobanRpcUrl: 'https://soroban-testnet.stellar.org',
}));

const SELECTED_POOL_CONTRACT_ID =
  'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4';

type InvokeContractOperation = {
  type: 'invokeHostFunction';
  func: {
    invokeContract: () => {
      contractAddress: () => xdr.ScAddress;
      functionName: () => string;
      args: () => xdr.ScVal[];
    };
  };
};

describe('buildLockAssetsTransaction', () => {
  it('builds a lock_assets contract call with a 7-decimal i128 amount', async () => {
    const publicKey = StrKey.encodeEd25519PublicKey(new Uint8Array(32).fill(7));
    const keypair = Keypair.fromPublicKey(publicKey);
    expect(keypair.publicKey()).toBe(publicKey);
    const account = new Account(publicKey, '42');
    const rpcServer = {
      getAccount: vi.fn().mockResolvedValue(account),
      simulateTransaction: vi.fn(),
    };

    const transaction = await buildLockAssetsTransaction(
      {
        poolContractId: SELECTED_POOL_CONTRACT_ID,
        publicKey,
        amount: '1.25',
      },
      rpcServer,
    );

    const operation = transaction.operations[0] as unknown as InvokeContractOperation;
    const invocation = operation.func.invokeContract();
    const args = invocation.args();

    expect(rpcServer.getAccount).toHaveBeenCalledWith(publicKey);
    expect(operation.type).toBe('invokeHostFunction');
    expect(Address.fromScAddress(invocation.contractAddress()).toString()).toBe(
      SELECTED_POOL_CONTRACT_ID,
    );
    expect(invocation.functionName().toString()).toBe('lock_assets');
    expect(scValToNative(args[0])).toBe(publicKey);
    expect(scValToNative(args[1])).toBe(12500000n);
    expect(amountToStroops('1.25')).toBe(12500000n);
  });
});
