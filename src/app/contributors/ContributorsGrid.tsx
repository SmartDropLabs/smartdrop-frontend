"use client";

import { useMemo, useState } from "react";
import { Avatar, Box, Flex, Grid, Input, Link as ChakraLink, Text } from "@chakra-ui/react";
import NextLink from "next/link";

import { safeHttpUrl } from "@/lib/sanitize";

export interface Contributor {
  login: string;
  contributions: number;
  html_url: string;
  avatar_url: string;
}

/** Case-insensitive substring match on the GitHub login, ignoring a leading "@". */
export function filterContributors<T extends { login: string }>(rows: T[], query: string): T[] {
  const needle = query.trim().replace(/^@/, "").toLowerCase();
  if (!needle) return rows;
  return rows.filter((c) => c.login.toLowerCase().includes(needle));
}

/**
 * Searchable contributor grid (#779). `contributors` arrive already sorted by
 * commit count, so each card keeps its overall rank even when filtered — the
 * top-3 badge means "top 3 overall", not "top 3 of this search".
 */
export function ContributorsGrid({ contributors }: { contributors: Contributor[] }) {
  const [query, setQuery] = useState("");
  const ranked = useMemo(
    () => contributors.map((c, rank) => ({ ...c, rank })),
    [contributors],
  );
  const shown = filterContributors(ranked, query);

  return (
    <Box w="100%" maxW="1100px">
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search contributors by name"
        aria-label="Search contributors by name"
        maxW="360px"
        mb={4}
        bg="app.surface"
        borderColor="app.border"
      />
      <Text fontSize="sm" color="app.muted" mb={4} aria-live="polite">
        {query.trim()
          ? `${shown.length} of ${contributors.length} contributors match "${query.trim()}"`
          : `${contributors.length} contributors`}
      </Text>

      {shown.length === 0 ? (
        <Flex
          justify="center"
          py={16}
          border="1px dashed"
          borderColor="app.border"
          borderRadius="card"
          bg="app.surface"
        >
          <Text color="app.muted">No contributors match &ldquo;{query.trim()}&rdquo;.</Text>
        </Flex>
      ) : (
        <Grid
          templateColumns={{ base: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" }}
          gap={4}
        >
          {shown.map((c) => (
            <ChakraLink
              key={c.login}
              as={NextLink}
              href={
                safeHttpUrl(c.html_url, ["github.com"]) ??
                `https://github.com/${encodeURIComponent(c.login)}`
              }
              target="_blank"
              rel="noreferrer"
              minW={0}
              _hover={{ textDecoration: "none" }}
            >
              <Flex
                align="center"
                gap={3}
                p={4}
                minW={0}
                border="1px solid"
                borderColor="app.border"
                borderRadius="card"
                bg="app.surface"
                boxShadow="card"
                transition="all 0.2s ease"
                _hover={{ borderColor: "app.borderHover", boxShadow: "cardHover", transform: "translateY(-2px)" }}
              >
                <Avatar src={safeHttpUrl(c.avatar_url, ["avatars.githubusercontent.com"])} name={c.login} size="md" flexShrink={0} />
                <Box minW={0} flex={1}>
                  <Text fontWeight="semibold" color="app.text" isTruncated>
                    @{c.login}
                  </Text>
                  <Text fontSize="sm" color="app.muted">
                    {c.contributions} commit{c.contributions === 1 ? "" : "s"}
                  </Text>
                </Box>
                {c.rank < 3 && (
                  <Box
                    flexShrink={0}
                    fontSize="xs"
                    fontWeight="bold"
                    color="app.onAccent"
                    bg="app.accent"
                    borderRadius="full"
                    px={2}
                    py={0.5}
                  >
                    #{c.rank + 1}
                  </Box>
                )}
              </Flex>
            </ChakraLink>
          ))}
        </Grid>
      )}
    </Box>
  );
}
