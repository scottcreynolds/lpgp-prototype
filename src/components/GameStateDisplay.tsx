import {
  Box,
  Button,
  Flex,
  Heading,
  IconButton,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useState } from "react";
import { FiInfo } from "react-icons/fi";
import { useAdvancePhase, useAdvanceRound, useAddPlayer } from "../hooks/useGameData";
import type { DashboardPlayer, GamePhase, Specialization } from "../lib/database.types";
import { AddPlayerModal } from "./AddPlayerModal";
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
  const addPlayer = useAddPlayer();
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

  const handleAddPlayer = async (
    name: string,
    specialization: Specialization
  ) => {
    try {
      await addPlayer.mutateAsync({ name, specialization });
      toaster.create({
        title: "Player Added",
        description: `${name} joined as ${specialization}`,
        type: "success",
        duration: 3000,
      });
    } catch (error) {
      toaster.create({
        title: "Failed to Add Player",
        description:
          error instanceof Error ? error.message : "Failed to add player",
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
      maxW={{ base: "full", lg: "4xl" }}
      mx="auto"
    >
      {/* Top Row: Two columns */}
      <Flex
        justify="space-between"
        align="flex-start"
        flexWrap={{ base: "wrap", md: "nowrap" }}
        gap={4}
        mb={4}
      >
        {/* Left Column: Round/Status Info */}
        <Box flex="1" minW={{ base: "full", md: "300px" }}>
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

        {/* Right Column: Timer */}
        <Box flexShrink={0}>
          {phase !== "Setup" && <PhaseTimer round={round} phase={phase} />}
        </Box>
      </Flex>

      {/* Action Row */}
      <Stack
        direction={{ base: "column", md: "row" }}
        justify="flex-start"
        align={{ base: "stretch", md: "center" }}
        gap={3}
      >
        {phase === "Setup" && (
          <IconButton
            aria-label="Setup tips"
            onClick={() => setTipsOpen(true)}
            variant="subtle"
            width={{ base: "full", md: "auto" }}
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

        {/* Add Player Button */}
        <AddPlayerModal
          onAddPlayer={handleAddPlayer}
          isPending={addPlayer.isPending}
        />

        {/* Spacer to push next button to the right on desktop */}
        <Box flex={{ base: "0", md: "1" }} />

        {/* Next Phase / Advance Round - always rightmost */}
        {phase === "Operations" ? (
          <Button
            onClick={handleAdvanceRound}
            loading={advanceRound.isPending}
            colorPalette="blue"
            size="lg"
            width={{ base: "full", md: "auto" }}
          >
            Advance Round
          </Button>
        ) : (
          <Button
            onClick={handleAdvancePhase}
            loading={advancePhase.isPending}
            colorPalette="blue"
            size="lg"
            width={{ base: "full", md: "auto" }}
          >
            {phase === "Setup" ? "Begin Round 1" : "Next Phase"}
          </Button>
        )}
      </Stack>

      {phase === "Setup" && (
        <SetupTips open={tipsOpen} onClose={() => setTipsOpen(false)} />
      )}
    </Box>
  );
}
