"use client";

import { Button, Flex, Input, InputGroup, InputRightElement, Text } from "@chakra-ui/react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import LegacyPathRedirect from "./LegacyPathRedirect";

export default function NotFound() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/leaderboard?q=${encodeURIComponent(trimmed)}`);
    }
  };

  // Sends legacy /leaderbord typo requests to /leaderboard (#444).
  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      textAlign="center"
      gap={4}
      px={6}
      py={24}
      minH="60vh"
    >
      <LegacyPathRedirect />
      <Text
        fontSize={{ base: "5xl", md: "7xl" }}
        fontWeight="extrabold"
        letterSpacing="tight"
        bgGradient="linear(to-r, app.text, app.accent)"
        bgClip="text"
      >
        404
      </Text>
      <Text fontSize="xl" fontWeight="semibold" color="app.text">
        This page doesn&apos;t exist
      </Text>
      <Text color="app.muted" maxW="440px">
        The link you followed may be broken, or the page may have moved.
      </Text>
      <form onSubmit={handleSearch} style={{ width: "100%", maxWidth: "440px" }}>
        <InputGroup>
          <Input
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            bg="app.inputBg"
            borderColor="app.border"
            _hover={{ borderColor: "app.borderHover" }}
            _focus={{ borderColor: "app.accent", boxShadow: "none" }}
            color="app.text"
            pr="4.5rem"
          />
          <InputRightElement width="4.5rem">
            <Button
              h="1.75rem"
              size="sm"
              type="submit"
              bg="app.accent"
              color="app.onAccent"
              _hover={{ opacity: 0.9 }}
              isDisabled={!query.trim()}
            >
              Search
            </Button>
          </InputRightElement>
        </InputGroup>
      </form>
      <Button as={NextLink} href="/" colorScheme="green" bg="app.accent" mt={2}>
        Back to home
      </Button>
    </Flex>
  );
}
