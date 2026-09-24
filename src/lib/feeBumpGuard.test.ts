import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Account,
  Address,
  Asset,
  Contract,
  Keypair,
  Networks,
  Operation,
  StrKey,
  TransactionBuilder,
  nativeToScVal,
  xdr,
} from '@stellar/stellar-sdk';
import { assertSponsorableInnerTransaction, RateLimiter } from './feeBumpGuard';

// These signature-verification cases previously ran under jsdom (Vitest 4
// dropped environmentMatchGlobs), where the npm `buffer` polyfill's Buffer
// fails @noble/hashes' Uint8Array instanceof check inside Transaction.hash().
// vitest.config.ts now runs src/lib tests in the node environment, where
// hash()/verify() behave exactly as they do under `next start`.

function attachDummySignature(tx: { addDecoratedSignature: (sig: xdr.DecoratedSignature) => void }) {
  tx.addDecoratedSignature(
    new xdr.DecoratedSignature({
      hint: Buffer.alloc(4, 9),
      signature: Buffer.alloc(64, 9),
    }),
  );
}

const POOL_ID = StrKey.encodeContract(new Uint8Array(32).fill(1));
const OTHER_CONTRACT_ID = StrKey.encodeContract(new Uint8Array(32).fill(2));
const SOURCE_PUBKEY = StrKey.encodeEd25519PublicKey(new Uint8Array(32).fill(3));

function buildLockAssetsTx(poolId: string) {
  const account = new Account(SOURCE_PUBKEY, '0');
  const contract = new Contract(poolId);
  const operation = contract.call(
    'lock_assets',
    Address.fromString(SOURCE_PUBKEY).toScVal(),
    nativeToScVal(10_000_000, { type: 'i128' }),
  );
  return new TransactionBuilder(account, { fee: '100', networkPassphrase: Networks.TESTNET })
    .addOperation(operation)
    .setTimeout(300)
    .build();
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('assertSponsorableInnerTransaction', () => {
  it('accepts a signed lock_assets call against a known pool', () => {
    vi.spyOn(Keypair.prototype, 'verify').mockReturnValue(true);
    const tx = buildLockAssetsTx(POOL_ID);
    attachDummySignature(tx);

    expect(() => assertSponsorableInnerTransaction(tx, new Set([POOL_ID]))).not.toThrow();
  });

  it('rejects a plain Payment operation', () => {
    const account = new Account(SOURCE_PUBKEY, '0');
    const tx = new TransactionBuilder(account, { fee: '100', networkPassphrase: Networks.TESTNET })
      .addOperation(
        Operation.payment({
          destination: StrKey.encodeEd25519PublicKey(new Uint8Array(32).fill(4)),
          asset: Asset.native(),
          amount: '1',
        }),
      )
      .setTimeout(300)
      .build();
    attachDummySignature(tx);

    expect(() => assertSponsorableInnerTransaction(tx, new Set([POOL_ID]))).toThrow(
      /not sponsorable/,
    );
  });

  it('rejects an invokeHostFunction call targeting a contract not in the known pool set', () => {
    const tx = buildLockAssetsTx(OTHER_CONTRACT_ID);
    attachDummySignature(tx);

    expect(() => assertSponsorableInnerTransaction(tx, new Set([POOL_ID]))).toThrow(
      /unrecognized pool contract/,
    );
  });

  it('rejects a call to a function outside the sponsorable allow-list', () => {
    const account = new Account(SOURCE_PUBKEY, '0');
    const contract = new Contract(POOL_ID);
    const operation = contract.call('drain_pool', Address.fromString(SOURCE_PUBKEY).toScVal());
    const tx = new TransactionBuilder(account, { fee: '100', networkPassphrase: Networks.TESTNET })
      .addOperation(operation)
      .setTimeout(300)
      .build();
    attachDummySignature(tx);

    expect(() => assertSponsorableInnerTransaction(tx, new Set([POOL_ID]))).toThrow(
      /not a sponsorable function/,
    );
  });

  it('rejects an unsigned inner transaction', () => {
    const tx = buildLockAssetsTx(POOL_ID);

    expect(() => assertSponsorableInnerTransaction(tx, new Set([POOL_ID]))).toThrow(
      /not signed/,
    );
  });

  it('rejects a transaction whose attached signature does not verify against its source', () => {
    vi.spyOn(Keypair.prototype, 'verify').mockReturnValue(false);
    const tx = buildLockAssetsTx(POOL_ID);
    attachDummySignature(tx);

    expect(() => assertSponsorableInnerTransaction(tx, new Set([POOL_ID]))).toThrow(
      /valid signature/,
    );
  });

  it('rejects a transaction with more than one operation', () => {
    const account = new Account(SOURCE_PUBKEY, '0');
    const contract = new Contract(POOL_ID);
    const operation = contract.call(
      'lock_assets',
      Address.fromString(SOURCE_PUBKEY).toScVal(),
      nativeToScVal(10_000_000, { type: 'i128' }),
    );
    const tx = new TransactionBuilder(account, { fee: '100', networkPassphrase: Networks.TESTNET })
      .addOperation(operation)
      .addOperation(operation)
      .setTimeout(300)
      .build();
    attachDummySignature(tx);

    expect(() => assertSponsorableInnerTransaction(tx, new Set([POOL_ID]))).toThrow(
      /exactly one operation/,
    );
  });
});

describe('RateLimiter', () => {
  it('allows up to the configured max requests within the window, then throttles', () => {
    const limiter = new RateLimiter(2, 1000);
    const now = 1_000_000;
    expect(limiter.tryConsume('a', now)).toBe(true);
    expect(limiter.tryConsume('a', now + 10)).toBe(true);
    expect(limiter.tryConsume('a', now + 20)).toBe(false);
  });

  it('resets once the window has elapsed', () => {
    const limiter = new RateLimiter(1, 1000);
    const now = 1_000_000;
    expect(limiter.tryConsume('a', now)).toBe(true);
    expect(limiter.tryConsume('a', now + 500)).toBe(false);
    expect(limiter.tryConsume('a', now + 1001)).toBe(true);
  });

  it('tracks distinct keys independently', () => {
    const limiter = new RateLimiter(1, 1000);
    const now = 1_000_000;
    expect(limiter.tryConsume('a', now)).toBe(true);
    expect(limiter.tryConsume('b', now)).toBe(true);
  });
});
