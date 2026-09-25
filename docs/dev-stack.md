# Full-stack dev setup (`scripts/dev-stack.sh`)

`scripts/dev-stack.sh` starts everything the app needs locally, in one command:

1. An in-memory Redis on port `6379`
2. [`smartdrop-backend`](https://github.com/Mainnet-ops/smartdrop-backend) on port `4000`
3. This frontend on port `3000`

## When to use it

Run it when you work on pages that talk to the backend: `/prices`, `/airdrops`,
`/webhooks` and `/alerts`. For pages that only use Stellar RPC and Horizon (the
on-chain pages), `npm run dev` is enough and starts faster.

## Prerequisites

- Node.js 20+ and npm, with dependencies installed in this repo (`npm ci`)
- `smartdrop-backend` cloned as a sibling directory (`../smartdrop-backend`), with
  its dependencies installed
- `openssl` and `lsof` available on your `PATH`

No Docker or system Redis install is needed.

## Usage

```bash
npm run dev:stack
# or
./scripts/dev-stack.sh
```

If the backend lives somewhere else:

```bash
SMARTDROP_BACKEND_DIR=/path/to/smartdrop-backend npm run dev:stack
```

Point the frontend at the local backend in `.env.local`:

```
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:4000/api/v1
```

Press `Ctrl+C` to stop all three processes.

## What it does on each run

- **Admin API key.** Generated once with `openssl rand -hex 32`, saved to
  `~/.smartdrop-dev/admin-api-key.txt`, and reused on later runs. It is printed
  on startup; paste it into the `/alerts` page, which requires it.
- **In-memory Redis.** On the first run it installs `redis-memory-server` under
  `~/.smartdrop-dev/redis-mem/` and reuses it afterwards. If something is already
  listening on `6379`, that Redis is reused instead.
- **Backend.** Starts `npm run dev` in the backend directory with
  `PORT=4000`, `REDIS_URL=redis://localhost:6379`, `NODE_ENV=development`, the
  admin key, and `CORS_ALLOWED_ORIGINS` allowing `http://localhost:3000` and
  `http://localhost:3001`. If something is already listening on `4000`, it is
  reused.
- **Frontend.** Runs `npm run dev` in the foreground.

## Files and logs

Everything the script creates lives under `~/.smartdrop-dev/`:

| Path | Contents |
|---|---|
| `admin-api-key.txt` | The persisted admin API key |
| `redis-mem/` | The in-memory Redis helper |
| `logs/redis.log` | Redis output |
| `logs/backend.log` | Backend output |

## Troubleshooting

- **`couldn't find smartdrop-backend`**: clone it next to this repo or set
  `SMARTDROP_BACKEND_DIR`.
- **`Redis didn't start in time` / `backend didn't start in time`**: read the
  matching log in `~/.smartdrop-dev/logs/`.
- **Port already in use by something unrelated**: the script reuses whatever is
  listening on `6379` and `4000`, so stop the other process first.
