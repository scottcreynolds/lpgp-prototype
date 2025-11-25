import { Box, Text } from "@chakra-ui/react";
import type { GamePhase } from "../lib/database.types";

interface Props {
  phase: GamePhase;
  warningMessage?: string;
}

export function PhaseFooter({ phase, warningMessage }: Props) {
  return (
    <Box
      mt={6}
      pt={4}
      borderTopWidth={1}
      borderColor="border"
      minH="64px"
      data-phase-messages
      aria-live="polite"
      bg="boldTangerine.contrast"
      fontSize="sm"
    >
      {phase === "Operations" && (
        <Text color="fg" fontSize="sm">
          Go to the Player Dashboard to build your inventory!
        </Text>
      )}
      {warningMessage && (
        <Text color="fg" fontSize="sm">
          {warningMessage}
        </Text>
      )}
    </Box>
  );
}
