import { useGameStore } from "@/store/gameStore";
import { Box, Flex, Grid, GridItem, Heading } from "@chakra-ui/react";
import { useMemo, useState } from "react";
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
import { GameActions } from "./GameActions";
import { GameStatusInfo } from "./GameStatusInfo";
import { NewPlayerTutorialWizard } from "./NewPlayerTutorialWizard";
import { PhaseFooter } from "./PhaseFooter";
import { PhaseSummaryModal } from "./PhaseSummaryModal";
import { PhaseTimer } from "./PhaseTimer";
import { PhaseTipsPanel } from "./PhaseTipsPanel";
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
  const useTimer = useGameStore((s) => s.usePhaseTimer);

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
      const result = await addPlayer.mutateAsync({ name, specialization });
      toaster.create({
        title: "Player Added",
        description: `${name} joined as ${specialization}`,
        type: "success",
        duration: 3000,
      });
      return result.player_id;
    } catch (error) {
      toaster.create({
        title: "Failed to Add Player",
        description:
          error instanceof Error ? error.message : "Failed to add player",
        type: "error",
        duration: 5000,
      });
      return undefined;
    }
  };

  const [wizardOpen, setWizardOpen] = useState(false);

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

      <Grid
        templateColumns={{ base: "1fr", lg: "2fr 1fr" }}
        gap={6}
        alignItems="flex-start"
      >
        <GridItem>
          <Flex
            justify="space-between"
            align="flex-start"
            flexWrap={{ base: "wrap", md: "nowrap" }}
            gap={4}
            mb={4}
          >
            <GameStatusInfo
              round={round}
              phase={phase}
              players={players}
              gameEnded={gameEnded}
              victoryType={victoryType}
              winnerIds={winnerIds}
              turnOrder={turnOrder}
              onOpenPhaseSummary={() => setPhaseSummaryOpen(true)}
              warningMessage={warningMessage}
            />

            <Box flexShrink={0}>
              {useTimer && phase !== "Setup" && !gameEnded && (
                <PhaseTimer round={round} phase={phase} />
              )}
            </Box>
          </Flex>

          <GameActions
            phase={phase}
            players={players}
            round={round}
            gameEnded={gameEnded}
            advancePhasePending={advancePhase.isPending}
            advanceRoundPending={advanceRound.isPending}
            onAdvancePhase={handleAdvancePhase}
            onAdvanceRound={handleAdvanceRound}
            onAddPlayer={handleAddPlayer}
            addPlayerPending={addPlayer.isPending}
            setWizardOpen={setWizardOpen}
            canBeginRound1={canBeginRound1}
          />

          <PhaseFooter phase={phase} warningMessage={warningMessage} />
        </GridItem>

        <GridItem display="flex" flexDirection="column" gap={1}>
          <PhaseTipsPanel phase={phase} />
        </GridItem>
      </Grid>

      <PhaseSummaryModal
        phase={phase}
        open={phaseSummaryOpen}
        onOpenChange={setPhaseSummaryOpen}
      />

      <NewPlayerTutorialWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
      />
    </Box>
  );
}
