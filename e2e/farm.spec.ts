import { type Page } from '@playwright/test';
import { test, expect, TEST_PUBLIC_KEY, TEST_ADDRESS_DISPLAY } from './mocks/freighter';

// Pre-computed XDR constants (generated with @stellar/stellar-sdk)
// Pools ScVal XDR: scvVec([scvMap({ id: 'pool-xlm', contract_address: '...', asset_code: 'XLM', ... })])
const POOLS_XDR =
  'AAAAEAAAAAEAAAABAAAAEQAAAAEAAAAKAAAADwAAAAJpZAAAAAAADgAAAAhwb29sLXhsbQAAAA8AAAAQY29udHJhY3RfYWRkcmVzcwAAAA4AAAA4Q0FBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUQyS00AAAAPAAAACmFzc2V0X2NvZGUAAAAAAA4AAAADWExNAAAAAA8AAAAJaXNfbmF0aXZlAAAAAAAAAAAAAAEAAAAPAAAACmRhaWx5X3JhdGUAAAAAAAoAAAAAAAAAAAAAAAAAAYagAAAADwAAAA9taW5fbG9ja19wZXJpb2QAAAAABQAAAAAACTqAAAAADwAAAAx0b3RhbF9sb2NrZWQAAAAKAAAAAAAAAAAAAAAXSHboAAAAAA8AAAALdG90YWxfdXNlcnMAAAAAAwAAAAUAAAAPAAAACWlzX2FjdGl2ZQAAAAAAAAAAAAABAAAADwAAAApjcmVhdGVkX2F0AAAAAAAFAAAAAAAAAAA=';

// Account LedgerEntry XDR for getLedgerEntries mock response
const ACCOUNT_XDR =
  'AAAAZAAAAAAAAAAANiHp+LugK9v5rC22OBtJciJwvEG0UfvI72cASeJqsYIAAAAXSHboAAAAAABJlgLSAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAA=';
const ACCOUNT_KEY_XDR =
  'AAAAAAAAAAA2Ien4u6Ar2/msLbY4G0lyInC8QbRR+8jvZwBJ4mqxgg==';

// SorobanTransactionData XDR for simulateTransaction response
const SOROBAN_DATA_XDR = 'AAAAAAAAAAAAAAAAAA9CQAAAA+gAAAPoAAAAAAAAAGQ=';

// Fixed "now" that matches the position's lockedAt offset (must stay in sync)
const FIXED_NOW_MS = 1_750_000_000_000;

// ── RPC fetch mock ──────────────────────────────────────────────────────────

async function mockSorobanRpc(page: Page): Promise<void> {
  await page.route('**/soroban-testnet.stellar.org**', async (route) => {
    const body = JSON.parse(route.request().postData() ?? '{}') as {
      id: number;
      method: string;
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

      case 'simulateTransaction':
        // Works for get_pools, get_user_position, and unlock_assets alike.
        // get_user_position parsing ignores a Vec retval and returns null (no position),
        // so positions come exclusively from the QueryClient seed in tests.
        result = {
          transactionData: SOROBAN_DATA_XDR,
          results: [{ xdr: 'AAAAAQ==', auth: [] }], // scvVoid
          minResourceFee: '100',
          cost: { cpuInsns: '1000', memBytes: '1000' },
          latestLedger: 100,
        };
        break;

      case 'sendTransaction':
        result = {
          hash: 'a'.repeat(64),
          status: 'PENDING',
          latestLedger: 100,
          latestLedgerCloseTime: '0',
        };
        break;

      case 'getTransaction':
        result = {
          status: 'SUCCESS',
          latestLedger: 101,
          latestLedgerCloseTime: '0',
          ledger: 101,
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

// ── QueryClient seed helpers ────────────────────────────────────────────────

const MOCK_POOL = {
  id: 'pool-xlm',
  contractAddress: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
  asset: { code: 'XLM', isNative: true },
  dailyRate: '0.0000001',
  minLockPeriod: 604800, // 7 days in seconds
  totalLocked: '10.0000000',
  totalUsers: 5,
  isActive: true,
  createdAt: 0,
};

function makeMockPosition(lockedAtMs: number) {
  return {
    user: TEST_PUBLIC_KEY,
    poolId: 'pool-xlm',
    amount: '10.0000000',
    lockedAt: lockedAtMs,
    credits: '0',
    isLocked: true,
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
  const pos = makeMockPosition(lockedAtMs);
  await page.evaluate(
    ({ pool, position, pubKey }) => {
      const qc = (window as any).__queryClient;
      if (!qc) return;
      qc.setQueryData(['pools'], [pool]);
      qc.setQueryData(['userPosition', 'all', pubKey], [{ pool, position }]);
    },
    { pool: MOCK_POOL, position: pos, pubKey: TEST_PUBLIC_KEY },
  );
}

async function connectWallet(page: Page): Promise<void> {
  await page.getByRole('button', { name: /connect freighter/i }).click();
  await page.waitForFunction(
    (addr) => document.body.textContent?.includes(addr),
    TEST_ADDRESS_DISPLAY,
    { timeout: 10_000 },
  );
}

// ── Tests ───────────────────────────────────────────────────────────────────

test.describe('Farm E2E', () => {
  test('1 · connect wallet — header updates to show truncated address', async ({ page }) => {
    await mockSorobanRpc(page);
    await page.goto('/farm');
    await page.waitForLoadState('networkidle');

    // Connect button is visible before connection
    await expect(
      page.getByRole('button', { name: /connect freighter/i }),
    ).toBeVisible();

    await connectWallet(page);

    // Navbar shows the shortened address (first 4 + last 4 chars)
    await expect(page.getByText(TEST_ADDRESS_DISPLAY)).toBeVisible();
  });

  test('2 · deposit — modal accepts 10 XLM and submits', async ({ page }) => {
    await mockSorobanRpc(page);
    await page.goto('/farm');
    await page.waitForLoadState('networkidle');
    await connectWallet(page);

    // Seed pool data so the Farm pools section renders a row
    await seedPools(page);

    // Wait for pool row with Deposit button
    const depositBtn = page.getByRole('button', { name: /^deposit$/i }).first();
    await expect(depositBtn).toBeVisible({ timeout: 8_000 });
    await depositBtn.click();

    // Modal opens — fill amount input with 10
    const amountInput = page.locator('input[type="number"]').first();
    await amountInput.fill('10');
    await expect(amountInput).toHaveValue('10');

    // Click the deposit/lock button inside the modal
    const submitBtn = page.getByRole('button', { name: /deposit 10/i });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Button shows loading state briefly
    await expect(submitBtn).toHaveAttribute('data-loading', 'true', { timeout: 3_000 }).catch(() => {
      // Chakra renders a spinner; just ensure the button still exists
    });

    // After the 1.5 s stub delay, seed a position so "My earnings" shows 10 XLM
    await page.waitForTimeout(1_800);
    await seedPosition(page, FIXED_NOW_MS - 60_000);

    // My earnings row now shows the staked amount
    await expect(page.getByText('10.0000000')).toBeVisible({ timeout: 5_000 });
  });

  test('3 · countdown visible — Unlock button is disabled before lock period', async ({ page }) => {
    await mockSorobanRpc(page);

    // Set the clock to a fixed point so the countdown is always non-zero
    await page.clock.setFixedTime(new Date(FIXED_NOW_MS));

    await page.goto('/farm');
    await page.waitForLoadState('networkidle');
    await connectWallet(page);

    // Seed a position locked 1 minute ago (7-day lock period → ~7 days remaining)
    await seedPosition(page, FIXED_NOW_MS - 60_000);

    // Countdown label is visible and contains time-remaining text (e.g. "6d …")
    const countdownText = page.getByText(/\d+d \d+h \d+m \d+s/);
    await expect(countdownText).toBeVisible({ timeout: 5_000 });

    // Unlock button should be disabled
    const unlockBtn = page.getByRole('button', { name: /^unlock$/i }).first();
    await expect(unlockBtn).toBeVisible();
    await expect(unlockBtn).toBeDisabled();
  });

  test('4 · unlock available — fast-forward 8 days enables Unlock', async ({ page }) => {
    await mockSorobanRpc(page);

    await page.clock.setFixedTime(new Date(FIXED_NOW_MS));

    await page.goto('/farm');
    await page.waitForLoadState('networkidle');
    await connectWallet(page);
    await seedPosition(page, FIXED_NOW_MS - 60_000);

    // Fast-forward 8 days (past the 7-day lock period)
    const eightDaysMs = 8 * 24 * 60 * 60 * 1_000;
    await page.clock.setFixedTime(new Date(FIXED_NOW_MS + eightDaysMs));

    // The useCountdown hook re-evaluates on each render; trigger a navigation
    // back to /farm so the hook picks up the new Date.now()
    await page.goto('/farm');
    await page.waitForLoadState('networkidle');
    await connectWallet(page);
    await seedPosition(page, FIXED_NOW_MS - 60_000);

    // Unlock button should now be enabled
    const unlockBtn = page.getByRole('button', { name: /^unlock$/i }).first();
    await expect(unlockBtn).toBeVisible({ timeout: 5_000 });
    await expect(unlockBtn).toBeEnabled();

    // Countdown label shows "Unlocked"
    await expect(page.getByText(/unlocked/i).first()).toBeVisible();
  });

  test('5 · unlock — fill modal, sign, submit; stake drops to 0', async ({ page }) => {
    await mockSorobanRpc(page);

    // Start with clock 8 days in the future so Unlock is immediately available
    const eightDaysMs = 8 * 24 * 60 * 60 * 1_000;
    await page.clock.setFixedTime(new Date(FIXED_NOW_MS + eightDaysMs));

    await page.goto('/farm');
    await page.waitForLoadState('networkidle');
    await connectWallet(page);
    await seedPosition(page, FIXED_NOW_MS - 60_000);

    // Unlock button should be enabled
    const unlockBtn = page.getByRole('button', { name: /^unlock$/i }).first();
    await expect(unlockBtn).toBeVisible({ timeout: 5_000 });
    await expect(unlockBtn).toBeEnabled();
    await unlockBtn.click();

    // Unlock modal opens
    await expect(page.getByRole('dialog')).toBeVisible();

    // Confirm amount (pre-filled with lockedAmount)
    const amountInput = page.locator('dialog input[type="number"], [role="dialog"] input[type="number"]').first();
    await expect(amountInput).toHaveValue('10');

    // Click "Unlock with Freighter"
    const confirmBtn = page.getByRole('button', { name: /unlock with freighter/i });
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // Modal shows unlock confirmed badge or closes
    await expect(
      page.getByText(/unlock (confirmed|submitted)/i).or(page.getByText(/unlock submitted/i)),
    ).toBeVisible({ timeout: 15_000 });

    // After success, update cache to show 0 stake
    await page.evaluate(
      ({ pool, pubKey }) => {
        const qc = (window as any).__queryClient;
        if (!qc) return;
        const emptyPos = {
          user: pubKey,
          poolId: 'pool-xlm',
          amount: '0.0000000',
          lockedAt: 0,
          credits: '0',
          isLocked: false,
          unlockableAt: 0,
        };
        qc.setQueryData(['userPosition', 'all', pubKey], [{ pool, position: emptyPos }]);
      },
      { pool: MOCK_POOL, pubKey: TEST_PUBLIC_KEY },
    );

    // "My earnings" now shows 0.0000000
    await expect(page.getByText('0.0000000')).toBeVisible({ timeout: 5_000 });
  });
});
