import { SPECIALIZATION_IMAGES } from "@/data/specializationAssets";
import {
  SPECIALIZATION_DETAILS,
  SPECIALIZATION_ORDER,
} from "@/data/specializations";
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
                <Flex
                  mt={1}
                  // keep the right column under the cards until large screens
                  direction={{ base: "column", lg: "row" }}
                  gap={{ base: 3, lg: 0 }}
                  alignItems="flex-start"
                >
                  <Flex
                    flex="1"
                    role="radiogroup"
                    direction="row"
                    gap={3}
                    // allow wrapping so cards flow to multiple rows responsively
                    wrap="wrap"
                    alignItems="flex-start"
                    pr={1}
                  >
                    {SPECIALIZATION_ORDER.map((spec) => {
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
                          borderWidth={selected ? "3px" : "1px"}
                          borderColor={
                            selected ? `${colorKey}.600` : "gray.300"
                          }
                          borderRadius="sm"
                          p={0}
                          flexShrink={0}
                          transition="transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, filter 0.15s ease, background-color 0.15s ease"
                          _hover={{
                            borderColor: selected
                              ? `${colorKey}.700`
                              : `${colorKey}.500`,
                            transform: "translateY(-2px)",
                            boxShadow: selected ? "lg" : "md",
                          }}
                          _focusVisible={{
                            outline: "none",
                            boxShadow: `0 0 0 3px var(--chakra-colors-${colorKey}-200)`,
                          }}
                          bg={selected ? `${colorKey}.50` : "gray.50"}
                          filter={
                            selected
                              ? "none"
                              : "grayscale(0.4) brightness(0.95)"
                          }
                          opacity={selected ? 1 : 0.85}
                          _active={{ transform: "scale(0.98)" }}
                          display="inline-flex"
                          justifyContent="center"
                          alignItems="center"
                          lineHeight={0}
                        >
                          <Box
                            position="absolute"
                            top={3}
                            left={3}
                            bg={
                              selected ? `${colorKey}.600` : `${colorKey}.400`
                            }
                            color="white"
                            borderRadius="full"
                            p={2}
                            boxShadow="sm"
                          >
                            <SpecializationIcon
                              specialization={spec}
                              size={2}
                              color="white"
                            />
                          </Box>
                          <Image
                            src={SPECIALIZATION_IMAGES[spec]}
                            alt={`${spec} card`}
                            objectFit="contain"
                            width="220px"
                            height="auto"
                            display="block"
                            style={{
                              transition:
                                "filter 0.2s ease, transform 0.2s ease",
                              transform: selected
                                ? "scale(1.02)"
                                : "scale(1.0)",
                            }}
                          />
                        </Box>
                      );
                    })}
                  </Flex>
                  <Box
                    flexBasis={{ lg: "320px" }}
                    flexGrow={1}
                    p={1}
                    borderWidth="1px"
                    borderColor="gray.200"
                    borderRadius="md"
                    bg="bg"
                    w={{ base: "100%", lg: "auto" }}
                    maxW={{ base: "100%", lg: "35vw" }}
                  >
                    <Heading size="sm" mb={2} color="fg.emphasized">
                      {SPECIALIZATION_DETAILS[specialization].title}
                    </Heading>
                    <Text fontSize="sm" color="fg" lineHeight="1.4">
                      {SPECIALIZATION_DETAILS[specialization].description}
                    </Text>
                    <Box mt={4}>
                      <Text
                        fontSize="xs"
                        fontWeight="semibold"
                        color="fg"
                        textTransform="uppercase"
                        letterSpacing="wide"
                      >
                        Buildable Equipment
                      </Text>
                      <Box
                        as="ul"
                        mt={2}
                        pl={4}
                        color="fg"
                        lineHeight="1.4"
                        listStyleType="disc"
                      >
                        {SPECIALIZATION_DETAILS[specialization].equipment.map(
                          (item) => (
                            <Text as="li" key={item} fontSize="sm">
                              {item}
                            </Text>
                          )
                        )}
                      </Box>
                    </Box>
                    <Box mt={4}>
                      <Text
                        fontSize="xs"
                        fontWeight="semibold"
                        color="fg"
                        textTransform="uppercase"
                        letterSpacing="wide"
                      >
                        Strategies &amp; alliances
                      </Text>
                      <Box
                        as="ul"
                        mt={2}
                        pl={4}
                        color="fg"
                        lineHeight="1.4"
                        listStyleType="disc"
                      >
                        {SPECIALIZATION_DETAILS[specialization].strategy.map(
                          (item) => (
                            <Text as="li" key={item} fontSize="sm">
                              {item}
                            </Text>
                          )
                        )}
                      </Box>
                    </Box>
                  </Box>
                </Flex>
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
