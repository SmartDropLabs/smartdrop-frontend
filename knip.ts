import type { KnipConfig } from "knip";

/**
 * Dead-code / unused-export detection (GitHub issue #297).
 *
 * Run locally with `pnpm run deadcode`; CI runs the same script in
 * .github/workflows/e2e.yml. The check fails the build on any finding that is
 * not grandfathered in the allowlist below.
 *
 * knip auto-loads its Next.js and Vitest plugins from package.json; the config
 * here only pins the Playwright plugin at this repo's two config files — the
 * root one (testDir: ./tests) and the e2e/ one (testDir: ./e2e) that the
 * `playwright` / `test:visual` npm scripts pass via --config.
 */
const config: KnipConfig = {
  playwright: {
    config: ["playwright.config.ts", "e2e/playwright.config.ts"],
  },

  // ---------------------------------------------------------------------------
  // PRE-EXISTING FINDINGS ALLOWLIST — GitHub issue #297
  //
  // Everything listed below was ALREADY unused when dead-code detection was
  // first wired into CI. None of it was introduced by this change. It is
  // grandfathered so CI can go green now without deleting code that has not
  // been verified safe to remove (see the #297 follow-up cleanup issue for the
  // per-item checklist).
  //
  // DO NOT extend these lists to silence a NEW finding — delete the new dead
  // code instead.
  // ---------------------------------------------------------------------------

  ignoreDependencies: [
    // Not imported anywhere in src/.
    "@chakra-ui/next-js",
    // Transitively provided by @stellar/stellar-sdk; no direct import.
    "@stellar/stellar-base",
    // Leftover from Tailwind v3. Tailwind v4 (@tailwindcss/postcss) autoprefixes
    // internally, so the standalone package is no longer referenced.
    "autoprefixer",
  ],

  // Per-file: suppress only the pre-existing unused `exports` / `types` issues.
  // Every other issue class (unused files, deps, unlisted deps, ...) still fails
  // CI for these files, and any OTHER file is fully checked.
  ignoreIssues: {
    // next-intl navigation re-export (Link, redirect, usePathname, useRouter,
    // type Locale). Framework idiom — exported for app-wide use; consumers not
    // wired up yet. Not truly dead.
    "src/i18n/routing.ts": ["exports", "types"],

    // Whole module appears to have been built ahead of use: RPCError,
    // ContractError, ValidationError, ErrorLogger, ErrorHandler, withErrorHandler,
    // useErrorHandler, retryWithBackoff, enum ErrorType, interface AppError.
    // Needs real investigation (dynamic import? planned feature?) before removal.
    "src/lib/error-handler.ts": ["exports", "types"],

    // buildUnlockAssetsTransaction, parseSimulationError, interfaces
    // LeaderboardRow, BoostConfig, ContractCallOptions.
    "src/lib/soroban.ts": ["exports", "types"],

    // getAirdrop, listAirdropRecipients, type Recipient.
    "src/lib/backend.ts": ["exports", "types"],

    // SPONSORABLE_FUNCTIONS.
    "src/lib/feeBumpGuard.ts": ["exports"],

    // useLockAssets, useOptimisticUpdate, useTransactionStates.
    "src/hooks/useSorobanQuery.ts": ["exports"],

    // classifyGetEventsError.
    "src/hooks/useSorobanEvents.ts": ["exports"],

    // type NotificationType.
    "src/hooks/useToast.tsx": ["types"],

    // toStroops.
    "src/types/farm.ts": ["exports"],

    // type StellarNetworkPreset.
    "src/config/index.ts": ["types"],

    // ErrorBoundarySection.
    "src/components/ErrorBoundary/ErrorBoundary.tsx": ["exports"],

    // injectFreighterMock is exported but only referenced inside this file's own
    // auto-fixture. Fix is to drop the `export` keyword (trivial; #297 follow-up).
    "e2e/mocks/freighter.ts": ["exports"],
  },
};

export default config;
