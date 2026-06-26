import { Flex, Link as ChakraLink, Text } from "@chakra-ui/react";
import NextLink from "next/link";

export default function Footer() {
  return (
    <Flex
      as="footer"
      w={{ base: "full", md: "95%" }}
      h={{ base: "auto", md: 5 }}
      align="center"
      justify={{ base: "center", md: "space-between" }}
      direction={{ base: "column", md: "row" }}
      gap={{ base: 2, md: 0 }}
      borderTop="1px solid #454545"
      borderBottom="1px solid #454545"
      py={5}
      mx="auto"
      my={8}
      px={{ base: 4, md: 0 }}
    >
      <Text px={{ base: 0, md: 8 }}>SMARTDROP</Text>
      <ChakraLink
        as={NextLink}
        href="/contributors"
        px={{ base: 0, md: 8 }}
        color="white"
        textDecoration="underline"
        fontSize="sm"
        textAlign="center"
        overflowWrap="anywhere"
      >
        Contributors (Lernza community)
      </ChakraLink>
      <Text px={{ base: 0, md: 8 }}>2026</Text>
    </Flex>
  );
}
