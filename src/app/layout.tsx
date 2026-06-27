import AppShell from "@/components/AppShell/AppShell";
import type { Metadata } from "next";
import { CSP_POLICY } from "../../next.config";

export const metadata: Metadata = {
  title: "SmartDrop",
  description: "Stellar-based liquidity-oriented airdrop experiment",
  other: {
    "Content-Security-Policy": CSP_POLICY,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta httpEquiv="Content-Security-Policy" content={CSP_POLICY} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
