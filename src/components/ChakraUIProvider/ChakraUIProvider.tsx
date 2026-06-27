"use client";

import theme from "@/lib/theme";
import {
  ChakraProvider,
  ColorModeScript,
  localStorageManager,
} from "@chakra-ui/react";
import type { ReactNode } from "react";

export default function ChakraUIProvider({ children }: { children: ReactNode }) {
  return (
    <>
      <ColorModeScript
        initialColorMode={theme.config.initialColorMode}
        storageKey="chakra-ui-color-mode"
      />
      <ChakraProvider theme={theme} colorModeManager={localStorageManager}>
        {children}
      </ChakraProvider>
    </>
  );
}
