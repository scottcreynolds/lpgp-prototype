import { Box, Button, Stack } from "@chakra-ui/react";
import type {
  DashboardPlayer,
  GamePhase,
  Specialization,
} from "../lib/database.types";
import { AddPlayerModal } from "./AddPlayerModal";
import { CreateContractModal } from "./CreateContractModal";
import { TurnOrderModal } from "./TurnOrderModal";

interface Props {
  phase: GamePhase;
  players?: DashboardPlayer[];
  round: number;
  gameEnded: boolean;
  advancePhasePending: boolean;
  advanceRoundPending: boolean;
  onAdvancePhase: () => Promise<void>;
  onAdvanceRound: () => Promise<void>;
  onAddPlayer: (
    name: string,
    specialization: Specialization
  ) => Promise<string | undefined>;
  addPlayerPending: boolean;
  setWizardOpen: (v: boolean) => void;
  canBeginRound1?: boolean;
}

export function GameActions({
  phase,
  players,
  round,
  gameEnded,
  advancePhasePending,
  advanceRoundPending,
  onAdvancePhase,
  onAdvanceRound,
  onAddPlayer,
  addPlayerPending,
  setWizardOpen,
  canBeginRound1,
}: Props) {
  return (
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

      {phase === "Setup" && !gameEnded && (
        <>
          <Button
            colorPalette="flamingoGold"
            variant="solid"
            onClick={() => setWizardOpen(true)}
          >
            New Player Walkthrough
          </Button>
          <AddPlayerModal
            onAddPlayer={onAddPlayer}
            isPending={addPlayerPending}
          />
        </>
      )}

      {phase === "Operations" && players && !gameEnded && (
        <TurnOrderModal players={players} round={round} />
      )}

      <Box flex={{ base: "0", md: "1" }} />

      {phase === "Operations" ? (
        <Button
          onClick={() => onAdvanceRound()}
          loading={advanceRoundPending}
          colorPalette="flamingoGold"
          size="lg"
          width={{ base: "full", md: "auto" }}
          disabled={gameEnded}
        >
          Advance Round
        </Button>
      ) : (
        <Button
          onClick={() => onAdvancePhase()}
          loading={advancePhasePending}
          colorPalette="flamingoGold"
          size="lg"
          width={{ base: "full", md: "auto" }}
          disabled={(phase === "Setup" && !canBeginRound1) || gameEnded}
        >
          {phase === "Setup" ? "Begin Round 1" : "Next Phase"}
        </Button>
      )}
    </Stack>
  );
}
