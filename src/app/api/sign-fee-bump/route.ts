import { NextResponse } from 'next/server';
import {
  Keypair,
  TransactionBuilder,
  Transaction,
  Address,
  type xdr,
} from '@stellar/stellar-sdk';
import { buildFeeBumpTransaction, sorobanService } from '@/lib/soroban';
import { networkPassphrase } from '@/config';

const ALLOWED_SPONSORED_FUNCTIONS = new Set(['lock_assets', 'unlock_assets']);
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 5;

// In-memory rate limiting map (key -> timestamps array)
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (rateLimitMap.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    rateLimitMap.set(key, timestamps);
    return false;
  }

  timestamps.push(now);
  rateLimitMap.set(key, timestamps);
  return true;
}

export function resetRateLimits(): void {
  rateLimitMap.clear();
}

async function getKnownPoolIds(): Promise<Set<string>> {
  const known = new Set<string>();
  const envPool = process.env.NEXT_PUBLIC_POOL_CONTRACT_ID;
  if (envPool) known.add(envPool);

  try {
    const pools = await sorobanService.getFactoryPools();
    for (const pool of pools) {
      if (pool.contract_address) known.add(pool.contract_address);
      if (pool.id && pool.id.startsWith('C')) known.add(pool.id);
    }
  } catch {
    // If factory is uninitialized, proceed with env pool if present
  }
  return known;
}

export async function POST(request: Request) {
  try {
    const sponsorSecret = process.env.STELLAR_FEE_SPONSOR_SECRET;
    if (!sponsorSecret) {
      console.error('[SignFeeBump] Sponsor secret (STELLAR_FEE_SPONSOR_SECRET) is not configured.');
      return NextResponse.json(
        { error: 'Sponsor secret key is not configured on the server' },
        { status: 500 },
      );
    }

    let body: { innerTxXdr?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const { innerTxXdr } = body;
    if (!innerTxXdr) {
      return NextResponse.json({ error: 'Missing innerTxXdr in request body' }, { status: 400 });
    }

    // Load sponsor keypair
    let sponsorKeypair: Keypair;
    try {
      sponsorKeypair = Keypair.fromSecret(sponsorSecret);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[SignFeeBump] Invalid sponsor secret key format:', msg);
      return NextResponse.json(
        { error: 'Invalid sponsor secret key configuration' },
        { status: 500 },
      );
    }

    // Parse the inner transaction
    let innerTxObj: Transaction;
    try {
      innerTxObj = TransactionBuilder.fromXDR(
        innerTxXdr,
        networkPassphrase,
      ) as Transaction;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: `Invalid inner transaction XDR: ${msg}` },
        { status: 400 },
      );
    }

    // Security Check 1: Inner transaction must carry a source signature
    if (!innerTxObj.signatures || innerTxObj.signatures.length === 0) {
      console.warn('[SignFeeBump] Rejected unsigned inner transaction');
      return NextResponse.json(
        { error: 'Inner transaction must be signed by the user before fee-bumping' },
        { status: 400 },
      );
    }

    // Security Check 2: Rate limit by source account
    const sourceAccount = innerTxObj.source;
    if (!checkRateLimit(sourceAccount)) {
      console.warn(`[SignFeeBump] Rate limit exceeded for source account: ${sourceAccount}`);
      return NextResponse.json(
        { error: 'Too many fee-bump requests. Please wait a minute and try again.' },
        { status: 429 },
      );
    }

    // Security Check 3: Only exactly 1 operation allowed (prevent fee amplification exploit)
    if (!innerTxObj.operations || innerTxObj.operations.length !== 1) {
      console.warn(`[SignFeeBump] Rejected transaction with ${innerTxObj.operations?.length ?? 0} operations`);
      return NextResponse.json(
        { error: 'Sponsored transactions must contain exactly one operation' },
        { status: 400 },
      );
    }

    const op = innerTxObj.operations[0] as unknown as {
      type?: string;
      func?: xdr.HostFunction;
    };

    // Security Check 4: Must be an invokeHostFunction operation
    if (op.type !== 'invokeHostFunction' || !op.func) {
      console.warn(`[SignFeeBump] Rejected non-invokeHostFunction operation type: ${op.type}`);
      return NextResponse.json(
        { error: 'Only Soroban contract interactions are eligible for fee sponsorship' },
        { status: 400 },
      );
    }

    // Extract target contract ID and function name
    let targetContractId = '';
    let functionName = '';

    try {
      const hostFn = op.func;
      const fnSwitch = typeof hostFn.switch === 'function' ? hostFn.switch() : null;
      const switchName = typeof fnSwitch === 'object' && fnSwitch !== null && 'name' in fnSwitch
        ? (fnSwitch as { name: string }).name
        : '';

      if (switchName && !switchName.toLowerCase().includes('invokecontract')) {
        return NextResponse.json(
          { error: 'Unsupported host function type for sponsorship' },
          { status: 400 },
        );
      }

      const invokeContract = hostFn.invokeContract();
      const scAddress = invokeContract.contractAddress();
      targetContractId = Address.fromScAddress(scAddress).toString();
      functionName = invokeContract.functionName().toString();
    } catch (err) {
      console.warn('[SignFeeBump] Failed to decode invokeHostFunction arguments:', err);
      return NextResponse.json(
        { error: 'Malformed host function call in inner transaction' },
        { status: 400 },
      );
    }

    // Security Check 5: Must invoke approved sponsored functions (lock_assets, unlock_assets)
    if (!ALLOWED_SPONSORED_FUNCTIONS.has(functionName)) {
      console.warn(`[SignFeeBump] Rejected non-sponsored function name: ${functionName}`);
      return NextResponse.json(
        { error: `Function '${functionName}' is not eligible for fee sponsorship` },
        { status: 400 },
      );
    }

    // Security Check 6: Must target a known pool contract ID
    const knownPools = await getKnownPoolIds();
    if (knownPools.size > 0 && !knownPools.has(targetContractId)) {
      console.warn(`[SignFeeBump] Target contract ${targetContractId} is not a registered SmartDrop pool`);
      return NextResponse.json(
        { error: 'Target contract is not an authorized SmartDrop pool' },
        { status: 400 },
      );
    }

    // Build the fee-bump transaction
    const feeBumpTx = buildFeeBumpTransaction(
      innerTxObj,
      sponsorKeypair.publicKey(),
      networkPassphrase,
    );

    // Sign the outer fee-bump envelope
    feeBumpTx.sign(sponsorKeypair);

    // Return the completed fee-bump transaction XDR
    return NextResponse.json({
      feeBumpTxXdr: feeBumpTx.toEnvelope().toXDR('base64'),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    console.error('[SignFeeBump] Server error:', error);
    return NextResponse.json(
      { error: msg },
      { status: 500 },
    );
  }
}
