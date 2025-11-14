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
  Text,
  VStack,
} from "@chakra-ui/react";
import { FiCheckCircle } from "react-icons/fi";
import type { Contract, DashboardPlayer } from "../lib/database.types";

interface EndContractModalProps {
  open: boolean;
  onClose: () => void;
  contract: Contract;
  allPlayers: DashboardPlayer[];
  onConfirm: () => void;
  isPending?: boolean;
}

export function EndContractModal({
  open,
  onClose,
  contract,
  allPlayers,
  onConfirm,
  isPending,
}: EndContractModalProps) {
  // Get party names
  const partyA = allPlayers.find((p) => p.id === contract.party_a_id);
  const partyB = allPlayers.find((p) => p.id === contract.party_b_id);

  const handleOpenChange = (e: { open: boolean }) => {
    if (!e.open) {
      onClose();
    }
  };

  const { repBonusOnCompletion } = gameSettings.contracts;

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
          <DialogTitle>End Contract</DialogTitle>
        </DialogHeader>
        <DialogCloseTrigger />

        <DialogBody>
          <VStack gap={4} align="stretch">
            <Alert.Root status="success" variant="subtle">
              <Alert.Indicator>
                <FiCheckCircle />
              </Alert.Indicator>
              <Alert.Content>
                <Alert.Title>Contract Completion</Alert.Title>
                <Alert.Description>
                  Ending this contract successfully will reward both parties
                  with reputation bonuses.
                </Alert.Description>
              </Alert.Content>
            </Alert.Root>

            <Box>
              <Text fontWeight="medium" mb={2}>
                Contract Parties:
              </Text>
              <VStack gap={2} align="stretch">
                {partyA && (
                  <Box
                    borderWidth="1px"
                    borderColor="gray.300"
                    borderRadius="md"
                    p={3}
                    bg="green.50"
                  >
                    <Text fontWeight="semibold">{partyA.name}</Text>
                    {repBonusOnCompletion > 0 && (
                      <Text fontSize="sm" color="green.700" fontWeight="bold">
                        +{repBonusOnCompletion} REP
                      </Text>
                    )}
                  </Box>
                )}
                {partyB && (
                  <Box
                    borderWidth="1px"
                    borderColor="gray.300"
                    borderRadius="md"
                    p={3}
                    bg="green.50"
                  >
                    <Text fontWeight="semibold">{partyB.name}</Text>
                    {repBonusOnCompletion > 0 && (
                      <Text fontSize="sm" color="green.700" fontWeight="bold">
                        +{repBonusOnCompletion} REP
                      </Text>
                    )}
                  </Box>
                )}
              </VStack>
            </Box>

            {repBonusOnCompletion > 0 && (
              <Alert.Root status="info" variant="subtle" size="sm">
                <Alert.Content>
                  <Text fontSize="sm">
                    Both parties will receive{" "}
                    <strong>+{repBonusOnCompletion} REP</strong> for
                    successfully completing this contract.
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
            colorPalette="green"
            onClick={onConfirm}
            disabled={isPending}
            loading={isPending}
          >
            End Contract
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
