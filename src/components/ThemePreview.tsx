import {
  Box,
  Button,
  Heading,
  HStack,
  SimpleGrid,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useTheme as useNextThemes } from "next-themes";

function Swatch({ label, token }: { label: string; token: string }) {
  return (
    <VStack gap={1} align="stretch">
      <Box
        borderWidth="1px"
        borderColor="border"
        bg={token}
        h="10"
        borderRadius="md"
      />
      <Text fontSize="xs" color="fg">
        {label}
      </Text>
    </VStack>
  );
}

interface SemanticColorRowProps {
  name: string;
  colorPalette: string;
}

interface BgComboSwatchProps {
  label: string;
  bgToken: string;
  fgToken: string;
  borderToken: string;
}

function BgComboSwatch({
  label,
  bgToken,
  fgToken,
  borderToken,
}: BgComboSwatchProps) {
  return (
    <VStack gap={1} align="stretch">
      <Box
        borderWidth="2px"
        borderColor={borderToken}
        bg={bgToken}
        color={fgToken}
        h="20"
        borderRadius="md"
        display="flex"
        alignItems="center"
        justifyContent="center"
        p={2}
      >
        <Text fontSize="xs" fontWeight="medium">
          {fgToken}
        </Text>
      </Box>
      <Text fontSize="xs" color="fg">
        {label}
      </Text>
    </VStack>
  );
}

function SemanticColorRow({ name, colorPalette }: SemanticColorRowProps) {
  return (
    <VStack
      align="stretch"
      gap={2}
      p={3}
      borderWidth="1px"
      borderRadius="md"
      bg="bg.subtle"
    >
      <Text fontSize="sm" fontWeight="bold" color="fg.emphasized">
        {name}
      </Text>
      <SimpleGrid columns={{ base: 3, md: 6 }} gap={2}>
        <Swatch label="solid" token={`${colorPalette}.solid`} />
        <Swatch label="contrast" token={`${colorPalette}.contrast`} />
        <Swatch label="fg" token={`${colorPalette}.fg`} />
        <Swatch label="muted" token={`${colorPalette}.muted`} />
        <Swatch label="subtle" token={`${colorPalette}.subtle`} />
        <Swatch label="emphasized" token={`${colorPalette}.emphasized`} />
      </SimpleGrid>
      <HStack gap={2}>
        <Button size="sm" colorPalette={colorPalette}>
          Solid
        </Button>
        <Button size="sm" colorPalette={colorPalette} variant="outline">
          Outline
        </Button>
        <Button size="sm" colorPalette={colorPalette} variant="surface">
          Surface
        </Button>
        <Button size="sm" colorPalette={colorPalette} variant="ghost">
          Ghost
        </Button>
      </HStack>
    </VStack>
  );
}

export function ThemePreview() {
  const { resolvedTheme } = useNextThemes();

  return (
    <Box mt={6} p={4} borderWidth="1px" borderRadius="md" bg="bg.panel">
      <Stack gap={4}>
        <Heading size="sm">Theme Preview</Heading>
        <Text fontSize="sm">
          Current mode: <b>{resolvedTheme}</b>
        </Text>

        <VStack gap={3} align="stretch">
          <SemanticColorRow name="Flamingo Gold" colorPalette="flamingoGold" />
          <SemanticColorRow name="Sapphire Wool" colorPalette="sapphireWool" />
          <SemanticColorRow name="Soft Ochre" colorPalette="softOchre" />
          <SemanticColorRow
            name="Bold Tangerine"
            colorPalette="boldTangerine"
          />
          <SemanticColorRow
            name="Subdued Crystal"
            colorPalette="subduedCrystal"
          />
        </VStack>

        <Box>
          <Text fontSize="sm" fontWeight="bold" mb={2} color="fg.emphasized">
            Base Colors
          </Text>
          <SimpleGrid columns={{ base: 2, md: 4 }} gap={3}>
            <Swatch label="bg" token="bg" />
            <Swatch label="bg.panel" token="bg.panel" />
            <Swatch label="fg" token="fg" />
            <Swatch label="border" token="border" />
          </SimpleGrid>
        </Box>

        <Box>
          <Text fontSize="sm" fontWeight="bold" mb={2} color="fg.emphasized">
            Background Combinations
          </Text>
          <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} gap={3}>
            <BgComboSwatch
              label="bg"
              bgToken="bg"
              fgToken="fg"
              borderToken="border"
            />
            <BgComboSwatch
              label="bg.subtle"
              bgToken="bg.subtle"
              fgToken="fg"
              borderToken="border.subtle"
            />
            <BgComboSwatch
              label="bg.muted"
              bgToken="bg.muted"
              fgToken="fg.inverted"
              borderToken="border.muted"
            />
            <BgComboSwatch
              label="bg.emphasized"
              bgToken="bg.emphasized"
              fgToken="fg.inverted"
              borderToken="border.emphasized"
            />
            <BgComboSwatch
              label="bg.inverted"
              bgToken="bg.inverted"
              fgToken="fg.inverted"
              borderToken="border.inverted"
            />
            <BgComboSwatch
              label="bg.panel"
              bgToken="bg.panel"
              fgToken="fg"
              borderToken="border"
            />
          </SimpleGrid>
        </Box>
      </Stack>
    </Box>
  );
}

export default ThemePreview;
