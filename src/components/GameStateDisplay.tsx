import { useGameStore } from "@/store/gameStore";
import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  Icon,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { LuInfo } from "react-icons/lu";
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
import { PhaseSummaryModal } from "./PhaseSummaryModal";
import { PhaseTimer } from "./PhaseTimer";
import { PhaseTipsPanel } from "./PhaseTipsPanel";
import { TurnOrderModal } from "./TurnOrderModal";
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
  const turnOrder = useGameStore((s) => s.operationsTurnOrder[round]);
  const gameEnded = useGameStore((s) => s.gameEnded);
  const victoryType = useGameStore((s) => s.victoryType);
  const winnerIds = useGameStore((s) => s.winnerIds);

  const [phaseSummaryOpen, setPhaseSummaryOpen] = useState(false);

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
        {gameEnded ? "Game Ended" : "Game Status"}
      </Heading>
      {/* Main content split: 2/3 game status meta + 1/3 tips panel */}
      <Grid
        templateColumns={{ base: "1fr", lg: "2fr 1fr" }}
        gap={6}
        alignItems="flex-start"
      >
        <GridItem>
          {/* Top Row: Two columns still inside left area */}
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
                {gameEnded ? (
                  <>
                    Game Ended –{" "}
                    {(() => {
                      if (victoryType === "cooperative")
                        return "Cooperative Victory";
                      if (victoryType === "tiebreaker")
                        return "Tiebreaker Victory";
                      if (victoryType === "single") return "Victory";
                      return "Victory";
                    })()}
                  </>
                ) : phase === "Setup" ? (
                  <HStack align="center" gap={2}>
                    <Text>Setup Phase</Text>
                    <Icon
                      as={LuInfo}
                      cursor="pointer"
                      onClick={() => setPhaseSummaryOpen(true)}
                      fontSize="lg"
                      color="fg"
                    />
                  </HStack>
                ) : (
                  <HStack align="center" gap={2}>
                    <Text>
                      Round {round} - {phase} Phase
                    </Text>
                    <Icon
                      as={LuInfo}
                      cursor="pointer"
                      onClick={() => setPhaseSummaryOpen(true)}
                      fontSize="lg"
                      color="fg"
                    />
                  </HStack>
                )}
              </Heading>
              {gameEnded && players && winnerIds.length > 0 && (
                <Text color="fg" fontSize="sm" fontWeight="medium" mb={2}>
                  Winner{winnerIds.length > 1 ? "s" : ""}:{" "}
                  {players
                    .filter((p) => winnerIds.includes(p.id))
                    .map((p) => p.name)
                    .join(", ")}
                </Text>
              )}
              {/* Highest Rep label */}
              {players && players.length > 0 && phase !== "Setup" && (
                <Text color="fg" fontSize="sm" fontWeight="bold" mb={1}>
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
              {/* Operations Phase Turn Order (single-line) */}
              {phase === "Operations" && turnOrder && turnOrder.length > 0 && (
                <Box>
                  <Heading size="sm" mb={1} color="fg.emphasized">
                    Turn Order:
                  </Heading>
                  <Text color="fg" fontSize="sm" mb={1}>
                    {turnOrder
                      .map((name, idx) => `${idx + 1}. ${name}`)
                      .join(", ")}
                  </Text>
                </Box>
              )}
              {phase === "Setup" && (
                <Box mt={3} color="fg" fontSize="sm" lineHeight={1.4}>
                  <Text mb={1} fontWeight="medium">
                    During Setup:
                  </Text>
                  <Box as="ol" pl={5} style={{ listStyle: "decimal" }}>
                    <Box as="li">
                      Choose one player to act as game facilitator to advance
                      game state and keep time.
                    </Box>
                    <Box as="li">
                      Place the initial resource tokens on the board.
                    </Box>
                    <Box as="li">
                      Choose your player name and specialization with the ADD
                      PLAYER button.
                    </Box>
                    <Box as="li">
                      Place your starter infrastructure on the board.
                    </Box>
                    <Box as="li">
                      Review your player card and start planning your strategy.
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
              {phase !== "Setup" && !gameEnded && (
                <PhaseTimer round={round} phase={phase} />
              )}
            </Box>
          </Flex>

          {/* Action Row */}
          <Stack
            direction={{ base: "column", md: "row" }}
            justify="flex-start"
            align={{ base: "stretch", md: "center" }}
            gap={3}
          >
            {phase === "Governance" && players && !gameEnded && (
              <CreateContractModal
                players={players}
                currentRound={round}
                disabled={gameEnded}
              />
            )}

            {/* Add Player Button (only during Setup) */}
            {phase === "Setup" && !gameEnded && (
              <AddPlayerModal
                onAddPlayer={handleAddPlayer}
                isPending={addPlayer.isPending}
              />
            )}

            {/* Generate Turn Order (only during Operations and when none yet) */}
            {phase === "Operations" && players && !gameEnded && (
              <TurnOrderModal players={players} round={round} />
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
                disabled={gameEnded}
              >
                Advance Round
              </Button>
            ) : (
              <Button
                onClick={handleAdvancePhase}
                loading={advancePhase.isPending}
                colorPalette="flamingoGold"
                size="lg"
                width={{ base: "full", md: "auto" }}
                disabled={(phase === "Setup" && !canBeginRound1) || gameEnded}
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
            // color="fg"
            bg="boldTangerine.contrast"
            fontSize="sm"
          >
            {warningMessage && (
              <Text color="fg" fontSize="sm">
                {warningMessage}
              </Text>
            )}
          </Box>
        </GridItem>

        {/* Tips Panel in right column */}
        <GridItem display="flex" flexDirection="column" gap={4}>
          <PhaseTipsPanel phase={phase} />
        </GridItem>
      </Grid>

      <PhaseSummaryModal
        phase={phase}
        open={phaseSummaryOpen}
        onOpenChange={setPhaseSummaryOpen}
      />
    </Box>
  );
}
