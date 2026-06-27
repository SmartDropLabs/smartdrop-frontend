import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const raw = process.env.BASE_PATH?.trim() ?? "";
const basePath = raw.startsWith("/") ? raw : raw ? `/${raw}` : "";

const CSP_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' https://horizon.stellar.org https://soroban-testnet.stellar.org https://soroban.stellar.org https://stellar.expert",
  "img-src 'self' data: https:",
  "font-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: "export",
  images: { unoptimized: true },
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default withBundleAnalyzer(nextConfig);
export { CSP_POLICY };
