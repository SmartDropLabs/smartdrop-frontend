# Authentication model

This page describes how SmartDrop authenticates users today, and the rules any
future session-based auth must follow. It was written in response to
[#554](https://github.com/SmartDropLabs/smartdrop-frontend/issues/554)
("Session tokens not rotated after login").

## Summary

SmartDrop has **no login and no sessions**. There is nothing for an attacker to
fix in advance, so session fixation does not apply to the current code.

| Concern | Status in this repo |
| --- | --- |
| Login endpoint | None. There is no `src/app/api/auth/`. |
| Session tokens / JWTs / refresh tokens | None issued or stored. |
| Auth cookies | None set. The only server route (`/api/sign-fee-bump`) sets no cookies. |
| Credentials in browser storage | None. `localStorage` holds only the colour mode and the onboarding flag. |

## How users are authenticated

**Wallet signatures, per action.** Users connect a Stellar wallet (Freighter).
Each state-changing action — lock, unlock, claim — is a Soroban transaction the
user signs in their wallet. The signature is checked on-chain by the contract,
and nothing stays valid after that transaction. Connecting a wallet does not
create a server-side session.

**Fee sponsoring.** `POST /api/sign-fee-bump` wraps a transaction the user has
already signed in a fee-bump signed by the server's sponsor key. It is
rate-limited per IP and checks the inner transaction
(`src/lib/feeBumpGuard.ts`). It doesn't identify the user and creates no
session.

**Backend API key (alerts).** The alerts page sends a user-entered API key to
`smartdrop-backend` as `Authorization: Bearer <key>` (`src/lib/backend.ts`).
The key is held only in React state for the current page, is never persisted,
and is issued and rotated by the backend, not this frontend.

## If session-based auth is ever added

Any change that introduces sign-in sessions (cookies, JWTs, or server-side
session ids), for example "Sign in with Stellar" (SEP-10), must:

1. **Issue a new session id after successful authentication**, and invalidate any
   id that existed before login. Never upgrade a pre-login id. This is the
   session-fixation protection #554 asks for.
2. Rotate the session again on privilege changes (e.g. becoming an admin) and on
   logout, and invalidate it server-side on logout.
3. Store it in a cookie with `HttpOnly; Secure; SameSite=Lax` (or `Strict`) and a
   bounded lifetime. Never put it in `localStorage` or a URL.
4. Bind SEP-10 challenges to a one-time nonce with a short expiry, so a captured
   challenge can't be replayed into a session.
5. Add tests that the session id after login differs from the one before it.

Reviewers should treat a PR that adds sessions without these as incomplete.
