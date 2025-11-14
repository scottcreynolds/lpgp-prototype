import {
  Badge,
  Box,
  Heading,
  HStack,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useEditPlayer } from "../hooks/useGameData";
import type { DashboardPlayer, Specialization } from "../lib/database.types";
import { useGameStore } from "../store/gameStore";
import { BuildInfrastructureModal } from "./BuildInfrastructureModal";
import { EditPlayerModal } from "./EditPlayerModal";
import { ManualAdjustmentModal } from "./ManualAdjustmentModal";
import { PlayerInventoryModal } from "./PlayerInventoryModal";
import SpecializationIcon from "./SpecializationIcon";
import { toaster } from "./ui/toasterInstance";

interface PlayerRankingsProps {
  players: DashboardPlayer[];
}

export function PlayerRankings({ players }: PlayerRankingsProps) {
  const editPlayer = useEditPlayer();
  const currentPhase = useGameStore((state) => state.currentPhase);
  const gameEnded = useGameStore((s) => s.gameEnded);
  // Removed self-labeling of player ("You") per updated requirement.

  const getSpecializationBadge = (specialization: string) => {
    const colorMap: Record<string, string> = {
      "Resource Extractor": "orange",
      "Infrastructure Provider": "blue",
      "Operations Manager": "green",
    };
    return colorMap[specialization] || "gray";
  };

  const isCloseToWinning = (ev: number) => ev >= 400 && ev < 500;
  const isWinner = (ev: number) => ev >= 500;

  const handleEditPlayer = async (
    playerId: string,
    name: string,
    specialization: Specialization
  ) => {
    try {
      await editPlayer.mutateAsync({ playerId, name, specialization });
      toaster.create({
        title: "Player Updated",
        description: `${name} updated successfully`,
        type: "success",
        duration: 3000,
      });
    } catch (error) {
      toaster.create({
        title: "Failed to Update Player",
        description:
          error instanceof Error ? error.message : "Failed to update player",
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
    >
      <Heading size="lg" mb={4} color="fg.emphasized">
        Player Rankings
      </Heading>

      <Table.ScrollArea maxH="600px">
        <Table.Root
          size="lg"
          variant="outline"
          striped
          colorPalette="sapphireWool"
        >
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader fontWeight="bold">Rank</Table.ColumnHeader>
              <Table.ColumnHeader fontWeight="bold">Player</Table.ColumnHeader>
              <Table.ColumnHeader fontWeight="bold">
                Specialization
              </Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right" fontWeight="bold">
                EV
              </Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right" fontWeight="bold">
                REP
              </Table.ColumnHeader>
              <Table.ColumnHeader textAlign="center" fontWeight="bold">
                Power
              </Table.ColumnHeader>
              <Table.ColumnHeader textAlign="center" fontWeight="bold">
                Crew
              </Table.ColumnHeader>
              <Table.ColumnHeader fontWeight="bold">Actions</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {players.map((player, index) => (
              <Table.Row key={player.id}>
                <Table.Cell>
                  <HStack gap={2}>
                    <Text fontWeight="bold" fontSize="lg" color="fg">
                      {index + 1}
                    </Text>
                    {index === 0 && <Text fontSize="xl">👑</Text>}
                  </HStack>
                </Table.Cell>
                <Table.Cell>
                  <HStack gap={2}>
                    <Text fontWeight="semibold" color="fg">
                      {player.name}
                    </Text>
                    {isWinner(player.ev) && (
                      <Badge colorPalette="green" size="sm">
                        WINNER
                      </Badge>
                    )}
                    {isCloseToWinning(player.ev) && (
                      <Badge colorPalette="yellow" size="sm">
                        Close to Win
                      </Badge>
                    )}
                  </HStack>
                </Table.Cell>
                <Table.Cell>
                  <HStack gap={2} align="center">
                    <SpecializationIcon
                      specialization={player.specialization}
                    />
                    <Badge
                      colorPalette={getSpecializationBadge(
                        player.specialization
                      )}
                    >
                      {player.specialization}
                    </Badge>
                  </HStack>
                </Table.Cell>
                <Table.Cell textAlign="right">
                  <Text fontWeight="bold" fontSize="lg" color="fg">
                    {player.ev}
                  </Text>
                </Table.Cell>
                <Table.Cell textAlign="right">
                  <Text fontWeight="semibold" color="fg">
                    {player.rep}
                  </Text>
                </Table.Cell>
                <Table.Cell textAlign="center">
                  <VStack gap={0}>
                    <Text fontSize="sm" fontWeight="semibold" color="fg">
                      {player.totals.available_power}
                    </Text>
                    <Text fontSize="xs" color="fg">
                      ({player.totals.total_power_used} /{" "}
                      {player.totals.net_power_capacity})
                    </Text>
                  </VStack>
                </Table.Cell>
                <Table.Cell textAlign="center">
                  <VStack gap={0}>
                    <Text fontSize="sm" fontWeight="semibold" color="fg">
                      {player.totals.available_crew}
                    </Text>
                    <Text fontSize="xs" color="fg">
                      ({player.totals.total_crew_used} /{" "}
                      {player.totals.net_crew_capacity})
                    </Text>
                  </VStack>
                </Table.Cell>
                <Table.Cell>
                  <HStack gap={2}>
                    <EditPlayerModal
                      playerId={player.id}
                      currentName={player.name}
                      currentSpecialization={player.specialization}
                      onEditPlayer={handleEditPlayer}
                      isPending={editPlayer.isPending}
                    />
                    <BuildInfrastructureModal
                      builderId={player.id}
                      builderName={player.name}
                      builderEv={player.ev}
                      players={players}
                      disabled={currentPhase !== "Operations"}
                      gameEnded={gameEnded}
                    />
                    <PlayerInventoryModal
                      playerId={player.id}
                      playerName={player.name}
                      infrastructure={player.infrastructure}
                    />
                    <ManualAdjustmentModal
                      playerId={player.id}
                      playerName={player.name}
                      currentEv={player.ev}
                      currentRep={player.rep}
                    />
                  </HStack>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Table.ScrollArea>
    </Box>
  );
}
