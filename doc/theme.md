# Retro Sci‑Fi Theme

This document explains the custom Chakra UI v3 system theme used in the project.

## Palette Overview

Four custom color palettes (scales 50–950) provide the retro sci‑fi vibe:

| Name | Purpose | Example Hex (500) |
|------|---------|------------------|
| `ridgeGold` | Primary accent (buttons, highlights) | `#D7AD3D` |
| `driftTeal` | Secondary accent (interactive, focus) | `#2EA8A5` |
| `voidNavy` | Dark surfaces & backgrounds | `#486E9F` |
| `duneSand` | Light surfaces & backgrounds | `#CBA55C` |

Each palette has shades 50–950. Adjust any shade by editing `src/theme.ts`.

## Semantic Tokens

Instead of hardcoding color values in components, we rely on semantic tokens that automatically respond to light/dark mode:

- `bg`, `bg.subtle`, `bg.panel`, etc.
- `fg`, `fg.muted`, `fg.subtle`, `fg.inverted`
- `border`, `border.subtle`, `border.emphasized`
- Accent semantic groups: `ridgeGold.*` and `driftTeal.*` (`solid`, `contrast`, `fg`, `muted`, `subtle`, `emphasized`, `focusRing`).

Use them via Chakra props: `bg="bg.panel"`, `color="fg.muted"`, `borderColor="border"`, `colorPalette="ridgeGold"`.

## Light & Dark Mode

Mode switching uses `next-themes` with a system default. The color mode toggle is in `DashboardHeader` using `<ColorModeButton />`.

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
| Primary button | `colorPalette="ridgeGold"` |
| Secondary button | `colorPalette="driftTeal"` |
| Emphasis background | `bg.emphasized` |

## Future Ideas

- Add a `warningAmber` palette for alerts.
- Introduce motion tokens (gentle solar flare focus animation) for focus states.
- Create layerStyles for common container patterns.

---
Feel free to iterate; keep palettes small and semantic tokens stable so downstream components stay resilient.
