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
import SpecializationSelector from "./SpecializationSelector";

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
  hideStarterLocation?: boolean; // tutorial can hide starter location field
}

export function AddPlayerModal({
  onAddPlayer,
  isPending,
  externalOpen,
  onExternalClose,
  hideTrigger,
  onPlayerCreated,
  hideStarterLocation,
}: AddPlayerModalProps) {
  const [open, setOpen] = useState(false); // internal fallback state
  const [companyName, setCompanyName] = useState("");
  const [specialization, setSpecialization] =
    useState<Specialization>("Resource Extractor");
  const [starterLocation, setStarterLocation] = useState("");

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

    // Reset form and close modal
    setCompanyName("");
    setSpecialization("Resource Extractor");
    setStarterLocation("");
    if (controlled) {
      onExternalClose?.();
    } else {
      setOpen(false);
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
              {!hideStarterLocation && (
                <Field.Root>
                  <Field.Label>
                    (Optional) Starter Infrastructure Location
                  </Field.Label>
                  <Input
                    placeholder="e.g. Near Commons A2"
                    value={starterLocation}
                    onChange={(e) => setStarterLocation(e.target.value)}
                  />
                  <Field.HelperText>
                    Leave blank to set this later in the walkthrough.
                  </Field.HelperText>
                </Field.Root>
              )}
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
              {hideStarterLocation ? "Add Player" : "Add Player"}
            </Button>
          </DialogFooter>

          <DialogCloseTrigger />
        </DialogContent>
      </Portal>
    </DialogRoot>
  );
}
