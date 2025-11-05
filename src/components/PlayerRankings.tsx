import {
  Badge,
  Box,
  Heading,
  Table,
  Text,
  HStack,
} from '@chakra-ui/react';
import type { DashboardPlayer } from '../lib/database.types';

interface PlayerRankingsProps {
  players: DashboardPlayer[];
}

export function PlayerRankings({ players }: PlayerRankingsProps) {
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

  return (
    <Box
      bg="white"
      p={6}
      borderRadius="lg"
      borderWidth={1}
      borderColor="gray.200"
      shadow="sm"
    >
      <Heading size="lg" mb={4}>
        Player Rankings
      </Heading>

      <Table.Root size="lg" variant="outline" striped>
        <Table.Header>
          <Table.Row bg="gray.50">
            <Table.ColumnHeader>Rank</Table.ColumnHeader>
            <Table.ColumnHeader>Player</Table.ColumnHeader>
            <Table.ColumnHeader>Specialization</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">EV</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">REP</Table.ColumnHeader>
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
                  <Text fontWeight="semibold">{player.name}</Text>
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
                <Text fontWeight="semibold" color={player.rep < 0 ? 'red.600' : 'inherit'}>
                  {player.rep}
                </Text>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}
