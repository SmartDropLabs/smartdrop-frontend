/**
 * E2E spec for the core user journey: lock → wait → unlock.
 *
 * Covers the full lifecycle of a position in one continuous session:
 *
 *   connect wallet → select pool → enter amount → lock (sign + submit)
 *   → verify the locked position (stake, countdown, disabled Unlock)
 *   → wait past the lock period → unlock (sign + submit) → stake returns to 0.
 *
 * Uses the same mocked Freighter extension and Soroban RPC stubs as
 * farm.spec.ts, with the clock fixed so the 7-day lock period can be
 * fast-forwarded deterministically.
 */
import { type Page } from '@playwright/test';
import { Networks, TransactionBuilder } from '@stellar/stellar-sdk';
import { test, expect, TEST_PUBLIC_KEY, TEST_ADDRESS_DISPLAY } from './mocks/freighter';

// Pre-computed XDR constants (generated with @stellar/stellar-sdk)
const POOLS_XDR =
  'AAAAEAAAAAEAAAABAAAAEQAAAAEAAAAKAAAADwAAAAJpZAAAAAAADgAAAAhwb29sLXhsbQAAAA8AAAAQY29udHJhY3RfYWRkcmVzcwAAAA4AAAA4Q0FBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUQyS00AAAAPAAAACmFzc2V0X2NvZGUAAAAAAA4AAAADWExNAAAAAA8AAAAJaXNfbmF0aXZlAAAAAAAAAAAAAAEAAAAPAAAACmRhaWx5X3JhdGUAAAAAAAoAAAAAAAAAAAAAAAAAAYagAAAADwAAAA9taW5fbG9ja19wZXJpb2QAAAAABQAAAAAACTqAAAAADwAAAAx0b3RhbF9sb2NrZWQAAAAKAAAAAAAAAAAAAAAXSHboAAAAAA8AAAALdG90YWxfdXNlcnMAAAAAAwAAAAUAAAAPAAAACWlzX2FjdGl2ZQAAAAAAAAAAAAABAAAADwAAAApjcmVhdGVkX2F0AAAAAAAFAAAAAAAAAAA=';

const ACCOUNT_XDR =
  'AAAAAAAAAAA2Ien4u6Ar2/msLbY4G0lyInC8QbRR+8jvZwBJ4mqxggAAABdIdugAAAAAAEmWAtIAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAA';
const ACCOUNT_KEY_XDR =
  'AAAAAAAAAAA2Ien4u6Ar2/msLbY4G0lyInC8QbRR+8jvZwBJ4mqxgg==';

const SOROBAN_DATA_XDR = 'AAAAAAAAAAAAAAAAAA9CQAAAA+gAAAPoAAAAAAAAAGQ=';
const LOCK_ASSETS_AUTH_XDR =
  'AAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAALbG9ja19hc3NldHMAAAAAAAAAAAA=';
const UNLOCK_ASSETS_AUTH_XDR =
  'AAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAANdW5sb2NrX2Fzc2V0cwAAAAAAAAAAAAAA';
const SUCCESS_RESULT_XDR =
  'AAAAAAAAAGQAAAAAAAAAAQAAAAAAAAAYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
const SUCCESS_META_XDR = 'AAAAAAAAAAA=';

// Fixed "now" that matches the position's lockedAt offset (must stay in sync)
const FIXED_NOW_MS = 1_750_000_000_000;
const EIGHT_DAYS_MS = 8 * 24 * 60 * 60 * 1_000;
const CONNECT_WALLET_BUTTON_NAME = /connect (freighter|wallet)/i;

function getSimulatedFunctionName(transactionXdr?: string): string | null {
  if (!transactionXdr) return null;

  try {
    const transaction = TransactionBuilder.fromXDR(transactionXdr, Networks.TESTNET);
    const operation = transaction.operations[0] as {
      type?: string;
      func?: {
        invokeContract?: () => {
          functionName?: () => { toString: () => string };
        };
      };
    };

    if (operation.type !== 'invokeHostFunction') return null;
    return operation.func?.invokeContract?.().functionName?.().toString() ?? null;
  } catch {
    return null;
  }
}

// ── RPC mock ─────────────────────────────────────────────────────────────────

async function mockSorobanRpc(page: Page): Promise<void> {
  let submittedTransactionXdr = '';

  await page.route('**/horizon-testnet.stellar.org/accounts/**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        balances: [{ asset_type: 'native', balance: '100.0000000' }],
      }),
    });
  });

  await page.route('**/soroban-testnet.stellar.org**', async (route) => {
    const body = JSON.parse(route.request().postData() ?? '{}') as {
      id: number;
      method: string;
      params?: { transaction?: string };
    };

    let result: unknown;

    switch (body.method) {
      case 'getLedgerEntries':
        result = {
          entries: [
            {
              key: ACCOUNT_KEY_XDR,
              xdr: ACCOUNT_XDR,
              lastModifiedLedgerSeq: 100,
            },
          ],
          latestLedger: 100,
        };
        break;

      case 'simulateTransaction': {
        const functionName = getSimulatedFunctionName(body.params?.transaction);
        const auth =
          functionName === 'lock_assets'
            ? [LOCK_ASSETS_AUTH_XDR]
            : functionName === 'unlock_assets'
              ? [UNLOCK_ASSETS_AUTH_XDR]
              : [];
        result = {
          id: String(body.id),
          transactionData: SOROBAN_DATA_XDR,
          results: [{ xdr: 'AAAAAQ==', auth }], // scvVoid
          minResourceFee: '100',
          events: [],
          cost: { cpuInsns: '1000', memBytes: '1000' },
          latestLedger: 100,
        };
        break;
      }

      case 'sendTransaction':
        submittedTransactionXdr = body.params?.transaction ?? '';
        result = {
          hash: 'a'.repeat(64),
          status: 'PENDING',
          latestLedger: 100,
          latestLedgerCloseTime: '0',
        };
        break;

      case 'getTransaction':
        result = {
          applicationOrder: 0,
          createdAt: 0,
          envelopeXdr: submittedTransactionXdr,
          feeBump: false,
          resultMetaXdr: SUCCESS_META_XDR,
          resultXdr: SUCCESS_RESULT_XDR,
          status: 'SUCCESS',
          txHash: 'a'.repeat(64),
          ledger: 101,
          latestLedger: 101,
          latestLedgerCloseTime: '0',
        };
        break;

      default:
        await route.continue();
        return;
    }

    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ jsonrpc: '2.0', id: body.id, result }),
    });
  });
}

// ── Seed helpers ─────────────────────────────────────────────────────────────

const MOCK_POOL = {
  id: 'pool-xlm',
  contractAddress: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
  asset: { code: 'XLM', isNative: true },
  dailyRate: '0.0000001',
  minLockPeriod: 604_800, // 7 days in seconds
  totalLocked: '10.0000000',
  totalUsers: 5,
  isActive: true,
  createdAt: 0,
};

function makeMockPosition(lockedAtMs: number, amount = '10.0000000') {
  return {
    user: TEST_PUBLIC_KEY,
    poolId: 'pool-xlm',
    amount,
    lockedAt: lockedAtMs,
    credits: '0',
    isLocked: Number(amount) > 0,
    unlockableAt: lockedAtMs + 604_800_000,
  };
}

async function seedPools(page: Page): Promise<void> {
  await page.evaluate((pool) => {
    const qc = (window as any).__queryClient;
    if (qc) qc.setQueryData(['pools'], [pool]);
  }, MOCK_POOL);
}

async function seedPosition(page: Page, lockedAtMs: number): Promise<void> {
  await page.evaluate(
    ({ pool, position, pubKey }) => {
      const qc = (window as any).__queryClient;
      if (!qc) return;
      qc.setQueryData(['pools'], [pool]);
      qc.setQueryData(['userPosition', 'all', pubKey], [{ pool, position }]);
    },
    { pool: MOCK_POOL, position: makeMockPosition(lockedAtMs), pubKey: TEST_PUBLIC_KEY },
  );
}

async function seedEmptyPosition(page: Page): Promise<void> {
  await page.evaluate(
    ({ pool, position, pubKey }) => {
      const qc = (window as any).__queryClient;
      if (!qc) return;
      qc.setQueryData(['userPosition', 'all', pubKey], [{ pool, position }]);
    },
    { pool: MOCK_POOL, position: makeMockPosition(0, '0.0000000'), pubKey: TEST_PUBLIC_KEY },
  );
}

async function connectWallet(page: Page): Promise<void> {
  await expect(
    page.getByRole('button', { name: CONNECT_WALLET_BUTTON_NAME }).first(),
  ).toBeVisible();
  await page.getByRole('button', { name: CONNECT_WALLET_BUTTON_NAME }).first().click();
  await page.waitForFunction(
    (addr) => document.body.textContent?.includes(addr),
    TEST_ADDRESS_DISPLAY,
    { timeout: 10_000 },
  );
}

test.describe('Lock/unlock lifecycle E2E', () => {
  test.setTimeout(90_000);

  test('connect → select pool → lock 10 XLM → verify position → wait → unlock', async ({
    page,
  }) => {
    test.info().annotations.push({
      type: 'journey',
      description: 'connect → select pool → enter amount → lock → verify → unlock',
    });

    await mockSorobanRpc(page);

    // Fix the clock so the 7-day lock period can be fast-forwarded later
    await page.clock.setFixedTime(new Date(FIXED_NOW_MS));

    // ── Connect wallet ───────────────────────────────────────────────────
    await page.goto('/farm');
    await page.waitForLoadState('networkidle');
    await connectWallet(page);

    // ── Select pool ─────────────────────────────────────────────────────
    await seedPools(page);
    const depositBtn = page.getByRole('button', { name: /^\+ deposit$/i }).first();
    await expect(depositBtn).toBeVisible({ timeout: 8_000 });
    await depositBtn.click();

    // ── Enter amount and lock ───────────────────────────────────────────
    await expect(page.getByRole('dialog')).toBeVisible();
    const amountInput = page.locator(
      '[role="dialog"] input[type="number"], dialog input[type="number"]',
    ).first();
    await amountInput.fill('10');
    await expect(amountInput).toHaveValue('10');

    const lockBtn = page.getByRole('button', { name: /deposit with freighter/i });
    await expect(lockBtn).toBeEnabled({ timeout: 8_000 });
    await lockBtn.click();

    // Signing/submitting runs through the mocked Freighter extension; the
    // modal auto-closes shortly after the success step.
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 20_000 });

    // ── Verify the locked position ──────────────────────────────────────
    await seedPosition(page, FIXED_NOW_MS - 60_000);

    // Stake shows up under My Earnings
    await expect(page.getByText('10.0000000').last()).toBeVisible({ timeout: 8_000 });

    // Countdown is running — the lock period has not elapsed yet
    // (both the pool row and the My Earnings row render one).
    await expect(
      page.getByText(/\d+d \d+h \d+m \d+s/).first(),
    ).toBeVisible({ timeout: 5_000 });

    // Unlock must still be disabled while the lock period elapses
    const unlockBtn = page.getByRole('button', { name: /^unlock$/i }).first();
    await expect(unlockBtn).toBeDisabled();

    // ── Wait — fast-forward past the 7-day lock period ──────────────────
    await page.clock.setFixedTime(new Date(FIXED_NOW_MS + EIGHT_DAYS_MS));

    // useCountdown ticks every second; the next tick flips the row to
    // "Unlocked" and enables the button without any reload.
    await expect(unlockBtn).toBeEnabled({ timeout: 10_000 });
    await expect(page.getByText(/unlocked/i).first()).toBeVisible();

    // ── Unlock ──────────────────────────────────────────────────────────
    await unlockBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Confirm amount (pre-filled with the locked amount)
    const unlockAmountInput = page.locator(
      '[role="dialog"] input[type="number"], dialog input[type="number"]',
    ).first();
    await expect(unlockAmountInput).toHaveValue('10');

    const confirmBtn = page.getByRole('button', { name: /unlock with freighter/i });
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    await expect(page.getByText(/unlock confirmed|unlock submitted/i).first()).toBeVisible({
      timeout: 15_000,
    });

    // ── Position is gone after unlocking ────────────────────────────────
    await seedEmptyPosition(page);
    await expect(page.getByText('0.0000000').last()).toBeVisible({ timeout: 8_000 });
  });
});
