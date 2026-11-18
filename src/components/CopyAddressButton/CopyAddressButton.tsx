"use client";

import { CheckIcon, CopyIcon } from "@chakra-ui/icons";
import { IconButton, Tooltip } from "@chakra-ui/react";
import { useState } from "react";

/**
 * Small copy-to-clipboard icon button for a Stellar address (issue #236).
 * Stellar addresses are 56 characters — manual selection is error-prone,
 * so every place an address is displayed should offer a one-click copy.
 */
export default function CopyAddressButton({
  address,
  size = "xs",
}: {
  address: string;
  size?: "2xs" | "xs" | "sm";
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable in hardened browser contexts.
    }
  };

  return (
    <Tooltip label={copied ? "Copied!" : "Copy address"} hasArrow fontSize="xs">
      <IconButton
        aria-label="Copy address"
        icon={copied ? <CheckIcon /> : <CopyIcon />}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          void handleCopy();
        }}
        size={size}
        variant="ghost"
        color={copied ? "app.accent" : "app.muted"}
        _hover={{ color: "app.accent", bg: "app.surfaceHover" }}
        minW="auto"
        h="auto"
        p={1}
      />
    </Tooltip>
  );
}
