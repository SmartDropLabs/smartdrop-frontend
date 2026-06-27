import { Suspense } from "react";
import type { Metadata } from "next";
import { sorobanService } from "@/lib/soroban";
import PoolDetailClient from "./PoolDetailClient";

export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const pools = await sorobanService.getFactoryPools();
    return pools.map((pool) => ({ poolId: pool.id }));
  } catch {
    // RPC unreachable at build time — fall back to CSR via revalidate
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: { poolId: string };
}): Promise<Metadata> {
  return {
    title: `Pool ${params.poolId.slice(0, 8)}… | SmartDrop Farm`,
  };
}

export default function PoolDetailPage({
  params,
}: {
  params: { poolId: string };
}) {
  return (
    <Suspense fallback={null}>
      <PoolDetailClient poolId={params.poolId} />
    </Suspense>
  );
}
