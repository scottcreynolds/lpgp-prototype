import {
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
  DialogTrigger,
  Field,
  HStack,
  Input,
  Portal,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { useState } from "react";
import { useManualAdjustment } from "../hooks/useGameData";
import { toaster } from "./ui/toasterInstance";

interface ManualAdjustmentModalProps {
  playerId: string;
  playerName: string;
  currentEv: number;
  currentRep: number;
}

export function ManualAdjustmentModal({
  playerId,
  playerName,
  currentEv,
  currentRep,
}: ManualAdjustmentModalProps) {
  const [open, setOpen] = useState(false);
  const [evChange, setEvChange] = useState(0);
  const [repChange, setRepChange] = useState(0);
  const [reason, setReason] = useState("");

  const manualAdjustment = useManualAdjustment();

  const newEv = currentEv + evChange;
  const newRep = currentRep + repChange;

  const handleOpenChange = (details: { open: boolean }) => {
    setOpen(details.open);
    if (!details.open) {
      // Reset form when modal closes
      setEvChange(0);
      setRepChange(0);
      setReason("");
    }
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toaster.create({
        title: "Reason Required",
        description: "Please provide a reason for this adjustment",
        type: "error",
        duration: 3000,
      });
      return;
    }

    if (evChange === 0 && repChange === 0) {
      toaster.create({
        title: "No Changes",
        description: "Please enter an EV or REP adjustment",
        type: "error",
        duration: 3000,
      });
      return;
    }

    try {
      const result = await manualAdjustment.mutateAsync({
        playerId,
        evChange,
        repChange,
        reason: reason.trim(),
      });

      toaster.create({
        title: "Adjustment Applied",
        description: `${playerName}: EV ${currentEv} → ${result.new_ev}, REP ${currentRep} → ${result.new_rep}`,
        type: "success",
        duration: 4000,
      });

      // Reset form and close modal
      setEvChange(0);
      setRepChange(0);
      setReason("");
      setOpen(false);
    } catch (error) {
      toaster.create({
        title: "Failed to Apply Adjustment",
        description:
          error instanceof Error ? error.message : "Failed to apply adjustment",
        type: "error",
        duration: 5000,
      });
    }
  };

  return (
    <DialogRoot open={open} onOpenChange={handleOpenChange} size="lg">
      <DialogTrigger asChild>
        <Button colorPalette="orange" variant="outline" size="sm">
          Adjust
        </Button>
      </DialogTrigger>

      <Portal>
        <DialogBackdrop />
        <DialogContent
          css={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            maxHeight: "90vh",
            overflow: "auto",
          }}
        >
          <DialogHeader>
            <DialogTitle>Manual Adjustment - {playerName}</DialogTitle>
          </DialogHeader>

          <DialogBody>
            <VStack gap={4} align="stretch">
              {/* Current Values */}
              <Box
                p={3}
                bg="bg.muted"
                borderRadius="md"
                borderWidth={1}
                borderColor="border"
              >
                <Text
                  fontSize="sm"
                  fontWeight="semibold"
                  color="fg.emphasized"
                  mb={2}
                >
                  Current Values:
                </Text>
                <HStack justify="space-between">
                  <Text fontSize="sm" color="fg.muted">
                    EV:
                  </Text>
                  <Text fontSize="sm" fontWeight="semibold" color="fg">
                    {currentEv}
                  </Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="sm" color="fg.muted">
                    REP:
                  </Text>
                  <Text fontSize="sm" fontWeight="semibold" color="fg">
                    {currentRep}
                  </Text>
                </HStack>
              </Box>

              {/* EV Adjustment */}
              <Field.Root>
                <Field.Label>EV Change</Field.Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={evChange === 0 ? "" : evChange}
                  onChange={(e) => {
                    const value =
                      e.target.value === "" ? 0 : Number(e.target.value);
                    setEvChange(value);
                  }}
                />
                <Field.HelperText>
                  Positive values add EV, negative values subtract
                </Field.HelperText>
              </Field.Root>

              {/* REP Adjustment */}
              <Field.Root>
                <Field.Label>REP Change</Field.Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={repChange === 0 ? "" : repChange}
                  onChange={(e) => {
                    const value =
                      e.target.value === "" ? 0 : Number(e.target.value);
                    setRepChange(value);
                  }}
                />
                <Field.HelperText>
                  Positive values add REP, negative values subtract
                </Field.HelperText>
              </Field.Root>

              {/* Preview */}
              {(evChange !== 0 || repChange !== 0) && (
                <Box
                  p={3}
                  bg="bg.muted"
                  borderRadius="md"
                  borderWidth={1}
                  borderColor="border"
                >
                  <Text
                    fontSize="sm"
                    fontWeight="semibold"
                    color="fg.emphasized"
                    mb={2}
                  >
                    Preview:
                  </Text>
                  {evChange !== 0 && (
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="fg.muted">
                        EV:
                      </Text>
                      <Text fontSize="sm" fontWeight="semibold" color="fg">
                        {currentEv} {evChange > 0 ? "+" : ""}
                        {evChange} = {newEv}
                      </Text>
                    </HStack>
                  )}
                  {repChange !== 0 && (
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="fg.muted">
                        REP:
                      </Text>
                      <Text fontSize="sm" fontWeight="semibold" color="fg">
                        {currentRep} {repChange > 0 ? "+" : ""}
                        {repChange} = {newRep}
                      </Text>
                    </HStack>
                  )}
                </Box>
              )}

              {/* Reason */}
              <Field.Root>
                <Field.Label>Reason (Required)</Field.Label>
                <Textarea
                  placeholder="Explain why this adjustment is being made..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
                <Field.HelperText>
                  This will be logged in the ledger for research purposes
                </Field.HelperText>
              </Field.Root>
            </VStack>
          </DialogBody>

          <DialogFooter>
            <DialogActionTrigger asChild>
              <Button variant="outline">Cancel</Button>
            </DialogActionTrigger>
            <Button
              colorPalette="orange"
              onClick={handleSubmit}
              loading={manualAdjustment.isPending}
              disabled={
                !reason.trim() ||
                (evChange === 0 && repChange === 0) ||
                manualAdjustment.isPending
              }
            >
              Apply Adjustment
            </Button>
          </DialogFooter>

          <DialogCloseTrigger />
        </DialogContent>
      </Portal>
    </DialogRoot>
  );
}
