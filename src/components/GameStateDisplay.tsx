import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useAdvancePhase } from '../hooks/useGameData';
import type { GamePhase } from '../lib/database.types';
import { toaster } from './ui/toaster';

interface GameStateDisplayProps {
  round: number;
  phase: GamePhase;
  version: number;
}

export function GameStateDisplay({
  round,
  phase,
  version,
}: GameStateDisplayProps) {
  const advancePhase = useAdvancePhase();

  const handleAdvancePhase = async () => {
    try {
      const result = await advancePhase.mutateAsync();
      toaster.create({
        title: 'Phase Advanced',
        description: `Now in Round ${result.new_round} - ${result.new_phase} Phase`,
        type: 'success',
        duration: 3000,
      });
    } catch (error) {
      toaster.create({
        title: 'Failed to Advance',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to advance phase - please try again',
        type: 'error',
        duration: 5000,
      });
    }
  };

  return (
    <Box
      bg="white"
      p={6}
      borderRadius="lg"
      borderWidth={1}
      borderColor="gray.200"
      shadow="sm"
    >
      <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
        <VStack align="flex-start" gap={2}>
          <Heading size="2xl">
            Round {round} - {phase} Phase
          </Heading>
          <Text color="gray.600" fontSize="sm">
            Version: {version}
          </Text>
        </VStack>

        <HStack gap={4}>
          <Box
            px={4}
            py={3}
            bg="gray.100"
            borderRadius="md"
            borderWidth={1}
            borderColor="gray.300"
          >
            <Text fontSize="sm" color="gray.600" mb={1}>
              Timer
            </Text>
            <Text fontSize="2xl" fontWeight="bold" fontFamily="mono">
              --:--
            </Text>
            <Text fontSize="xs" color="gray.500">
              (Coming Soon)
            </Text>
          </Box>

          <Button
            onClick={handleAdvancePhase}
            loading={advancePhase.isPending}
            colorPalette="blue"
            size="lg"
          >
            Next Phase
          </Button>
        </HStack>
      </Flex>
    </Box>
  );
}
