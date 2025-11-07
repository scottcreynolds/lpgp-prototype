import { isMockSupabase } from "@/lib/supabase";
import { Accordion, Box, Heading, Text } from "@chakra-ui/react";
import DevHarness from "./DevHarness";

export default function DeveloperPanel() {
  // Only show in development and when using the mock backend
  if (!import.meta.env.DEV || !isMockSupabase) return null;

  return (
    <Box mt={10}>
      <Accordion.Root collapsible defaultValue={["developer"]}>
        <Accordion.Item value="developer">
          <Accordion.ItemTrigger>
            <Box as="span" flex="1" textAlign="left">
              <Heading size="sm">Developer</Heading>
              <Text fontSize="xs" color="fg.muted">
                Mock-only tools and simulations
              </Text>
            </Box>
            <Accordion.ItemIndicator />
          </Accordion.ItemTrigger>
          <Accordion.ItemContent>
            <Accordion.ItemBody>
              <DevHarness />
            </Accordion.ItemBody>
          </Accordion.ItemContent>
        </Accordion.Item>
      </Accordion.Root>
    </Box>
  );
}
