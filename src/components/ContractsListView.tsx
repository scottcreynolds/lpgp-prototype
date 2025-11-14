import { gameSettings } from "@/config/gameSettings";
import { useGameStore } from "@/store/gameStore";
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
} from "@chakra-ui/react";
import { useState } from "react";
import { useContracts, useEndContract } from "../hooks/useGameData";
import type { Contract, DashboardPlayer } from "../lib/database.types";
import { BreakContractModal } from "./BreakContractModal";
import { EndContractModal } from "./EndContractModal";
import { toaster } from "./ui/toasterInstance";

interface ContractsListViewProps {
  players: DashboardPlayer[];
  currentRound: number;
}

export function ContractsListView({ players }: ContractsListViewProps) {
  const [filterPlayerId, setFilterPlayerId] = useState<string>("all");
  const [selectedContract, setSelectedContract] = useState<Contract | null>(
    null
  );
  const [breakModalOpen, setBreakModalOpen] = useState(false);
  const [endModalOpen, setEndModalOpen] = useState(false);

  const { data: contracts, isLoading } = useContracts(
    filterPlayerId === "all" ? undefined : filterPlayerId
  );
  const endContract = useEndContract();
  const gameEnded = useGameStore((s) => s.gameEnded);

  const handleBreakContract = async (breakerId: string) => {
    if (!selectedContract) return;

    const { repPenaltyBreaker, repPenaltyVictim } = gameSettings.contracts;

    // Find player names for toast
    const breaker = players.find((p) => p.id === breakerId);
    const victim = players.find(
      (p) =>
        p.id ===
        (breakerId === selectedContract.party_a_id
          ? selectedContract.party_b_id
          : selectedContract.party_a_id)
    );

    try {
      await endContract.mutateAsync({
        contractId: selectedContract.id,
        reason: "Contract broken",
        isBroken: true,
        breakerId,
      });

      // Build REP change message
      const repChanges: string[] = [];
      if (breaker && repPenaltyBreaker > 0) {
        repChanges.push(`${breaker.name} (breaker): -${repPenaltyBreaker} REP`);
      }
      if (victim && repPenaltyVictim > 0) {
        repChanges.push(`${victim.name} (victim): -${repPenaltyVictim} REP`);
      }

      toaster.create({
        title: "Contract Broken",
        description:
          repChanges.length > 0
            ? repChanges.join(", ")
            : "Contract broken successfully",
        type: "info",
        duration: 5000,
      });

      setBreakModalOpen(false);
      setSelectedContract(null);
    } catch (error) {
      toaster.create({
        title: "Failed to Break Contract",
        description:
          error instanceof Error ? error.message : "Failed to break contract",
        type: "error",
        duration: 5000,
      });
    }
  };

  const handleEndContractSuccess = async () => {
    if (!selectedContract) return;

    const { repBonusOnCompletion } = gameSettings.contracts;

    // Find party names for toast
    const partyA = players.find((p) => p.id === selectedContract.party_a_id);
    const partyB = players.find((p) => p.id === selectedContract.party_b_id);

    try {
      await endContract.mutateAsync({
        contractId: selectedContract.id,
        reason: "Contract ended by mutual agreement",
        isBroken: false,
        breakerId: null,
      });

      // Build REP change message
      const repChanges: string[] = [];
      if (repBonusOnCompletion > 0) {
        if (partyA)
          repChanges.push(`${partyA.name}: +${repBonusOnCompletion} REP`);
        if (partyB)
          repChanges.push(`${partyB.name}: +${repBonusOnCompletion} REP`);
      }

      toaster.create({
        title: "Contract Ended",
        description:
          repChanges.length > 0
            ? repChanges.join(", ")
            : "Contract ended successfully",
        type: "success",
        duration: 5000,
      });

      setEndModalOpen(false);
      setSelectedContract(null);
    } catch (error) {
      toaster.create({
        title: "Failed to End Contract",
        description:
          error instanceof Error ? error.message : "Failed to end contract",
        type: "error",
        duration: 5000,
      });
    }
  };

  const getPlayerName = (playerId: string) => {
    return players.find((p) => p.id === playerId)?.name || "Unknown";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "green";
      case "ended":
        return "gray";
      case "broken":
        return "red";
      default:
        return "gray";
    }
  };

  if (isLoading) {
    return (
      <Box
        bg="bg"
        p={6}
        borderRadius="lg"
        borderWidth={1}
        borderColor="border.emphasized"
        shadow="sm"
      >
        <Text>Loading contracts...</Text>
      </Box>
    );
  }

  const activeContracts =
    (contracts as Contract[] | undefined)?.filter(
      (c) => c.status === "active"
    ) || [];
  const inactiveContracts =
    (contracts as Contract[] | undefined)
      ?.filter((c) => c.status !== "active")
      .sort((a, b) => (b.ended_in_round || 0) - (a.ended_in_round || 0)) || [];

  return (
    <Box
      bg="bg.panel"
      p={6}
      borderRadius="lg"
      borderWidth={1}
      borderColor="border.emphasized"
      shadow="sm"
      width="full"
    >
      <HStack justify="space-between" mb={4}>
        <Heading size="lg" color="fg.emphasized">
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
          <Text color="fg" fontSize="lg">
            No contracts found
          </Text>
          <Text color="fg" fontSize="sm" mt={2}>
            {filterPlayerId === "all"
              ? "Create a contract during the Governance phase"
              : "This player has no contracts"}
          </Text>
        </Box>
      ) : (
        <VStack gap={6} align="stretch">
          {/* Active Contracts */}
          {activeContracts.length > 0 && (
            <Box width="full">
              <Heading size="md" mb={3} color="fg.emphasized">
                Active Contracts ({activeContracts.length})
              </Heading>
              <Table.ScrollArea maxH="400px">
                <Table.Root
                  size="lg"
                  variant="outline"
                  interactive
                  colorPalette="softOchre"
                >
                  <Table.Header bg="bg">
                    <Table.Row>
                      <Table.ColumnHeader fontWeight="bold">
                        Parties
                      </Table.ColumnHeader>
                      <Table.ColumnHeader fontWeight="bold">
                        EV Exchange
                      </Table.ColumnHeader>
                      <Table.ColumnHeader fontWeight="bold">
                        Power
                      </Table.ColumnHeader>
                      <Table.ColumnHeader fontWeight="bold">
                        Crew
                      </Table.ColumnHeader>
                      <Table.ColumnHeader fontWeight="bold">
                        Duration
                      </Table.ColumnHeader>
                      <Table.ColumnHeader fontWeight="bold">
                        Status
                      </Table.ColumnHeader>
                      <Table.ColumnHeader fontWeight="bold">
                        Actions
                      </Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {activeContracts.map((contract: Contract) => {
                      const partyAName = getPlayerName(contract.party_a_id);
                      const partyBName = getPlayerName(contract.party_b_id);

                      return (
                        <Table.Row key={contract.id}>
                          <Table.Cell>
                            <VStack gap={1} align="start">
                              <Text fontWeight="semibold" fontSize="sm">
                                {partyAName}
                              </Text>
                              <Text fontSize="xs" color="fg">
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
                                  {partyAName.substring(0, 10)} →{" "}
                                  {partyBName.substring(0, 10)}:{" "}
                                  {contract.ev_from_a_to_b}
                                  {contract.ev_is_per_round ? "/r" : ""}
                                </Text>
                              )}
                              {contract.ev_from_b_to_a > 0 && (
                                <Text fontSize="sm">
                                  {partyBName.substring(0, 10)} →{" "}
                                  {partyAName.substring(0, 10)}:{" "}
                                  {contract.ev_from_b_to_a}
                                  {contract.ev_is_per_round ? "/r" : ""}
                                </Text>
                              )}
                              {contract.ev_from_a_to_b === 0 &&
                                contract.ev_from_b_to_a === 0 && (
                                  <Text fontSize="sm" color="fg">
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
                                  <Text fontSize="sm" color="fg">
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
                                  <Text fontSize="sm" color="fg">
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
                                <Text fontSize="xs" color="fg">
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
                                variant="surface"
                                colorPalette="green"
                                onClick={() => {
                                  setSelectedContract(contract);
                                  setEndModalOpen(true);
                                }}
                                loading={endContract.isPending}
                                disabled={gameEnded}
                              >
                                End
                              </Button>
                              <Button
                                size="xs"
                                variant="surface"
                                colorPalette="red"
                                onClick={() => {
                                  setSelectedContract(contract);
                                  setBreakModalOpen(true);
                                }}
                                loading={endContract.isPending}
                                disabled={gameEnded}
                              >
                                Break
                              </Button>
                            </VStack>
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table.Root>
              </Table.ScrollArea>
            </Box>
          )}

          {/* Inactive Contracts */}
          {inactiveContracts.length > 0 && (
            <Box width="full">
              <Heading size="md" mb={3} color="fg.emphasized">
                Past Contracts ({inactiveContracts.length})
              </Heading>
              <Table.ScrollArea maxH="300px">
                <Table.Root size="sm" variant="outline" width="full">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader fontWeight="bold">
                        Parties
                      </Table.ColumnHeader>
                      <Table.ColumnHeader fontWeight="bold">
                        Created
                      </Table.ColumnHeader>
                      <Table.ColumnHeader fontWeight="bold">
                        Ended
                      </Table.ColumnHeader>
                      <Table.ColumnHeader fontWeight="bold">
                        Status
                      </Table.ColumnHeader>
                      <Table.ColumnHeader fontWeight="bold">
                        Reason
                      </Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {inactiveContracts.map((contract: Contract) => {
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
                            <Text fontSize="sm">
                              Round {contract.created_in_round}
                            </Text>
                          </Table.Cell>
                          <Table.Cell>
                            <Text fontSize="sm">
                              Round {contract.ended_in_round || "?"}
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
                            <Text fontSize="xs" color="fg">
                              {contract.reason_for_ending || "N/A"}
                            </Text>
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table.Root>
              </Table.ScrollArea>
            </Box>
          )}
        </VStack>
      )}

      {/* Modals */}
      {selectedContract && (
        <>
          <BreakContractModal
            open={breakModalOpen}
            onClose={() => {
              setBreakModalOpen(false);
              setSelectedContract(null);
            }}
            contract={selectedContract}
            allPlayers={players}
            onConfirm={handleBreakContract}
            isPending={endContract.isPending}
          />
          <EndContractModal
            open={endModalOpen}
            onClose={() => {
              setEndModalOpen(false);
              setSelectedContract(null);
            }}
            contract={selectedContract}
            allPlayers={players}
            onConfirm={handleEndContractSuccess}
            isPending={endContract.isPending}
          />
        </>
      )}
    </Box>
  );
}
