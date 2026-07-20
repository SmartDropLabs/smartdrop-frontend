import { NextResponse } from 'next/server';
import { Keypair, TransactionBuilder, Transaction } from '@stellar/stellar-sdk';
import { buildFeeBumpTransaction } from '@/lib/soroban';
import { networkPassphrase } from '@/config';

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
