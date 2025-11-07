"use client";

import type { IconButtonProps } from "@chakra-ui/react";
import { Box, ClientOnly, IconButton, Skeleton } from "@chakra-ui/react";
import type { ThemeProviderProps } from "next-themes";
import { ThemeProvider, useTheme } from "next-themes";
import * as React from "react";
import { LuMoon, LuSun } from "react-icons/lu";

export type ColorModeProviderProps = ThemeProviderProps;

// Root wrapper that applies the chakra theme class based on resolved theme.
function ThemeRoot({ children }: { children?: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  return (
    <ClientOnly fallback={<>{children}</>}>
      <Box
        className={`chakra-theme ${
          resolvedTheme === "dark" ? "dark" : "light"
        }`}
        data-color-scheme={resolvedTheme === "dark" ? "dark" : "light"}
      >
        {children}
      </Box>
    </ClientOnly>
  );
}

export function ColorModeProvider(props: ColorModeProviderProps) {
  return (
    <ThemeProvider attribute="class" disableTransitionOnChange {...props}>
      <ThemeRoot>{props.children}</ThemeRoot>
    </ThemeProvider>
  );
}

type ColorMode = "light" | "dark";

function useColorModeInternal() {
  const { resolvedTheme, setTheme, forcedTheme } = useTheme();
  const colorMode = (forcedTheme || resolvedTheme) as ColorMode;
  const toggleColorMode = () =>
    setTheme(colorMode === "dark" ? "light" : "dark");
  return { colorMode, toggleColorMode } as const;
}

export function ColorModeIcon() {
  const { colorMode } = useColorModeInternal();
  return colorMode === "dark" ? <LuMoon /> : <LuSun />;
}

type ColorModeButtonProps = Omit<IconButtonProps, "aria-label">;

export const ColorModeButton = React.forwardRef<
  HTMLButtonElement,
  ColorModeButtonProps
>(function ColorModeButton(props, ref) {
  const { toggleColorMode } = useColorModeInternal();
  return (
    <ClientOnly fallback={<Skeleton boxSize="9" />}>
      <IconButton
        onClick={toggleColorMode}
        variant="ghost"
        aria-label="Toggle color mode"
        size="sm"
        ref={ref}
        {...props}
        css={{
          _icon: {
            width: "5",
            height: "5",
          },
        }}
      >
        <ColorModeIcon />
      </IconButton>
    </ClientOnly>
  );
});
