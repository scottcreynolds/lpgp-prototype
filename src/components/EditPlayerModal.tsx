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
  IconButton,
  Input,
  NativeSelect,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useState } from "react";
import { FaEdit } from "react-icons/fa";
import type { Specialization } from "../lib/database.types";

interface EditPlayerModalProps {
  playerId: string;
  currentName: string;
  currentSpecialization: Specialization;
  onEditPlayer: (
    playerId: string,
    name: string,
    specialization: Specialization
  ) => Promise<void>;
  isPending?: boolean;
  currentRound?: number;
}

const specializations: Specialization[] = [
  "Resource Extractor",
  "Infrastructure Provider",
  "Operations Manager",
];

const specializationDescriptions: Record<Specialization, string> = {
  "Resource Extractor":
    "Specializes in mining and resource acquisition. Starts with H2O Extractor.",
  "Infrastructure Provider":
    "Specializes in construction and energy systems. Starts with Solar Array.",
  "Operations Manager":
    "Specializes in logistics and human resources. Starts with Habitat.",
};

export function EditPlayerModal({
  playerId,
  currentName,
  currentSpecialization,
  onEditPlayer,
  isPending,
  currentRound = 0,
}: EditPlayerModalProps) {
  const [open, setOpen] = useState(false);
  const [companyName, setCompanyName] = useState(currentName || "");
  const [specialization, setSpecialization] = useState<Specialization>(
    currentSpecialization
  );

  // Reset form when modal opens
  const handleOpenChange = (details: { open: boolean }) => {
    setOpen(details.open);
    if (details.open) {
      setCompanyName(currentName || "");
      setSpecialization(currentSpecialization);
    }
  };

  const handleSubmit = async () => {
    if (!companyName?.trim()) {
      return;
    }

    await onEditPlayer(playerId, companyName.trim(), specialization);

    // Close modal
    setOpen(false);
  };

  return (
    <DialogRoot open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <IconButton
          size="md"
          aria-label="Edit player"
          title="Edit Player"
          variant="ghost"
          color="voidNavy.700"
          _hover={{ color: "boldTangerine.100", bg: "voidNavy.700" }}
        >
          <FaEdit />
        </IconButton>
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
            <DialogTitle>Edit Player</DialogTitle>
          </DialogHeader>

          <DialogBody>
            <VStack gap={4} align="stretch">
              <Field.Root>
                <Field.Label>Company Name</Field.Label>
                <Input
                  placeholder="Enter company name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  autoFocus
                />
              </Field.Root>

              <Field.Root>
                {currentRound === 0 && (
                  <>
                    <Field.Label>Specialization</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={specialization}
                        onChange={(e) =>
                          setSpecialization(e.target.value as Specialization)
                        }
                      >
                        {specializations.map((spec) => (
                          <option key={spec} value={spec}>
                            {spec}
                          </option>
                        ))}
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                    <Text fontSize="sm" color="fg" mt={2} fontWeight="medium">
                      {specializationDescriptions[specialization]}
                    </Text>
                  </>
                )}

                {currentRound > 0 && (
                  <Text fontSize="xs" color="fg.subtle" mt={1}>
                    Specialization cannot be changed after setup phase
                  </Text>
                )}
              </Field.Root>
            </VStack>
          </DialogBody>

          <DialogFooter>
            <DialogActionTrigger asChild>
              <Button variant="outline" colorPalette="flamingoGold">
                Cancel
              </Button>
            </DialogActionTrigger>
            <Button
              colorPalette="flamingoGold"
              onClick={handleSubmit}
              loading={isPending}
              disabled={!companyName?.trim()}
            >
              Save Changes
            </Button>
          </DialogFooter>

          <DialogCloseTrigger />
        </DialogContent>
      </Portal>
    </DialogRoot>
  );
}
