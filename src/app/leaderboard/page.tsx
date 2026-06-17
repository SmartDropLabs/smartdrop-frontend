"use client";

import { useCallback, useEffect, useState } from "react";
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

type SortKey = "credits" | "stake";

type LeaderboardEntry = {
  address: string;
  totalCredits: number;
  totalStake: number;
  boostUtilization: number;
};

const PAGE_SIZE = 10;
const REFRESH_MS = 30_000;

function truncate(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  // Wire to Horizon event indexer or Soroban RPC when contract is deployed.
  await new Promise((r) => setTimeout(r, 400));
  return Array.from({ length: 100 }, (_, i) => ({
    address: `G${"A".repeat(55 - String(i + 1).length)}${i + 1}`,
    totalCredits: 50000 - i * 480,
    totalStake: 100000 - i * 950,
    boostUtilization: Math.max(5, 100 - i),
  }));
}

export default function LeaderboardPage() {
  const { publicKey } = useStellarWallet();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("credits");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const refresh = useCallback(() => {
    setIsLoading(true);
    fetchLeaderboard().then((data) => {
      setEntries(data);
      setIsLoading(false);
      setLastRefreshed(new Date());
    });
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const sorted = [...entries].sort((a, b) =>
    sortKey === "credits"
      ? b.totalCredits - a.totalCredits
      : b.totalStake - a.totalStake
  );

  const filtered = sorted.filter((e) =>
    e.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const connectedRank = publicKey
    ? filtered.findIndex((e) => e.address === publicKey) + 1
    : 0;

  return (
    <Flex direction="column" align="center" mt={8} px={{ base: 4, md: 16 }}>
      <Text fontSize={{ base: "3xl", md: "4xl" }} fontWeight="bold">
        LEADERBOARD
      </Text>

      {connectedRank > 0 ? (
        <Text color="#4ae292" mt={2} fontSize="sm">
          You are rank {connectedRank} of {filtered.length} farmers.
        </Text>
      ) : (
        <Text color="#A2A2A2" mt={2} fontSize="sm">
          {filtered.length.toLocaleString()} farmers ranked.
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
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          maxW={{ base: "100%", md: "280px" }}
          borderRadius="2xl"
          borderColor="#454545"
          _placeholder={{ color: "#A2A2A2" }}
          _hover={{ borderColor: "#4ae292" }}
          _focus={{ boxShadow: "none", borderColor: "#4ae292" }}
        />

        <Flex gap={2} align="center">
          <Select
            value={sortKey}
            onChange={(e) => {
              setSortKey(e.target.value as SortKey);
              setPage(1);
            }}
            borderRadius="2xl"
            borderColor="#454545"
            bg="black"
            color="white"
            maxW="180px"
            _hover={{ borderColor: "#4ae292" }}
            _focus={{ boxShadow: "none", borderColor: "#4ae292" }}
          >
            <option value="credits" style={{ background: "#111" }}>
              Sort: Credits
            </option>
            <option value="stake" style={{ background: "#111" }}>
              Sort: Stake
            </option>
          </Select>

          <Button
            onClick={refresh}
            borderRadius="2xl"
            size="sm"
            isDisabled={isLoading}
            variant="outline"
            borderColor="#454545"
            color="white"
            _hover={{ borderColor: "#4ae292", color: "#4ae292" }}
          >
            {isLoading ? <Spinner size="xs" /> : "Refresh"}
          </Button>
        </Flex>
      </Flex>

      {isLoading && entries.length === 0 ? (
        <Spinner color="#4ae292" size="xl" mt={16} />
      ) : filtered.length === 0 ? (
        <Text color="#A2A2A2" mt={16}>
          No results found.
        </Text>
      ) : (
        <>
          <TableContainer w="100%" maxW="900px" overflowX="auto">
            <Table variant="unstyled" size="sm">
              <Thead>
                <Tr borderBottom="1px solid #454545">
                  <Th color="#A2A2A2" fontWeight="normal" pb={3}>
                    #
                  </Th>
                  <Th color="#A2A2A2" fontWeight="normal" pb={3}>
                    Address
                  </Th>
                  <Th color="#A2A2A2" fontWeight="normal" pb={3} isNumeric>
                    Credits
                  </Th>
                  <Th color="#A2A2A2" fontWeight="normal" pb={3} isNumeric>
                    Stake
                  </Th>
                  <Th color="#A2A2A2" fontWeight="normal" pb={3} isNumeric>
                    Boost %
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {paged.map((entry, i) => {
                  const rank = (currentPage - 1) * PAGE_SIZE + i + 1;
                  const isMe = Boolean(publicKey && entry.address === publicKey);
                  return (
                    <Tr
                      key={entry.address}
                      borderTop="1px solid #454545"
                      borderBottom="1px solid #454545"
                      bg={isMe ? "rgba(74,226,146,0.08)" : undefined}
                      _hover={{ bg: "rgba(255,255,255,0.04)" }}
                    >
                      <Td
                        py={4}
                        color={rank <= 3 ? "#4ae292" : "white"}
                        fontWeight={rank <= 3 ? "bold" : "normal"}
                      >
                        {rank}
                      </Td>
                      <Td py={4}>
                        <Flex align="center" gap={2}>
                          <Text fontFamily="mono" color="white">
                            {truncate(entry.address)}
                          </Text>
                          {isMe && (
                            <Text fontSize="xs" color="#4ae292">
                              (you)
                            </Text>
                          )}
                        </Flex>
                      </Td>
                      <Td py={4} isNumeric color="white">
                        {entry.totalCredits.toLocaleString()}
                      </Td>
                      <Td py={4} isNumeric color="white">
                        {entry.totalStake.toLocaleString()}
                      </Td>
                      <Td py={4} isNumeric color="white">
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
              borderColor="#454545"
              color="white"
              isDisabled={currentPage === 1}
              onClick={() => setPage((p) => p - 1)}
              _hover={{ borderColor: "#4ae292", color: "#4ae292" }}
            >
              Prev
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                size="sm"
                borderRadius="2xl"
                variant={p === currentPage ? "solid" : "outline"}
                bg={p === currentPage ? "#4ae292" : undefined}
                color={p === currentPage ? "#000" : "white"}
                borderColor="#454545"
                onClick={() => setPage(p)}
                _hover={{
                  borderColor: "#4ae292",
                  color: p === currentPage ? "#000" : "#4ae292",
                }}
              >
                {p}
              </Button>
            ))}

            <Button
              size="sm"
              borderRadius="2xl"
              variant="outline"
              borderColor="#454545"
              color="white"
              isDisabled={currentPage === totalPages}
              onClick={() => setPage((p) => p + 1)}
              _hover={{ borderColor: "#4ae292", color: "#4ae292" }}
            >
              Next
            </Button>
          </Flex>

          {lastRefreshed && (
            <Text fontSize="xs" color="#A2A2A2" mt={4} mb={8}>
              Updated {lastRefreshed.toLocaleTimeString()} · auto-refreshes
              every 30s
            </Text>
          )}
        </>
      )}
    </Flex>
  );
}
