import { extendTheme, type ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "dark",
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  semanticTokens: {
    colors: {
      // Page-level backgrounds
      "app.bg":        { default: "#ffffff",  _dark: "#1a1a1a" },
      "app.surface":   { default: "#f5f5f5",  _dark: "#171717" },
      "app.inputBg":   { default: "#ffffff",  _dark: "#121212" },
      // Borders
      "app.border":    { default: "#d0d0d0",  _dark: "#454545" },
      // Accent — #0f7a4e passes 4.5:1 on white; #4ae292 is the dark-mode green
      "app.accent":    { default: "#0f7a4e",  _dark: "#4ae292" },
      // Text
      "app.text":      { default: "#171717",  _dark: "#ffffff" },
      "app.muted":     { default: "#6b7280",  _dark: "#A2A2A2" },
      "app.onAccent":  { default: "#ffffff",  _dark: "#000000" },
      // Tooltip
      "app.tooltipBg": { default: "#f0f0f0",  _dark: "#222222" },
      "app.tooltipFg": { default: "#171717",  _dark: "#ffffff" },
    },
  },
});

export default theme;
