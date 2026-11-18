import { rpc } from '@stellar/stellar-sdk';

/**
 * One `rpc.Server` per RPC URL, shared by every caller (#754).
 *
 * `soroban.ts` and `useSorobanEvents.ts` each used to construct their own
 * client for the same endpoint, so the app held two independent clients (and
 * their HTTP agents / keep-alive connections) for one RPC URL. Both now resolve
 * through this pool and get the same instance.
 */
const pool = new Map<string, rpc.Server>();

export function getRpcServer(url: string): rpc.Server {
  let server = pool.get(url);
  if (!server) {
    server = new rpc.Server(url);
    pool.set(url, server);
  }
  return server;
}

/** Test seam: forget every pooled client. */
export function resetRpcPool(): void {
  pool.clear();
}
