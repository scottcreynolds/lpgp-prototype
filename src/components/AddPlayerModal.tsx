import infrastructureProviderImg from "@/assets/player-cards/infrastructure-provider.png";
import operationsManagerImg from "@/assets/player-cards/operations-manager.png";
import resourceExtractorImg from "@/assets/player-cards/resource-extractor.png";
import { getSpecializationColor } from "@/lib/specialization";
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
  Flex,
  Heading,
  Image,
  Input,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useState } from "react";
import type { Specialization } from "../lib/database.types";
import SpecializationIcon from "./SpecializationIcon";

interface AddPlayerModalProps {
  onAddPlayer: (name: string, specialization: Specialization) => Promise<void>;
  isPending?: boolean;
}

const specializations: Specialization[] = [
  "Resource Extractor",
  "Infrastructure Provider",
  "Operations Manager",
];

// Specialization metadata (title + description) for the dynamic info panel
const specializationMeta: Record<
  Specialization,
  { title: string; description: string }
> = {
  "Resource Extractor": {
    title: "Resource Extractor",
    description:
      "You excel at mining and acquiring lunar resources. Use raw materials to build infrastructure, trade, or sell for EV.",
  },
  "Infrastructure Provider": {
    title: "Infrastructure Provider",
    description:
      "You construct and maintain power and support systems. Other players rely on your ability to keep operations running.",
  },
  "Operations Manager": {
    title: "Operations Management",
    description:
      "You coordinate logistics and habitation. You keep crews healthy, housed, and connected, enabling steady growth.",
  },
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

  // Specialization images
  const specializationImages: Record<Specialization, string> = {
    "Resource Extractor": resourceExtractorImg,
    "Infrastructure Provider": infrastructureProviderImg,
    "Operations Manager": operationsManagerImg,
  };

  return (
    <DialogRoot open={open} onOpenChange={(e) => setOpen(e.open)} size="xl">
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
            maxHeight: "90vh",
            overflow: "auto",
            width: "min(95vw, 760px)",
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
                <Field.Label>Select Specialization</Field.Label>
                <Flex
                  role="radiogroup"
                  direction={{ base: "column", md: "row" }}
                  gap={4}
                  wrap="wrap"
                  mt={2}
                  alignItems="flex-start"
                >
                  {specializations.map((spec) => {
                    const selected = specialization === spec;
                    const colorKey = getSpecializationColor(spec);
                    return (
                      <Box
                        key={spec}
                        role="radio"
                        aria-checked={selected}
                        aria-label={spec}
                        tabIndex={0}
                        onClick={() => setSpecialization(spec)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSpecialization(spec);
                          }
                        }}
                        cursor="pointer"
                        position="relative"
                        borderWidth="2px"
                        borderColor={selected ? `${colorKey}.500` : "gray.200"}
                        borderRadius="md"
                        p={2}
                        w={{ base: "100%", md: "240px" }}
                        flexShrink={0}
                        transition="transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease"
                        _hover={{
                          borderColor: `${colorKey}.600`,
                          transform: selected
                            ? "translateY(-2px)"
                            : "translateY(-2px)",
                          boxShadow: selected ? "lg" : "md",
                        }}
                        _focusVisible={{
                          outline: "none",
                          boxShadow: `0 0 0 3px var(--chakra-colors-${colorKey}-200)`,
                        }}
                        boxShadow={selected ? "lg" : "none"}
                        bg={selected ? `${colorKey}.50` : "white"}
                      >
                        {/* Icon badge */}
                        <Box
                          position="absolute"
                          top={2}
                          left={2}
                          bg={`${colorKey}.500`}
                          color="white"
                          borderRadius="full"
                          p={1.5}
                          boxShadow="sm"
                        >
                          <SpecializationIcon
                            specialization={spec}
                            size={4}
                            color="white"
                          />
                        </Box>
                        <Image
                          src={specializationImages[spec]}
                          alt={`${spec} card`}
                          objectFit="contain"
                          width="100%"
                          height="auto"
                          display="block"
                        />
                      </Box>
                    );
                  })}
                </Flex>
                {/* Dynamic metadata panel */}
                <Box
                  mt={4}
                  p={4}
                  borderWidth="1px"
                  borderColor="gray.200"
                  borderRadius="md"
                  bg="bg.muted"
                >
                  <Heading size="sm" mb={2} color="fg.emphasized">
                    {specializationMeta[specialization].title}
                  </Heading>
                  <Text fontSize="sm" color="fg" lineHeight="1.3">
                    {specializationMeta[specialization].description}
                  </Text>
                </Box>
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
