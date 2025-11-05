import { Box, Button, Flex, Heading, HStack, Text } from "@chakra-ui/react";
import { useAdvancePhase } from "../hooks/useGameData";
import type { GamePhase } from "../lib/database.types";
import { PhaseTimer } from "./PhaseTimer";
import { toaster } from "./ui/toaster";

interface GameStateDisplayProps {
  round: number;
  phase: GamePhase;
  version: number;
}

export function GameStateDisplay({
  round,
  phase,
  version,
}: GameStateDisplayProps) {
  const advancePhase = useAdvancePhase();

  const handleAdvancePhase = async () => {
    try {
      const result = await advancePhase.mutateAsync();
      toaster.create({
        title: "Phase Advanced",
        description: `Now in Round ${result.new_round} - ${result.new_phase} Phase`,
        type: "success",
        duration: 3000,
      });
    } catch (error) {
      toaster.create({
        title: "Failed to Advance",
        description:
          error instanceof Error
            ? error.message
            : "Failed to advance phase - please try again",
        type: "error",
        duration: 5000,
      });
    }
  };

  return (
    <Box
      bg="white"
      p={6}
      borderRadius="lg"
      borderWidth={1}
      borderColor="gray.200"
      shadow="sm"
    >
      <Flex justify="space-between" align="flex-start" flexWrap="wrap" gap={4}>
        <Box flex="1" minW="300px">
          <Heading size="xl" mb={2} color="gray.900">
            Round {round} - {phase} Phase
          </Heading>
          <Text color="gray.700" fontSize="sm" fontWeight="medium">
            Version: {version}
          </Text>
        </Box>

        <HStack gap={4} flexShrink={0}>
          <PhaseTimer round={round} phase={phase} />

          <Button
            onClick={handleAdvancePhase}
            loading={advancePhase.isPending}
            colorPalette="blue"
            size="lg"
          >
            Next Phase
          </Button>
        </HStack>
      </Flex>
    </Box>
  );
}
