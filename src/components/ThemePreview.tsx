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
      <Text fontSize="xs" color="fg.muted">
        {label}
      </Text>
    </VStack>
  );
}

export function ThemePreview() {
  const { resolvedTheme } = useNextThemes();

  return (
    <Box mt={6} p={4} borderWidth="1px" borderRadius="md" bg="bg.panel">
      <Stack gap={3}>
        <Heading size="sm">Theme Preview</Heading>
        <Text color="fg.muted" fontSize="sm">
          Current mode: <b>{resolvedTheme}</b>
        </Text>
        <SimpleGrid columns={{ base: 2, md: 4 }} gap={3}>
          <Swatch label="bg" token="bg" />
          <Swatch label="bg.panel" token="bg.panel" />
          <Swatch label="ridgeGold.solid" token="ridgeGold.solid" />
          <Swatch label="driftTeal.solid" token="driftTeal.solid" />
        </SimpleGrid>
        <HStack gap={2} pt={2}>
          <Button colorPalette="ridgeGold">Primary</Button>
          <Button colorPalette="driftTeal" variant="outline">
            Secondary
          </Button>
        </HStack>
      </Stack>
    </Box>
  );
}

export default ThemePreview;
