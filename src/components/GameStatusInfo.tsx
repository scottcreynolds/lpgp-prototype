import { gameSettings } from "@/config/gameSettings";
import { Box, Heading, HStack, Icon, Text } from "@chakra-ui/react";
import { LuInfo } from "react-icons/lu";
import type { DashboardPlayer, GamePhase } from "../lib/database.types";

interface Props {
  round: number;
  phase: GamePhase;
  players?: DashboardPlayer[];
  gameEnded: boolean;
  victoryType: string | null;
  winnerIds: string[];
  turnOrder?: string[];
  onOpenPhaseSummary: () => void;
  warningMessage?: string;
}

export function GameStatusInfo({
  round,
  phase,
  players,
  gameEnded,
  winnerIds,
  turnOrder,
  onOpenPhaseSummary,
  warningMessage,
}: Props) {
  return (
    <Box flex="1" minW={{ base: "full", md: "300px" }}>
      <Heading size="xl" mb={1} color="fg">
        {gameEnded ? (
          "Game Ended"
        ) : phase === "Setup" ? (
          <HStack align="center" gap={2}>
            <Text>Setup Phase</Text>
            <Icon
              as={LuInfo}
              cursor="pointer"
              onClick={onOpenPhaseSummary}
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
              onClick={onOpenPhaseSummary}
              fontSize="lg"
              color="fg"
            />
          </HStack>
        )}
      </Heading>

      <Text color="fg" fontSize="sm" mb={2}>
        {(() => {
          const parts: string[] = [];
          const { evThreshold, repThreshold, combinedThreshold } =
            gameSettings.win;
          if (evThreshold && evThreshold > 0) parts.push(`EV ≥ ${evThreshold}`);
          if (repThreshold && repThreshold > 0)
            parts.push(`REP ≥ ${repThreshold}`);
          if (combinedThreshold && combinedThreshold > 0)
            parts.push(`EV+REP ≥ ${combinedThreshold}`);
          return `Win Conditions: ${parts.join("; ")}`;
        })()}
      </Text>

      {gameEnded && players && winnerIds.length > 0 && (
        <Text color="fg" fontSize="sm" fontWeight="medium" mb={2}>
          Winner{winnerIds.length > 1 ? "s" : ""}:{" "}
          {players
            .filter((p) => winnerIds.includes(p.id))
            .map((p) => p.name)
            .join(", ")}
        </Text>
      )}

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

      {phase === "Operations" && turnOrder && turnOrder.length > 0 && (
        <Box>
          <Heading size="sm" mb={1} color="fg.emphasized">
            Turn Order:
          </Heading>
          <Text color="fg" fontSize="sm" mb={1}>
            {turnOrder.map((name, idx) => `${idx + 1}. ${name}`).join(", ")}
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
              Choose one player to act as game facilitator to advance game state
              and keep time.
            </Box>
            <Box as="li">
              Look at the game board. Take note of the commons infrastructure in
              Astra-3/4/6. You'll need to place your starter infrastructure
              nearby.
            </Box>
            <Box as="li">
              Choose your player name and specialization with the ADD PLAYER
              button. Or, if this is your first time, use the NEW PLAYER
              WALKTHROUGH button to be guided through the setup steps and a
              description of the gameplay.
            </Box>
            <Box as="li">
              Place your starter infrastructure tokens on the board.
            </Box>
            <Box as="li">
              Review your player card and start planning your strategy. What
              will you build? Who will you need to trade with?
            </Box>
          </Box>
          <Text mt={2}>
            When everyone is ready, click “Begin Round 1” to enter the
            Governance phase.
          </Text>
        </Box>
      )}

      {warningMessage && (
        <Text color="fg" fontSize="sm">
          {warningMessage}
        </Text>
      )}
    </Box>
  );
}
