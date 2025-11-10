import { Alert, Box, Container, Spinner, Text, VStack } from "@chakra-ui/react";
import { useDashboardData } from "../hooks/useGameData";
import { ContractsListView } from "./ContractsListView";
import { DashboardHeader } from "./DashboardHeader";
import DeveloperPanel from "./DeveloperPanel";
import { GameStateDisplay } from "./GameStateDisplay";
import { InfrastructureCards } from "./InfrastructureCards";
import { JoinGamePrompt } from "./JoinGamePrompt";
import { LedgerDisplay } from "./LedgerDisplay";
import { PhaseTipsPanel } from "./PhaseTipsPanel";
import { PlayerRankings } from "./PlayerRankings";

export function Dashboard() {
  const { data, isLoading, error } = useDashboardData();

  if (isLoading) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack gap={4}>
          <Spinner size="xl" />
          <Text>Loading dashboard...</Text>
        </VStack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxW="container.xl" py={8}>
        <Alert.Root status="error" variant="surface">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Error loading dashboard</Alert.Title>
            <Alert.Description>
              {error instanceof Error ? error.message : "Unknown error"}
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
      </Container>
    );
  }

  if (!data) {
    return (
      <Container maxW="container.xl" py={8}>
        <Text>No data available</Text>
      </Container>
    );
  }

  return (
    <Box minH="100vh" minW="100vw" bg="bg.inverted">
      <DashboardHeader />

      <Container maxW="container.xl" py={8}>
        <VStack gap={8} align="stretch">
          {/* Join prompt for players/observers */}
          <JoinGamePrompt phase={data.game_state.phase} />

          {/* Game Status Section */}
          <Box>
            <GameStateDisplay
              round={data.game_state.round}
              phase={data.game_state.phase}
              version={data.game_state.version}
              players={data.players}
            />
          </Box>

          {/* Phase Tips Panel (collapsible) */}
          <Box>
            <PhaseTipsPanel phase={data.game_state.phase} />
          </Box>

          {/* Player Rankings Section */}
          <Box>
            <PlayerRankings players={data.players} />
          </Box>

          {/* Contracts Section */}
          <Box>
            <ContractsListView
              players={data.players}
              currentRound={data.game_state.round}
            />
          </Box>

          {/* Infrastructure Section */}
          <Box>
            <InfrastructureCards players={data.players} />
          </Box>

          {/* Ledger Section */}
          <Box>
            <LedgerDisplay
              players={data.players}
              currentRound={data.game_state.round}
            />
          </Box>
          {/* Developer tools appear at the bottom of the page */}
          <DeveloperPanel />
        </VStack>
      </Container>
    </Box>
  );
}
