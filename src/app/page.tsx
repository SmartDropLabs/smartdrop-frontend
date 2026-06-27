import HomeClient from "./HomeClient";

export default function Home() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "2rem",
        padding: "2rem 4rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: "1200px" }}>
        <h1
          style={{
            fontSize: "3rem",
            fontWeight: "bold",
            marginBottom: "1rem",
          }}
        >
          SmartDrop Dashboard
        </h1>
        <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
          Live Soroban RPC data with contract-driven TVL, pool counts, and user
          metrics.
        </p>
      </div>
      <div style={{ width: "100%", maxWidth: "1200px" }}>
        <HomeClient />
      </div>
    </main>
  );
}
