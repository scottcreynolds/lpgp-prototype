import {
  Badge,
  Box,
  Heading,
  Table,
  Text,
  HStack,
} from '@chakra-ui/react';
import { useEditPlayer } from '../hooks/useGameData';
import { EditPlayerModal } from './EditPlayerModal';
import { toaster } from './ui/toaster';
import type { DashboardPlayer } from '../lib/database.types';
import type { Specialization } from '../lib/database.types';

interface PlayerRankingsProps {
  players: DashboardPlayer[];
}

export function PlayerRankings({ players }: PlayerRankingsProps) {
  const editPlayer = useEditPlayer();

  const getSpecializationBadge = (specialization: string) => {
    const colorMap: Record<string, string> = {
      'Resource Extractor': 'orange',
      'Infrastructure Provider': 'blue',
      'Operations Manager': 'green',
    };
    return colorMap[specialization] || 'gray';
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
        title: 'Player Updated',
        description: `${name} updated successfully`,
        type: 'success',
        duration: 3000,
      });
    } catch (error) {
      toaster.create({
        title: 'Failed to Update Player',
        description:
          error instanceof Error ? error.message : 'Failed to update player',
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
      <Heading size="lg" mb={4} color="gray.900">
        Player Rankings
      </Heading>

      <Table.Root size="lg" variant="outline" striped>
        <Table.ScrollArea maxH="600px">
          <Table.Header>
            <Table.Row bg="gray.100">
              <Table.ColumnHeader fontWeight="bold" color="gray.900">Rank</Table.ColumnHeader>
              <Table.ColumnHeader fontWeight="bold" color="gray.900">Player</Table.ColumnHeader>
              <Table.ColumnHeader fontWeight="bold" color="gray.900">Specialization</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right" fontWeight="bold" color="gray.900">EV</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right" fontWeight="bold" color="gray.900">REP</Table.ColumnHeader>
              <Table.ColumnHeader fontWeight="bold" color="gray.900">Actions</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {players.map((player, index) => (
              <Table.Row
                key={player.id}
                bg={
                  isWinner(player.ev)
                    ? 'green.50'
                    : isCloseToWinning(player.ev)
                      ? 'yellow.50'
                      : undefined
                }
              >
                <Table.Cell>
                  <HStack gap={2}>
                    <Text fontWeight="bold" fontSize="lg">
                      {index + 1}
                    </Text>
                    {index === 0 && <Text fontSize="xl">👑</Text>}
                  </HStack>
                </Table.Cell>
                <Table.Cell>
                  <HStack gap={2}>
                    <Text fontWeight="semibold" color="gray.900">{player.name}</Text>
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
                  <Badge colorPalette={getSpecializationBadge(player.specialization)}>
                    {player.specialization}
                  </Badge>
                </Table.Cell>
                <Table.Cell textAlign="right">
                  <Text
                    fontWeight="bold"
                    fontSize="lg"
                    color={isWinner(player.ev) ? 'green.600' : 'inherit'}
                  >
                    {player.ev}
                  </Text>
                </Table.Cell>
                <Table.Cell textAlign="right">
                  <Text fontWeight="semibold" color={player.rep < 0 ? 'red.700' : 'gray.900'}>
                    {player.rep}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <EditPlayerModal
                    playerId={player.id}
                    currentName={player.name}
                    currentSpecialization={player.specialization}
                    onEditPlayer={handleEditPlayer}
                    isPending={editPlayer.isPending}
                  />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.ScrollArea>
      </Table.Root>
    </Box>
  );
}
