"use client";

import { LinkIcon } from "@chakra-ui/icons";
import {
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Tooltip,
} from "@chakra-ui/react";
import { useState } from "react";

function twitterIntentUrl(url: string, text: string): string {
  const params = new URLSearchParams({ url, text });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

/**
 * Share menu for a pool or leaderboard entry (#264): copy the current page
 * link, or open a prefilled X/Twitter share intent in a new tab.
 */
export default function ShareButton({
  url,
  shareText,
  size = "xs",
}: {
  url: string;
  shareText: string;
  size?: "2xs" | "xs" | "sm";
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable in hardened browser contexts.
    }
  };

  const handleTweet = () => {
    window.open(twitterIntentUrl(url, shareText), "_blank", "noopener,noreferrer");
  };

  return (
    <Menu placement="bottom-end">
      <Tooltip label={copied ? "Copied!" : "Share"} hasArrow fontSize="xs">
        <MenuButton
          as={IconButton}
          aria-label="Share"
          icon={<LinkIcon />}
          onClick={(e) => e.stopPropagation()}
          size={size}
          variant="ghost"
          color={copied ? "app.accent" : "app.muted"}
          _hover={{ color: "app.accent", bg: "app.surfaceHover" }}
          minW="auto"
          h="auto"
          p={1}
        />
      </Tooltip>
      <MenuList bg="app.surface" borderColor="app.border" fontSize="sm" minW="160px">
        <MenuItem
          bg="app.surface"
          color="app.text"
          _hover={{ bg: "app.surfaceHover" }}
          onClick={() => void handleCopy()}
        >
          {copied ? "Copied!" : "Copy link"}
        </MenuItem>
        <MenuItem
          bg="app.surface"
          color="app.text"
          _hover={{ bg: "app.surfaceHover" }}
          onClick={handleTweet}
        >
          Share on X
        </MenuItem>
      </MenuList>
    </Menu>
  );
}
