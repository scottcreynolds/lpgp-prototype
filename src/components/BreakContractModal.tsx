import { gameSettings } from "@/config/gameSettings";
import {
  Alert,
  Box,
  Button,
  DialogActionTrigger,
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  Flex,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useState } from "react";
import { FiAlertTriangle } from "react-icons/fi";
import type { Contract, DashboardPlayer } from "../lib/database.types";

interface BreakContractModalProps {
  open: boolean;
  onClose: () => void;
  contract: Contract;
  allPlayers: DashboardPlayer[];
  onConfirm: (breakerId: string) => void;
  isPending?: boolean;
}

export function BreakContractModal({
  open,
  onClose,
  contract,
  allPlayers,
  onConfirm,
  isPending,
}: BreakContractModalProps) {
  const [selectedBreakerId, setSelectedBreakerId] = useState<string | null>(
    null
  );

  // Filter to only the two contract parties and sort alphabetically
  const contractParties = allPlayers
    .filter((p) => p.id === contract.party_a_id || p.id === contract.party_b_id)
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleConfirm = () => {
    if (selectedBreakerId) {
      onConfirm(selectedBreakerId);
      setSelectedBreakerId(null);
    }
  };

  const handleOpenChange = (e: { open: boolean }) => {
    if (!e.open) {
      setSelectedBreakerId(null);
      onClose();
    }
  };

  const { repPenaltyBreaker, repPenaltyVictim } = gameSettings.contracts;

  return (
    <DialogRoot open={open} onOpenChange={handleOpenChange}>
      <DialogBackdrop />
      <DialogContent
        css={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          maxHeight: "90vh",
          overflow: "auto",
          width: "min(95vw, 500px)",
        }}
      >
        <DialogHeader>
          <DialogTitle>Break Contract</DialogTitle>
        </DialogHeader>
        <DialogCloseTrigger />

        <DialogBody>
          <VStack gap={4} align="stretch">
            <Alert.Root status="warning" variant="subtle">
              <Alert.Indicator>
                <FiAlertTriangle />
              </Alert.Indicator>
              <Alert.Content>
                <Alert.Title>Warning: Contract Break</Alert.Title>
                <Alert.Description>
                  Breaking a contract will apply reputation penalties. Select
                  which player is breaking the contract.
                </Alert.Description>
              </Alert.Content>
            </Alert.Root>

            <Box>
              <Text fontWeight="medium" mb={2}>
                Who is breaking the contract?
              </Text>
              <VStack gap={2} align="stretch">
                {contractParties.map((player) => {
                  const isSelected = selectedBreakerId === player.id;
                  const isBreaker = isSelected;
                  const penalty = isBreaker
                    ? repPenaltyBreaker
                    : repPenaltyVictim;

                  return (
                    <Box
                      key={player.id}
                      onClick={() => setSelectedBreakerId(player.id)}
                      cursor="pointer"
                      borderWidth="2px"
                      borderColor={isSelected ? "red.500" : "gray.300"}
                      borderRadius="md"
                      p={3}
                      bg={isSelected ? "red.50" : "transparent"}
                      transition="all 0.2s"
                      _hover={{
                        borderColor: isSelected ? "red.600" : "red.400",
                        bg: isSelected ? "red.100" : "red.50",
                        transform: "translateY(-1px)",
                      }}
                    >
                      <Flex justify="space-between" align="center">
                        <Text fontWeight="semibold">{player.name}</Text>
                        {isSelected && penalty > 0 && (
                          <Text fontSize="sm" color="red.700" fontWeight="bold">
                            -{penalty} REP
                          </Text>
                        )}
                      </Flex>
                    </Box>
                  );
                })}
              </VStack>
            </Box>

            {selectedBreakerId && (
              <Alert.Root status="error" variant="subtle" size="sm">
                <Alert.Content>
                  <Text fontSize="sm">
                    <strong>Breaker:</strong> -{repPenaltyBreaker} REP
                    {repPenaltyVictim > 0 && (
                      <>
                        <br />
                        <strong>Victim:</strong> -{repPenaltyVictim} REP
                      </>
                    )}
                  </Text>
                </Alert.Content>
              </Alert.Root>
            )}
          </VStack>
        </DialogBody>

        <DialogFooter>
          <DialogActionTrigger asChild>
            <Button variant="outline" disabled={isPending}>
              Cancel
            </Button>
          </DialogActionTrigger>
          <Button
            colorPalette="red"
            onClick={handleConfirm}
            disabled={!selectedBreakerId || isPending}
            loading={isPending}
          >
            Break Contract
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
