# Environment Variables

This document lists all configurable environment variables for the Smartdrop frontend. These are used to customize deployment across different networks and environments.

## Stellar Network Configuration

- **`NEXT_PUBLIC_STELLAR_NETWORK`** - Network preset name
  - Default: `"TESTNET"`
  - Allowed values: `"PUBLIC"`, `"MAINNET"`, `"TESTNET"`, `"FUTURENET"`
  - Controls which Stellar network endpoint to use

- **`NEXT_PUBLIC_HORIZON_URL`** - Horizon API endpoint
  - Default: Determined by `NEXT_PUBLIC_STELLAR_NETWORK` (public: `https://horizon.stellar.org`, testnet: `https://horizon-testnet.stellar.org`, futurenet: `https://horizon-futurenet.stellar.org`)
  - Override to use a custom Horizon server

- **`NEXT_PUBLIC_SOROBAN_RPC_URL`** - Soroban RPC endpoint
  - Default: Determined by `NEXT_PUBLIC_STELLAR_NETWORK` (public: `https://soroban-mainnet.stellar.org`, testnet: `https://soroban-testnet.stellar.org`, futurenet: `https://rpc-futurenet.stellar.org`)
  - Override to use a custom Soroban RPC server

- **`NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE`** - Network passphrase for transactions
  - Default: Determined by `NEXT_PUBLIC_STELLAR_NETWORK` (public: `"Public Global Stellar Network ; September 2015"`, testnet: `"Test SDF Network ; September 2015"`, futurenet: `"Test SDF Future Network ; October 2022"`)
  - Override to use a custom network passphrase

## Contract Configuration

- **`NEXT_PUBLIC_FACTORY_CONTRACT_ID`** - Soroban factory contract ID
  - Default: `""` (empty, must be set)
  - Format: Contract ID starting with `C...`
  - Used to fetch available farming pools

- **`NEXT_PUBLIC_POOL_CONTRACT_ID`** - Soroban pool contract ID
  - Default: `""` (empty, must be set)
  - Format: Contract ID starting with `C...`
  - Holds locked user positions

- **`NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS`** - Alternative factory contract identifier
  - Default: `""` (empty)
  - Used in some contexts as alternate to `NEXT_PUBLIC_FACTORY_CONTRACT_ID`

- **`NEXT_PUBLIC_SIMULATION_ACCOUNT`** - Account for read-only Soroban simulations
  - Default: `""` (empty, must be set)
  - Must be a funded Stellar account on the configured network
  - Used for: `getFactoryPools()`, `getUserPosition()`, `calculateUserCredits()`
  - No fallback provided - must be explicitly set per environment

## Lock Period Configuration

- **`NEXT_PUBLIC_MIN_LOCK_PERIOD_SECONDS`** - Minimum lock period in seconds
  - Default: `604800` (7 days)
  - Must be a valid positive number to override default
  - Mirrors the on-chain contract's `unlock_assets` time-lock
  - Used to disable unlock action and show countdown in UI

## API Configuration

- **`NEXT_PUBLIC_BACKEND_API_URL`** - Smartdrop backend API base URL
  - Default: `"http://localhost:4000/api/v1"`
  - Used for: Price oracle, airdrops, webhooks, alerts
  - Set to the deployed backend endpoint in production

- **`NEXT_PUBLIC_LEADERBOARD_API_URL`** - Leaderboard API endpoint
  - Default: `""` (empty)
  - Used to fetch leaderboard data

- **`NEXT_PUBLIC_NETWORK_PASSPHRASE`** - Network passphrase (alternative name)
  - Default: Determined by `NEXT_PUBLIC_STELLAR_NETWORK`
  - Used in some contexts as alternate to `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE`

## Transaction Configuration

- **`NEXT_PUBLIC_FEE_SPONSOR_PUBLIC_KEY`** - Public key of fee sponsor account
  - Default: `""` (empty, optional)
  - When set and user's balance is below 1.0 XLM, indicates fees are sponsored
  - If unset or empty, user must pay their own transaction fees

## Testing Configuration

- **`NEXT_PUBLIC_E2E`** - Enable E2E testing mode
  - Default: `"false"`
  - Set to `"true"` to enable E2E testing features in non-production environments
