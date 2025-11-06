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
import { useAdvancePhase, useAdvanceRound } from "../hooks/useGameData";
import type { DashboardPlayer, GamePhase } from "../lib/database.types";
import { CreateContractModal } from "./CreateContractModal";
import { PhaseTimer } from "./PhaseTimer";
import { SetupTips } from "./SetupTips.tsx";
import { toaster } from "./ui/toasterInstance";

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
  const advanceRound = useAdvanceRound();
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

  const handleAdvanceRound = async () => {
    try {
      const result = await advanceRound.mutateAsync();
      toaster.create({
        title: "Round Advanced",
        description: `Advanced to Round ${result.new_round} - ${result.new_phase} Phase`,
        type: "success",
        duration: 3000,
      });
    } catch (error) {
      toaster.create({
        title: "Failed to Advance Round",
        description:
          error instanceof Error
            ? error.message
            : "Failed to advance round - please try again",
        type: "error",
        duration: 5000,
      });
    }
  };

  return (
    <Box
      bg="bg"
      p={6}
      borderRadius="lg"
      borderWidth={1}
      borderColor="border"
      shadow="sm"
    >
      <Flex justify="space-between" align="flex-start" flexWrap="wrap" gap={4}>
        <Box flex="1" minW="300px">
          <Heading size="xl" mb={1} color="fg">
            {phase === "Setup" ? (
              <>Setup Phase</>
            ) : (
              <>
                Round {round} - {phase} Phase
              </>
            )}
          </Heading>
          {/* Highest Rep label */}
          {players && players.length > 0 && phase !== "Setup" && (
            <Text color="fg.muted" fontSize="sm" fontWeight="medium" mb={1}>
              {(() => {
                const maxRep = Math.max(...players.map((p) => p.rep));
                const leaders = players.filter((p) => p.rep === maxRep);
                if (leaders.length === 1) {
                  return `Highest Rep: ${leaders[0].name} (first issue, tiebreak)`;
                }
                return "No High Rep Bonus Active";
              })()}
            </Text>
          )}
          <Text color="fg.muted" fontSize="sm" fontWeight="medium">
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

          {phase === "Operations" ? (
            <Button
              onClick={handleAdvanceRound}
              loading={advanceRound.isPending}
              colorPalette="blue"
              size="lg"
            >
              Advance Round
            </Button>
          ) : (
            <Button
              onClick={handleAdvancePhase}
              loading={advancePhase.isPending}
              colorPalette="blue"
              size="lg"
            >
              {phase === "Setup" ? "Begin Round 1" : "Next Phase"}
            </Button>
          )}
        </HStack>
      </Flex>

      {phase === "Setup" && (
        <SetupTips open={tipsOpen} onClose={() => setTipsOpen(false)} />
      )}
    </Box>
  );
}
