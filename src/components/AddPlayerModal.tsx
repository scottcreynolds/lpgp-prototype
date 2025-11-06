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
  NativeSelect,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useState } from "react";
import type { Specialization } from "../lib/database.types";

interface AddPlayerModalProps {
  onAddPlayer: (name: string, specialization: Specialization) => Promise<void>;
  isPending?: boolean;
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

export function AddPlayerModal({
  onAddPlayer,
  isPending,
}: AddPlayerModalProps) {
  const [open, setOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [specialization, setSpecialization] =
    useState<Specialization>("Resource Extractor");

  const handleSubmit = async () => {
    if (!companyName.trim()) {
      return;
    }

    await onAddPlayer(companyName.trim(), specialization);

    // Reset form and close modal
    setCompanyName("");
    setSpecialization("Resource Extractor");
    setOpen(false);
  };

  return (
    <DialogRoot open={open} onOpenChange={(e) => setOpen(e.open)}>
      <DialogTrigger asChild>
        <Button colorPalette="green" variant="solid">
          Add Player
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
          }}
        >
          <DialogHeader>
            <DialogTitle>Add New Player</DialogTitle>
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
                <Text fontSize="sm" color="fg.muted" mt={2}>
                  {specializationDescriptions[specialization]}
                </Text>
              </Field.Root>
            </VStack>
          </DialogBody>

          <DialogFooter>
            <DialogActionTrigger asChild>
              <Button variant="outline">Cancel</Button>
            </DialogActionTrigger>
            <Button
              colorPalette="green"
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
