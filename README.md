# SmartDrop (frontend)

This repository is the **Next.js web app** for SmartDrop, hosted under [**SmartDropLabs/smartdrop-frontend**](https://github.com/SmartDropLabs/smartdrop-frontend). Soroban contracts live in [**smartdrop-contracts**](https://github.com/SmartDropLabs/smartdrop-contracts); the API and indexing service lives in [**smartdrop-backend**](https://github.com/SmartDropLabs/smartdrop-backend).

**SmartDrop** is a liquidity-oriented airdrop experiment on **Stellar**: participants lock **Stellar assets** in **Soroban** farming pools and accrue **airdrop credits** over time instead of passive "click to claim" drops. The goal is to reward people who materially back a project early while discouraging purely extractive behavior.

---

## What this project is

At a high level, SmartDrop has two layers:

1. **Smart contracts (Soroban / Rust)** — developed in [**smartdrop-contracts**](https://github.com/SmartDropLabs/smartdrop-contracts)
   - A **factory** registers or deploys isolated **farming pool** instances per campaign.
   - Each pool accepts a configurable **staking asset** (classic asset + trustline and/or Soroban token contract, depending on your design). Participants **lock** balances, **earn credits** from elapsed time × amount × rate multipliers, can opt into **boost** rules, and **unlock** when policy allows.

2. **Web app (this repo)**
   A Chakra UI + Tailwind CSS front end with **Freighter** for wallet connection and Stellar network settings in `src/config/`. The **Farm** flow is wired to **Soroban RPC** (`invoke`, simulation, transaction submission); dashboard numbers reflect live contract state where a factory is configured, and fall back to clear "not available" states otherwise.

### 🔓 Asset Unlock & Withdrawal System

- **⏰ Time-Lock Protection**: Assets are locked for a configurable minimum period (default: 7 days)
- **📊 Partial Unlocks**: Users can unlock portions of their stake while keeping the rest earning
- **⏱️ Real-Time Countdown**: Live countdown timer shows exactly when assets become unlockable
- **🔐 Freighter Integration**: Secure transaction signing through Freighter wallet
- **⚠️ Comprehensive Error Handling**: User-friendly error messages and retry logic
- **📈 Analytics Tracking**: Full event tracking for unlock actions and outcomes
- **📱 Mobile Responsive**: Verified overflow-free down to 320px viewports

**Technical Features:**
- Minimum unlock validation (0.01 minimum)
- Wallet connectivity verification
- Transaction simulation and fee estimation
- Automatic retry logic for transient failures
- Real-time UI updates upon confirmation
- Stellar Expert transaction links

---

## Design system

- **Chakra UI** provides the component layer, theming tokens (`src/lib/theme.ts`), forms, modals, and the wallet UI.
- **Tailwind CSS** (utilities only — `preflight` is disabled so it doesn't clash with Chakra's reset) drives layout and responsive breakpoints for newer components, starting with the navbar.
- Dark-first theme with a brand accent gradient, card-based layouts with hover states, and a custom SVG mark (`src/app/icon.svg`) replacing the default Next.js favicon.
- The `/contributors` page pulls live commit data from the GitHub API across the three SmartDropLabs repos — no static or borrowed data.

---

## Why it matters

Traditional airdrops often optimize for reach, not alignment. SmartDrop reframes distribution around **commitment**:

- **Skin in the game** — Credits accrue from locked assets, not from a one-off signature.
- **Liquidity and attention** — Projects can target early supporters willing to lock value for a period.
- **Transparent rules** — Rates and multipliers live in **Soroban** contracts; the app is a window into that state.

This does not replace legal, compliance, or token-design work; it is a **mechanism** teams can study, fork, or extend.

---

## Repository layout

| Path | Role |
|------|------|
| `src/app/` | Next.js App Router pages (home, farm, history, leaderboard, contributors) |
| `src/components/` | Shared UI: navbar, footer, wallet button, charts, modals |
| `src/config/` | Stellar network, Horizon, Soroban RPC, optional factory contract id |
| `src/data/contributors.json` | Live-synced contributor data (regenerate via the GitHub contributors API) |
| `src/app/icon.svg` | Favicon / brand mark |

**Stack:** Next.js 15, React 19, TypeScript, Chakra UI, Tailwind CSS, **@stellar/freighter-api**, TanStack Query, Recharts. The app builds as a **static export** (`output: "export"`) so only the front end is shipped — no Node server.

---

## Deployments

When your Soroban **factory** is on **Futurenet** or **Stellar Testnet**, publish the contract id and explorer links here and set:

- `NEXT_PUBLIC_FACTORY_CONTRACT_ID`
- `NEXT_PUBLIC_SOROBAN_RPC_URL` (if not using the default for your network)

### GitHub Pages

Workflow: [`.github/workflows/deploy-github-pages.yml`](./.github/workflows/deploy-github-pages.yml). On every push to `main` it builds and updates the **`gh-pages`** branch.

**One-time setup (required):**

1. Open **`https://github.com/SmartDropLabs/smartdrop-frontend/settings/pages`**
2. **Build and deployment → Source:** choose **Deploy from a branch** (not "GitHub Actions").
3. **Branch:** `gh-pages`, folder **`/ (root)`**, then **Save**.
4. Wait 1–2 minutes after the workflow turns green (**Actions** tab).

**Link:** **`https://smartdroplabs.github.io/smartdrop-frontend/`**

Local preview with the same asset paths: `BASE_PATH=/smartdrop-frontend npm run build` and `npx serve out` → open **`http://localhost:3000/smartdrop-frontend/`**.

### Vercel

1. Sign in at [vercel.com](https://vercel.com) and click **Add New… → Project**.
2. **Import** `SmartDropLabs/smartdrop-frontend` (or your fork). Leave the root directory as the repo root (where `package.json` lives).
3. Vercel should detect **Next.js**. `vercel.json` runs **`npm ci`** + **`npm run build`**; **`.npmrc`** enables `legacy-peer-deps` so Chakra + React resolve like your lockfile. The app is a **static export** (`next.config.ts`): no Node server, only HTML/JS/CSS.
4. Under **Environment Variables**, add any optional `NEXT_PUBLIC_*` values from above (defaults work for testnet without them).
5. In **Settings → General**, set **Node.js** to **20.x** (see `.nvmrc` / `package.json` `engines`).
6. **Deploy.** Pushes to the connected branch trigger new deployments.

**Routes:** use **`/leaderboard`**. The old **`/leaderbord`** path still loads a tiny page that redirects to `/leaderboard`.

**Freighter:** For wallet connect on your `*.vercel.app` URL, ensure the site is allowed in Freighter / use a network that matches your `NEXT_PUBLIC_STELLAR_NETWORK` settings.

---

## Local development

### Prerequisites

- Node.js 20+ recommended
- npm (lockfile is `package-lock.json`; `.npmrc` sets `legacy-peer-deps`)
- [Freighter](https://www.freighter.app/) browser extension for wallet connect

### Setup

```bash
npm ci                # or: npm install
```

Optional `.env.local`:

```
NEXT_PUBLIC_STELLAR_NETWORK=TESTNET
# NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
# NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
# NEXT_PUBLIC_FACTORY_CONTRACT_ID=C...
# NEXT_PUBLIC_POOL_CONTRACT_ID=C...            # pool that custodies locked positions
# NEXT_PUBLIC_MIN_LOCK_PERIOD_SECONDS=604800   # min lock before unlock (default 7 days)
```

Then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Production: `npm run build` / `npm start`.

### Soroban contracts

See the [**smartdrop-contracts**](https://github.com/SmartDropLabs/smartdrop-contracts) repository. Use the official **Stellar / Soroban** CLI and Rust toolchain to scaffold, test, and deploy; then connect the UI via RPC and Freighter-signed transactions.

**Never commit** signing keys or sponsor secrets.

---

## Security and status

This codebase is **not** presented as audited production infrastructure. Pool economics, boosts, and admin operations must be reviewed for your deployment. Anyone shipping should:

- Run their own review or professional audit
- Start on **test networks** and conservative parameters
- Treat privileged functions (`pause`, parameter updates, rescues) as governance-sensitive

---

## Roadmap

| Area | Opportunity |
|------|----------------|
| **Soroban pools** | Implement factory + pool in Rust; lock Stellar assets; emit events for indexers. |
| **Boost & donations** | Wire boosts to explicit token transfer rules in contracts. |
| **Frontend** | Continue migrating layout/responsive styling to Tailwind. |
| **Horizon + Soroban** | Optional account balance reads via Horizon alongside contract state. |

---

## Contributors

SmartDrop is built by the SmartDropLabs org across three repos: this frontend, [`smartdrop-backend`](https://github.com/SmartDropLabs/smartdrop-backend), and [`smartdrop-contracts`](https://github.com/SmartDropLabs/smartdrop-contracts). See **[`CONTRIBUTORS.md`](./CONTRIBUTORS.md)** or the in-app [`/contributors`](https://smartdroplabs.github.io/smartdrop-frontend/contributors) page for the full list, sourced directly from each repo's GitHub contributors API.

---

## Contributing

1. **Fork** the repository and branch for your change.
2. **Discuss** larger design shifts in an issue when helpful.
3. **Keep PRs focused** — one coherent improvement per pull request.
4. **Tests** — Add Soroban tests for contract changes; exercise the Next.js app after UI updates.
5. **Documentation** — Update this README when env vars or deployment steps change.

Please be respectful in issues and reviews.

---

## License

Add a root `LICENSE` when you are ready (MIT is common for OSS). Until then, clarify terms in your fork if you distribute the code publicly.
