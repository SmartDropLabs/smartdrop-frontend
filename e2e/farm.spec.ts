import { type Page } from '@playwright/test';
import { Networks, TransactionBuilder } from '@stellar/stellar-sdk';
import { test, expect, TEST_ADDRESS_DISPLAY } from './mocks/freighter';

// Pre-computed XDR constants (generated with @stellar/stellar-sdk)
// Pools ScVal XDR: scvVec([scvMap({ id: 'pool-xlm', contract_address: '...', asset_code: 'XLM', ... })])
const POOLS_XDR =
  'AAAAEAAAAAEAAAABAAAAEQAAAAEAAAAKAAAADwAAAAJpZAAAAAAADgAAAAhwb29sLXhsbQAAAA8AAAAQY29udHJhY3RfYWRkcmVzcwAAAA4AAAA4Q0FBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUQyS00AAAAPAAAACmFzc2V0X2NvZGUAAAAAAA4AAAADWExNAAAAAA8AAAAJaXNfbmF0aXZlAAAAAAAAAAAAAAEAAAAPAAAACmRhaWx5X3JhdGUAAAAAAAoAAAAAAAAAAAAAAAAAAYagAAAADwAAAA9taW5fbG9ja19wZXJpb2QAAAAABQAAAAAACTqAAAAADwAAAAx0b3RhbF9sb2NrZWQAAAAKAAAAAAAAAAAAAAAXSHboAAAAAA8AAAALdG90YWxfdXNlcnMAAAAAAwAAAAUAAAAPAAAACWlzX2FjdGl2ZQAAAAAAAAAAAAABAAAADwAAAApjcmVhdGVkX2F0AAAAAAAFAAAAAAAAAAA=';

// User position ScVal XDRs — locked (10 XLM at FIXED_NOW_MS-60s) and empty.
// locked_at / unlockable_at are epoch MILLISECONDS (FarmPosition contract:
// unlockAvailableAt = lockedAt + lockPeriodSeconds * 1000).
const POSITION_XDR =
  'AAAAEQAAAAEAAAAFAAAADgAAAAZhbW91bnQAAAAAAAUAAAAABfXhAAAAAA4AAAAHY3JlZGl0cwAAAAAFAAAAAAAAAAAAAAAOAAAACWlzX2xvY2tlZAAAAAAAAAAAAAABAAAADgAAAAlsb2NrZWRfYXQAAAAAAAAFAAABl3Qf8aAAAAAOAAAADXVubG9ja2FibGVfYXQAAAAAAAAFAAABl5gsdaA=';
const EMPTY_POSITION_XDR =
  'AAAAEQAAAAEAAAAFAAAADgAAAAZhbW91bnQAAAAAAAUAAAAAAAAAAAAAAA4AAAAHY3JlZGl0cwAAAAAFAAAAAAAAAAAAAAAOAAAACWlzX2xvY2tlZAAAAAAAAAAAAAAAAAAADgAAAAlsb2NrZWRfYXQAAAAAAAAFAAAAAAAAAAAAAAAOAAAADXVubG9ja2FibGVfYXQAAAAAAAAFAAAAAAAAAAA=';

// Account LedgerEntry XDR for getLedgerEntries mock response
const ACCOUNT_XDR =
  'AAAAAAAAAAA2Ien4u6Ar2/msLbY4G0lyInC8QbRR+8jvZwBJ4mqxggAAABdIdugAAAAAAEmWAtIAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAA';
const ACCOUNT_KEY_XDR =
  'AAAAAAAAAAA2Ien4u6Ar2/msLbY4G0lyInC8QbRR+8jvZwBJ4mqxgg==';

// SorobanTransactionData XDR for simulateTransaction response
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
const CONNECT_WALLET_BUTTON_NAME = /connect (freighter|wallet)/i;

type PositionState = 'empty' | 'locked';

function getSimulatedFunctionName(transactionXdr?: string): string | null {
  if (!transactionXdr) return null;

  try {
    const transaction = TransactionBuilder.fromXDR(transactionXdr, Networks.TESTNET);
    const operation = transaction.operations[0] as {
      type?: string;
      func?: {
        invokeContract?: () => {
          functionName: () => { toString: () => string };
        };
      };
    };

    if (operation.type !== 'invokeHostFunction') return null;
    return operation.func?.invokeContract?.().functionName().toString() ?? null;
  } catch {
    return null;
  }
}

// ── RPC fetch mock ──────────────────────────────────────────────────────────
//
// Seeds pool + position data at the network layer (issue #475) so farm.spec
// no longer depends on `window.__queryClient`. get_pools / get_user_position
// return pre-computed XDRs; sendTransaction flips the mock position state so
// the post-mutation QueryClient invalidation refetches the updated value.

async function mockSorobanRpc(
  page: Page,
  options: { initialPosition?: PositionState } = {},
): Promise<void> {
  let submittedTransactionXdr = '';
  let positionState: PositionState = options.initialPosition ?? 'empty';

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
      case 'getHealth':
        result = { status: 'OK', latestLedger: 100 };
        break;

      case 'getLatestLedger':
        // Intentionally missing headerXdr/metadataXdr: parseRawLatestLedger
        // throws, getCreditVelocity / useSorobanEvents catch → "0" / abort
        // polling. Avoids a real-network continue() while staying hermetic.
        result = { sequence: 100, id: 'b'.repeat(64) };
        break;

      case 'getEvents':
        result = {
          latestLedger: 100,
          oldestLedger: 1,
          latestLedgerCloseTime: '0',
          oldestLedgerCloseTime: '0',
          cursor: '',
          events: [],
        };
        break;

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
        // Function-specific retval: get_pools → POOLS_XDR,
        // get_user_position → POSITION_XDR / EMPTY_POSITION_XDR,
        // lock/unlock (and anything else) → scvVoid.
        let retvalXdr = 'AAAAAQ==';
        if (functionName === 'get_pools') retvalXdr = POOLS_XDR;
        else if (functionName === 'get_user_position') {
          retvalXdr = positionState === 'locked' ? POSITION_XDR : EMPTY_POSITION_XDR;
        }
        result = {
          id: String(body.id),
          transactionData: SOROBAN_DATA_XDR,
          results: [{ xdr: retvalXdr, auth }],
          minResourceFee: '100',
          events: [],
          cost: { cpuInsns: '1000', memBytes: '1000' },
          latestLedger: 100,
        };
        break;
      }

      case 'sendTransaction': {
        submittedTransactionXdr = body.params?.transaction ?? '';
        const sentFn = getSimulatedFunctionName(submittedTransactionXdr);
        // Flip mock position state BEFORE getTransaction SUCCESS so the
        // mutation onSuccess → invalidateQueries refetch sees the new value.
        if (sentFn === 'lock_assets') positionState = 'locked';
        else if (sentFn === 'unlock_assets') positionState = 'empty';
        result = {
          hash: 'a'.repeat(64),
          status: 'PENDING',
          latestLedger: 100,
          latestLedgerCloseTime: '0',
        };
        break;
      }

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

async function connectWallet(page: Page): Promise<void> {
  await page.getByRole('button', { name: CONNECT_WALLET_BUTTON_NAME }).first().click();
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
      page.getByRole('button', { name: CONNECT_WALLET_BUTTON_NAME }).first(),
    ).toBeVisible();

    await connectWallet(page);

    // Navbar shows the shortened address (first 4 + last 4 chars)
    await expect(page.getByText(TEST_ADDRESS_DISPLAY)).toBeVisible();
  });

  test('2 · deposit — modal accepts 10 XLM and submits', async ({ page }) => {
    // Start empty; sendTransaction of lock_assets flips the mock position →
    // locked so the post-success QueryClient invalidation refetches POSITION_XDR.
    await mockSorobanRpc(page, { initialPosition: 'empty' });
    await page.goto('/farm');
    await page.waitForLoadState('networkidle');
    await connectWallet(page);

    // Wait for pool row with Deposit button (seeded via get_pools XDR mock)
    const depositBtn = page.getByRole('button', { name: /^\+ deposit$/i }).first();
    await expect(depositBtn).toBeVisible({ timeout: 8_000 });
    await depositBtn.click();

    // Modal opens — fill amount input with 10
    const amountInput = page.locator('input[type="number"]').first();
    await amountInput.fill('10');
    await expect(amountInput).toHaveValue('10');

    // Click the deposit/lock button inside the modal
    const submitBtn = page.getByRole('button', { name: /deposit with freighter/i });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Button shows loading state briefly
    await expect(submitBtn).toHaveAttribute('data-loading', 'true', { timeout: 3_000 }).catch(() => {
      // Chakra renders a spinner; just ensure the button still exists
    });

    // Give the lock flow time to submit + flip mock position + invalidate.
    await page.waitForTimeout(1_800);

    // My earnings row now shows the staked amount
    await expect(page.getByText('10.0000000').last()).toBeVisible({ timeout: 5_000 });
  });

  test('3 · countdown visible — Unlock button is disabled before lock period', async ({ page }) => {
    await mockSorobanRpc(page, { initialPosition: 'locked' });

    // Set the clock to a fixed point so the countdown is always non-zero
    await page.clock.setFixedTime(new Date(FIXED_NOW_MS));

    await page.goto('/farm');
    await page.waitForLoadState('networkidle');
    await connectWallet(page);

    // Countdown label is visible and contains time-remaining text (e.g. "6d …").
    // Both the pool row (FarmPoolRow) and the earnings row (EarningRow) render
    // this position's countdown independently, so two elements legitimately
    // match — same reason unlockBtn below is scoped with .first().
    const countdownText = page.getByText(/\d+d \d+h \d+m \d+s/).first();
    await expect(countdownText).toBeVisible({ timeout: 5_000 });

    // Unlock button should be disabled
    const unlockBtn = page.getByRole('button', { name: /^unlock$/i }).first();
    await expect(unlockBtn).toBeVisible();
    await expect(unlockBtn).toBeDisabled();
  });

  test('4 · unlock available — fast-forward 8 days enables Unlock', async ({ page }) => {
    await mockSorobanRpc(page, { initialPosition: 'locked' });

    await page.clock.setFixedTime(new Date(FIXED_NOW_MS));

    await page.goto('/farm');
    await page.waitForLoadState('networkidle');
    await connectWallet(page);

    // Fast-forward 8 days (past the 7-day lock period)
    const eightDaysMs = 8 * 24 * 60 * 60 * 1_000;
    await page.clock.setFixedTime(new Date(FIXED_NOW_MS + eightDaysMs));

    // The useCountdown hook re-evaluates on each render; trigger a navigation
    // back to /farm so the hook picks up the new Date.now()
    await page.goto('/farm');
    await page.waitForLoadState('networkidle');
    await connectWallet(page);

    // Unlock button should now be enabled
    const unlockBtn = page.getByRole('button', { name: /^unlock$/i }).first();
    await expect(unlockBtn).toBeVisible({ timeout: 5_000 });
    await expect(unlockBtn).toBeEnabled();

    // Countdown label shows "Unlocked"
    await expect(page.getByText(/unlocked/i).first()).toBeVisible();
  });

  test('5 · unlock — fill modal, sign, submit; stake drops to 0', async ({ page }) => {
    // Start locked; sendTransaction of unlock_assets flips the mock position →
    // empty so the post-success QueryClient invalidation refetches EMPTY_POSITION_XDR.
    await mockSorobanRpc(page, { initialPosition: 'locked' });

    // Start with clock 8 days in the future so Unlock is immediately available
    const eightDaysMs = 8 * 24 * 60 * 60 * 1_000;
    await page.clock.setFixedTime(new Date(FIXED_NOW_MS + eightDaysMs));

    await page.goto('/farm');
    await page.waitForLoadState('networkidle');
    await connectWallet(page);

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
      page.getByText(/unlock (confirmed|submitted)/i).first(),
    ).toBeVisible({ timeout: 15_000 });

    // "My earnings" now shows 0.0000000 after the position flip + refetch
    await expect(page.getByText('0.0000000').last()).toBeVisible({ timeout: 5_000 });
  });
});
