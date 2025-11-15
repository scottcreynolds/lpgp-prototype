import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

// Retro sci‑fi theme inspired by the “Eclipse Over Ridge” card
// Palettes use thematic names so they’re easy to extend.
// AA contrast is respected via semantic tokens below.

// put these colors into a color scale as below with the name softOchre

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        // Text dark mode and buttons
        softOchre: {
          50: { value: "#10a11114c" },
          100: { value: "#10610a128" },
          200: { value: "#101101106" },
          300: { value: "#f8f6e6" },
          400: { value: "#f0ecc9" },
          500: { value: "#e8e3b7" },
          600: { value: "#ded9a9" },
          700: { value: "#d4ce9c" },
          800: { value: "#c8c291" },
          900: { value: "#bab587" },
        },
        // secondary
        sapphireWool: {
          50: { value: "#2ffcff" },
          100: { value: "#07fbff" },
          200: { value: "#01dadd" },
          300: { value: "#06adb0" },
          400: { value: "#058789" },
          500: { value: "#086e70" },
          600: { value: "#095557" },
          700: { value: "#093e3f" },
          800: { value: "#082929" },
          900: { value: "#051414" },
        },
        // light mode text, body text
        subduedCrystal: {
          50: { value: "#c2895d" },
          100: { value: "#ac754b" },
          200: { value: "#8a6345" },
          300: { value: "#6a513d" },
          400: { value: "#503d2e" },
          500: { value: "#3f3329" },
          600: { value: "#2e2722" },
          700: { value: "#1f1c1a" },
          800: { value: "#111110" },
          900: { value: "#050505" },
        },
        // accent options and headings
        flamingoGold: {
          50: { value: "#fdaf92" },
          100: { value: "#f79470" },
          200: { value: "#f07a50" },
          300: { value: "#e66232" },
          400: { value: "#d54b1a" },
          500: { value: "#ba481e" },
          600: { value: "#a04321" },
          700: { value: "#873d22" },
          800: { value: "#703621" },
          900: { value: "#5a2f20" },
        },
        boldTangerine: {
          50: { value: "#fde5b6" },
          100: { value: "#f8d693" },
          200: { value: "#f1c772" },
          300: { value: "#e8b654" },
          400: { value: "#e3a72f" },
          500: { value: "#d69b26" },
          600: { value: "#bb8b29" },
          700: { value: "#a27a2b" },
          800: { value: "#8a6a2b" },
          900: { value: "#735b2b" },
        },
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
      fonts: {
        heading: { value: "Orbitron" },
      },
    },
    semanticTokens: {
      colors: {
        // Base application surfaces
        bg: {
          value: {
            _light: "{colors.softOchre.solid}",
            _dark: "{colors.voidNavy.900}",
          },
        },
        "bg.subtle": {
          value: {
            _light: "{colors.softOchre.subtle}",
            _dark: "{colors.voidNavy.800}",
          },
        },
        "bg.muted": {
          value: {
            _light: "{colors.subduedCrystal.muted}",
            _dark: "{colors.voidNavy.700}",
          },
        },
        "bg.emphasized": {
          value: {
            _light: "{colors.voidNavy.800}",
            _dark: "{colors.softOchre.200}",
          },
        },
        "bg.inverted": {
          value: {
            _light: "{colors.voidNavy.700}",
            _dark: "{colors.softOchre.200}",
          },
        },
        "bg.panel": {
          value: {
            _light: "{colors.boldTangerine.subtle}",
            _dark: "{colors.voidNavy.800}",
          },
        },

        // Text colors — tuned for AA contrast on the bg tokens above
        fg: {
          value: {
            _light: "{colors.subduedCrystal.solid}",
            _dark: "{colors.softOchre.500}",
          },
        },
        "fg.muted": {
          value: {
            _light: "{colors.flamingoGold.contrast}",
            _dark: "{colors.softOchre.muted}",
          },
        },
        "fg.subtle": {
          value: {
            _light: "{colors.subduedCrystal.solid}",
            _dark: "{colors.softOchre.400}",
          },
        },
        "fg.inverted": {
          value: {
            _light: "{colors.boldTangerine.contrast}",
            _dark: "{colors.sapphireWool.700}",
          },
        },

        // Borders
        border: {
          value: {
            _light: "{colors.subduedCrystal.400}",
            _dark: "{colors.voidNavy.700}",
          },
        },
        "border.muted": {
          value: {
            _light: "{colors.subduedCrystal.300}",
            _dark: "{colors.voidNavy.800}",
          },
        },
        "border.subtle": {
          value: {
            _light: "{colors.subduedCrystal.200}",
            _dark: "{colors.voidNavy.700}",
          },
        },
        "border.emphasized": {
          value: {
            _light: "{colors.subduedCrystal .200}",
            _dark: "{colors.duneSand.400}",
          },
        },
        "border.inverted": {
          value: {
            _light: "{colors.duneSand.200}",
            _dark: "{colors.voidNavy.800}",
          },
        },
        flamingoGold: {
          solid: { value: "{colors.flamingoGold.400}" },
          contrast: { value: "{colors.boldTangerine.50}" },
          fg: {
            value: {
              _light: "{colors.subduedCrystal.solid}",
              _dark: "{colors.subduedCrystal.solid}",
            },
          },
          muted: { value: "{colors.flamingoGold.100}" },
          subtle: { value: "{colors.flamingoGold.200}" },
          emphasized: { value: "{colors.flamingoGold.300}" },
          focusRing: { value: "{colors.flamingoGold.600}" },
        },
        sapphireWool: {
          solid: { value: "{colors.sapphireWool.400}" },
          contrast: { value: "{colors.sapphireWool.50}" },
          fg: {
            value: {
              _light: "{colors.sapphireWool.800}",
              _dark: "{colors.sapphireWool.300}",
            },
          },
          muted: { value: "{colors.sapphireWool.100}" },
          subtle: { value: "{colors.sapphireWool.200}" },
          emphasized: { value: "{colors.sapphireWool.300}" },
          focusRing: { value: "{colors.sapphireWool.600}" },
        },
        boldTangerine: {
          solid: { value: "{colors.boldTangerine.400}" },
          contrast: { value: "{colors.boldTangerine.50}" },
          fg: {
            value: {
              _light: "{colors.boldTangerine.800}",
              _dark: "{colors.boldTangerine.300}",
            },
          },
          muted: { value: "{colors.boldTangerine.100}" },
          subtle: { value: "{colors.boldTangerine.200}" },
          emphasized: { value: "{colors.boldTangerine.300}" },
          focusRing: { value: "{colors.boldTangerine.600}" },
        },
        subduedCrystal: {
          solid: { value: "{colors.subduedCrystal.400}" },
          contrast: { value: "{colors.subduedCrystal.50}" },
          fg: {
            value: {
              _light: "{colors.softOchre.solid}",
              _dark: "{colors.subduedCrystal.300}",
            },
          },
          muted: { value: "{colors.subduedCrystal.100}" },
          subtle: { value: "{colors.subduedCrystal.200}" },
          emphasized: { value: "{colors.subduedCrystal.300}" },
          focusRing: { value: "{colors.subduedCrystal.600}" },
        },
        softOchre: {
          solid: { value: "{colors.softOchre.400}" },
          contrast: { value: "{colors.softOchre.50}" },
          fg: {
            value: {
              _light: "{colors.subduedCrystal.solid}",
              _dark: "{colors.softOchre.300}",
            },
          },
          muted: { value: "{colors.softOchre.200}" },
          subtle: { value: "{colors.softOchre.700}" },
          emphasized: { value: "{colors.softOchre.400}" },
          focusRing: { value: "{colors.softOchre.500}" },
        },
      },
    },
  },
});

export const ridgeSystem = createSystem(defaultConfig, config);

export type RidgeSystem = typeof ridgeSystem;
