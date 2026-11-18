"use client";

import { usePageTitle } from "@/hooks/usePageTitle";
import {
  Box,
  Card,
  CardBody,
  Grid,
  Heading,
  Progress,
  Stat,
  StatArrow,
  StatHelpText,
  StatLabel,
  StatNumber,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";

const MOCK_STATS = {
  totalStaked: "125,000",
  totalRewards: "3,420",
  activeStakers: 47,
  avgApr: "12.4%",
  rewardChange: 8.2,
  stakerChange: -2.1,
};

const MOCK_POOLS = [
  { name: "USDC Pool", staked: "45,000", rewards: "1,230", apr: "11.2%", tvl: "$45,000" },
  { name: "XLM Pool", staked: "32,000", rewards: "890", apr: "13.8%", tvl: "$32,000" },
  { name: "AQUA Pool", staked: "28,000", rewards: "780", apr: "14.1%", tvl: "$28,000" },
  { name: "yXLM Pool", staked: "20,000", rewards: "520", apr: "10.5%", tvl: "$20,000" },
];

export default function AnalyticsPage() {
  usePageTitle("Analytics");

  return (
    <Box p={6} maxW="1200px" mx="auto">
      <Heading size="lg" mb={6}>
        Staking Analytics
      </Heading>

      <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={4} mb={8}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Total Staked</StatLabel>
              <StatNumber>{MOCK_STATS.totalStaked}</StatNumber>
              <StatHelpText>
                <StatArrow type="increase" />
                {MOCK_STATS.rewardChange}%
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Total Rewards</StatLabel>
              <StatNumber>{MOCK_STATS.totalRewards}</StatNumber>
              <StatHelpText>
                <StatArrow type="increase" />
                {MOCK_STATS.rewardChange}%
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Active Stakers</StatLabel>
              <StatNumber>{MOCK_STATS.activeStakers}</StatNumber>
              <StatHelpText>
                <StatArrow type="decrease" />
                {Math.abs(MOCK_STATS.stakerChange)}%
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Average APR</StatLabel>
              <StatNumber>{MOCK_STATS.avgApr}</StatNumber>
              <StatHelpText>Across all pools</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </Grid>

      <Card mb={8}>
        <CardBody>
          <Heading size="md" mb={4}>
            Pool Performance
          </Heading>
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Pool</Th>
                <Th isNumeric>Staked</Th>
                <Th isNumeric>Rewards</Th>
                <Th isNumeric>APR</Th>
                <Th isNumeric>TVL</Th>
                <Th>Utilization</Th>
              </Tr>
            </Thead>
            <Tbody>
              {MOCK_POOLS.map((pool) => (
                <Tr key={pool.name}>
                  <Td fontWeight="medium">{pool.name}</Td>
                  <Td isNumeric>{pool.staked}</Td>
                  <Td isNumeric>{pool.rewards}</Td>
                  <Td isNumeric color="green.400">
                    {pool.apr}
                  </Td>
                  <Td isNumeric>{pool.tvl}</Td>
                  <Td>
                    <Progress
                      value={parseFloat(pool.apr) * 5}
                      size="sm"
                      colorScheme="teal"
                      borderRadius="full"
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Heading size="md" mb={2}>
            Reward Distribution
          </Heading>
          <Text color="gray.400" mb={4}>
            Rewards are distributed proportionally to stake amount and duration.
          </Text>
          <Box>
            {MOCK_POOLS.map((pool) => {
              const pct = (parseFloat(pool.rewards.replace(",", "")) / parseFloat(MOCK_STATS.totalRewards.replace(",", ""))) * 100;
              return (
                <Box key={pool.name} mb={3}>
                  <Text fontSize="sm" mb={1}>
                    {pool.name} — {pct.toFixed(1)}%
                  </Text>
                  <Progress value={pct} size="sm" colorScheme="teal" borderRadius="full" />
                </Box>
              );
            })}
          </Box>
        </CardBody>
      </Card>
    </Box>
  );
}
