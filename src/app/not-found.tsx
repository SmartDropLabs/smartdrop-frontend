"use client";

import { Button, Flex, Input, InputGroup, InputRightElement, Text } from "@chakra-ui/react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { forgetRecentPage, getRecentPages, type RecentPage } from "@/lib/recentPages";
import LegacyPathRedirect from "./LegacyPathRedirect";

export default function NotFound() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [recentPages, setRecentPages] = useState<RecentPage[]>([]);

  // #784 — suggest recently visited pages. Read after mount (storage is
  // client-only) and leave out the URL that just 404'd. AppShell records the
  // pathname in its own effect, which runs after this one, so the removal is
  // queued as a microtask to run once that recording has happened.
  useEffect(() => {
    // Recorded paths come from usePathname(), which excludes the basePath
    // (GitHub Pages export); window.location includes it.
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    const raw = window.location.pathname;
    const withoutBase = basePath && raw.startsWith(basePath) ? raw.slice(basePath.length) : raw;
    const current = withoutBase.replace(/\/+$/, "") || "/";
    setRecentPages(getRecentPages().filter((p) => p.path !== current));
    queueMicrotask(() => forgetRecentPage(current));
  }, []);

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
      {recentPages.length > 0 && (
        <nav aria-label="Recently visited pages">
          <Text color="app.muted" fontSize="sm" mb={2}>
            Recently visited
          </Text>
          <Flex as="ul" listStyleType="none" gap={2} wrap="wrap" justify="center">
            {recentPages.map((page) => (
              <li key={page.path}>
                <Button as={NextLink} href={page.path} size="sm" variant="outline">
                  {page.label}
                </Button>
              </li>
            ))}
          </Flex>
        </nav>
      )}
      <Button as={NextLink} href="/" colorScheme="green" bg="app.accent" mt={2}>
        Back to home
      </Button>
    </Flex>
  );
}
