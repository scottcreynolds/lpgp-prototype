import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

// Retro sci‑fi theme inspired by the “Eclipse Over Ridge” card
// Palettes use thematic names so they’re easy to extend.
// AA contrast is respected via semantic tokens below.

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        // Primary accent — warm retro gold
        ridgeGold: {
          50: { value: "#FFFAE8" },
          100: { value: "#FFF3C9" },
          200: { value: "#FDE8A3" },
          300: { value: "#F4D77B" },
          400: { value: "#E8C65A" },
          500: { value: "#D7AD3D" },
          600: { value: "#B8912F" },
          700: { value: "#8F6F23" },
          800: { value: "#6B521A" },
          900: { value: "#4A3911" },
          950: { value: "#2E240B" },
        },
        // Secondary accent — cool teal
        driftTeal: {
          50: { value: "#E6FFFC" },
          100: { value: "#C8FFF6" },
          200: { value: "#96F0E8" },
          300: { value: "#63DACE" },
          400: { value: "#3DC0B5" },
          500: { value: "#2EA8A5" },
          600: { value: "#23888A" },
          700: { value: "#1E6C6F" },
          800: { value: "#184F53" },
          900: { value: "#12393D" },
          950: { value: "#0B262A" },
        },
        // Deep space navy for dark backgrounds
        voidNavy: {
          50: { value: "#E7EEF7" },
          100: { value: "#C9D7EB" },
          200: { value: "#A9BEDC" },
          300: { value: "#86A3CB" },
          400: { value: "#6488B9" },
          500: { value: "#486E9F" },
          600: { value: "#34557F" },
          700: { value: "#264265" },
          800: { value: "#1A2F4A" },
          900: { value: "#122339" },
          950: { value: "#0B1725" },
        },
        // Warm sand/cream for light backgrounds & panels
        duneSand: {
          50: { value: "#FFF8E9" },
          100: { value: "#FCEFD3" },
          200: { value: "#F6E1B5" },
          300: { value: "#ECD190" },
          400: { value: "#DFBF78" },
          500: { value: "#CBA55C" },
          600: { value: "#AA8748" },
          700: { value: "#856837" },
          800: { value: "#604B28" },
          900: { value: "#40321B" },
          950: { value: "#241B0F" },
        },
      },
    },
    semanticTokens: {
      colors: {
        // Base application surfaces
        bg: {
          value: {
            _light: "{colors.duneSand.50}",
            _dark: "{colors.voidNavy.900}",
          },
        },
        "bg.subtle": {
          value: {
            _light: "{colors.duneSand.100}",
            _dark: "{colors.voidNavy.800}",
          },
        },
        "bg.muted": {
          value: {
            _light: "{colors.duneSand.200}",
            _dark: "{colors.voidNavy.700}",
          },
        },
        "bg.emphasized": {
          value: {
            _light: "{colors.voidNavy.800}",
            _dark: "{colors.duneSand.200}",
          },
        },
        "bg.inverted": {
          value: {
            _light: "{colors.voidNavy.900}",
            _dark: "{colors.duneSand.50}",
          },
        },
        "bg.panel": {
          value: {
            _light: "{colors.duneSand.100}",
            _dark: "{colors.voidNavy.800}",
          },
        },

        // Text colors — tuned for AA contrast on the bg tokens above
        fg: {
          value: {
            _light: "{colors.voidNavy.900}",
            _dark: "{colors.duneSand.50}",
          },
        },
        "fg.muted": {
          value: {
            _light: "{colors.voidNavy.700}",
            _dark: "{colors.duneSand.200}",
          },
        },
        "fg.subtle": {
          value: {
            _light: "{colors.voidNavy.600}",
            _dark: "{colors.duneSand.300}",
          },
        },
        "fg.inverted": {
          value: {
            _light: "{colors.duneSand.50}",
            _dark: "{colors.voidNavy.900}",
          },
        },

        // Borders
        border: {
          value: {
            _light: "{colors.voidNavy.200}",
            _dark: "{colors.voidNavy.700}",
          },
        },
        "border.muted": {
          value: {
            _light: "{colors.voidNavy.100}",
            _dark: "{colors.voidNavy.800}",
          },
        },
        "border.subtle": {
          value: {
            _light: "{colors.duneSand.200}",
            _dark: "{colors.voidNavy.700}",
          },
        },
        "border.emphasized": {
          value: {
            _light: "{colors.voidNavy.600}",
            _dark: "{colors.duneSand.400}",
          },
        },
        "border.inverted": {
          value: {
            _light: "{colors.duneSand.200}",
            _dark: "{colors.voidNavy.800}",
          },
        },

        // Primary (gold) semantic mapping for colorPalette="ridgeGold"
        ridgeGold: {
          solid: { value: "{colors.ridgeGold.600}" },
          contrast: { value: "{colors.duneSand.50}" },
          fg: {
            value: {
              _light: "{colors.ridgeGold.800}",
              _dark: "{colors.ridgeGold.200}",
            },
          },
          muted: { value: "{colors.ridgeGold.100}" },
          subtle: { value: "{colors.ridgeGold.200}" },
          emphasized: { value: "{colors.ridgeGold.300}" },
          focusRing: { value: "{colors.ridgeGold.500}" },
        },

        // Secondary (teal) mapping for colorPalette="driftTeal"
        driftTeal: {
          solid: { value: "{colors.driftTeal.600}" },
          contrast: { value: "{colors.duneSand.50}" },
          fg: {
            value: {
              _light: "{colors.driftTeal.800}",
              _dark: "{colors.driftTeal.200}",
            },
          },
          muted: { value: "{colors.driftTeal.100}" },
          subtle: { value: "{colors.driftTeal.200}" },
          emphasized: { value: "{colors.driftTeal.300}" },
          focusRing: { value: "{colors.driftTeal.500}" },
        },
      },
    },
  },
});

export const ridgeSystem = createSystem(defaultConfig, config);

export type RidgeSystem = typeof ridgeSystem;
