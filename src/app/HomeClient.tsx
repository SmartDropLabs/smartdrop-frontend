"use client";

import dynamic from "next/dynamic";
import { Flex, Spinner } from "@chakra-ui/react";
import { useStellarWallet } from "@/context/StellarWalletContext";
import { sorobanRpcUrl, stellarNetwork } from "@/config";

const HomeDashboard = dynamic(() => import("./HomeDashboard"), {
  loading: () => (
    <Flex w="100%" justify="center" py={16}>
      <Spinner size="xl" color="#4AE292" />
    </Flex>
  ),
});

export default function HomeClient() {
  const { publicKey } = useStellarWallet();

  return (
    <>
      <p
        style={{
          fontSize: "0.875rem",
          color: "#777",
          marginBottom: "0.5rem",
        }}
      >
        Network: {stellarNetwork} · RPC: {sorobanRpcUrl.replace(/^https?:\/\//, "")}
        {publicKey ? ` · Wallet ${publicKey.slice(0, 6)}…` : ""}
      </p>
      <HomeDashboard />
    </>
  );
}
