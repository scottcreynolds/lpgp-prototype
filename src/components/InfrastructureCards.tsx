import { getSpecializationColor } from "@/lib/specialization";
import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  HStack,
  IconButton,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import type { ReactElement } from "react";
import { useState } from "react";
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
import { FiArrowDown, FiArrowUp } from "react-icons/fi";
import { LuPickaxe } from "react-icons/lu";
import {
  useAddPlayer,
  useContracts,
  useEditPlayer,
} from "../hooks/useGameData";
import type {
  Contract,
  DashboardPlayer,
  Specialization,
} from "../lib/database.types";
import { useGameStore } from "../store/gameStore";
import { AddPlayerModal } from "./AddPlayerModal";
import { BuildInfrastructureModal } from "./BuildInfrastructureModal";
import { EditPlayerModal } from "./EditPlayerModal";
import { HelpModal } from "./HelpModal";
import { PlayerInfoModal } from "./PlayerInfoModal";
import { PlayerInventoryModal } from "./PlayerInventoryModal";
import SpecializationIcon from "./SpecializationIcon";
import { toaster } from "./ui/toasterInstance";
import { Tooltip } from "./ui/tooltip";

interface InfrastructureCardsProps {
  players: DashboardPlayer[];
}

export function InfrastructureCards({ players }: InfrastructureCardsProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const editPlayer = useEditPlayer();
  const { data: allContracts } = useContracts();
  const currentRound = useGameStore((state) => state.currentRound);
  const currentPhase = useGameStore((state) => state.currentPhase);
  const addPlayer = useAddPlayer();

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

  const getContractCapacityDetails = (playerId: string) => {
    const activeContracts =
      allContracts?.filter((c: Contract) => c.status === "active") || [];
    const powerIn: Array<{ amount: number; from: string }> = [];
    const powerOut: Array<{ amount: number; to: string }> = [];
    const crewIn: Array<{ amount: number; from: string }> = [];
    const crewOut: Array<{ amount: number; to: string }> = [];

    activeContracts.forEach((contract: Contract) => {
      if (contract.party_a_id === playerId) {
        // Player is Party A
        if (contract.power_from_b_to_a > 0) {
          const partnerName =
            players.find((p) => p.id === contract.party_b_id)?.name ||
            "Unknown";
          powerIn.push({
            amount: contract.power_from_b_to_a,
            from: partnerName,
          });
        }
        if (contract.power_from_a_to_b > 0) {
          const partnerName =
            players.find((p) => p.id === contract.party_b_id)?.name ||
            "Unknown";
          powerOut.push({
            amount: contract.power_from_a_to_b,
            to: partnerName,
          });
        }
        if (contract.crew_from_b_to_a > 0) {
          const partnerName =
            players.find((p) => p.id === contract.party_b_id)?.name ||
            "Unknown";
          crewIn.push({ amount: contract.crew_from_b_to_a, from: partnerName });
        }
        if (contract.crew_from_a_to_b > 0) {
          const partnerName =
            players.find((p) => p.id === contract.party_b_id)?.name ||
            "Unknown";
          crewOut.push({ amount: contract.crew_from_a_to_b, to: partnerName });
        }
      } else if (contract.party_b_id === playerId) {
        // Player is Party B
        if (contract.power_from_a_to_b > 0) {
          const partnerName =
            players.find((p) => p.id === contract.party_a_id)?.name ||
            "Unknown";
          powerIn.push({
            amount: contract.power_from_a_to_b,
            from: partnerName,
          });
        }
        if (contract.power_from_b_to_a > 0) {
          const partnerName =
            players.find((p) => p.id === contract.party_a_id)?.name ||
            "Unknown";
          powerOut.push({
            amount: contract.power_from_b_to_a,
            to: partnerName,
          });
        }
        if (contract.crew_from_a_to_b > 0) {
          const partnerName =
            players.find((p) => p.id === contract.party_a_id)?.name ||
            "Unknown";
          crewIn.push({ amount: contract.crew_from_a_to_b, from: partnerName });
        }
        if (contract.crew_from_b_to_a > 0) {
          const partnerName =
            players.find((p) => p.id === contract.party_a_id)?.name ||
            "Unknown";
          crewOut.push({ amount: contract.crew_from_b_to_a, to: partnerName });
        }
      }
    });

    return { powerIn, powerOut, crewIn, crewOut };
  };

  const getContractEV = (playerId: string) => {
    const activeContracts =
      allContracts?.filter((c: Contract) => c.status === "active") || [];
    let netEV = 0;

    activeContracts.forEach((contract: Contract) => {
      if (contract.party_a_id === playerId) {
        // Player is Party A
        const evFromB = contract.ev_from_b_to_a;
        const evToB = contract.ev_from_a_to_b;
        const evChange = evFromB - evToB;

        if (contract.ev_is_per_round) {
          netEV += evChange;
        }
      } else if (contract.party_b_id === playerId) {
        // Player is Party B
        const evFromA = contract.ev_from_a_to_b;
        const evToA = contract.ev_from_b_to_a;
        const evChange = evFromA - evToA;

        if (contract.ev_is_per_round) {
          netEV += evChange;
        }
      }
    });

    return netEV;
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

  const handleAddPlayer = async (
    name: string,
    specialization: Specialization
  ) => {
    try {
      await addPlayer.mutateAsync({ name, specialization });
      toaster.create({
        title: "Player Added",
        description: `${name} joined as ${specialization}`,
        type: "success",
        duration: 3000,
      });
    } catch (error) {
      toaster.create({
        title: "Failed to Add Player",
        description:
          error instanceof Error ? error.message : "Failed to add player",
        type: "error",
        duration: 5000,
      });
    }
  };

  const renderCapacityPanel = (
    label: string,
    icon: ReactElement,
    used: number,
    capacity: number,
    incoming: Array<{ amount: number; from: string }>,
    outgoing: Array<{ amount: number; to: string }>
  ) => {
    const available = capacity - used;
    const hasShortage = available < 0;
    const hasSurplus = available > 0;
    const bgColor = hasShortage
      ? "bg.error.subtle"
      : hasSurplus
      ? "bg.success.subtle"
      : "bg";
    const statusBadge = hasShortage
      ? { label: "SHORTAGE", palette: "red" as const }
      : hasSurplus
      ? { label: "SURPLUS", palette: "green" as const }
      : undefined;
    const availableColor = hasShortage
      ? "red.500"
      : hasSurplus
      ? "green.500"
      : "fg";

    return (
      <Box
        key={label}
        p={3}
        bg={bgColor}
        borderRadius="md"
        borderWidth={1}
        borderColor="border"
        overflow="hidden"
      >
        <HStack gap={2} mb={2} align="center" justify="space-between">
          <HStack gap={2} align="center" minW={0}>
            <Box color="fg">{icon}</Box>
            <Box
              fontSize="xs"
              fontWeight="bold"
              color="fg"
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
            >
              {label}
            </Box>
          </HStack>
          {statusBadge && (
            <Badge
              size="sm"
              colorPalette={statusBadge.palette}
              whiteSpace="nowrap"
            >
              {statusBadge.label}
            </Badge>
          )}
        </HStack>

        <VStack align="stretch" gap={1} mb={2}>
          <Text fontSize="sm" color="fg">
            Total Capacity:{" "}
            <Box as="span" fontWeight="semibold">
              {capacity}
            </Box>
          </Text>
          <Text fontSize="sm" color="fg">
            In Use:{" "}
            <Box as="span" fontWeight="semibold">
              {used}
            </Box>
          </Text>
          <Text fontSize="sm" color={availableColor}>
            Available:{" "}
            <Box as="span" fontWeight="semibold">
              {available}
            </Box>
          </Text>
        </VStack>

        {(incoming.length > 0 || outgoing.length > 0) && (
          <VStack gap={1} align="stretch">
            {incoming.map((item, idx) => (
              <HStack key={`${label}-in-${idx}`} gap={1} fontSize="xs">
                <FiArrowDown color="green" />
                <Text color="fg.muted">
                  +{item.amount} from {item.from}
                </Text>
              </HStack>
            ))}
            {outgoing.map((item, idx) => (
              <HStack key={`${label}-out-${idx}`} gap={1} fontSize="xs">
                <FiArrowUp color="orange" />
                <Text color="fg.muted">
                  -{item.amount} to {item.to}
                </Text>
              </HStack>
            ))}
          </VStack>
        )}
      </Box>
    );
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
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="lg" color="fg">
          Infrastructure Overview
        </Heading>
        <HStack gap={2}>
          {currentPhase === "Setup" && (
            <AddPlayerModal
              onAddPlayer={handleAddPlayer}
              isPending={addPlayer.isPending}
            />
          )}
          <Button
            size="sm"
            variant="outline"
            colorPalette="sapphireWool"
            onClick={() => setHelpOpen(true)}
          >
            Infrastructure Values
          </Button>
        </HStack>
      </Flex>
      <HelpModal
        topic={"infrastructure-table"}
        open={helpOpen}
        onOpenChange={setHelpOpen}
      />

      <Grid
        templateColumns={{
          base: "repeat(1, 1fr)",
          md: "repeat(2, 1fr)",
          lg: "repeat(3, 1fr)",
        }}
        gap={4}
      >
        {players.map((player) => {
          const { totals } = player;
          const infrastructureCounts = getInfrastructureCounts(player);
          const contractCapacity = getContractCapacityDetails(player.id);
          const contractEV = getContractEV(player.id);
          const infrastructureNetEV =
            totals.total_yield - totals.total_maintenance_cost;
          const totalNetEV = infrastructureNetEV + contractEV;
          const inactiveCount = player.infrastructure.filter(
            (i) => !i.is_active
          ).length;

          return (
            <Box
              key={player.id}
              bg="boldTangerine.contrast"
              p={5}
              borderRadius="lg"
              borderWidth={2}
              borderColor={`${getSpecializationColor(
                player.specialization
              )}.400`}
              shadow="md"
              position="relative"
              transition="box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease"
              _hover={{
                boxShadow: "lg",
                transform: "translateY(-2px)",
                borderColor: `${getSpecializationColor(
                  player.specialization
                )}.500`,
              }}
            >
              <VStack align="stretch" gap={4}>
                {/* Player Header */}
                <Flex
                  justify="space-between"
                  align="center"
                  position="relative"
                  gap={2}
                >
                  <Box minW={0} flex="1">
                    <HStack gap={2} align="center" minW={0}>
                      <Text
                        fontWeight="bold"
                        fontSize="lg"
                        color="fg"
                        overflow="hidden"
                        textOverflow="ellipsis"
                        whiteSpace="nowrap"
                      >
                        {player.name}
                      </Text>
                      <PlayerInfoModal
                        playerName={player.name}
                        specialization={player.specialization}
                      />
                    </HStack>
                    <HStack
                      gap={2}
                      align="center"
                      mt={1}
                      flexWrap="wrap"
                      minW={0}
                    >
                      <HStack gap={1} align="center" flexWrap="wrap" minW={0}>
                        <SpecializationIcon
                          specialization={player.specialization}
                        />
                        <Badge
                          size="sm"
                          colorPalette={getSpecializationColor(
                            player.specialization
                          )}
                        >
                          {player.specialization}
                        </Badge>
                      </HStack>
                      <HStack gap={2} align="center" flexWrap="wrap" minW={0}>
                        <Badge
                          size="sm"
                          colorPalette="flamingoGold"
                          whiteSpace="nowrap"
                        >
                          {player.ev} EV
                        </Badge>
                        <Badge
                          size="sm"
                          colorPalette="purple"
                          whiteSpace="nowrap"
                        >
                          REP {player.rep}
                        </Badge>
                      </HStack>
                      {inactiveCount > 0 && (
                        <Badge
                          size="sm"
                          colorPalette="orange"
                          title="Some infrastructure is inactive. Open Inventory to manage."
                        >
                          Inactive: {inactiveCount}
                        </Badge>
                      )}
                    </HStack>
                    <HStack gap={2} mt={3}>
                      <PlayerInventoryModal
                        playerId={player.id}
                        playerName={player.name}
                        infrastructure={player.infrastructure}
                        trigger={
                          <Button
                            size="xs"
                            colorPalette="flamingoGold"
                            variant="outline"
                          >
                            Manage Infrastructure
                          </Button>
                        }
                      />
                      <BuildInfrastructureModal
                        builderId={player.id}
                        builderName={player.name}
                        builderEv={player.ev}
                        players={players}
                        disabled={currentPhase !== "Operations"}
                      />
                    </HStack>
                  </Box>
                  <HStack gap={2} align="center" flexShrink={0}>
                    <Tooltip
                      content="Infrastructure Values"
                      showArrow
                      positioning={{ placement: "top" }}
                    >
                      <IconButton
                        size="sm"
                        aria-label={`Infrastructure Values for ${player.name}`}
                        variant="ghost"
                        onClick={() => setHelpOpen(true)}
                        color="voidNavy.700"
                        _hover={{
                          color: "boldTangerine.100",
                          bg: "voidNavy.700",
                        }}
                      >
                        <LuPickaxe />
                      </IconButton>
                    </Tooltip>

                    <EditPlayerModal
                      playerId={player.id}
                      currentName={player.name}
                      currentSpecialization={player.specialization}
                      onEditPlayer={handleEditPlayer}
                      isPending={editPlayer.isPending}
                      currentRound={currentRound}
                    />
                  </HStack>
                </Flex>

                {/* Infrastructure Counts */}
                <Box>
                  <Text fontSize="sm" fontWeight="semibold" mb={2} color="fg">
                    Infrastructure
                  </Text>
                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={2}>
                    {Object.entries(infrastructureCounts).map(
                      ([type, count]) => (
                        <HStack key={type} gap={2}>
                          <Box color="fg" fontSize="sm" bg="bg.panel">
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
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                  {renderCapacityPanel(
                    "Power",
                    <FaBolt />,
                    totals.total_power_used,
                    totals.net_power_capacity,
                    contractCapacity.powerIn,
                    contractCapacity.powerOut
                  )}
                  {renderCapacityPanel(
                    "Crew",
                    <FaUsers />,
                    totals.total_crew_used,
                    totals.net_crew_capacity,
                    contractCapacity.crewIn,
                    contractCapacity.crewOut
                  )}
                </SimpleGrid>

                {/* Financial Stats */}
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                  <Box
                    p={3}
                    bg="bg"
                    borderRadius="md"
                    borderWidth={1}
                    borderColor="border"
                  >
                    <HStack gap={2} mb={1}>
                      <Box color="fg">
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
                    bg={totals.total_yield > 0 ? "bg.success.subtle" : "bg"}
                    borderRadius="md"
                    borderWidth={1}
                    borderColor="border"
                  >
                    <HStack gap={2} mb={1}>
                      <Box color="fg">
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
                  p={3}
                  bg={
                    totalNetEV > 0
                      ? "bg.success.subtle"
                      : totalNetEV < 0
                      ? "bg.error.subtle"
                      : "boldTangerine.contrast"
                  }
                  borderRadius="md"
                >
                  <Text
                    fontSize="xs"
                    color="fg"
                    mb={2}
                    fontWeight="bold"
                    textAlign="center"
                  >
                    Net EV Per Round
                  </Text>
                  <Text
                    fontSize="xl"
                    fontWeight="bold"
                    color="fg"
                    textAlign="center"
                  >
                    {totalNetEV > 0 ? "+" : ""}
                    {totalNetEV} EV
                  </Text>
                  <VStack gap={1} mt={2} align="stretch">
                    <HStack justify="space-between" fontSize="xs">
                      <Text color="fg.muted">Infrastructure:</Text>
                      <Text color="fg" fontWeight="medium">
                        {infrastructureNetEV > 0 ? "+" : ""}
                        {infrastructureNetEV} EV
                      </Text>
                    </HStack>
                    {contractEV !== 0 && (
                      <HStack justify="space-between" fontSize="xs">
                        <Text color="fg.muted">Contracts:</Text>
                        <Text color="fg" fontWeight="medium">
                          {contractEV > 0 ? "+" : ""}
                          {contractEV} EV
                        </Text>
                      </HStack>
                    )}
                  </VStack>
                </Box>
              </VStack>
            </Box>
          );
        })}
      </Grid>
    </Box>
  );
}
