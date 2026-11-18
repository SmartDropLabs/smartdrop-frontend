import { devices, expect, test, type Browser, type Page } from "@playwright/test";
import {
  Keypair,
  Networks,
  SorobanDataBuilder,
  TransactionBuilder,
  nativeToScVal,
  xdr,
} from "@stellar/stellar-sdk";

const FACTORY_CONTRACT_ID =
  "CAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQC526";
const POOL_CONTRACT_ID =
  "CABAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAFNSZ";
const USER_PUBLIC_KEY =
  "GABQGAYDAMBQGAYDAMBQGAYDAMBQGAYDAMBQGAYDAMBQGAYDAMBQHGPC";

type DeviceProfile = (typeof devices)[string];

const MOBILE_DEVICES: {
  name: string;
  width: number;
  height: number;
  profile: DeviceProfile;
}[] = [
  { name: "iPhone SE", width: 375, height: 667, profile: devices["iPhone SE"] },
  {
    name: "iPhone 14 Pro",
    width: 390,
    height: 844,
    profile: devices["iPhone 14 Pro"],
  },
  {
    name: "iPhone 14 Plus",
    width: 414,
    height: 896,
    profile: devices["iPhone 14 Plus"],
  },
];

function accountLedgerEntryXdr() {
  const accountEntry = new xdr.AccountEntry({
    accountId: Keypair.fromPublicKey(USER_PUBLIC_KEY).xdrPublicKey(),
    balance: xdr.Int64.fromString("100000000000"),
    seqNum: xdr.SequenceNumber.fromString("1"),
    numSubEntries: 0,
    inflationDest: null,
    flags: 0,
    homeDomain: "",
    thresholds: Buffer.from([1, 0, 0, 0]),
    signers: [],
    ext: new xdr.AccountEntryExt(0),
  });

  return xdr.LedgerEntryData.account(accountEntry).toXDR("base64");
}

function simulationResultXdr(methodName: string, locked: boolean) {
  const lockStartedAt = Date.now();

  if (methodName === "get_pools") {
    return nativeToScVal([
      {
        id: "xlm-pool",
        contract_address: POOL_CONTRACT_ID,
        asset_code: "XLM",
        daily_rate: 123000000n,
        min_lock_period: 604800,
        total_locked: 987650000000n,
        total_users: 4,
        is_active: true,
        created_at: 0,
      },
    ]).toXDR("base64");
  }

  if (methodName === "get_user_position") {
    const lockedAt = locked ? lockStartedAt : lockStartedAt - 604801000;

    return nativeToScVal({
      amount: 250000000n,
      locked_at: lockedAt,
      credits: 70000000n,
      is_locked: locked,
      unlockable_at: lockedAt + 604800000,
    }).toXDR("base64");
  }

  return nativeToScVal(null).toXDR("base64");
}

function contractMethodName(transactionXdr: string) {
  const transaction = TransactionBuilder.fromXDR(
    transactionXdr,
    Networks.TESTNET
  );
  const operation = transaction.operations[0];
  if (operation?.type !== "invokeHostFunction") return "";

  const hostFunction = operation.func;
  if (hostFunction.switch().name !== "hostFunctionTypeInvokeContract") {
    return "";
  }

  return hostFunction.invokeContract().functionName().toString();
}

async function installFarmDataMocks(page: Page, options?: { locked?: boolean }) {
  const locked = options?.locked ?? true;

  await page.addInitScript((publicKey) => {
    Object.defineProperty(window, "freighter", {
      configurable: true,
      value: true,
    });

    window.addEventListener("message", (event) => {
      if (
        event.source !== window ||
        event.data?.source !== "FREIGHTER_EXTERNAL_MSG_REQUEST"
      ) {
        return;
      }

      const base = {
        source: "FREIGHTER_EXTERNAL_MSG_RESPONSE",
        messageId: event.data.messageId,
        messagedId: event.data.messageId,
      };

      const payloads: Record<string, Record<string, unknown>> = {
        REQUEST_ALLOWED_STATUS: { isAllowed: true },
        REQUEST_CONNECTION_STATUS: { isConnected: true },
        REQUEST_PUBLIC_KEY: { publicKey },
        REQUEST_ACCESS: { publicKey },
      };

      window.postMessage(
        {
          ...base,
          ...(payloads[event.data.type] ?? {}),
        },
        window.location.origin
      );
    });
  }, USER_PUBLIC_KEY);

  await page.route(/soroban-testnet\.stellar\.org/, async (route) => {
    const request = route.request();
    const body = request.postDataJSON() as {
      id?: number;
      method?: string;
      params?: { keys?: string[]; transaction?: string };
    };

    if (body.method === "getLedgerEntries") {
      await route.fulfill({
        json: {
          jsonrpc: "2.0",
          id: body.id ?? 1,
          result: {
            latestLedger: 12345,
            entries: [
              {
                key: body.params?.keys?.[0],
                xdr: accountLedgerEntryXdr(),
                lastModifiedLedgerSeq: 12340,
              },
            ],
          },
        },
      });
      return;
    }

    if (body.method === "simulateTransaction" && body.params?.transaction) {
      await route.fulfill({
        json: {
          jsonrpc: "2.0",
          id: body.id ?? 1,
          result: {
            id: String(body.id ?? 1),
            latestLedger: 12345,
            events: [],
            transactionData: new SorobanDataBuilder()
              .build()
              .toXDR("base64"),
            minResourceFee: "0",
            results: [
              {
                auth: [],
                xdr: simulationResultXdr(
                  contractMethodName(body.params.transaction),
                  locked
                ),
              },
            ],
          },
        },
      });
      return;
    }

    await route.abort();
  });
}

async function connectWalletAndLoadPosition(
  page: Page,
  options?: { locked?: boolean }
) {
  await installFarmDataMocks(page, options);
  await page.goto("/farm");
  await page.getByRole("button", { name: "Connect Freighter" }).click();
  await expect(page.getByText("My earnings")).toBeVisible();
  await expect(page.getByText("7.0000000").first()).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));

  expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.viewport);
  expect(overflow.bodyWidth).toBeLessThanOrEqual(overflow.viewport);
}

async function withMobilePage(
  browser: Browser,
  device: (typeof MOBILE_DEVICES)[number],
  run: (page: Page) => Promise<void>
) {
  const context = await browser.newContext({
    ...device.profile,
    viewport: { width: device.width, height: device.height },
  });
  const page = await context.newPage();

  try {
    await run(page);
  } finally {
    await context.close();
  }
}

test.describe("farm responsive layout", () => {
  for (const device of MOBILE_DEVICES) {
    test(`keeps farm cards and unlock controls reachable at ${device.width}px (${device.name})`, async ({
      browser,
    }) => {
      await withMobilePage(browser, device, async (page) => {
        await connectWalletAndLoadPosition(page);

        await expectNoHorizontalOverflow(page);

        const unlockButton = page.getByRole("button", { name: "Unlock" });
        await expect(unlockButton).toBeVisible();
        await unlockButton.scrollIntoViewIfNeeded();
        await expect(unlockButton).toBeInViewport();

        const unlockBox = await unlockButton.boundingBox();
        expect(unlockBox?.x).toBeGreaterThanOrEqual(0);
        expect(
          (unlockBox?.x ?? 0) + (unlockBox?.width ?? 0)
        ).toBeLessThanOrEqual(device.width);

        await expect(page.getByText("Unlock countdown")).toBeVisible();
        await expect(page.getByText("Earned").first()).toBeVisible();
        await expect(page.getByText("My Stake").first()).toBeVisible();
        await expect(page.getByText("Daily Rate").first()).toBeVisible();
        await expect(page.getByText("Total Staked Liquidity").first()).toBeVisible();
      });
    });
  }

  test("keeps the unlock modal form controls full-width on mobile", async ({
    browser,
  }) => {
    await withMobilePage(browser, MOBILE_DEVICES[1], async (page) => {
      await connectWalletAndLoadPosition(page, { locked: false });

      await page.getByRole("button", { name: "Unlock" }).click({ force: true });
      const dialog = page.getByRole("dialog", { name: "Unlock XLM" });
      await expect(dialog).toBeVisible();

      const input = dialog.getByPlaceholder("Amount");
      const unlockAction = dialog.getByRole("button", {
        name: "Unlock with Freighter",
      });

      const [dialogBox, inputBox, buttonBox] = await Promise.all([
        dialog.boundingBox(),
        input.boundingBox(),
        unlockAction.boundingBox(),
      ]);

      expect(inputBox?.width).toBeGreaterThan((dialogBox?.width ?? 0) * 0.75);
      expect(buttonBox?.width).toBeGreaterThan((dialogBox?.width ?? 0) * 0.75);
      await expectNoHorizontalOverflow(page);
    });
  });

  test("makes the disconnected farm connect button full-width on mobile", async ({
    browser,
  }) => {
    await withMobilePage(browser, MOBILE_DEVICES[0], async (page) => {
      await installFarmDataMocks(page);
      await page.goto("/farm");

      const connectButton = page.getByRole("button", {
        name: "Connect Wallet",
      });
      await expect(connectButton).toBeVisible();
      const box = await connectButton.boundingBox();

      expect(box?.x).toBeGreaterThanOrEqual(0);
      expect(box?.width).toBeGreaterThan(300);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(375);
      await expectNoHorizontalOverflow(page);
    });
  });

  test("retains the desktop farm row without horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await connectWalletAndLoadPosition(page);

    await expectNoHorizontalOverflow(page);
    await expect(page.getByRole("button", { name: "Boost" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Unlock" })).toBeVisible();
  });
});
