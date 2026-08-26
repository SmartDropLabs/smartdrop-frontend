import AppShell from "@/components/AppShell/AppShell";
import PageTransition from "@/components/PageTransition/PageTransition";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Inter } from "next/font/google";
import { ColorModeScript } from "@chakra-ui/react";
import { CSP_POLICY } from "../../next.config";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

const SITE_NAME = "SmartDrop";
const SITE_TITLE = "SmartDrop — Stellar Liquidity Farming";
const SITE_DESCRIPTION = "Stellar-based liquidity-oriented airdrop experiment";
const INITIAL_COLOR_MODE = "dark";

export const metadata: Metadata = {
  title: {
    default: SITE_TITLE,
    template: "%s · SmartDrop",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0d0c",
};

const isStaticExport = process.env.NEXT_EXPORT === "true";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let nonce = "";
  if (!isStaticExport) {
    const headersList = await headers();
    nonce = headersList.get("x-nonce") ?? "";
  }

  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <head>
        <meta httpEquiv="Content-Security-Policy" content={CSP_POLICY} />
        <ColorModeScript
          nonce={nonce}
          initialColorMode={INITIAL_COLOR_MODE}
          storageKey="chakra-ui-color-mode"
        />
      </head>
      <body suppressHydrationWarning>
        <AppShell>
          <PageTransition>{children}</PageTransition>
        </AppShell>
      </body>
    </html>
  );
}
