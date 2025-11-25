import { useSetStarterInfraLocation } from "@/hooks/useSetStarterInfraLocation";
import { ensureDialogClosed } from "@/lib/ui";
import {
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
  Input,
  Portal,
  VStack,
} from "@chakra-ui/react";
import { useState } from "react";
import type { Specialization } from "../lib/database.types";
import LocationPicker from "./LocationPicker";
import SpecializationSelector from "./SpecializationSelector";
import { toaster } from "./ui/toasterInstance";

interface AddPlayerModalProps {
  onAddPlayer: (
    name: string,
    specialization: Specialization
  ) => Promise<string | void>; // return player id if available
  isPending?: boolean;
  externalOpen?: boolean; // controlled open state (optional)
  onExternalClose?: () => void; // callback when controlled modal requests close
  hideTrigger?: boolean; // hide built-in trigger button
  onPlayerCreated?: (playerId: string) => void; // callback when player created
}

export function AddPlayerModal({
  onAddPlayer,
  isPending,
  externalOpen,
  onExternalClose,
  hideTrigger,
  onPlayerCreated,
}: AddPlayerModalProps) {
  const [open, setOpen] = useState(false); // internal fallback state
  const [companyName, setCompanyName] = useState("");
  const [specialization, setSpecialization] =
    useState<Specialization>("Resource Extractor");
  const [starterLocationName, setStarterLocationName] = useState("");
  const [starterLocationNumber, setStarterLocationNumber] = useState("");
  const setStarterLoc = useSetStarterInfraLocation();

  const controlled = externalOpen !== undefined;
  const effectiveOpen = controlled ? externalOpen! : open;

  const handleSubmit = async () => {
    if (!companyName.trim()) {
      return;
    }

    const createdId = await onAddPlayer(companyName.trim(), specialization);
    if (createdId && onPlayerCreated) {
      onPlayerCreated(createdId);
    }

    // Persist starter location to backend if provided
    if (createdId && starterLocationName.trim()) {
      const combinedLocation = `${starterLocationName}${
        starterLocationNumber !== "" ? ` ${starterLocationNumber}` : ""
      }`.trim();
      try {
        await setStarterLoc.mutateAsync({
          playerId: createdId,
          location: combinedLocation,
        });
        toaster.create({
          title: "Starter Location Saved",
          description: `Starter infrastructure placed at ${combinedLocation}`,
          type: "success",
          duration: 3000,
        });
      } catch (e) {
        toaster.create({
          title: "Failed to Save Starter Location",
          description:
            e instanceof Error ? e.message : "Failed to save location",
          type: "error",
          duration: 5000,
        });
      }
    }

    // Reset form and close modal
    setCompanyName("");
    setSpecialization("Resource Extractor");
    setStarterLocationName("");
    setStarterLocationNumber("");
    if (controlled) {
      onExternalClose?.();
      setTimeout(() => ensureDialogClosed(), 0);
    } else {
      setOpen(false);
      setTimeout(() => ensureDialogClosed(), 0);
    }
  };

  const handleOpenChange = (e: { open: boolean }) => {
    if (controlled) {
      if (!e.open) onExternalClose?.();
    } else {
      setOpen(e.open);
    }
  };

  return (
    <DialogRoot open={effectiveOpen} onOpenChange={handleOpenChange} size="xl">
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button colorPalette="flamingoGold" variant="outline">
            Add Player
          </Button>
        </DialogTrigger>
      )}

      <Portal>
        <DialogBackdrop />
        <DialogContent
          css={{
            position: "fixed",
            top: "40%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            maxHeight: "90vh",
            overflow: "auto",
            width: "100%",
            maxWidth: "90vw",
          }}
        >
          <DialogHeader>
            <DialogTitle>Add New Player</DialogTitle>
          </DialogHeader>

          <DialogBody>
            <VStack gap={4} align="stretch">
              <Field.Root>
                <Field.Label>
                  Company Name (Choose a unique name for your company)
                </Field.Label>
                <Input
                  _placeholder={{ color: "inherit" }}
                  placeholder="Enter company name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  autoFocus
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>
                  Select Specialization (Choose a card to see the playstyle)
                </Field.Label>
                <SpecializationSelector
                  specialization={specialization}
                  onChange={(s) => setSpecialization(s)}
                />
              </Field.Root>
              <>
                <Field.Root>
                  <Field.Label>Starter Infrastructure</Field.Label>
                  <Field.HelperText color="fg">
                    Look at the game board and choose a location for the
                    player's starter infrastructure. This must be within 3
                    spaces of the commons infrastructure and on a space that
                    supports the infrastructure type.
                  </Field.HelperText>
                </Field.Root>

                <LocationPicker
                  valueName={starterLocationName}
                  onNameChange={setStarterLocationName}
                  valueNumber={starterLocationNumber}
                  onNumberChange={(v) => setStarterLocationNumber(String(v))}
                  label="Starter Infrastructure Location"
                  helperText="Choose a board tile and number"
                />
              </>
            </VStack>
          </DialogBody>

          <DialogFooter>
            <DialogActionTrigger asChild>
              <Button colorPalette="sapphireWool" variant="outline">
                Cancel
              </Button>
            </DialogActionTrigger>
            <Button
              colorPalette="flamingoGold"
              onClick={handleSubmit}
              loading={isPending}
              disabled={!companyName.trim()}
            >
              Add Player
            </Button>
          </DialogFooter>

          <DialogCloseTrigger />
        </DialogContent>
      </Portal>
    </DialogRoot>
  );
}
