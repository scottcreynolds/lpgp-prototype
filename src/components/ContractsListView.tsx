import {
  Badge,
  Box,
  Button,
  Heading,
  HStack,
  NativeSelect,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useState } from 'react';
import { useContracts, useEndContract } from '../hooks/useGameData';
import type { DashboardPlayer } from '../lib/database.types';
import { toaster } from './ui/toaster';

interface ContractsListViewProps {
  players: DashboardPlayer[];
  currentRound: number;
}

export function ContractsListView({
  players,
  currentRound: _currentRound,
}: ContractsListViewProps) {
  const [filterPlayerId, setFilterPlayerId] = useState<string>('all');
  const { data: contracts, isLoading } = useContracts(
    filterPlayerId === 'all' ? undefined : filterPlayerId
  );
  const endContract = useEndContract();

  const handleEndContract = async (contractId: string, isBroken: boolean) => {
    const reason = isBroken
      ? 'Contract broken by mutual agreement'
      : 'Contract ended naturally';

    try {
      await endContract.mutateAsync({
        contractId,
        reason,
        isBroken,
      });

      toaster.create({
        title: isBroken ? 'Contract Broken' : 'Contract Ended',
        description: `Contract ${isBroken ? 'broken' : 'ended'} successfully`,
        type: 'info',
        duration: 3000,
      });
    } catch (error) {
      toaster.create({
        title: 'Failed to End Contract',
        description:
          error instanceof Error ? error.message : 'Failed to end contract',
        type: 'error',
        duration: 5000,
      });
    }
  };

  const getPlayerName = (playerId: string) => {
    return players.find((p) => p.id === playerId)?.name || 'Unknown';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'green';
      case 'ended':
        return 'gray';
      case 'broken':
        return 'red';
      default:
        return 'gray';
    }
  };

  if (isLoading) {
    return (
      <Box
        bg="white"
        p={6}
        borderRadius="lg"
        borderWidth={1}
        borderColor="gray.200"
        shadow="sm"
      >
        <Text>Loading contracts...</Text>
      </Box>
    );
  }

  const activeContracts = contracts?.filter((c: { status: string }) => c.status === 'active') || [];
  const inactiveContracts = contracts?.filter((c: { status: string }) => c.status !== 'active') || [];

  return (
    <Box
      bg="white"
      p={6}
      borderRadius="lg"
      borderWidth={1}
      borderColor="gray.200"
      shadow="sm"
    >
      <HStack justify="space-between" mb={4}>
        <Heading size="lg" color="gray.900">
          Contracts
        </Heading>

        <NativeSelect.Root width="250px">
          <NativeSelect.Field
            value={filterPlayerId}
            onChange={(e) => setFilterPlayerId(e.target.value)}
          >
            <option value="all">All Contracts</option>
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </HStack>

      {activeContracts.length === 0 && inactiveContracts.length === 0 ? (
        <Box p={8} textAlign="center">
          <Text color="fg.muted" fontSize="lg">
            No contracts found
          </Text>
          <Text color="fg.muted" fontSize="sm" mt={2}>
            {filterPlayerId === 'all'
              ? 'Create a contract during the Governance phase'
              : 'This player has no contracts'}
          </Text>
        </Box>
      ) : (
        <VStack gap={6} align="stretch">
          {/* Active Contracts */}
          {activeContracts.length > 0 && (
            <Box>
              <Heading size="md" mb={3} color="gray.900">
                Active Contracts ({activeContracts.length})
              </Heading>
              <Table.Root size="md" variant="outline">
                <Table.ScrollArea maxH="400px">
                  <Table.Header>
                    <Table.Row bg="gray.100">
                      <Table.ColumnHeader fontWeight="bold" color="gray.900">
                        Parties
                      </Table.ColumnHeader>
                      <Table.ColumnHeader fontWeight="bold" color="gray.900">
                        EV Exchange
                      </Table.ColumnHeader>
                      <Table.ColumnHeader fontWeight="bold" color="gray.900">
                        Power
                      </Table.ColumnHeader>
                      <Table.ColumnHeader fontWeight="bold" color="gray.900">
                        Crew
                      </Table.ColumnHeader>
                      <Table.ColumnHeader fontWeight="bold" color="gray.900">
                        Duration
                      </Table.ColumnHeader>
                      <Table.ColumnHeader fontWeight="bold" color="gray.900">
                        Status
                      </Table.ColumnHeader>
                      <Table.ColumnHeader fontWeight="bold" color="gray.900">
                        Actions
                      </Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {activeContracts.map((contract: any) => {
                      const partyAName = getPlayerName(contract.party_a_id);
                      const partyBName = getPlayerName(contract.party_b_id);

                      return (
                        <Table.Row key={contract.id}>
                          <Table.Cell>
                            <VStack gap={1} align="start">
                              <Text fontWeight="semibold" fontSize="sm">
                                {partyAName}
                              </Text>
                              <Text fontSize="xs" color="fg.muted">
                                ⇄
                              </Text>
                              <Text fontWeight="semibold" fontSize="sm">
                                {partyBName}
                              </Text>
                            </VStack>
                          </Table.Cell>
                          <Table.Cell>
                            <VStack gap={1} align="start">
                              {contract.ev_from_a_to_b > 0 && (
                                <Text fontSize="sm">
                                  {partyAName.substring(0, 10)} → {partyBName.substring(0, 10)}:{' '}
                                  {contract.ev_from_a_to_b}
                                  {contract.ev_is_per_round ? '/r' : ''}
                                </Text>
                              )}
                              {contract.ev_from_b_to_a > 0 && (
                                <Text fontSize="sm">
                                  {partyBName.substring(0, 10)} → {partyAName.substring(0, 10)}:{' '}
                                  {contract.ev_from_b_to_a}
                                  {contract.ev_is_per_round ? '/r' : ''}
                                </Text>
                              )}
                              {contract.ev_from_a_to_b === 0 &&
                                contract.ev_from_b_to_a === 0 && (
                                  <Text fontSize="sm" color="fg.muted">
                                    None
                                  </Text>
                                )}
                            </VStack>
                          </Table.Cell>
                          <Table.Cell>
                            <VStack gap={1} align="start">
                              {contract.power_from_a_to_b > 0 && (
                                <Text fontSize="sm">
                                  A → B: {contract.power_from_a_to_b}
                                </Text>
                              )}
                              {contract.power_from_b_to_a > 0 && (
                                <Text fontSize="sm">
                                  B → A: {contract.power_from_b_to_a}
                                </Text>
                              )}
                              {contract.power_from_a_to_b === 0 &&
                                contract.power_from_b_to_a === 0 && (
                                  <Text fontSize="sm" color="fg.muted">
                                    None
                                  </Text>
                                )}
                            </VStack>
                          </Table.Cell>
                          <Table.Cell>
                            <VStack gap={1} align="start">
                              {contract.crew_from_a_to_b > 0 && (
                                <Text fontSize="sm">
                                  A → B: {contract.crew_from_a_to_b}
                                </Text>
                              )}
                              {contract.crew_from_b_to_a > 0 && (
                                <Text fontSize="sm">
                                  B → A: {contract.crew_from_b_to_a}
                                </Text>
                              )}
                              {contract.crew_from_a_to_b === 0 &&
                                contract.crew_from_b_to_a === 0 && (
                                  <Text fontSize="sm" color="fg.muted">
                                    None
                                  </Text>
                                )}
                            </VStack>
                          </Table.Cell>
                          <Table.Cell>
                            {contract.duration_rounds === null ? (
                              <Badge colorPalette="blue" size="sm">
                                Permanent
                              </Badge>
                            ) : (
                              <VStack gap={0} align="start">
                                <Text fontSize="sm" fontWeight="semibold">
                                  {contract.rounds_remaining} left
                                </Text>
                                <Text fontSize="xs" color="fg.muted">
                                  of {contract.duration_rounds}
                                </Text>
                              </VStack>
                            )}
                          </Table.Cell>
                          <Table.Cell>
                            <Badge
                              colorPalette={getStatusColor(contract.status)}
                              size="sm"
                            >
                              {contract.status}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>
                            <VStack gap={1}>
                              <Button
                                size="xs"
                                variant="outline"
                                colorPalette="gray"
                                onClick={() => handleEndContract(contract.id, false)}
                                loading={endContract.isPending}
                              >
                                End
                              </Button>
                              <Button
                                size="xs"
                                variant="outline"
                                colorPalette="red"
                                onClick={() => handleEndContract(contract.id, true)}
                                loading={endContract.isPending}
                              >
                                Break
                              </Button>
                            </VStack>
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table.ScrollArea>
              </Table.Root>
            </Box>
          )}

          {/* Inactive Contracts */}
          {inactiveContracts.length > 0 && (
            <Box>
              <Heading size="md" mb={3} color="gray.900">
                Past Contracts ({inactiveContracts.length})
              </Heading>
              <Table.Root size="sm" variant="outline">
                <Table.ScrollArea maxH="300px">
                  <Table.Header>
                    <Table.Row bg="gray.50">
                      <Table.ColumnHeader fontWeight="bold" color="gray.700">
                        Parties
                      </Table.ColumnHeader>
                      <Table.ColumnHeader fontWeight="bold" color="gray.700">
                        Created
                      </Table.ColumnHeader>
                      <Table.ColumnHeader fontWeight="bold" color="gray.700">
                        Ended
                      </Table.ColumnHeader>
                      <Table.ColumnHeader fontWeight="bold" color="gray.700">
                        Status
                      </Table.ColumnHeader>
                      <Table.ColumnHeader fontWeight="bold" color="gray.700">
                        Reason
                      </Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {inactiveContracts.map((contract: any) => {
                      const partyAName = getPlayerName(contract.party_a_id);
                      const partyBName = getPlayerName(contract.party_b_id);

                      return (
                        <Table.Row key={contract.id}>
                          <Table.Cell>
                            <Text fontSize="sm">
                              {partyAName} ⇄ {partyBName}
                            </Text>
                          </Table.Cell>
                          <Table.Cell>
                            <Text fontSize="sm">Round {contract.created_in_round}</Text>
                          </Table.Cell>
                          <Table.Cell>
                            <Text fontSize="sm">
                              Round {contract.ended_in_round || '?'}
                            </Text>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge
                              colorPalette={getStatusColor(contract.status)}
                              size="sm"
                            >
                              {contract.status}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>
                            <Text fontSize="xs" color="fg.muted">
                              {contract.reason_for_ending || 'N/A'}
                            </Text>
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table.ScrollArea>
              </Table.Root>
            </Box>
          )}
        </VStack>
      )}
    </Box>
  );
}
