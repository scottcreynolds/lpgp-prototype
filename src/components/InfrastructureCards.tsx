import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  HStack,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  FaAtom,
  FaBolt,
  FaChartLine,
  FaCoins,
  FaHome,
  FaSolarPanel,
  FaTint,
  FaUsers,
} from "react-icons/fa";
import { useEditPlayer } from "../hooks/useGameData";
import type { DashboardPlayer, Specialization } from "../lib/database.types";
import { EditPlayerModal } from "./EditPlayerModal";
import { PlayerInventoryModal } from "./PlayerInventoryModal";
import { toaster } from "./ui/toasterInstance";

interface InfrastructureCardsProps {
  players: DashboardPlayer[];
}

export function InfrastructureCards({ players }: InfrastructureCardsProps) {
  const editPlayer = useEditPlayer();

  const getInfrastructureIcon = (type: string) => {
    if (type.includes("Habitat")) return <FaHome />;
    if (type.includes("Solar")) return <FaSolarPanel />;
    if (type.includes("H2O")) return <FaTint />;
    if (type.includes("Helium")) return <FaAtom />;
    return null;
  };

  const getInfrastructureCounts = (player: DashboardPlayer) => {
    const counts: Record<string, number> = {};
    player.infrastructure.forEach((infra) => {
      const baseType = infra.type.replace("Starter ", "");
      counts[baseType] = (counts[baseType] || 0) + 1;
    });
    return counts;
  };

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
    <Box>
      <Heading size="lg" mb={4} color="fg">
        Infrastructure Overview
      </Heading>

      <Grid templateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap={4}>
        {players.map((player) => {
          const { totals } = player;
          const powerShortage =
            totals.total_power_used > totals.total_power_capacity;
          const crewShortage =
            totals.total_crew_used > totals.total_crew_capacity;
          const infrastructureCounts = getInfrastructureCounts(player);

          return (
            <Box
              key={player.id}
              bg="bg"
              p={5}
              borderRadius="lg"
              borderWidth={1}
              borderColor="border"
              shadow="sm"
            >
              <VStack align="stretch" gap={4}>
                {/* Player Header */}
                <Flex justify="space-between" align="flex-start">
                  <Box>
                    <Text fontWeight="bold" fontSize="lg" color="fg">
                      {player.name}
                    </Text>
                    <HStack gap={2} align="center">
                      <Badge size="sm" colorPalette="gray">
                        {player.specialization}
                      </Badge>
                      {(() => {
                        const inactiveCount = player.infrastructure.filter(
                          (i) => !i.is_active
                        ).length;
                        return inactiveCount > 0 ? (
                          <HStack gap={2}>
                            <Badge
                              size="sm"
                              colorPalette="orange"
                              title="Some infrastructure is inactive. Open Inventory to manage."
                            >
                              Inactive: {inactiveCount}
                            </Badge>
                            <PlayerInventoryModal
                              playerId={player.id}
                              playerName={player.name}
                              infrastructure={player.infrastructure}
                              trigger={
                                <Button size="xs" colorPalette="orange">
                                  Manage
                                </Button>
                              }
                            />
                          </HStack>
                        ) : null;
                      })()}
                    </HStack>
                  </Box>
                  <EditPlayerModal
                    playerId={player.id}
                    currentName={player.name}
                    currentSpecialization={player.specialization}
                    onEditPlayer={handleEditPlayer}
                    isPending={editPlayer.isPending}
                  />
                </Flex>

                {/* Infrastructure Counts */}
                <Box>
                  <Text fontSize="sm" fontWeight="semibold" mb={2} color="fg">
                    Infrastructure
                  </Text>
                  <SimpleGrid columns={2} gap={2}>
                    {Object.entries(infrastructureCounts).map(
                      ([type, count]) => (
                        <HStack key={type} gap={2}>
                          <Box color="fg.muted" fontSize="sm">
                            {getInfrastructureIcon(type)}
                          </Box>
                          <Text fontSize="sm" color="fg">
                            {type}: {count}
                          </Text>
                        </HStack>
                      )
                    )}
                  </SimpleGrid>
                </Box>

                {/* Capacity Stats */}
                <SimpleGrid columns={2} gap={3}>
                  {/* Power */}
                  <Box
                    p={3}
                    bg={powerShortage ? "bg.error.subtle" : "bg.muted"}
                    borderRadius="md"
                    borderWidth={1}
                    borderColor="border"
                  >
                    <HStack gap={2} mb={1}>
                      <Box color={powerShortage ? "fg" : "fg.muted"}>
                        <FaBolt />
                      </Box>
                      <Text fontSize="xs" fontWeight="bold" color="fg">
                        Power
                      </Text>
                    </HStack>
                    <Text fontSize="lg" fontWeight="bold" color="fg">
                      {totals.total_power_used}/{totals.total_power_capacity}
                    </Text>
                    {powerShortage && (
                      <Badge size="sm" colorPalette="red">
                        SHORTAGE
                      </Badge>
                    )}
                  </Box>

                  {/* Crew */}
                  <Box
                    p={3}
                    bg={crewShortage ? "bg.error.subtle" : "bg.muted"}
                    borderRadius="md"
                    borderWidth={1}
                    borderColor="border"
                  >
                    <HStack gap={2} mb={1}>
                      <Box color={crewShortage ? "fg" : "fg.muted"}>
                        <FaUsers />
                      </Box>
                      <Text fontSize="xs" fontWeight="bold" color="fg">
                        Crew
                      </Text>
                    </HStack>
                    <Text fontSize="lg" fontWeight="bold" color="fg">
                      {totals.total_crew_used}/{totals.total_crew_capacity}
                    </Text>
                    {crewShortage && (
                      <Badge size="sm" colorPalette="red">
                        SHORTAGE
                      </Badge>
                    )}
                  </Box>
                </SimpleGrid>

                {/* Financial Stats */}
                <SimpleGrid columns={2} gap={3}>
                  <Box
                    p={3}
                    bg="bg.muted"
                    borderRadius="md"
                    borderWidth={1}
                    borderColor="border"
                  >
                    <HStack gap={2} mb={1}>
                      <Box color="fg.muted">
                        <FaCoins />
                      </Box>
                      <Text fontSize="xs" fontWeight="bold" color="fg">
                        Maintenance
                      </Text>
                    </HStack>
                    <Text fontSize="lg" fontWeight="bold" color="fg">
                      {totals.total_maintenance_cost} EV
                    </Text>
                  </Box>

                  <Box
                    p={3}
                    bg={
                      totals.total_yield > 0 ? "bg.success.subtle" : "bg.muted"
                    }
                    borderRadius="md"
                    borderWidth={1}
                    borderColor="border"
                  >
                    <HStack gap={2} mb={1}>
                      <Box color="fg.muted">
                        <FaChartLine />
                      </Box>
                      <Text fontSize="xs" fontWeight="bold" color="fg">
                        Yield
                      </Text>
                    </HStack>
                    <Text fontSize="lg" fontWeight="bold" color="fg">
                      +{totals.total_yield} EV
                    </Text>
                  </Box>
                </SimpleGrid>

                {/* Net Income */}
                <Box
                  p={2}
                  bg={
                    totals.total_yield - totals.total_maintenance_cost > 0
                      ? "bg.success.subtle"
                      : totals.total_yield - totals.total_maintenance_cost < 0
                      ? "bg.error.subtle"
                      : "bg.muted"
                  }
                  borderRadius="md"
                  textAlign="center"
                >
                  <Text fontSize="xs" color="fg" mb={1} fontWeight="bold">
                    Net Per Round
                  </Text>
                  <Text fontSize="xl" fontWeight="bold" color="fg">
                    {totals.total_yield - totals.total_maintenance_cost > 0
                      ? "+"
                      : ""}
                    {totals.total_yield - totals.total_maintenance_cost} EV
                  </Text>
                </Box>
              </VStack>
            </Box>
          );
        })}
      </Grid>
    </Box>
  );
}
