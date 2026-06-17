# SmartDrop (frontend)

This repository is the **Next.js web app** for SmartDrop, hosted under [**SmartDropLabs/smart-frontend**](https://github.com/SmartDropLabs/smart-frontend). Soroban contracts live in [**smartdrop-contracts**](https://github.com/SmartDropLabs/smartdrop-contracts); APIs and indexing will live in [**smartdrop-backend**](https://github.com/SmartDropLabs/smartdrop-backend). The original combined app remains at [**SmartDrop**](https://github.com/SmartDropLabs/SmartDrop).

**SmartDrop** is a liquidity-oriented airdrop experiment on **Stellar**: participants lock **Stellar assets** in **Soroban** farming pools and accrue **airdrop credits** over time instead of passive “click to claim” drops. The goal is to reward people who materially back a project early while discouraging purely extractive behavior.

[Livedemo (Heroku)](https://smartdro-76d78d7c3a78.herokuapp.com/)


---

## What this project is

At a high level, SmartDrop has two layers:

1. **Smart contracts (Soroban / Rust)** — developed in [**smartdrop-contracts**](https://github.com/SmartDropLabs/smartdrop-contracts)  
   - A **factory** registers or deploys isolated **farming pool** instances per campaign.  
   - Each pool accepts a configurable **staking asset** (classic asset + trustline and/or Soroban token contract, depending on your design). Participants **lock** balances, **earn credits** from elapsed time × amount × rate multipliers, can opt into **boost** rules, and **unlock** when policy allows.

2. **Web app (Next.js)**  
   A Chakra UI front end with **Freighter** for wallet connection and Stellar network settings in `src/config/`. The **Farm** flow is ready to be wired to **Soroban RPC** (`invoke`, simulation, transaction submission); several dashboard numbers are still **placeholders** until your contracts are deployed and indexed.

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
| `soroban/` / `contracts/` | Moved to [**smartdrop-contracts**](https://github.com/SmartDropLabs/smartdrop-contracts) |
| `src/app/` | Next.js App Router pages (home, farm, leaderboard) |
| `src/config/` | Stellar network, Horizon, Soroban RPC, optional factory contract id |

**Stack:** Next.js 15, React, TypeScript, Chakra UI, **@stellar/freighter-api**, TanStack Query. The app builds as **static export** (`output: "export"`) so only the front end is shipped—no Node server.

---

## Deployments

When your Soroban **factory** is on **Futurenet** or **Stellar Testnet**, publish the contract id and explorer links here and set:

- `NEXT_PUBLIC_FACTORY_CONTRACT_ID`  
- `NEXT_PUBLIC_SOROBAN_RPC_URL` (if not using the default for your network)

### GitHub Pages (free public link, no Vercel)

Workflow: [`.github/workflows/deploy-github-pages.yml`](./.github/workflows/deploy-github-pages.yml). On every push to `main` it builds and updates the **`gh-pages`** branch.

**One-time setup (required):**

1. Open **`https://github.com/SmartDropLabs/smart-frontend/settings/pages`**
2. **Build and deployment → Source:** choose **Deploy from a branch** (not “GitHub Actions”).
3. **Branch:** `gh-pages`, folder **`/ (root)`**, then **Save**.
4. Wait 1–2 minutes after the workflow turns green (**Actions** tab).

**Your link:**

**`https://smartdroplabs.github.io/smart-frontend/`**

If the repo is renamed, replace `smart-frontend` in the URL with the new repo name.

Local preview with the same asset paths: `BASE_PATH=/smart-frontend npm run build` and `npx serve out` → open **`http://localhost:3000/smart-frontend/`**.

### Vercel (frontend)

1. Sign in at [vercel.com](https://vercel.com) and click **Add New… → Project**.
2. **Import** `SmartDropLabs/smart-frontend` (or your fork). Leave the root directory as the repo root (where `package.json` lives).
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

### Front end

```bash
cd SmartDrop          # folder that contains package.json
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
npm run dev           # or: yarn dev
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
| **Frontend** | Replace mock metrics with `simulateTransaction` / indexer data. |
| **Horizon + Soroban** | Optional account balance reads via Horizon alongside contract state. |

---

## Community acknowledgments

SmartDrop sits alongside other **Stellar / Soroban** projects such as [**lernza/lernza**](https://github.com/lernza/lernza). **[`CONTRIBUTORS.md`](./CONTRIBUTORS.md)** and **[`src/data/lernza-contributors.json`](./src/data/lernza-contributors.json)** list everyone GitHub counts as a contributor there.

**GitHub Insights → Contributors (this repo):** the default branch also includes transparent **empty attribution commits** that carry `Co-authored-by` trailers for those upstream accounts, so they appear on SmartDrop’s contributor graph the same way GitHub documents for multi-author commits. Refresh that set after Lernza gains new contributors by running `npm run contributors:sync` (updates data files) and `npm run contributors:github-insights` (creates new empty commits; maintainers only).

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
