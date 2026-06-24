// --- PASTE ENTIRELY INTO src/app/farm/page.tsx ---
import { PlatformStats } from '@/components/PlatformStats/PlatformStats';
import { sorobanService } from '@/lib/soroban';

// This safely grabs the data from the smart contract before rendering the page
async function getPreRenderedStats() {
  try {
    const stats = await sorobanService.getPlatformStats();
    const velocity = await sorobanService.getCreditVelocity(24);
    
    return {
      tvl: stats?.tvl || "0",
      activePools: stats?.activePools || 0,
      totalFarmers: stats?.totalFarmers || 0,
      creditVelocity: velocity,
    };
  } catch (error) {
    console.error("Failed to load server stats:", error);
    return { tvl: "0", activePools: 0, totalFarmers: 0, creditVelocity: "0" };
  }
}

// This is the functional page layout loader
export default async function FarmPage() {
  const initialStats = await getPreRenderedStats();

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Protocol Farm Dashboard</h1>
      
      {/* Visual platform statistics overview metrics layout banner */}
      <PlatformStats initialData={initialStats} />

      {/* Your farm pool layouts and components continue below */}
      <div style={{ marginTop: '2rem' }}>
        <p>Loading active liquidity pool connections...</p>
      </div>
    </main>
  );
}
