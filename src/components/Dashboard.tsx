import { Box, Container, Heading, Spinner, Text, VStack } from '@chakra-ui/react';
import { useDashboardData } from '../hooks/useGameData';
import { DashboardHeader } from './DashboardHeader';
import { GameStateDisplay } from './GameStateDisplay';
import { PlayerRankings } from './PlayerRankings';
import { InfrastructureCards } from './InfrastructureCards';

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
        <Box
          p={6}
          borderRadius="md"
          bg="red.50"
          borderWidth={1}
          borderColor="red.200"
        >
          <Text color="red.700" fontWeight="semibold">
            Error loading dashboard
          </Text>
          <Text color="red.600" fontSize="sm" mt={2}>
            {error instanceof Error ? error.message : 'Unknown error'}
          </Text>
          <Text fontSize="sm" mt={4} color="red.600">
            Make sure you have set up your Supabase environment variables in
            .env.local
          </Text>
        </Box>
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
    <Box minH="100vh" bg="gray.50">
      <DashboardHeader />

      <Container maxW="container.xl" py={8}>
        <VStack gap={8} align="stretch">
          {/* Game Status Section */}
          <Box>
            <Heading size="md" mb={3} color="gray.900">
              Game Status
            </Heading>
            <GameStateDisplay
              round={data.game_state.round}
              phase={data.game_state.phase}
              version={data.game_state.version}
            />
          </Box>

          {/* Player Rankings Section */}
          <Box>
            <PlayerRankings players={data.players} />
          </Box>

          {/* Infrastructure Section */}
          <Box>
            <InfrastructureCards players={data.players} />
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}
