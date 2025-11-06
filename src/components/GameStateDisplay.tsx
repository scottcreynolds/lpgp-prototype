import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  IconButton,
  Text,
} from "@chakra-ui/react";
import { useState } from "react";
import { FiInfo } from "react-icons/fi";
import { useAdvancePhase } from "../hooks/useGameData";
import type { GamePhase, DashboardPlayer } from "../lib/database.types";
import { PhaseTimer } from "./PhaseTimer";
import { SetupTips } from "./SetupTips.tsx";
import { CreateContractModal } from "./CreateContractModal";
import { toaster } from "./ui/toaster";

interface GameStateDisplayProps {
  round: number;
  phase: GamePhase;
  version: number;
  players?: DashboardPlayer[];
}

export function GameStateDisplay({
  round,
  phase,
  version,
  players,
}: GameStateDisplayProps) {
  const advancePhase = useAdvancePhase();
  const [tipsOpen, setTipsOpen] = useState(true);

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
            {phase === "Setup" ? (
              <>Setup Phase</>
            ) : (
              <>
                Round {round} - {phase} Phase
              </>
            )}
          </Heading>
          <Text color="gray.700" fontSize="sm" fontWeight="medium">
            Version: {version}
          </Text>
        </Box>

        <HStack gap={4} flexShrink={0}>
          {phase !== "Setup" && <PhaseTimer round={round} phase={phase} />}

          {phase === "Setup" && (
            <IconButton
              aria-label="Setup tips"
              onClick={() => setTipsOpen(true)}
              variant="subtle"
            >
              <FiInfo />
            </IconButton>
          )}

          {phase === "Governance" && players && (
            <CreateContractModal
              players={players}
              currentRound={round}
              disabled={false}
            />
          )}

          <Button
            onClick={handleAdvancePhase}
            loading={advancePhase.isPending}
            colorPalette="blue"
            size="lg"
          >
            {phase === "Setup" ? "Begin Round 1" : "Next Phase"}
          </Button>
        </HStack>
      </Flex>

      {phase === "Setup" && (
        <SetupTips open={tipsOpen} onClose={() => setTipsOpen(false)} />
      )}
    </Box>
  );
}
