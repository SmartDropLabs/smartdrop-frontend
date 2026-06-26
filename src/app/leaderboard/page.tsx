"use client";

import {
  Button,
  Flex,
  Input,
  Select,
  Spinner,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import { useStellarWallet } from "@/context/StellarWalletContext";
import { useLeaderboard, PAGE_SIZE, type SortKey } from "@/hooks/useLeaderboard";

function truncate(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function LeaderboardPage() {
  const { publicKey } = useStellarWallet();
  const {
    paged,
    isLoading,
    sortKey,
    setSortKey,
    searchQuery,
    setSearchQuery,
    currentPage,
    totalPages,
    setPage,
    connectedRank,
    filteredCount,
    lastRefreshed,
    refresh,
  } = useLeaderboard(publicKey);

  return (
    <Flex direction="column" align="center" mt={8} px={{ base: 4, md: 16 }}>
      <Text fontSize={{ base: "3xl", md: "4xl" }} fontWeight="bold">
        LEADERBOARD
      </Text>

      {connectedRank > 0 ? (
        <Text color="app.accent" mt={2} fontSize="sm">
          You are rank {connectedRank} of {filteredCount} farmers.
        </Text>
      ) : (
        <Text color="app.muted" mt={2} fontSize="sm">
          {filteredCount.toLocaleString()} farmers ranked.
        </Text>
      )}

      <Flex
        direction={{ base: "column", md: "row" }}
        gap={3}
        w="100%"
        maxW="900px"
        my={6}
        align={{ base: "stretch", md: "center" }}
        justify="space-between"
      >
        <Input
          placeholder="Search address…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          maxW={{ base: "100%", md: "280px" }}
          borderRadius="2xl"
          borderColor="app.border"
          bg="app.inputBg"
          color="app.text"
          _placeholder={{ color: "app.muted" }}
          _hover={{ borderColor: "app.accent" }}
          _focus={{ boxShadow: "none", borderColor: "app.accent" }}
        />

        <Flex gap={2} align="center">
          <Select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            borderRadius="2xl"
            borderColor="app.border"
            bg="app.surface"
            color="app.text"
            maxW="180px"
            _hover={{ borderColor: "app.accent" }}
            _focus={{ boxShadow: "none", borderColor: "app.accent" }}
          >
            <option value="credits">Sort: Credits</option>
            <option value="stake">Sort: Stake</option>
          </Select>

          <Button
            onClick={refresh}
            borderRadius="2xl"
            size="sm"
            isDisabled={isLoading}
            variant="outline"
            borderColor="app.border"
            color="app.text"
            _hover={{ borderColor: "app.accent", color: "app.accent" }}
          >
            {isLoading ? <Spinner size="xs" /> : "Refresh"}
          </Button>
        </Flex>
      </Flex>

      {isLoading && paged.length === 0 ? (
        <Spinner color="app.accent" size="xl" mt={16} />
      ) : filteredCount === 0 ? (
        <Text color="app.muted" mt={16}>
          No results found.
        </Text>
      ) : (
        <>
          <TableContainer w="100%" maxW="900px" overflowX="auto">
            <Table variant="unstyled" size="sm">
              <Thead>
                <Tr borderBottom="1px solid" borderColor="app.border">
                  <Th color="app.muted" fontWeight="normal" pb={3}>#</Th>
                  <Th color="app.muted" fontWeight="normal" pb={3}>Address</Th>
                  <Th color="app.muted" fontWeight="normal" pb={3} isNumeric>Credits</Th>
                  <Th color="app.muted" fontWeight="normal" pb={3} isNumeric>Stake</Th>
                  <Th color="app.muted" fontWeight="normal" pb={3} isNumeric>Boost %</Th>
                </Tr>
              </Thead>
              <Tbody>
                {paged.map((entry, i) => {
                  const rank = (currentPage - 1) * PAGE_SIZE + i + 1;
                  const isMe = Boolean(publicKey && entry.address === publicKey);
                  return (
                    <Tr
                      key={entry.address}
                      borderTop="1px solid"
                      borderBottom="1px solid"
                      borderColor="app.border"
                      bg={isMe ? "rgba(74,226,146,0.08)" : undefined}
                      _hover={{ bg: "rgba(128,128,128,0.08)" }}
                    >
                      <Td
                        py={4}
                        color={rank <= 3 ? "app.accent" : "app.text"}
                        fontWeight={rank <= 3 ? "bold" : "normal"}
                      >
                        {rank}
                      </Td>
                      <Td py={4}>
                        <Flex align="center" gap={2}>
                          <Text fontFamily="mono" color="app.text">
                            {truncate(entry.address)}
                          </Text>
                          {isMe && (
                            <Text fontSize="xs" color="app.accent">(you)</Text>
                          )}
                        </Flex>
                      </Td>
                      <Td py={4} isNumeric color="app.text">
                        {entry.totalCredits.toLocaleString()}
                      </Td>
                      <Td py={4} isNumeric color="app.text">
                        {entry.totalStake.toLocaleString()}
                      </Td>
                      <Td py={4} isNumeric color="app.text">
                        {entry.boostUtilization}%
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </TableContainer>

          <Flex gap={2} mt={6} align="center" wrap="wrap" justify="center">
            <Button
              size="sm"
              borderRadius="2xl"
              variant="outline"
              borderColor="app.border"
              color="app.text"
              isDisabled={currentPage === 1}
              onClick={() => setPage((p) => p - 1)}
              _hover={{ borderColor: "app.accent", color: "app.accent" }}
            >
              Prev
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                size="sm"
                borderRadius="2xl"
                variant={p === currentPage ? "solid" : "outline"}
                bg={p === currentPage ? "app.accent" : undefined}
                color={p === currentPage ? "app.onAccent" : "app.text"}
                borderColor="app.border"
                onClick={() => setPage(p)}
                _hover={{
                  borderColor: "app.accent",
                  color: p === currentPage ? "app.onAccent" : "app.accent",
                }}
              >
                {p}
              </Button>
            ))}

            <Button
              size="sm"
              borderRadius="2xl"
              variant="outline"
              borderColor="app.border"
              color="app.text"
              isDisabled={currentPage === totalPages}
              onClick={() => setPage((p) => p + 1)}
              _hover={{ borderColor: "app.accent", color: "app.accent" }}
            >
              Next
            </Button>
          </Flex>

          {lastRefreshed && (
            <Text fontSize="xs" color="app.muted" mt={4} mb={8}>
              Updated {lastRefreshed.toLocaleTimeString()} · auto-refreshes
              every 30s
            </Text>
          )}
        </>
      )}
    </Flex>
  );
}
