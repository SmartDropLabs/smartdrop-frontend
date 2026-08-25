import { Suspense } from "react";
import type { Metadata } from "next";
import { poolContractId } from "@/config";
import { sorobanService } from "@/lib/soroban";
import { generatePoolSlug, extractPoolIdFromSlug } from "@/lib/pool-slugs";
import PoolDetailClient from "./PoolDetailClient";

export const revalidate = 60;

export async function generateStaticParams() {
  const fallbackParams = [{ poolId: poolContractId || "placeholder" }];

  try {
    const pools = await sorobanService.getFactoryPools();
    const params = pools.map((pool) => ({ poolId: generatePoolSlug(pool) }));
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
  const { poolId: slug } = await params;

  try {
    const pools = await sorobanService.getFactoryPools();
    const actualPoolId = extractPoolIdFromSlug(slug, pools) || slug;
    const pool = pools.find((p) => p.id === actualPoolId);
    const title = pool ? `${pool.asset.code} | SmartDrop Farm` : `Pool | SmartDrop Farm`;
    return { title };
  } catch {
    return { title: `Pool | SmartDrop Farm` };
  }
}

export default async function PoolDetailPage({
  params,
}: {
  params: Promise<{ poolId: string }>;
}) {
  const { poolId: slug } = await params;

  let poolId = slug;
  try {
    const pools = await sorobanService.getFactoryPools();
    const resolvedId = extractPoolIdFromSlug(slug, pools);
    if (resolvedId) {
      poolId = resolvedId;
    }
  } catch {
    // Fallback to slug as ID if resolution fails
  }

  return (
    <Suspense fallback={null}>
      <PoolDetailClient poolId={poolId} />
    </Suspense>
  );
}
