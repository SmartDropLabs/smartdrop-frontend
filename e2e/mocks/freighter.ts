import { test as base, type Page } from '@playwright/test';

export const TEST_PUBLIC_KEY =
  'GA3CD2PYXOQCXW7ZVQW3MOA3JFZCE4F4IG2FD66I55TQASPCNKYYEFRN';

// Truncated address as shown by Navbar's shortenStellarAddress (first4…last4)
export const TEST_ADDRESS_DISPLAY = 'GA3C…EFRN';

/**
 * Inject a deterministic Freighter stub before page scripts load.
 *
 * The stub intercepts window.postMessage calls that @stellar/freighter-api v3
 * uses to communicate with the browser extension and immediately dispatches
 * the expected response on the same window, so no real extension is needed.
 *
 * window.__freighter is also set as the sentinel checked by isConnected().
 */
export async function injectFreighterMock(page: Page): Promise<void> {
  await page.addInitScript((pubKey: string) => {
    // isConnected() checks truthiness of window.freighter
    (window as any).__freighter = true;
    (window as any).freighter = true;

    const _origPost = window.postMessage.bind(window);

    window.postMessage = function (data: any, targetOrigin?: any, transfer?: any) {
      if (data?.source !== 'FREIGHTER_EXTERNAL_MSG_REQUEST') {
        return _origPost(data, targetOrigin, transfer);
      }

      const messageId = data.messageId as number;

      let payload: Record<string, unknown> = {};

      switch (data.type) {
        case 'REQUEST_CONNECTION_STATUS':
          payload = { isConnected: true };
          break;
        case 'REQUEST_ALLOWED_STATUS':
          payload = { isAllowed: true };
          break;
        case 'SET_ALLOWED_STATUS':
          payload = { isAllowed: true };
          break;
        case 'REQUEST_PUBLIC_KEY':
          payload = { publicKey: pubKey };
          break;
        case 'REQUEST_ACCESS':
          payload = { publicKey: pubKey };
          break;
        case 'SUBMIT_TRANSACTION':
          // Return the unsigned XDR unchanged — our mock RPC accepts it
          payload = {
            signedTransaction: data.transactionXdr,
            signerAddress: pubKey,
          };
          break;
        case 'REQUEST_NETWORK_DETAILS':
          payload = {
            networkDetails: {
              network: 'TESTNET',
              networkName: 'Test SDF Network',
              networkUrl: 'https://horizon-testnet.stellar.org',
              networkPassphrase: 'Test SDF Network ; September 2015',
              sorobanRpcUrl: 'https://soroban-testnet.stellar.org',
            },
          };
          break;
        default:
          return _origPost(data, targetOrigin, transfer);
      }

      // Post the response back synchronously on next tick so the freighter-api
      // listener (added via addEventListener) is already registered.
      setTimeout(() => {
        window.dispatchEvent(
          new MessageEvent('message', {
            data: {
              source: 'FREIGHTER_EXTERNAL_MSG_RESPONSE',
              // Note: freighter-api uses the typo "messagedId" (not "messageId")
              messagedId: messageId,
              ...payload,
            },
            // event.source must === window for the listener to accept it
            source: window,
            origin: window.location.origin,
          }),
        );
      }, 0);
    } as typeof window.postMessage;
  }, TEST_PUBLIC_KEY);
}

type FreighterFixtures = { freighterMock: void };

export const test = base.extend<FreighterFixtures>({
  freighterMock: [
    async ({ page }, use) => {
      await injectFreighterMock(page);
      await use();
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
