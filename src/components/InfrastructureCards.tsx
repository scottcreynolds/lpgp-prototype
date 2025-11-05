import {
  Badge,
  Box,
  Grid,
  Heading,
  HStack,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react';
import { FaBolt, FaUsers, FaCoins, FaChartLine, FaHome, FaSolarPanel, FaTint, FaAtom } from 'react-icons/fa';
import type { DashboardPlayer } from '../lib/database.types';

interface InfrastructureCardsProps {
  players: DashboardPlayer[];
}

export function InfrastructureCards({ players }: InfrastructureCardsProps) {
  const getInfrastructureIcon = (type: string) => {
    if (type.includes('Habitat')) return <FaHome />;
    if (type.includes('Solar')) return <FaSolarPanel />;
    if (type.includes('H2O')) return <FaTint />;
    if (type.includes('Helium')) return <FaAtom />;
    return null;
  };

  const getInfrastructureCounts = (player: DashboardPlayer) => {
    const counts: Record<string, number> = {};
    player.infrastructure.forEach((infra) => {
      const baseType = infra.type.replace('Starter ', '');
      counts[baseType] = (counts[baseType] || 0) + 1;
    });
    return counts;
  };

  return (
    <Box>
      <Heading size="lg" mb={4}>
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
              bg="white"
              p={5}
              borderRadius="lg"
              borderWidth={1}
              borderColor="gray.200"
              shadow="sm"
            >
              <VStack align="stretch" gap={4}>
                {/* Player Header */}
                <Box>
                  <Text fontWeight="bold" fontSize="lg">
                    {player.name}
                  </Text>
                  <Badge size="sm" colorPalette="gray">
                    {player.specialization}
                  </Badge>
                </Box>

                {/* Infrastructure Counts */}
                <Box>
                  <Text fontSize="sm" fontWeight="semibold" mb={2} color="gray.600">
                    Infrastructure
                  </Text>
                  <SimpleGrid columns={2} gap={2}>
                    {Object.entries(infrastructureCounts).map(([type, count]) => (
                      <HStack key={type} gap={2}>
                        <Box color="gray.500" fontSize="sm">
                          {getInfrastructureIcon(type)}
                        </Box>
                        <Text fontSize="sm">
                          {type}: {count}
                        </Text>
                      </HStack>
                    ))}
                  </SimpleGrid>
                </Box>

                {/* Capacity Stats */}
                <SimpleGrid columns={2} gap={3}>
                  {/* Power */}
                  <Box
                    p={3}
                    bg={powerShortage ? 'red.50' : 'blue.50'}
                    borderRadius="md"
                    borderWidth={1}
                    borderColor={powerShortage ? 'red.200' : 'blue.200'}
                  >
                    <HStack gap={2} mb={1}>
                      <FaBolt color={powerShortage ? '#C53030' : '#3182CE'} />
                      <Text fontSize="xs" fontWeight="semibold" color="gray.600">
                        Power
                      </Text>
                    </HStack>
                    <Text
                      fontSize="lg"
                      fontWeight="bold"
                      color={powerShortage ? 'red.600' : 'inherit'}
                    >
                      {totals.total_power_used}/{totals.total_power_capacity}
                    </Text>
                    {powerShortage && (
                      <Text fontSize="xs" color="red.600" fontWeight="semibold">
                        SHORTAGE
                      </Text>
                    )}
                  </Box>

                  {/* Crew */}
                  <Box
                    p={3}
                    bg={crewShortage ? 'red.50' : 'green.50'}
                    borderRadius="md"
                    borderWidth={1}
                    borderColor={crewShortage ? 'red.200' : 'green.200'}
                  >
                    <HStack gap={2} mb={1}>
                      <FaUsers color={crewShortage ? '#C53030' : '#38A169'} />
                      <Text fontSize="xs" fontWeight="semibold" color="gray.600">
                        Crew
                      </Text>
                    </HStack>
                    <Text
                      fontSize="lg"
                      fontWeight="bold"
                      color={crewShortage ? 'red.600' : 'inherit'}
                    >
                      {totals.total_crew_used}/{totals.total_crew_capacity}
                    </Text>
                    {crewShortage && (
                      <Text fontSize="xs" color="red.600" fontWeight="semibold">
                        SHORTAGE
                      </Text>
                    )}
                  </Box>
                </SimpleGrid>

                {/* Financial Stats */}
                <SimpleGrid columns={2} gap={3}>
                  <Box p={3} bg="orange.50" borderRadius="md" borderWidth={1} borderColor="orange.200">
                    <HStack gap={2} mb={1}>
                      <FaCoins color="#DD6B20" />
                      <Text fontSize="xs" fontWeight="semibold" color="gray.600">
                        Maintenance
                      </Text>
                    </HStack>
                    <Text fontSize="lg" fontWeight="bold">
                      {totals.total_maintenance_cost} EV
                    </Text>
                  </Box>

                  <Box p={3} bg="green.50" borderRadius="md" borderWidth={1} borderColor="green.200">
                    <HStack gap={2} mb={1}>
                      <FaChartLine color="#38A169" />
                      <Text fontSize="xs" fontWeight="semibold" color="gray.600">
                        Yield
                      </Text>
                    </HStack>
                    <Text fontSize="lg" fontWeight="bold" color="green.600">
                      +{totals.total_yield} EV
                    </Text>
                  </Box>
                </SimpleGrid>

                {/* Net Income */}
                <Box
                  p={2}
                  bg="gray.50"
                  borderRadius="md"
                  textAlign="center"
                >
                  <Text fontSize="xs" color="gray.600" mb={1}>
                    Net Per Round
                  </Text>
                  <Text
                    fontSize="xl"
                    fontWeight="bold"
                    color={
                      totals.total_yield - totals.total_maintenance_cost > 0
                        ? 'green.600'
                        : 'red.600'
                    }
                  >
                    {totals.total_yield - totals.total_maintenance_cost > 0
                      ? '+'
                      : ''}
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
