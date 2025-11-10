"use client";

import { ridgeSystem } from "@/theme";
import { ChakraProvider } from "@chakra-ui/react";
import type { PropsWithChildren } from "react";
import { ColorModeProvider, type ColorModeProviderProps } from "./color-mode";

export function Provider({
  children,
  ...rest
}: PropsWithChildren & Partial<ColorModeProviderProps>) {
  return (
    <ChakraProvider value={ridgeSystem}>
      {/* Use next-themes to manage system/light/dark and apply chakra-theme class */}
      <ColorModeProvider defaultTheme="light" enableSystem {...rest}>
        {children}
      </ColorModeProvider>
    </ChakraProvider>
  );
}
