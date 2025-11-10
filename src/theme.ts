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
          50: { value: "#697963" },
          100: { value: "#89977C" },
          200: { value: "#ABB596" },
          300: { value: "#CFD3AF" },
          400: { value: "#f0ecc9" },
          500: { value: "#F3E9D0" },
          600: { value: "#F5E7D6" },
          700: { value: "#F7E6DD" },
          800: { value: "#F9E8E5" },
          900: { value: "#FBECEC" },
          950: { value: "#FDF3F6" },
        },
        // secondary
        sapphireWool: {
          50: { value: "#000849" },
          100: { value: "#001F5A" },
          200: { value: "#003C6A" },
          300: { value: "#025F7A" },
          400: { value: "#058789" },
          500: { value: "#249B86" },
          600: { value: "#44AC87" },
          700: { value: "#66BC8D" },
          800: { value: "#88CC99" },
          900: { value: "#AADBAC" },
          950: { value: "#CEEACC" },
        },
        // light mode text, body text
        subduedCrystal: {
          50: { value: "#242916" },
          100: { value: "#31331C" },
          200: { value: "#3D3922" },
          300: { value: "#473C28" },
          400: { value: "#503d2e" },
          500: { value: "#685149" },
          600: { value: "#806765" },
          700: { value: "#978183" },
          800: { value: "#AE9CA2" },
          900: { value: "#C6B8BF" },
          950: { value: "#DDD5DA" },
        },
        // accent options and headings
        flamingoGold: {
          50: { value: "#657107" },
          100: { value: "#8B7E0A" },
          200: { value: "#A5760F" },
          300: { value: "#BD6414" },
          400: { value: "#d54b1a" },
          500: { value: "#DD4336" },
          600: { value: "#E55363" },
          700: { value: "#EB7095" },
          800: { value: "#F18EBE" },
          900: { value: "#F6AEDE" },
          950: { value: "#FACEF4" },
        },
        boldTangerine: {
          50: { value: "#437811" },
          100: { value: "#6E9418" },
          200: { value: "#A2AF1F" },
          300: { value: "#C9B626" },
          400: { value: "#e3a72f" },
          500: { value: "#E99648" },
          600: { value: "#EF8C62" },
          700: { value: "#F48A7D" },
          800: { value: "#F898A0" },
          900: { value: "#FBB5C7" },
          950: { value: "#FDD2E5" },
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
            _light: "{colors.softOchre.400}",
            _dark: "{colors.voidNavy.900}",
          },
        },
        "bg.subtle": {
          value: {
            _light: "{colors.softOchre.100}",
            _dark: "{colors.voidNavy.800}",
          },
        },
        "bg.muted": {
          value: {
            _light: "{colors.softOchre.200}",
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
            _light: "{colors.duneSand.300}",
            _dark: "{colors.voidNavy.800}",
          },
        },

        // Text colors — tuned for AA contrast on the bg tokens above
        fg: {
          value: {
            _light: "{colors.subduedCrystal.400}",
            _dark: "{colors.softOchre.500}",
          },
        },
        "fg.muted": {
          value: {
            _light: "{colors.subduedCrystal.800}",
            _dark: "{colors.softOchre.300}",
          },
        },
        "fg.subtle": {
          value: {
            _light: "{colors.subduedCrystal.700}",
            _dark: "{colors.softOchre.400}",
          },
        },
        "fg.inverted": {
          value: {
            _light: "{colors.subduedCrystal.50}",
            _dark: "{colors.sapphireWool.700}",
          },
        },

        // Borders
        border: {
          value: {
            _light: "{colors.flamingoGold.400}",
            _dark: "{colors.voidNavy.700}",
          },
        },
        "border.muted": {
          value: {
            _light: "{colors.flamingoGold.300}",
            _dark: "{colors.voidNavy.800}",
          },
        },
        "border.subtle": {
          value: {
            _light: "{colors.sapphireWool.200}",
            _dark: "{colors.voidNavy.700}",
          },
        },
        "border.emphasized": {
          value: {
            _light: "{colors.sapphireWool.200}",
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
          solid: { value: "{colors.flamingoGold.500}" },
          contrast: { value: "{colors.duneSand.300}" },
          fg: {
            value: {
              _light: "{colors.softOchre.400}",
              _dark: "{colors.flamingoGold.400}",
            },
          },
          muted: { value: "{colors.flamingoGold.400}" },
          subtle: { value: "{colors.flamingoGold.700}" },
          emphasized: { value: "{colors.flamingoGold.300}" },
          focusRing: { value: "{colors.flamingoGold.300}" },
        },
        // Primary (gold) semantic mapping for colorPalette="ridgeGold"
        // ridgeGold: {
        //   solid: { value: "{colors.ridgeGold.600}" },
        //   contrast: { value: "{colors.duneSand.50}" },
        //   fg: {
        //     value: {
        //       _light: "{colors.ridgeGold.800}",
        //       _dark: "{colors.ridgeGold.200}",
        //     },
        //   },
        //   muted: { value: "{colors.ridgeGold.100}" },
        //   subtle: { value: "{colors.ridgeGold.200}" },
        //   emphasized: { value: "{colors.ridgeGold.300}" },
        //   focusRing: { value: "{colors.ridgeGold.500}" },
        // },
        sapphireWool: {
          solid: { value: "{colors.sapphireWool.400}" },
          contrast: { value: "{colors.duneSand.300}" },
          fg: {
            value: {
              _light: "{colors.sapphireWool.500}",
              _dark: "{colors.sapphireWool.500}",
            },
          },
          muted: { value: "{colors.sapphireWool.200}" },
          subtle: { value: "{colors.sapphireWool.700}" },
          emphasized: { value: "{colors.sapphireWool.400}" },
          focusRing: { value: "{colors.sapphireWool.500}" },
        },
        // Secondary (teal) mapping for colorPalette="driftTeal"
        // driftTeal: {
        //   solid: { value: "{colors.driftTeal.600}" },
        //   contrast: { value: "{colors.duneSand.50}" },
        //   fg: {
        //     value: {
        //       _light: "{colors.driftTeal.800}",
        //       _dark: "{colors.driftTeal.200}",
        //     },
        //   },
        //   muted: { value: "{colors.driftTeal.100}" },
        //   subtle: { value: "{colors.driftTeal.200}" },
        //   emphasized: { value: "{colors.driftTeal.300}" },
        //   focusRing: { value: "{colors.driftTeal.500}" },
        // },
      },
    },
  },
});

export const ridgeSystem = createSystem(defaultConfig, config);

export type RidgeSystem = typeof ridgeSystem;
