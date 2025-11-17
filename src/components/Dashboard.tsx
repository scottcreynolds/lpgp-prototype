import { useGameStore } from "@/store/gameStore";
import {
  Alert,
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  HStack,
  Icon,
  Spinner,
  Table,
  Tabs,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useState } from "react";
import {
  LuBuilding,
  LuClock,
  LuDatabase,
  LuDollarSign,
  LuFileText,
  LuGauge,
  LuListOrdered,
  LuNotebookText,
  LuUser,
} from "react-icons/lu";
import { useDashboardData } from "../hooks/useGameData";
import { ContractsListView } from "./ContractsListView";
import { DashboardHeader } from "./DashboardHeader";
import DeveloperPanel from "./DeveloperPanel";
import { GameStateDisplay } from "./GameStateDisplay";
import { HelpModal } from "./HelpModal";
import { InfrastructureCards } from "./InfrastructureCards";
import { JoinGamePrompt } from "./JoinGamePrompt";
import { LedgerDisplay } from "./LedgerDisplay";
import { NarrativePanel } from "./NarrativePanel";
import { PlayerRankings } from "./PlayerRankings";
import { Tooltip } from "./ui/tooltip";

export function Dashboard() {
  const { data, isLoading, error } = useDashboardData();
  const gameEnded = useGameStore((s) => s.gameEnded);
  const victoryType = useGameStore((s) => s.victoryType);
  const winnerIds = useGameStore((s) => s.winnerIds);
  const [activeTab, setActiveTab] = useState("control");
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpTopic, setHelpTopic] = useState<string | null>(null);

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

  const winners = data.players.filter((p) => winnerIds.includes(p.id));
  const otherPlayers = data.players
    .filter((p) => !winnerIds.includes(p.id))
    .sort((a, b) => b.ev + b.rep - (a.ev + a.rep));
  const victoryLabel =
    victoryType === "cooperative"
      ? "Cooperative Victory"
      : victoryType === "tiebreaker"
      ? "Tiebreaker Victory"
      : "Victory";

  return (
    <Box minH="100vh" minW="100vw" bg="bg.inverted">
      <DashboardHeader />

      {/* Announcement panel (replaces winner modal) */}
      <Container maxW="container.xl" pt={gameEnded ? 6 : 0}>
        {gameEnded && (
          <Box
            bg="bg.panel"
            p={6}
            borderRadius="lg"
            borderWidth={1}
            borderColor="border.emphasized"
            shadow="sm"
            mb={6}
          >
            <Heading size="lg" mb={2} color="fg.emphasized">
              {victoryLabel}
            </Heading>
            <VStack align="stretch" gap={6}>
              <Box>
                <Text fontSize="lg" fontWeight="bold">
                  Winner{winners.length > 1 ? "s" : ""}
                </Text>
                <VStack align="stretch" mt={2} gap={3}>
                  {winners.map((w) => (
                    <Box
                      key={w.id}
                      p={4}
                      borderWidth={1}
                      borderRadius="md"
                      bg="bg.panel"
                    >
                      <Text fontSize="xl" fontWeight="semibold">
                        🏆 {w.name}
                      </Text>
                      <Text fontSize="sm" color="fg.emphasized">
                        {w.specialization}
                      </Text>
                      <HStack mt={2} gap={4}>
                        <Badge colorPalette="green">EV {w.ev}</Badge>
                        <Badge colorPalette="purple">REP {w.rep}</Badge>
                        <Badge colorPalette="blue">
                          Infra {w.totals.infrastructure_count}
                        </Badge>
                        <Badge colorPalette="orange">
                          Yield {w.totals.total_yield}
                        </Badge>
                        <Badge colorPalette="cyan">
                          Power {w.totals.total_power_capacity}
                        </Badge>
                        <Badge colorPalette="pink">
                          Crew {w.totals.total_crew_capacity}
                        </Badge>
                      </HStack>
                    </Box>
                  ))}
                </VStack>
              </Box>
              {otherPlayers.length > 0 && (
                <Box>
                  <Text fontSize="md" fontWeight="bold" mb={2}>
                    Other Players
                  </Text>
                  <Table.Root size="sm" variant="outline">
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeader>Name</Table.ColumnHeader>
                        <Table.ColumnHeader>Specialty</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="right">
                          EV
                        </Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="right">
                          REP
                        </Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {otherPlayers.map((p) => (
                        <Table.Row key={p.id}>
                          <Table.Cell>{p.name}</Table.Cell>
                          <Table.Cell>{p.specialization}</Table.Cell>
                          <Table.Cell textAlign="right">{p.ev}</Table.Cell>
                          <Table.Cell textAlign="right">{p.rep}</Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </Box>
              )}
              <Text fontSize="sm" color="fg">
                Game actions are now locked. Start a new game to play again.
              </Text>
            </VStack>
          </Box>
        )}

        {/* Help topics row (moved from GameStateDisplay) */}
        <Box mb={4}>
          <Box p={4} borderRadius="md" borderWidth={1} borderColor="border">
            <Flex wrap="wrap" gap={5} align="center">
              <Text mb={1} color="boldTangerine.contrast">
                Help Topics
              </Text>
              <Button
                variant="ghost"
                colorPalette="softOchre"
                color="flamingoGold.contrast"
                onClick={() => {
                  setHelpTopic("currency");
                  setHelpOpen(true);
                }}
                size="sm"
              >
                <Icon as={LuDollarSign} mr={1} />
                Currency
              </Button>
              <Button
                variant="ghost"
                colorPalette="softOchre"
                color="flamingoGold.contrast"
                onClick={() => {
                  setHelpTopic("infrastructure");
                  setHelpOpen(true);
                }}
                size="sm"
              >
                <Icon as={LuBuilding} mr={1} />
                Infrastructure Descriptions
              </Button>
              <Button
                variant="ghost"
                colorPalette="softOchre"
                color="flamingoGold.contrast"
                onClick={() => {
                  setHelpTopic("infrastructure-table");
                  setHelpOpen(true);
                }}
                size="sm"
              >
                <Icon as={LuBuilding} mr={1} />
                Infrastructure Values
              </Button>
              <Button
                variant="ghost"
                colorPalette="softOchre"
                color="flamingoGold.contrast"
                onClick={() => {
                  setHelpTopic("contracts");
                  setHelpOpen(true);
                }}
                size="sm"
              >
                <Icon as={LuFileText} mr={1} />
                Contracts
              </Button>
              <Button
                variant="ghost"
                colorPalette="softOchre"
                color="flamingoGold.contrast"
                onClick={() => {
                  setHelpTopic("roundStructure");
                  setHelpOpen(true);
                }}
                size="sm"
              >
                <Icon as={LuClock} mr={1} />
                Gameplay
              </Button>
            </Flex>
          </Box>
          <HelpModal
            topic={helpTopic}
            open={helpOpen}
            onOpenChange={setHelpOpen}
          />
        </Box>

        {/* Narrative panel for active phases */}
        {!gameEnded && (
          <NarrativePanel
            phase={data.game_state.phase}
            round={data.game_state.round}
          />
        )}
      </Container>

      <Container maxW="container.xl" py={8}>
        <VStack gap={8} align="stretch">
          {/* Join prompt for players/observers */}
          <JoinGamePrompt phase={data.game_state.phase} />

          <Tabs.Root
            variant="outline"
            defaultValue="control"
            colorPalette="subduedCrystal"
            value={activeTab}
            onValueChange={(details) => setActiveTab(details.value)}
          >
            <Tabs.List gap={2} flexWrap="wrap">
              <Tabs.Trigger value="control">
                <Tooltip
                  content="Shows current round, phase, and game status"
                  showArrow
                  positioning={{ placement: "top" }}
                >
                  <HStack>
                    <LuGauge />
                    <span>Game Status</span>
                  </HStack>
                </Tooltip>
              </Tabs.Trigger>
              <Tabs.Trigger value="player">
                <Tooltip
                  content="Player dashboards, infrastructure, and management"
                  showArrow
                  positioning={{ placement: "top" }}
                >
                  <HStack>
                    <LuUser />
                    <span>Player Dashboard</span>
                  </HStack>
                </Tooltip>
              </Tabs.Trigger>
              <Tabs.Trigger value="contracts">
                <Tooltip
                  content="View, create, and manage contracts between players"
                  showArrow
                  positioning={{ placement: "top" }}
                >
                  <HStack>
                    <LuNotebookText />
                    <span>Contracts</span>
                  </HStack>
                </Tooltip>
              </Tabs.Trigger>
              <Tabs.Trigger value="leaderboard">
                <Tooltip
                  content="Player rankings and standings"
                  showArrow
                  positioning={{ placement: "top" }}
                >
                  <HStack>
                    <LuListOrdered />
                    <span>Leaderboard</span>
                  </HStack>
                </Tooltip>
              </Tabs.Trigger>
              <Tabs.Trigger value="ledger">
                <Tooltip
                  content="Recent ledger transactions and entries"
                  showArrow
                  positioning={{ placement: "top" }}
                >
                  <HStack>
                    <LuDatabase />
                    <span>Ledger</span>
                  </HStack>
                </Tooltip>
              </Tabs.Trigger>
              <Tabs.Trigger value="dev">
                <Tooltip
                  content="Developer tools and debug utilities"
                  showArrow
                  positioning={{ placement: "top" }}
                >
                  <span>Dev</span>
                </Tooltip>
              </Tabs.Trigger>
              <Tabs.Indicator color="flamingoGold.solid" outline="2px solid" />
            </Tabs.List>

            <Tabs.Content value="control" px={0} pt={4}>
              <Box>
                <GameStateDisplay
                  round={data.game_state.round}
                  phase={data.game_state.phase}
                  version={data.game_state.version}
                  players={data.players}
                />
              </Box>
            </Tabs.Content>

            <Tabs.Content value="player" px={0} pt={4}>
              <Box>
                <InfrastructureCards players={data.players} />
              </Box>
            </Tabs.Content>

            <Tabs.Content value="contracts" px={0} pt={4}>
              <Box>
                <ContractsListView
                  players={data.players}
                  currentRound={data.game_state.round}
                />
              </Box>
            </Tabs.Content>

            <Tabs.Content value="leaderboard" px={0} pt={4}>
              <Box>
                <PlayerRankings players={data.players} />
              </Box>
            </Tabs.Content>

            <Tabs.Content value="ledger" px={0} pt={4}>
              <Box>
                <LedgerDisplay
                  players={data.players}
                  currentRound={data.game_state.round}
                />
              </Box>
            </Tabs.Content>

            <Tabs.Content value="dev" px={0} pt={4}>
              <DeveloperPanel />
            </Tabs.Content>
          </Tabs.Root>
        </VStack>
      </Container>
    </Box>
  );
}
