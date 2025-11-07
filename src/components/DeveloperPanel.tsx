import { Accordion, Box, Heading, Text } from "@chakra-ui/react";
import DevHarness from "./DevHarness";
import GamesAdminButton from "./GamesAdminButton";
import ThemePreview from "./ThemePreview";

export default function DeveloperPanel() {
  // Only show in development (regardless of backend)
  if (!import.meta.env.DEV) return null;

  return (
    <Box mt={10}>
      <Accordion.Root collapsible defaultValue={["developer"]}>
        <Accordion.Item value="developer">
          <Accordion.ItemTrigger>
            <Box as="span" flex="1" textAlign="left">
              <Heading size="sm">Developer</Heading>
              <Text fontSize="xs" color="fg.muted">
                Dev tools (some sections only show in mock mode)
              </Text>
            </Box>
            <Accordion.ItemIndicator />
          </Accordion.ItemTrigger>
          <Accordion.ItemContent>
            <Accordion.ItemBody>
              <ThemePreview />
              <DevHarness />
              <Box mt={4}>
                <Heading size="xs" mb={2}>
                  Admin
                </Heading>
                <GamesAdminButton inline />
              </Box>
            </Accordion.ItemBody>
          </Accordion.ItemContent>
        </Accordion.Item>
      </Accordion.Root>
    </Box>
  );
}
