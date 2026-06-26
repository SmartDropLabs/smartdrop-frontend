"use client";

import { Flex, Link as ChakraLink, Text } from "@chakra-ui/react";
import { useStellarWallet } from "@/context/StellarWalletContext";
import NextLink from "next/link";
import ThemeToggle from "@/components/ThemeToggle/ThemeToggle";

function shortenStellarAddress(address: string) {
  if (!address || address.length < 12) {
    return address;
  }
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export default function Navbar() {
  const { isConnected, publicKey } = useStellarWallet();

  return isConnected && publicKey ? (
    <Flex
      w={{ base: "full", md: "95%" }}
      h={{ base: "auto", md: 20 }}
      minH={20}
      mx="auto"
      align={{ base: "stretch", md: "center" }}
      justify={{ base: "flex-start", md: "space-between" }}
      direction={{ base: "column", md: "row" }}
      gap={{ base: 3, md: 0 }}
      borderTop="1px solid"
      borderBottom="1px solid"
      borderColor="app.border"
      px={{ base: 4, md: 0 }}
      py={{ base: 4, md: 0 }}
    >
      <Text px={{ base: 0, md: 8 }}>{shortenStellarAddress(publicKey)}</Text>
      <Flex
        gap={{ base: 4, md: 8 }}
        p={{ base: 0, md: 8 }}
        align="center"
        flexWrap="wrap"
      >
        <ChakraLink as={NextLink} href="/" color="app.text">Home</ChakraLink>
        <ChakraLink as={NextLink} href="/farm" color="app.text">Farm</ChakraLink>
        <ChakraLink as={NextLink} href="/history" color="app.text">History</ChakraLink>
        <ChakraLink as={NextLink} href="/leaderboard" color="app.text">Leaderboard</ChakraLink>
        <ChakraLink as={NextLink} href="/contributors" color="app.text">Contributors</ChakraLink>
        <ThemeToggle />
      </Flex>
      <Text px={{ base: 0, md: 8 }} fontWeight="bold">
        SMARTDROP
      </Text>
    </Flex>
  ) : (
    <Flex
      w={{ base: "full", md: "95%" }}
      h={{ base: "auto", md: 20 }}
      minH={20}
      mx="auto"
      align={{ base: "stretch", md: "center" }}
      justify={{ base: "flex-start", md: "space-between" }}
      direction={{ base: "column", md: "row" }}
      gap={{ base: 3, md: 0 }}
      borderTop="1px solid"
      borderBottom="1px solid"
      borderColor="app.border"
      px={{ base: 4, md: 0 }}
      py={{ base: 4, md: 0 }}
    >
      <Text px={{ base: 0, md: 8 }} fontWeight="bold">
        SMARTDROP
      </Text>
      <Flex
        gap={{ base: 4, md: 8 }}
        p={{ base: 0, md: 8 }}
        align="center"
        flexWrap="wrap"
        justify={{ base: "flex-start", md: "flex-end" }}
      >
        <ChakraLink as={NextLink} href="/history" color="app.text" textDecoration="underline">
          History
        </ChakraLink>
        <ChakraLink as={NextLink} href="/contributors" color="app.text" textDecoration="underline">
          Contributors
        </ChakraLink>
        <Text>Users online: 213</Text>
        <Text>Total Users: 30,738</Text>
        <Text>Total Value Locked: $302M</Text>
        <ThemeToggle />
      </Flex>
    </Flex>
  );
}
