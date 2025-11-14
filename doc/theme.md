# Retro Sci‑Fi Theme

This document explains the custom Chakra UI v3 system theme used in the project.

## Palette Overview

Nine custom color palettes (scales 50–950) provide the retro sci‑fi vibe:

| Name | Purpose | Example Hex (400/500) |
|------|---------|----------------------|
| `softOchre` | Text in dark mode, button accents | `#f0ecc9` (400) |
| `sapphireWool` | Secondary accent, interactive elements | `#058789` (400) |
| `subduedCrystal` | Light mode text, body text | `#503d2e` (400) |
| `flamingoGold` | Accent, headings, borders | `#d54b1a` (400) |
| `boldTangerine` | Warm accent, panels | `#e3a72f` (400) |
| `ridgeGold` | Primary warm gold accent | `#D7AD3D` (500) |
| `driftTeal` | Cool teal accent | `#2EA8A5` (500) |
| `voidNavy` | Dark backgrounds | `#486E9F` (500) |
| `duneSand` | Light backgrounds, panels | `#CBA55C` (500) |

Each palette has shades 50–900 (some include 950). Adjust any shade by editing `src/theme.ts`.

## Semantic Tokens

Instead of hardcoding color values in components, we rely on semantic tokens that automatically respond to light/dark mode:

### Background Tokens

- `bg` - Main application background
- `bg.subtle` - Subtle background variation
- `bg.muted` - Muted background
- `bg.emphasized` - Emphasized background (inverted)
- `bg.inverted` - Inverted background
- `bg.panel` - Panel/card backgrounds

### Foreground (Text) Tokens

- `fg` - Primary text color
- `fg.muted` - Muted/secondary text
- `fg.subtle` - Subtle text
- `fg.inverted` - Inverted text (for emphasized backgrounds)

### Border Tokens

- `border` - Default border color
- `border.muted` - Muted border
- `border.subtle` - Subtle border
- `border.emphasized` - Emphasized border
- `border.inverted` - Inverted border

### Color Palette Semantic Groups

Each of these palettes has semantic tokens (`solid`, `contrast`, `fg`, `muted`, `subtle`, `emphasized`, `focusRing`):

- `flamingoGold.*` - Warm orange-gold accent
- `sapphireWool.*` - Cool teal-cyan accent
- `boldTangerine.*` - Warm yellow-orange accent
- `subduedCrystal.*` - Earthy brown tones
- `softOchre.*` - Soft cream-yellow tones

Use them via Chakra props: `bg="bg.panel"`, `color="fg.muted"`, `borderColor="border"`, `colorPalette="flamingoGold"`.

## Light & Dark Mode

Mode switching uses `next-themes` with a system default. The color mode toggle is in `DashboardHeader` using `<ColorModeButton />`.

### Light Mode Colors

- Background: `softOchre.400`
- Text: `subduedCrystal.400`
- Borders: `flamingoGold.400`
- Panels: `boldTangerine.200`

### Dark Mode Colors

- Background: `voidNavy.900`
- Text: `softOchre.500`
- Borders: `voidNavy.700`
- Panels: `voidNavy.800`

## Editing the Theme

1. Open `src/theme.ts`.
2. Adjust hex values inside the palette objects.
3. (Optional) Update semantic token mappings if you change palette relationships.
4. Run Chakra type generation for improved autocomplete:

```bash
npx -y @chakra-ui/cli typegen src/theme.ts
```

This creates a `chakra.d.ts` declaration file so custom palettes & tokens are typed.

## Adding a New Palette

1. Add a new object under `tokens.colors` with your 50–950 shades.
2. Add matching semantic token group with the keys: `solid`, `contrast`, `fg`, `muted`, `subtle`, `emphasized`, `focusRing`.
3. Use it in components via `colorPalette="yourName"`.

## Accessibility

Foreground (`fg`, `fg.muted`) values were chosen to meet WCAG AA contrast against their paired backgrounds (`bg`, `bg.panel`). If you adjust colors, verify contrast (target ratio ≥ 4.5:1 for normal text) using tools like the Stark plugin or web-based contrast checkers.

## Quick Reference

| Component Intent | Recommended Token |
|------------------|-------------------|
| App background | `bg` |
| Card / panel | `bg.panel` |
| Heading text | `fg` |
| Secondary text | `fg.muted` |
| Border | `border` |
| Primary button | `colorPalette="flamingoGold"` |
| Secondary button | `colorPalette="sapphireWool"` |
| Warm accent | `colorPalette="boldTangerine"` |
| Emphasis background | `bg.emphasized` |

## Typography

Headings use the **Orbitron** font family for a retro sci-fi aesthetic.

## Theme Preview

View all color palettes and semantic tokens in action at `/dev-harness` using the `<ThemePreview />` component, which displays:

- All semantic color palettes with their variants
- Background combination swatches showing how bg, fg, and border tokens work together
- Button variants for each color palette

## Future Ideas

- Add a `warningAmber` palette for alerts.
- Introduce motion tokens (gentle solar flare focus animation) for focus states.
- Create layerStyles for common container patterns.

---
Feel free to iterate; keep palettes small and semantic tokens stable so downstream components stay resilient.
