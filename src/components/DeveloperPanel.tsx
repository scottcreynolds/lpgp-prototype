import { Box, Heading } from "@chakra-ui/react";
import DevHarness from "./DevHarness";
import GamesAdminButton from "./GamesAdminButton";
import ThemePreview from "./ThemePreview";

export default function DeveloperPanel() {
  // Only show in development (regardless of backend)
  // if (!import.meta.env.DEV) return null;

  return (
    <Box mt={10}>
      <ThemePreview />
      <DevHarness />
      <Heading size="xs" mb={2}>
        Admin
      </Heading>
      <GamesAdminButton inline />
    </Box>
  );
}
