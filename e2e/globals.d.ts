import type { E2ESeedApi } from "../src/lib/e2eSeed";

declare global {
  interface Window {
    /**
     * Installed by `src/context/index.tsx` in development and when
     * NEXT_PUBLIC_E2E=true, which is what the Playwright config sets.
     *
     * Specs seed through this rather than through the QueryClient, so the query
     * keys live in one place: `src/lib/e2eSeed.ts`.
     */
    __e2e?: E2ESeedApi;
  }
}

export {};
