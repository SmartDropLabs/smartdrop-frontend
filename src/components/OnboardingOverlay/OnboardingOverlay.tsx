"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  Text,
  VStack,
} from "@chakra-ui/react";
import { motion, AnimatePresence } from "framer-motion";
import NextLink from "next/link";
import { useStellarWallet } from "@/context/StellarWalletContext";

const MotionBox = motion.create(Box);

const STEPS = [
  {
    title: "Welcome to SmartDrop",
    description:
      "The premier platform for Stellar-based liquidity farming and airdrops.",
    icon: "🌱",
  },
  {
    title: "Lock Tokens, Earn Credits",
    description:
      "Deposit your assets into farming pools. The longer you lock, the more credits you earn.",
    icon: "🔒",
  },
  {
    title: "Claim Airdrops",
    description:
      "Your earned credits can be redeemed for exclusive ecosystem airdrops and rewards.",
    icon: "🎁",
  },
];

export default function OnboardingOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { isConnected } = useStellarWallet();

  useEffect(() => {
    // Check if user has seen onboarding
    const hasSeenOnboarding = localStorage.getItem("smartdrop_onboarded");
    if (!hasSeenOnboarding) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem("smartdrop_onboarded", "true");
    setIsOpen(false);
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} isCentered size="md">
      <ModalOverlay backdropFilter="blur(5px)" bg="blackAlpha.600" />
      <ModalContent
        bg="app.surface"
        color="app.text"
        borderRadius="3xl"
        mx={4}
        overflow="hidden"
        border="1px solid"
        borderColor="app.border"
        boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.5)"
      >
        <ModalBody p={0}>
          <Box position="relative" h="320px" bg="app.surfaceHover">
            {/* Background Accent */}
            <Box
              position="absolute"
              top="-20%"
              left="-10%"
              w="140%"
              h="140%"
              bgGradient="radial(app.accent, transparent, transparent)"
              opacity={0.15}
              pointerEvents="none"
            />

            <AnimatePresence mode="wait">
              <MotionBox
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                position="absolute"
                inset={0}
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <VStack spacing={6} p={8} textAlign="center">
                  <Text fontSize="6xl">{STEPS[currentStep].icon}</Text>
                  <VStack spacing={3}>
                    <Text fontSize="2xl" fontWeight="bold">
                      {STEPS[currentStep].title}
                    </Text>
                    <Text color="app.muted" fontSize="md" lineHeight="tall">
                      {STEPS[currentStep].description}
                    </Text>
                  </VStack>
                </VStack>
              </MotionBox>
            </AnimatePresence>
          </Box>

          <Flex
            p={6}
            borderTop="1px solid"
            borderColor="app.border"
            justify="space-between"
            align="center"
            bg="app.surface"
          >
            {/* Step Indicators */}
            <Flex gap={2}>
              {STEPS.map((_, i) => (
                <Box
                  key={i}
                  h="6px"
                  w={i === currentStep ? "24px" : "6px"}
                  borderRadius="full"
                  bg={i === currentStep ? "app.accent" : "app.borderHover"}
                  transition="all 0.3s ease"
                />
              ))}
            </Flex>

            <Flex gap={3}>
              <Button variant="ghost" onClick={handleClose} color="app.muted">
                Skip
              </Button>
              {currentStep === STEPS.length - 1 ? (
                isConnected ? (
                  <Button
                    as={NextLink}
                    href="/farm"
                    bg="app.accent"
                    color="app.onAccent"
                    _hover={{ opacity: 0.9 }}
                    borderRadius="full"
                    onClick={handleClose}
                  >
                    Go to Farm
                  </Button>
                ) : (
                  <Button
                    bg="app.accent"
                    color="app.onAccent"
                    _hover={{ opacity: 0.9 }}
                    borderRadius="full"
                    onClick={handleClose}
                  >
                    Get Started
                  </Button>
                )
              ) : (
                <Button
                  bg="app.surfaceHover"
                  color="app.text"
                  _hover={{ bg: "app.border" }}
                  borderRadius="full"
                  onClick={nextStep}
                >
                  Next
                </Button>
              )}
            </Flex>
          </Flex>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
