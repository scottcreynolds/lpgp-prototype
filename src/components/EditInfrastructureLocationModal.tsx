import { useUpdateInfrastructureLocation } from "@/hooks/useUpdateInfrastructureLocation";
import type { PlayerInfrastructureItem } from "@/lib/database.types";
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
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useState } from "react";
import LocationPicker from "./LocationPicker";
import { toaster } from "./ui/toasterInstance";

interface EditInfrastructureLocationModalProps {
  infrastructure: PlayerInfrastructureItem;
  trigger?: React.ReactNode;
}

export function EditInfrastructureLocationModal({
  infrastructure,
  trigger,
}: EditInfrastructureLocationModalProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState<string | "">(
    infrastructure.location ? String(infrastructure.location).split(" ")[0] : ""
  );
  const [number, setNumber] = useState<string | number>(
    infrastructure.location
      ? String(infrastructure.location).split(" ").slice(1).join(" ")
      : ""
  );

  const updater = useUpdateInfrastructureLocation();

  const handleOpenChange = (d: boolean | { open: boolean }) => {
    const isOpen = typeof d === "boolean" ? d : d.open;
    setOpen(isOpen);
    if (isOpen) {
      setName(
        infrastructure.location
          ? String(infrastructure.location).split(" ")[0]
          : ""
      );
      setNumber(
        infrastructure.location
          ? String(infrastructure.location).split(" ").slice(1).join(" ")
          : ""
      );
    }
  };

  const handleSubmit = async () => {
    const combined = name
      ? `${name}${number !== "" ? ` ${number}` : ""}`
      : null;
    try {
      await updater.mutateAsync({
        infrastructureId: infrastructure.id,
        location: combined,
      });
      toaster.create({
        title: "Location Updated",
        description: `Location updated to ${combined ?? "(none)"}`,
        type: "success",
        duration: 3000,
      });
      setOpen(false);
    } catch (e) {
      toaster.create({
        title: "Failed to Update Location",
        description: e instanceof Error ? e.message : "Unknown error",
        type: "error",
        duration: 5000,
      });
    }
  };

  return (
    <DialogRoot open={open} onOpenChange={handleOpenChange} size="sm">
      <DialogTrigger asChild>
        {trigger ?? <Button size="xs">Edit</Button>}
      </DialogTrigger>

      <Portal>
        <DialogBackdrop />
        <DialogContent
          css={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <DialogHeader>
            <DialogTitle>Edit Infrastructure Location</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <VStack align="stretch" gap={3}>
              <Box>
                <Text fontSize="sm" fontWeight="bold">
                  {infrastructure.type}
                </Text>
                <Text fontSize="xs" color="fg.muted">
                  Current:{" "}
                  <strong>{infrastructure.location || "(none)"}</strong>
                </Text>
              </Box>

              <LocationPicker
                valueName={String(name)}
                onNameChange={(v) => setName(v)}
                valueNumber={number}
                onNumberChange={(v) => setNumber(v)}
                label="New Location"
                helperText="Choose a region and optional slot number"
              />
            </VStack>
          </DialogBody>

          <DialogFooter>
            <DialogActionTrigger asChild>
              <Button variant="outline">Cancel</Button>
            </DialogActionTrigger>
            <Button
              colorPalette="flamingoGold"
              onClick={handleSubmit}
              loading={updater.isPending}
            >
              Save
            </Button>
          </DialogFooter>

          <DialogCloseTrigger />
        </DialogContent>
      </Portal>
    </DialogRoot>
  );
}

export default EditInfrastructureLocationModal;
