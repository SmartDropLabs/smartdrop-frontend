import { Suspense } from "react";
import type { Metadata } from "next";
import { poolContractId } from "@/config";
import { sorobanService } from "@/lib/soroban";
import PoolDetailClient from "./PoolDetailClient";

export const revalidate = 60;

export async function generateStaticParams() {
  const fallbackParams = [{ poolId: poolContractId || "placeholder" }];

  try {
    const pools = await sorobanService.getFactoryPools();
    const params = pools.map((pool) => ({ poolId: pool.id }));
    return params.length > 0 ? params : fallbackParams;
  } catch {
    // RPC unreachable at build time — fall back to CSR via revalidate
    return fallbackParams;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ poolId: string }>;
}): Promise<Metadata> {
  const { poolId } = await params;

  return {
    title: `Pool ${poolId.slice(0, 8)}... | SmartDrop Farm`,
  };
}

export default async function PoolDetailPage({
  params,
}: {
  params: Promise<{ poolId: string }>;
}) {
  const { poolId } = await params;

  return (
    <Suspense fallback={null}>
      <PoolDetailClient poolId={poolId} />
    </Suspense>
  );
}
