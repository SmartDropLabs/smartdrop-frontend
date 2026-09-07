"use client";
import { useEffect } from "react";
import {
  Flex,
  HStack,
  Text,
  Spinner,
  Box,
  Grid,
  GridItem,
  Skeleton,
  useToast,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useStellarWallet } from "@/context/StellarWalletContext";
import {
  usePlatformStats,
  useTotalUserCredits,
} from "@/hooks/useSorobanQuery";
import { sorobanRpcUrl, stellarNetwork } from "@/config";
import OnboardingOverlay from "@/components/OnboardingOverlay/OnboardingOverlay";

const MotionBox = motion.create(Box);

const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut", delay },
  }),
};

// ── Ambient background ───────────────────────────────────────────────────────
// A layer of slow-drifting, multi-hue gradient blobs plus a faint dot grid,
// scoped to this page's own stacking context so it never touches the shared
// AppShell chrome (nav/footer) that other routes' visual-regression
// screenshots depend on.

function GradientOrb({
  color,
  size,
  top,
  left,
  right,
  bottom,
  driftX = 24,
  driftY = 18,
  duration = 18,
  delay = 0,
}: {
  color: string;
  size: string;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  driftX?: number;
  driftY?: number;
  duration?: number;
  delay?: number;
}) {
  return (
    <MotionBox
      position="absolute"
      top={top}
      left={left}
      right={right}
      bottom={bottom}
      w={size}
      h={size}
      borderRadius="full"
      filter="blur(80px)"
      opacity={[0.35, 0.22]}
      bg={`radial-gradient(circle at 30% 30%, ${color}, transparent 70%)`}
      animate={{
        x: [0, driftX, 0, -driftX, 0],
        y: [0, -driftY, driftY, -driftY / 2, 0],
      }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function AmbientBackground() {
  return (
    <Box
      position="absolute"
      inset={0}
      overflow="hidden"
      pointerEvents="none"
      zIndex={0}
      aria-hidden
    >
      <GradientOrb
        color="var(--chakra-colors-app-accent)"
        size="42vw"
        top="-12%"
        left="-8%"
        duration={22}
      />
      <GradientOrb
        color="var(--chakra-colors-app-accent3)"
        size="36vw"
        top="8%"
        right="-10%"
        duration={26}
        delay={1.5}
      />
      <GradientOrb
        color="var(--chakra-colors-app-accent2)"
        size="30vw"
        bottom="-14%"
        left="18%"
        duration={20}
        delay={3}
      />
      <Box
        position="absolute"
        inset={0}
        opacity={[0.5, 0.35]}
        sx={{
          backgroundImage:
            "radial-gradient(circle, var(--chakra-colors-app-border) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(ellipse 60% 50% at 50% 0%, black, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 60% 50% at 50% 0%, black, transparent 75%)",
        }}
      />
    </Box>
  );
}

// ── Icons ────────────────────────────────────────────────────────────────────
// Small inline line icons — no new icon-package dependency for four glyphs.

function IconVault(props: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="6" width="18" height="14" rx="2.5" stroke={props.color} strokeWidth="1.6" />
      <circle cx="12" cy="13" r="3" stroke={props.color} strokeWidth="1.6" />
      <path d="M12 11.5v1.5l1 1" stroke={props.color} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M7 6V4.5A1.5 1.5 0 0 1 8.5 3h7A1.5 1.5 0 0 1 17 4.5V6" stroke={props.color} strokeWidth="1.6" />
    </svg>
  );
}

function IconLayers(props: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3 3 8l9 5 9-5-9-5Z" stroke={props.color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M3 12l9 5 9-5" stroke={props.color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M3 16l9 5 9-5" stroke={props.color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function IconUsers(props: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3" stroke={props.color} strokeWidth="1.6" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={props.color} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.4" stroke={props.color} strokeWidth="1.4" />
      <path d="M15.5 20c.2-2.7 1.7-4.9 3.9-5.6" stroke={props.color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconPulse(props: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 12h4l2-7 4 14 2-7h6"
        stroke={props.color}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatCard({
  label,
  value,
  accent = "app.accent",
  glow = "glow",
  icon,
  delay = 0,
  isLoading = false,
  span,
  featured = false,
}: {
  label: string;
  value: string | number;
  accent?: string;
  glow?: string;
  icon: (props: { color: string }) => React.ReactElement;
  delay?: number;
  isLoading?: boolean;
  span?: { base: number; lg: number };
  featured?: boolean;
}) {
  const Icon = icon;
  return (
    <GridItem colSpan={span ?? { base: 4, lg: 1 }} rowSpan={featured ? { base: 1, lg: 2 } : 1}>
      <MotionBox
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        custom={delay}
        h="100%"
        position="relative"
        overflow="hidden"
        border="1px solid"
        borderColor="app.border"
        borderRadius="card"
        p={featured ? 7 : 6}
        display="flex"
        flexDirection="column"
        justifyContent={featured ? "space-between" : "flex-start"}
        bg="app.surface"
        backdropFilter="blur(14px)"
        boxShadow="card"
        sx={{
          transition: "border-color 0.2s ease, box-shadow 0.25s ease, transform 0.2s ease",
        }}
        _hover={{
          borderColor: accent,
          boxShadow: glow,
          transform: "translateY(-3px)",
        }}
      >
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          h="3px"
          bgGradient={`linear(to-r, ${accent}, transparent)`}
        />
        {featured && (
          <Box
            position="absolute"
            bottom="-30%"
            right="-15%"
            w="60%"
            h="60%"
            borderRadius="full"
            filter="blur(50px)"
            opacity={0.25}
            bg={`radial-gradient(circle, var(--chakra-colors-${accent.replace(".", "-")}), transparent 70%)`}
            pointerEvents="none"
          />
        )}
        <Flex align="center" justify="space-between" mb={featured ? 8 : 3} position="relative">
          <Text color="app.muted" fontSize="sm" fontWeight="medium">
            {label}
          </Text>
          <Flex
            align="center"
            justify="center"
            w={featured ? "40px" : "34px"}
            h={featured ? "40px" : "34px"}
            borderRadius="lg"
            bg="app.surfaceHover"
            border="1px solid"
            borderColor="app.border"
          >
            <Icon color={`var(--chakra-colors-${accent.replace(".", "-")})`} />
          </Flex>
        </Flex>
        <Skeleton isLoaded={!isLoading} startColor="app.border" endColor="app.surfaceHover">
          <Text
            fontSize={featured ? { base: "4xl", md: "5xl" } : "3xl"}
            fontWeight="extrabold"
            letterSpacing="tight"
            color={accent}
            position="relative"
          >
            {isLoading ? "—" : value}
          </Text>
        </Skeleton>
      </MotionBox>
    </GridItem>
  );
}

export default function Home() {
  const toast = useToast();
  const { publicKey, isConnected } = useStellarWallet();
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    error: statsErrorObj,
  } = usePlatformStats();

  const {
    data: totalCredits,
    isLoading: creditsLoading,
    isError: creditsError,
    error: creditsErrorObj,
  } = useTotalUserCredits();

  useEffect(() => {
    if (statsError && statsErrorObj) {
      toast({
        title: "Unable to load platform data",
        description:
          statsErrorObj instanceof Error
            ? statsErrorObj.message
            : "Failed to fetch dashboard data",
        status: "error",
        duration: 8000,
        isClosable: true,
      });
    }
  }, [statsError, statsErrorObj, toast]);

  useEffect(() => {
    if (creditsError && creditsErrorObj) {
      toast({
        title: "Unable to load credits",
        description:
          creditsErrorObj instanceof Error
            ? creditsErrorObj.message
            : "Failed to fetch user credits",
        status: "error",
        duration: 8000,
        isClosable: true,
      });
    }
  }, [creditsError, creditsErrorObj, toast]);

  const formatNumber = (value: number | undefined | null, fallback = "Not tracked") =>
    value || value === 0 ? value.toLocaleString() : fallback;

  return (
    <Box position="relative">
      <AmbientBackground />
      <Flex
        direction="column"
        px={{ base: 6, md: 16 }}
        py={10}
        align="center"
        gap={10}
        position="relative"
        zIndex={1}
      >
        <MotionBox variants={fadeInUp} initial="hidden" animate="visible" w="100%" maxW="1200px">
          <HStack
            spacing={2}
            mb={5}
            display="inline-flex"
            borderRadius="full"
            border="1px solid"
            borderColor="app.border"
            bg="app.surface"
            backdropFilter="blur(12px)"
            px={3}
            py={1.5}
          >
            <Box
              w="6px"
              h="6px"
              borderRadius="full"
              bg="app.accent"
              boxShadow="0 0 8px var(--chakra-colors-app-accent)"
              className="animate-pulse"
            />
            <Text fontSize="xs" fontWeight="semibold" letterSpacing="wide" color="app.muted" textTransform="uppercase">
              Live on {stellarNetwork}
            </Text>
          </HStack>
          <Text
            fontSize={{ base: "5xl", md: "7xl" }}
            fontWeight="extrabold"
            letterSpacing="tighter"
            lineHeight={1.02}
            mb={4}
            bgGradient="linear(to-r, app.accent, app.accent3, app.accent2)"
            bgClip="text"
          >
            SmartDrop Dashboard
          </Text>
          <Text color="app.muted" mb={4} fontSize="lg" maxW="640px">
            Live Soroban RPC data with contract-driven TVL, pool counts, and user
            metrics.
          </Text>
          <Text fontSize="sm" color="app.muted" mb={2} fontFamily="mono">
            RPC: {sorobanRpcUrl.replace(/^https?:\/\//, "")}
            {publicKey ? ` · Wallet ${publicKey.slice(0, 6)}…` : ""}
          </Text>
        </MotionBox>

        <Grid
          templateColumns="repeat(4, 1fr)"
          templateRows="auto auto"
          autoFlow="row dense"
          w="100%"
          maxW="1200px"
          gap={4}
        >
          <StatCard
            label="Total Value Locked"
            value={stats?.totalValueLocked ?? "Not available"}
            accent="app.accent"
            glow="glow"
            icon={IconVault}
            delay={0.05}
            isLoading={statsLoading}
            span={{ base: 4, lg: 2 }}
            featured
          />
          <StatCard
            label="Active Pools"
            value={stats?.totalPools ?? "No pools found"}
            accent="app.accent2"
            glow="glowBlue"
            icon={IconLayers}
            delay={0.1}
            isLoading={statsLoading}
            span={{ base: 2, lg: 1 }}
          />
          <StatCard
            label="Total Users"
            value={formatNumber(stats?.totalUsers)}
            accent="app.accent3"
            glow="glowViolet"
            icon={IconUsers}
            delay={0.15}
            isLoading={statsLoading}
            span={{ base: 2, lg: 1 }}
          />
          <StatCard
            label="Users Online"
            value={formatNumber(stats?.onlineUsers)}
            accent="app.accent4"
            glow="glowPink"
            icon={IconPulse}
            delay={0.2}
            isLoading={statsLoading}
            span={{ base: 4, lg: 2 }}
          />
        </Grid>

        <MotionBox
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          custom={0.25}
          w="100%"
          maxW="1200px"
          position="relative"
          overflow="hidden"
          border="1px solid"
          borderColor="app.border"
          borderRadius="card"
          p={8}
          bg="app.surface"
          backdropFilter="blur(14px)"
          boxShadow="card"
        >
          <Box
            position="absolute"
            top="-20%"
            right="-10%"
            w="45%"
            h="140%"
            borderRadius="full"
            filter="blur(60px)"
            opacity={0.18}
            bg="radial-gradient(circle, var(--chakra-colors-app-accent), transparent 70%)"
            pointerEvents="none"
          />
          <Text fontSize="2xl" fontWeight="bold" mb={3} position="relative">
            Your credits
          </Text>
          <Text color="app.muted" mb={4} position="relative">
            Credits are calculated from your on-chain positions across all pools.
          </Text>

          {isConnected ? (
            creditsLoading ? (
              <Spinner size="lg" color="app.accent" />
            ) : (
              <Text
                fontSize={{ base: "4xl", md: "5xl" }}
                fontWeight="extrabold"
                letterSpacing="tight"
                bgGradient="linear(to-r, app.accent, app.accent3)"
                bgClip="text"
                position="relative"
              >
                {totalCredits ?? "0"} Credits
              </Text>
            )
          ) : (
            <Alert status="info" borderRadius="xl" bg="app.surfaceHover" position="relative">
              <AlertIcon /> Connect your Freighter wallet to fetch your user credits and positions.
            </Alert>
          )}
        </MotionBox>
        <OnboardingOverlay />
      </Flex>
    </Box>
  );
}
