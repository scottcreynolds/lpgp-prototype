import { Box, Button, Flex, Heading, Stack, Text } from "@chakra-ui/react";
import { useMemo } from "react";
import {
  useAddPlayer,
  useAdvancePhase,
  useAdvanceRound,
} from "../hooks/useGameData";
import type {
  DashboardPlayer,
  GamePhase,
  Specialization,
} from "../lib/database.types";
import { AddPlayerModal } from "./AddPlayerModal";
import { CreateContractModal } from "./CreateContractModal";
import { PhaseTimer } from "./PhaseTimer";
import { toaster } from "./ui/toasterInstance";

interface GameStateDisplayProps {
  round: number;
  phase: GamePhase;
  version: number; // retained for optimistic operations elsewhere
  players?: DashboardPlayer[];
}

export function GameStateDisplay({
  round,
  phase,
  players,
}: GameStateDisplayProps) {
  const advancePhase = useAdvancePhase();
  const advanceRound = useAdvanceRound();
  const addPlayer = useAddPlayer();

  // Setup phase button enable + warning logic
  const { canBeginRound1, warningMessage } = useMemo(() => {
    if (phase !== "Setup" || !players) {
      return { canBeginRound1: true, warningMessage: "" };
    }
    const specs = players.map((p) => p.specialization);
    const hasPlayers = specs.length > 0;
    const hasInfrastructureProvider = specs.includes("Infrastructure Provider");
    const distinctCount = new Set(specs).size;
    const hasMultipleTypes = distinctCount > 1;
    const canStart =
      hasPlayers && (hasInfrastructureProvider || hasMultipleTypes);
    const warn = canStart
      ? ""
      : "You must either have a player specialize as Infrastructure Provider or have more than one type of player specialization chosen in order to build all infrastructure types";
    return { canBeginRound1: canStart, warningMessage: warn };
  }, [phase, players]);

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
      bg="bg.panel"
      p={6}
      borderRadius="lg"
      borderWidth={1}
      borderColor="border.emphasized"
      shadow="sm"
      mx="auto"
    >
      <Heading size="lg" mb={4} color="fg.emphasized">
        Game Status
      </Heading>
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
            <Text color="fg" fontSize="sm" fontWeight="medium" mb={1}>
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
          {phase === "Setup" && (
            <Box mt={3} color="fg" fontSize="sm" lineHeight={1.4}>
              <Text mb={1} fontWeight="medium">
                During Setup:
              </Text>
              <Box as="ol" pl={5} style={{ listStyle: "decimal" }}>
                <Box as="li">Choose your player name.</Box>
                <Box as="li">Select your specialization.</Box>
                <Box as="li">
                  Review starter infrastructure and plan your first two rounds.
                </Box>
              </Box>
              <Text mt={2}>
                When everyone is ready, click “Begin Round 1” to enter the
                Governance phase.
              </Text>
            </Box>
          )}
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
        {phase === "Governance" && players && (
          <CreateContractModal
            players={players}
            currentRound={round}
            disabled={false}
          />
        )}

        {/* Add Player Button (only during Setup) */}
        {phase === "Setup" && (
          <AddPlayerModal
            onAddPlayer={handleAddPlayer}
            isPending={addPlayer.isPending}
          />
        )}

        {/* Spacer to push next button to the right on desktop */}
        <Box flex={{ base: "0", md: "1" }} />

        {/* Next Phase / Advance Round - always rightmost */}
        {phase === "Operations" ? (
          <Button
            onClick={handleAdvanceRound}
            loading={advanceRound.isPending}
            colorPalette="flamingoGold"
            size="lg"
            width={{ base: "full", md: "auto" }}
          >
            Advance Round
          </Button>
        ) : (
          <Button
            onClick={handleAdvancePhase}
            loading={advancePhase.isPending}
            colorPalette="sapphireWool"
            size="lg"
            width={{ base: "full", md: "auto" }}
            disabled={phase === "Setup" && !canBeginRound1}
          >
            {phase === "Setup" ? "Begin Round 1" : "Next Phase"}
          </Button>
        )}
      </Stack>

      {/* Footer message area (errors / warnings / future dynamic content) */}
      <Box
        mt={6}
        pt={4}
        borderTopWidth={1}
        borderColor="border"
        minH="64px"
        data-phase-messages
        aria-live="polite"
        color="fg"
        fontSize="sm"
      >
        {warningMessage && (
          <Text color="fg" fontSize="sm">
            {warningMessage}
          </Text>
        )}
      </Box>
    </Box>
  );
}
