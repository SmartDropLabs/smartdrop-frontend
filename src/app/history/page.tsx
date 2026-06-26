"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Flex,
  Link,
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
import ConnectWalletButton from "@/components/ConnectWalletButton/ConnectWalletButton";
import {
  getUserTransactionHistory,
  stellarExpertTxUrl,
  type TxHistoryEntry,
} from "@/lib/soroban";
import { poolContractId, stellarNetwork } from "@/config";

const PAGE_SIZE = 20;

function truncateHash(hash: string): string {
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatAmount(amount: string, symbol: string): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return `${amount} ${symbol}`;
  return `${(num / 1e7).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${symbol}`;
}

export default function HistoryPage() {
  const { publicKey, isConnected } = useStellarWallet();
  const [entries, setEntries] = useState<TxHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);

  const poolContractIds = poolContractId ? [poolContractId] : [];

  useEffect(() => {
    if (!publicKey || poolContractIds.length === 0) return;
    setIsLoading(true);
    setPage(1);
    getUserTransactionHistory(publicKey, poolContractIds)
      .then(setEntries)
      .finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey]);

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const paged = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Flex direction="column" align="center" mt={8} px={{ base: 4, md: 16 }}>
      <Text fontSize={{ base: "3xl", md: "4xl" }} fontWeight="bold">
        HISTORY
      </Text>
      <Text color="#A2A2A2" mt={1} fontSize="sm">
        Your past lock and unlock events
      </Text>

      {!isConnected ? (
        <Flex direction="column" align="center" mt={16} gap={4}>
          <Text color="#A2A2A2">Connect your wallet to view your farming history.</Text>
          <ConnectWalletButton />
        </Flex>
      ) : isLoading ? (
        <Spinner color="#4ae292" size="xl" mt={16} />
      ) : entries.length === 0 ? (
        <Text color="#A2A2A2" mt={16} textAlign="center">
          No farming history yet — deposit to a pool to get started
        </Text>
      ) : (
        <>
          <TableContainer w="100%" maxW="1000px" mt={8} overflowX="auto">
            <Table variant="unstyled" size="sm">
              <Thead>
                <Tr borderBottom="1px solid #454545">
                  <Th color="#A2A2A2" fontWeight="normal" pb={3}>Date</Th>
                  <Th color="#A2A2A2" fontWeight="normal" pb={3}>Action</Th>
                  <Th color="#A2A2A2" fontWeight="normal" pb={3} isNumeric>Amount</Th>
                  <Th color="#A2A2A2" fontWeight="normal" pb={3} isNumeric>Credits Earned</Th>
                  <Th color="#A2A2A2" fontWeight="normal" pb={3}>Transaction</Th>
                </Tr>
              </Thead>
              <Tbody>
                {paged.map((entry) => (
                  <Tr
                    key={entry.txHash}
                    borderTop="1px solid #454545"
                    borderBottom="1px solid #454545"
                    _hover={{ bg: "rgba(255,255,255,0.04)" }}
                  >
                    <Td py={4} color="white" whiteSpace="nowrap">
                      {formatDate(entry.date)}
                    </Td>
                    <Td py={4}>
                      <Text
                        fontWeight="semibold"
                        color={entry.action === "lock" ? "#4ae292" : "#f6c90e"}
                        textTransform="capitalize"
                      >
                        {entry.action}
                      </Text>
                    </Td>
                    <Td py={4} isNumeric color="white">
                      {formatAmount(entry.amount, entry.symbol)}
                    </Td>
                    <Td py={4} isNumeric color="white">
                      {entry.creditsEarned != null
                        ? Number(entry.creditsEarned).toLocaleString()
                        : "—"}
                    </Td>
                    <Td py={4}>
                      <Link
                        href={stellarExpertTxUrl(entry.txHash, stellarNetwork.toLowerCase())}
                        isExternal
                        color="#4ae292"
                        fontFamily="mono"
                        fontSize="xs"
                        _hover={{ textDecoration: "underline" }}
                      >
                        {truncateHash(entry.txHash)}
                      </Link>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>

          {totalPages > 1 && (
            <Flex gap={2} mt={6} align="center" wrap="wrap" justify="center">
              <Button
                size="sm"
                borderRadius="2xl"
                variant="outline"
                borderColor="#454545"
                color="white"
                isDisabled={page === 1}
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
                  variant={p === page ? "solid" : "outline"}
                  bg={p === page ? "#4ae292" : undefined}
                  color={p === page ? "#000" : "white"}
                  borderColor="#454545"
                  onClick={() => setPage(p)}
                  _hover={{
                    borderColor: "#4ae292",
                    color: p === page ? "#000" : "#4ae292",
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
                isDisabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                _hover={{ borderColor: "#4ae292", color: "#4ae292" }}
              >
                Next
              </Button>
            </Flex>
          )}

          {page === totalPages && entries.length >= PAGE_SIZE && (
            <Button
              mt={6}
              mb={8}
              size="sm"
              borderRadius="2xl"
              variant="outline"
              borderColor="#454545"
              color="white"
              isDisabled
              _hover={{ borderColor: "#4ae292", color: "#4ae292" }}
            >
              No more entries
            </Button>
          )}

          <Text fontSize="xs" color="#A2A2A2" mt={4} mb={8}>
            Showing events from the past 7 days
          </Text>
        </>
      )}
    </Flex>
  );
}
