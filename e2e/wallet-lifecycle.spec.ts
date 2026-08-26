/**
 * E2E spec for the full wallet connect → interact → disconnect lifecycle.
 *
 * Covers the most critical user journey end-to-end against the mocked
 * Freighter extension:
 *
 *   1. Disconnected baseline — wallet-gated nav hidden, stat pills shown,
 *      connect CTA visible.
 *   2. Connect — clicking the connect button runs the Freighter handshake
 *      (connection status → access → public key → network) and the UI flips
 *      to its connected state (address pill, gated links appear).
 *   3. Interact — account-scoped UI renders for the connected address.
 *   4. Disconnect — via the Navbar wallet menu, the app returns to the exact
 *      disconnected baseline.
 *
 * Related: #67 (account switch), #70 (disconnect guard), #237 (navbar
 * disconnect button).
 */
import { type Page } from '@playwright/test';
import { test, expect, TEST_PUBLIC_KEY, TEST_ADDRESS_DISPLAY } from './mocks/freighter';

const CONNECT_WALLET_BUTTON_NAME = /connect (freighter|wallet)/i;

// ── RPC mock ─────────────────────────────────────────────────────────────────
// Minimal Soroban/Horizon stubs so page data hooks resolve without errors.
// Account-scoped content is not needed here — only that requests succeed.

async function mockSorobanRpc(page: Page): Promise<void> {
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
    };

    let result: unknown;

    switch (body.method) {
      case 'getLedgerEntries':
        result = { entries: [], latestLedger: 100 };
        break;

      case 'simulateTransaction':
        result = {
          id: String(body.id),
          transactionData: 'AAAAAAAAAAAAAAAAAA9CQAAAA+gAAAPoAAAAAAAAAGQ=',
          results: [{ xdr: 'AAAAAQ==', auth: [] }], // scvVoid
          minResourceFee: '100',
          events: [],
          cost: { cpuInsns: '1000', memBytes: '1000' },
          latestLedger: 100,
        };
        break;

      case 'sendTransaction':
        result = {
          hash: 'b'.repeat(64),
          status: 'PENDING',
          latestLedger: 100,
          latestLedgerCloseTime: '0',
        };
        break;

      case 'getTransaction':
        result = {
          status: 'SUCCESS',
          resultXdr: 'AAAAAQ==',
          resultMetaXdr: 'AAAAAAAAAAA=',
          ledger: 101,
          txHash: 'b'.repeat(64),
          latestLedger: 101,
          latestLedgerCloseTime: '0',
        };
        break;

      default:
        result = {};
    }

    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ jsonrpc: '2.0', id: body.id, result }),
    });
  });
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

test.describe('Wallet lifecycle E2E', () => {
  test('connect → connected UI updates → disconnect restores baseline', async ({ page }) => {
    await mockSorobanRpc(page);
    await page.goto('/farm');
    await page.waitForLoadState('networkidle');

    // ── 1. Disconnected baseline ────────────────────────────────────────
    await expect(
      page.getByRole('button', { name: CONNECT_WALLET_BUTTON_NAME }).first(),
    ).toBeVisible();

    const farmLink = page.getByRole('link', { name: 'Farm' });
    const leaderboardLink = page.getByRole('link', { name: 'Leaderboard' });
    await expect(farmLink).toHaveCount(0);
    await expect(leaderboardLink).toHaveCount(0);

    // Stat pills are shown while no wallet is connected
    await expect(page.getByText('Online')).toBeVisible();

    // No address displayed anywhere before connecting
    await expect(page.getByText(TEST_ADDRESS_DISPLAY)).toHaveCount(0);

    // ── 2. Connect (Freighter handshake via the mocked extension) ──────
    await connectWallet(page);

    // Navbar wallet pill shows the truncated address
    await expect(page.getByText(TEST_ADDRESS_DISPLAY)).toBeVisible();

    // Wallet-gated navigation appears
    await expect(farmLink).toBeVisible();
    await expect(leaderboardLink).toBeVisible();

    // Stat pills replaced by the wallet menu pill
    await expect(page.getByText('Online')).toHaveCount(0);

    // ── 3. Interact — account-scoped UI renders for the session ────────
    await expect(
      page.getByText(/no active positions found for the connected wallet/i),
    ).toBeVisible({ timeout: 8_000 });

    // ── 4. Disconnect via the Navbar wallet menu ───────────────────────
    await page.getByRole('button', { name: 'Wallet menu' }).click();
    await page.getByRole('menuitem', { name: 'Disconnect' }).click();

    // Back to the disconnected baseline
    await expect(
      page.getByRole('button', { name: CONNECT_WALLET_BUTTON_NAME }).first(),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(TEST_ADDRESS_DISPLAY)).toHaveCount(0);
    await expect(farmLink).toHaveCount(0);
    await expect(page.getByText('Online')).toBeVisible();
    await expect(
      page.getByText(/connect your freighter wallet to view your positions/i),
    ).toBeVisible();
  });

  // The global floating ConnectWalletButton only renders while DISCONNECTED
  // on pages that don't provide their own CTA (AppShell suppresses it on
  // /farm and /history). Once connected, the Navbar wallet menu becomes the
  // sole disconnect affordance — so this flow connects via the floating
  // button on "/" and disconnects through the navbar.
  test('floating connect button on "/" connects; navbar menu disconnects', async ({ page }) => {
    await mockSorobanRpc(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Disconnected: the floating connect button is visible
    const connectBtn = page.getByRole('button', { name: CONNECT_WALLET_BUTTON_NAME }).first();
    await expect(connectBtn).toBeVisible();

    // Connect via the floating button
    await connectBtn.click();
    await page.waitForFunction(
      (addr) => document.body.textContent?.includes(addr),
      TEST_ADDRESS_DISPLAY,
      { timeout: 10_000 },
    );

    // Connected state: floating button removed, wallet menu pill shown,
    // wallet-gated navigation appears.
    await expect(connectBtn).toHaveCount(0);
    const walletMenu = page.getByRole('button', { name: 'Wallet menu' });
    await expect(walletMenu).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('link', { name: 'Farm' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Leaderboard' })).toBeVisible();

    // Disconnect via the navbar wallet menu
    await walletMenu.click();
    await page.getByRole('menuitem', { name: 'Disconnect' }).click();

    // Disconnected baseline restored on "/"
    await expect(connectBtn).toBeVisible({ timeout: 10_000 });
    await expect(walletMenu).toHaveCount(0);
    await expect(page.getByText(TEST_ADDRESS_DISPLAY)).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Farm' })).toHaveCount(0);
  });
});
