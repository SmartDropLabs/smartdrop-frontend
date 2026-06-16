# SmartDrop - 15 Solid Issues for Contributors

## Repository: smartdrop-contracts

### Issue 1: Implement Factory Contract with Pool Deployment
**Title:** Implement Soroban Factory Contract for Pool Creation and Registry

**Description:**
Create the core factory contract in Rust/Soroban that manages the creation and registration of farming pool instances. This is a critical component missing from the current scaffold.

**Requirements:**
- Implement `initialize(admin: Address)` function to set factory admin
- Implement `create_pool(asset: Address, daily_rate: u128, min_lock_period: u64)` function
- Store pool registry mapping (pool_id => pool_contract_address)
- Emit `pool_created` events with pool ID and contract address
- Add authorization checks for admin-only functions
- Include comprehensive unit tests with at least 80% coverage
- Document all public functions with rustdoc comments

**Acceptance Criteria:**
- Factory contract compiles to WASM successfully
- All tests pass (`cargo test`)
- Can deploy to Stellar Testnet
- Events are properly emitted and can be queried
- Admin can create multiple pools
- Non-admin addresses are rejected

**Estimated Effort:** 8-12 hours
**Priority:** Critical
**Labels:** `soroban`, `rust`, `smart-contracts`, `core-feature`

---

### Issue 2: Implement Farming Pool Contract with Lock/Unlock Logic
**Title:** Build Soroban Pool Contract with Asset Locking and Credit Accrual

**Description:**
Implement the individual farming pool contract that accepts asset deposits, calculates time-based credits, and manages user stakes.

**Requirements:**
- Implement `lock_assets(user: Address, amount: i128)` function
- Implement `unlock_assets(user: Address, amount: i128)` with time-lock validation
- Implement `calculate_credits(user: Address) -> i128` based on time elapsed × amount × rate
- Store user positions: `Map<Address, Position>` with amount, timestamp, total_credits
- Implement `get_user_position(user: Address) -> Position` view function
- Add pool pause/unpause functionality for emergency situations
- Include minimum lock period enforcement
- Emit events for all state changes
- Write comprehensive tests including edge cases (zero amounts, not enough balance, etc.)

**Acceptance Criteria:**
- Users can lock supported Stellar assets
- Credits accrue correctly over time (verified with tests)
- Users cannot unlock before minimum lock period
- Unauthorized unlock attempts are rejected
- All events are emitted correctly
- Test coverage > 85%

**Estimated Effort:** 12-16 hours
**Priority:** Critical
**Labels:** `soroban`, `rust`, `smart-contracts`, `core-feature`

---

### Issue 3: Add Boost Mechanism to Pool Contract
**Title:** Implement Boost/Multiplier System for Enhanced Credit Accrual

**Description:**
Add a boost mechanism where users can allocate a percentage of their stake to earn multiplied credits, adding gamification to the farming experience.

**Requirements:**
- Add `BoostConfig` struct with multiplier and allocation percentage fields
- Implement `set_boost(user: Address, allocation_pct: u32)` function (1-100%)
- Modify credit calculation to split principal and virtual stake
- Formula: `virtual_stake = (amount * allocation_pct / 100) * multiplier`
- Formula: `total_stake = principal_stake + virtual_stake`
- Implement `get_boost_config(user: Address) -> Option<BoostConfig>`
- Add admin function to set global boost multiplier
- Emit `boost_applied` events
- Write tests for different allocation percentages

**Acceptance Criteria:**
- Users can set boost allocation from 1-100%
- Credits are correctly calculated with boost applied
- Boost can be updated without losing existing credits
- Invalid percentages (>100) are rejected
- Tests verify all boost scenarios

**Estimated Effort:** 6-8 hours
**Priority:** High
**Labels:** `soroban`, `rust`, `enhancement`, `gamification`

---

## Repository: smartdrop-frontend

### Issue 4: Replace Mock Data with Real Soroban Contract Integration
**Title:** Integrate Frontend with Deployed Soroban Contracts via RPC

**Description:**
Remove all hardcoded mock data and connect the frontend to real Soroban contracts using `@stellar/stellar-sdk` and Soroban RPC.

**Requirements:**
- Create `/src/lib/soroban.ts` with contract invocation utilities
- Implement `getFactoryPools()` to fetch pool list from factory contract
- Implement `getUserPosition(poolId, userAddress)` to get real stake data
- Implement `calculateUserCredits(poolId, userAddress)` for earned credits
- Replace mock data in `/src/app/page.tsx` with real contract queries
- Replace mock farms in `/src/app/farm/page.tsx` with actual pools
- Add error handling for RPC failures with user-friendly messages
- Implement loading states with Chakra UI Spinner components
- Use TanStack Query for caching and automatic refetching

**Acceptance Criteria:**
- No more mock/hardcoded data in the UI
- Dashboard shows real TVL, user count (or explains they're not yet tracked)
- Farm page lists actual pools from the factory contract
- User positions and credits are fetched from blockchain
- Loading states are shown during RPC calls
- Errors are handled gracefully with toast notifications

**Estimated Effort:** 10-14 hours
**Priority:** Critical
**Labels:** `frontend`, `soroban-integration`, `typescript`

---

### Issue 5: Implement Deposit Flow with Freighter Transaction Signing
**Title:** Complete End-to-End Asset Locking Flow with Freighter Wallet

**Description:**
Wire up the deposit modal to actually lock assets in the Soroban pool contract using Freighter for transaction signing.

**Requirements:**
- Build transaction in `/src/app/farm/page.tsx` `handleLockClick()` function
- Use Soroban RPC `simulateTransaction` before submission for fee estimation
- Call pool contract `lock_assets` function with user-specified amount
- Request Freighter signature via `@stellar/freighter-api`
- Submit signed transaction to Soroban RPC
- Show transaction status (pending → success → confirmed)
- Display transaction hash with Stellar Expert link
- Handle errors: insufficient balance, rejected signature, network failures
- Update UI after successful deposit without requiring page refresh
- Add input validation (non-zero amounts, max balance checks)

**Acceptance Criteria:**
- User can input amount and click "Lock"
- Freighter popup appears for signature
- Transaction submits successfully to testnet
- Success/failure messages are shown
- User's position updates immediately after confirmation
- All edge cases have proper error messages

**Estimated Effort:** 8-12 hours
**Priority:** Critical
**Labels:** `frontend`, `soroban`, `wallet-integration`, `typescript`

---

### Issue 6: Build Leaderboard Page with Real On-Chain Data
**Title:** Create Dynamic Leaderboard Showing Top Stakers and Credit Earners

**Description:**
Implement `/src/app/leaderboard/page.tsx` to show rankings based on real contract data or indexed events.

**Requirements:**
- Query all users' positions across all pools (via indexer or RPC)
- Calculate rankings by: Total Credits, Total Stake (TVL), Boost Utilization
- Display top 100 users in a sortable Chakra UI Table
- Show user's rank, address (truncated), total credits, total stake
- Add sorting options (credits desc, stake desc)
- Implement pagination or infinite scroll for large datasets
- Add a search bar to find specific addresses
- Highlight current connected user's row
- Update every 30 seconds or add manual refresh button
- Handle loading and empty states

**Acceptance Criteria:**
- Leaderboard displays real user data
- Sorting and filtering work correctly
- Page is performant with 100+ entries
- Connected user can see their rank
- Mobile-responsive design

**Estimated Effort:** 8-10 hours
**Priority:** Medium
**Labels:** `frontend`, `feature`, `leaderboard`, `typescript`

---

### Issue 7: Add Comprehensive Error Handling and User Feedback
**Title:** Implement Global Error Handling with Toast Notifications

**Description:**
Add production-ready error handling across the app with clear user feedback for all failure scenarios.

**Requirements:**
- Create `/src/lib/error-handler.ts` with typed error classes
- Implement Chakra UI toast notifications for success/error/info
- Handle Freighter errors: not installed, rejected signature, network mismatch
- Handle RPC errors: timeout, rate limit, invalid response
- Handle contract errors: insufficient balance, authorization failed
- Add error boundary components for React component errors
- Log errors to console in development, optionally to service in production
- Create user-friendly error messages (no raw error dumps)
- Add retry logic for transient RPC failures
- Implement fallback UI for critical errors

**Acceptance Criteria:**
- All user actions show success/failure feedback
- Error messages are clear and actionable
- No unhandled promise rejections
- App doesn't crash on errors
- Users know what to do when errors occur

**Estimated Effort:** 6-8 hours
**Priority:** High
**Labels:** `frontend`, `error-handling`, `ux`, `typescript`

---

### Issue 8: Add Unlock/Withdraw Functionality
**Title:** Implement Asset Unlock and Withdrawal Flow

**Description:**
Allow users to unlock their staked assets after the minimum lock period has elapsed.

**Requirements:**
- Add "Unlock" button to farm position cards
- Create unlock modal showing: amount locked, time remaining, available to unlock
- Implement countdown timer for time-locked positions
- Build transaction to call pool contract `unlock_assets` function
- Sign with Freighter and submit to network
- Show success confirmation with updated balance
- Disable unlock button if lock period not met (with tooltip explanation)
- Add partial unlock support if contract allows
- Update UI to reflect reduced stake
- Emit analytics event for unlock actions

**Acceptance Criteria:**
- Users can unlock after minimum lock period
- Unlock before period is prevented with clear message
- Transaction successfully moves assets back to user wallet
- UI updates immediately after confirmation
- Loading states during unlock process

**Estimated Effort:** 6-8 hours
**Priority:** High
**Labels:** `frontend`, `feature`, `soroban`, `typescript`

---

### Issue 9: Implement Mobile-Responsive Design
**Title:** Make SmartDrop Fully Responsive for Mobile and Tablet

**Description:**
Ensure the entire application works perfectly on mobile devices (iOS/Android) and tablets.

**Requirements:**
- Audit all pages for mobile layout issues
- Fix farm table to be scrollable or convert to cards on mobile
- Make deposit modal mobile-friendly (smaller padding, stacked layout)
- Ensure Freighter mobile wallet integration works
- Test on iOS Safari, Android Chrome, and mobile Freighter
- Implement responsive breakpoints using Chakra UI
- Add mobile-optimized touch targets (min 44x44px)
- Fix text overflow issues on small screens
- Test landscape and portrait orientations
- Add PWA manifest for "Add to Home Screen" support

**Acceptance Criteria:**
- All pages render correctly on mobile (320px - 768px)
- Touch interactions work smoothly
- No horizontal scrolling issues
- Freighter wallet connect works on mobile
- Farm actions (deposit/unlock) work on mobile
- Passed testing on real devices

**Estimated Effort:** 8-10 hours
**Priority:** Medium
**Labels:** `frontend`, `responsive`, `mobile`, `ui/ux`

---

### Issue 10: Add Real-Time TVL and User Count Tracking
**Title:** Implement Live Total Value Locked and User Metrics

**Description:**
Calculate and display real-time TVL and active user count on the homepage dashboard.

**Requirements:**
- Query all pools from factory contract
- For each pool, aggregate total locked amounts
- Convert asset amounts to USD using price oracle or Stellar DEX rates
- Count unique user addresses across all pools
- Cache TVL calculations (update every 60 seconds)
- Display formatted values on homepage (`$302M`, `30,738 users`)
- Add "Last Updated" timestamp
- Implement sparkline/trend chart showing TVL over 24h
- Add API route `/api/stats` that frontend can query
- Consider using backend indexer if available

**Acceptance Criteria:**
- TVL shows accurate sum of all pool values
- User count is accurate (unique addresses)
- Values update periodically without page reload
- Performance is acceptable (< 2s load time)
- USD conversion is reasonably accurate

**Estimated Effort:** 10-12 hours
**Priority:** Medium
**Labels:** `frontend`, `backend`, `metrics`, `typescript`

---

## Repository: smartdrop-backend

### Issue 11: Build Soroban Event Indexer
**Title:** Create Event Indexer for Pool Lock/Unlock/Boost Events

**Description:**
Build a Node.js service that indexes Soroban contract events into a PostgreSQL database for fast queries.

**Requirements:**
- Set up Express.js API with TypeScript
- Implement Soroban RPC event streaming using `getEvents` API
- Index events: `pool_created`, `assets_locked`, `assets_unlocked`, `boost_applied`
- Store events in PostgreSQL with schema: event_type, contract_id, user_address, amount, timestamp, tx_hash
- Create indexes on user_address and timestamp columns
- Implement cursor-based pagination for catching up on historical events
- Add health check endpoint `/health`
- Add stats endpoint `/api/v1/stats` (TVL, user count, total pools)
- Add user position endpoint `/api/v1/users/:address/positions`
- Add leaderboard endpoint `/api/v1/leaderboard?limit=100&sort=credits`
- Implement graceful shutdown and restart from last indexed block

**Acceptance Criteria:**
- Indexer successfully streams events from testnet
- All events are stored in database
- API endpoints return correct data
- Indexer can restart without missing events
- Query performance is good (< 100ms for most queries)
- Docker Compose setup included

**Estimated Effort:** 14-18 hours
**Priority:** High
**Labels:** `backend`, `indexer`, `nodejs`, `postgresql`, `api`

---

### Issue 12: Implement Webhook System for External Integrations
**Title:** Add Webhook Support for Pool Events (Discord, Slack, Custom)

**Description:**
Allow projects to register webhook URLs that receive notifications when farming events occur.

**Requirements:**
- Add `webhooks` table in PostgreSQL: id, url, events[], secret, active
- Implement POST `/api/v1/webhooks` to register new webhooks
- Implement GET/DELETE `/api/v1/webhooks/:id` for management
- When events are indexed, trigger HTTP POST to registered webhook URLs
- Include signature (HMAC-SHA256) for webhook verification
- Retry failed webhooks with exponential backoff (3 attempts)
- Store webhook delivery logs: webhook_id, event_id, status, attempts, last_error
- Support filtering by event type (e.g., only `assets_locked` events)
- Add rate limiting to prevent abuse
- Implement webhook testing endpoint

**Acceptance Criteria:**
- Users can register webhooks via API
- Webhooks receive POST requests when events occur
- Failed deliveries are retried
- Signature verification works
- Admin dashboard shows webhook status
- Documentation includes integration examples

**Estimated Effort:** 10-12 hours
**Priority:** Medium
**Labels:** `backend`, `webhooks`, `integration`, `api`

---

### Issue 13: Add Price Oracle for USD Conversion
**Title:** Implement Multi-Source Price Oracle for Asset Valuation

**Description:**
Create a price oracle service that fetches and caches USD prices for Stellar assets from multiple sources.

**Requirements:**
- Support price fetching from: Stellar DEX, CoinGecko API, CoinMarketCap API
- Implement aggregation logic (median of available sources)
- Cache prices in Redis with 60-second TTL
- Create API endpoint `/api/v1/prices/:asset_code` returning USD price
- Support native XLM and issued assets (by asset code and issuer)
- Handle rate limits from external APIs
- Implement fallback chain (DEX → CoinGecko → CoinMarketCap → cached)
- Add stale price detection (warn if price is > 5 minutes old)
- Create background job to refresh prices every 30 seconds
- Log price anomalies (sudden >10% changes)

**Acceptance Criteria:**
- Endpoint returns accurate USD prices
- Prices are cached to avoid rate limits
- Service handles API failures gracefully
- Multiple sources are aggregated
- Prices update every 30-60 seconds

**Estimated Effort:** 8-10 hours
**Priority:** Medium
**Labels:** `backend`, `oracle`, `api`, `nodejs`

---

## Repository: All (Documentation & Testing)

### Issue 14: Write Comprehensive End-to-End Testing Suite
**Title:** Implement E2E Tests for Complete User Flows

**Description:**
Create end-to-end tests covering the full user journey from wallet connect to earning credits.

**Requirements:**
- Set up Playwright or Cypress for E2E testing
- Test flow 1: Connect Freighter wallet → View dashboard → See positions
- Test flow 2: Navigate to farm → Deposit assets → Confirm transaction → Verify position
- Test flow 3: Wait for lock period → Unlock assets → Confirm withdrawal
- Test flow 4: View leaderboard → Search for address → Verify data
- Test flow 5: Error scenarios (rejected transaction, network failure)
- Mock Freighter API responses for predictable testing
- Use Stellar testnet with deterministic test accounts
- Create test fixtures and utilities
- Add visual regression testing for UI components
- Configure CI/CD pipeline to run tests on every PR

**Acceptance Criteria:**
- All critical user flows have E2E tests
- Tests run reliably in CI environment
- Test coverage report shows >70% coverage
- Failed tests provide clear error messages
- Tests complete in < 5 minutes

**Estimated Effort:** 12-16 hours
**Priority:** High
**Labels:** `testing`, `e2e`, `qa`, `frontend`, `backend`

---

### Issue 15: Create Production Deployment Guide and Infrastructure-as-Code
**Title:** Document Production Deployment with Terraform/K8s Templates

**Description:**
Provide complete deployment documentation and infrastructure code for production deployments.

**Requirements:**
- Write deployment guide for: Vercel (frontend), AWS/GCP (backend), RDS (database)
- Create Terraform modules for backend infrastructure
- Create Kubernetes deployment YAML files
- Create Docker Compose production configuration
- Document environment variables for all services
- Create secrets management guide (AWS Secrets Manager, Vault)
- Add monitoring setup (Prometheus, Grafana, or Datadog)
- Create alerting rules for critical failures
- Document scaling strategy (horizontal/vertical)
- Add backup and disaster recovery procedures
- Create CI/CD pipeline examples (GitHub Actions, GitLab CI)
- Security hardening checklist

**Deliverables:**
- `/docs/deployment/PRODUCTION.md` comprehensive guide
- `/infra/terraform/` directory with modules
- `/infra/k8s/` directory with manifests
- `docker-compose.prod.yml` file
- CI/CD workflow files in `.github/workflows/`

**Acceptance Criteria:**
- Someone can deploy SmartDrop to production following the guide
- Infrastructure code is tested and working
- All security best practices are documented
- Monitoring and alerting is configured
- Backup procedures are clear

**Estimated Effort:** 10-14 hours
**Priority:** Medium
**Labels:** `devops`, `documentation`, `infrastructure`, `production`

---

## Summary

**Total Issues:** 15
**Estimated Total Effort:** 142-188 hours
**Priority Breakdown:**
- Critical: 5 issues
- High: 5 issues
- Medium: 5 issues

**Repository Breakdown:**
- smartdrop-contracts: 3 issues (core blockchain functionality)
- smartdrop-frontend: 7 issues (user interface and integration)
- smartdrop-backend: 3 issues (indexing, webhooks, oracle)
- Cross-cutting: 2 issues (testing, deployment)

These issues are production-ready, well-defined, and provide clear acceptance criteria for review and payment.
