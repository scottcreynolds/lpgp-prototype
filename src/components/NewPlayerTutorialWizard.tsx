import { SPECIALIZATION_IMAGES } from "@/data/specializationAssets";
import {
  SPECIALIZATION_DETAILS,
  SPECIALIZATION_ORDER,
} from "@/data/specializations";
import { useAddPlayer } from "@/hooks/useGameData";
import { useSetStarterInfraLocation } from "@/hooks/useSetStarterInfraLocation";
import type { Specialization } from "@/lib/database.types";
import { getSpecializationColor } from "@/lib/specialization";
import { useGameStore } from "@/store/gameStore";
import {
  Box,
  Button,
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  Field,
  Flex,
  Heading,
  Input,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import SpecializationIcon from "./SpecializationIcon";
import { toaster } from "./ui/toasterInstance";

interface NewPlayerTutorialWizardProps {
  open: boolean;
  onClose: () => void;
}

export function NewPlayerTutorialWizard({
  open,
  onClose,
}: NewPlayerTutorialWizardProps) {
  const [step, setStep] = useState(0);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [specialization, setSpecialization] =
    useState<Specialization>("Resource Extractor");
  const [infraLocation, setInfraLocation] = useState("");

  const addPlayer = useAddPlayer();
  const setStarterLoc = useSetStarterInfraLocation();
  const dashboardData = useGameStore((s) => s.dashboardData);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  // Focus heading on step change for accessibility
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  // Reset local state when closed
  useEffect(() => {
    if (!open) {
      setStep(0);
      setPlayerId(null);
      setCompanyName("");
      setSpecialization("Resource Extractor");
      setInfraLocation("");
    }
  }, [open]);

  const handleCreatePlayer = async () => {
    if (!companyName.trim()) return;
    try {
      const result = await addPlayer.mutateAsync({
        name: companyName.trim(),
        specialization,
      });
      if (result.player_id) {
        setPlayerId(result.player_id);
        toaster.create({
          title: "Player Created",
          description: `${companyName.trim()} joined as ${specialization}`,
          type: "success",
          duration: 3000,
        });
      }
      setStep(1);
    } catch (e) {
      toaster.create({
        title: "Failed to Create Player",
        description: e instanceof Error ? e.message : "Unknown error",
        type: "error",
        duration: 5000,
      });
    }
  };

  const skipPlayer = () => {
    setPlayerId(null);
    setStep(1);
  };

  const nextFromGovernanceSim = () => setStep(2);

  const finishWizard = async () => {
    // If player exists and location provided, persist via RPC
    if (playerId && infraLocation.trim()) {
      try {
        await setStarterLoc.mutateAsync({
          playerId,
          location: infraLocation.trim(),
        });
        toaster.create({
          title: "Location Saved",
          description: `Starter infrastructure placed at ${infraLocation.trim()}`,
          type: "success",
          duration: 3000,
        });
      } catch (e) {
        toaster.create({
          title: "Failed to Save Location",
          description: e instanceof Error ? e.message : "Unknown error",
          type: "error",
          duration: 5000,
        });
        // Allow finish even if error
      }
    }
    onClose();
  };

  // Starter infra details
  const starterInfra = playerId
    ? dashboardData?.players
        ?.find((p) => p.id === playerId)
        ?.infrastructure?.find((i) => i.is_starter) || null
    : null;

  return (
    <DialogRoot
      open={open}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      size="xl"
    >
      <Portal>
        <DialogBackdrop />
        <DialogContent
          css={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "80vw",
            maxWidth: "1200px",
            maxHeight: "90vh",
            overflow: "auto",
          }}
        >
          <DialogHeader>
            <DialogTitle ref={headingRef} tabIndex={-1}>
              {step === 0 && "Step 1 of 3: Create Your Player"}
              {step === 1 && "Step 2 of 3: Governance Contract Simulation"}
              {step === 2 && "Step 3 of 3: Place Starter Infrastructure"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            {step === 0 && (
              <VStack align="stretch" gap={5}>
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
                  <Flex wrap="wrap" gap={3} role="radiogroup">
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
                          borderWidth={selected ? "3px" : "1px"}
                          borderColor={
                            selected ? `${colorKey}.600` : "gray.300"
                          }
                          borderRadius="sm"
                          p={0}
                          transition="all 0.15s ease"
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
                          opacity={selected ? 1 : 0.85}
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
                          <img
                            src={SPECIALIZATION_IMAGES[spec]}
                            alt={`${spec} card`}
                            style={{ width: "220px", display: "block" }}
                          />
                        </Box>
                      );
                    })}
                  </Flex>
                  <Box mt={4} p={3} borderWidth="1px" borderRadius="md" bg="bg">
                    <Heading size="sm" mb={2}>
                      {SPECIALIZATION_DETAILS[specialization].title}
                    </Heading>
                    <Text fontSize="sm" mb={2}>
                      {SPECIALIZATION_DETAILS[specialization].description}
                    </Text>
                  </Box>
                </Field.Root>
              </VStack>
            )}
            {step === 1 && (
              <VStack align="stretch" gap={4}>
                <Text fontSize="md">
                  Simulated Governance Contract (static preview)
                </Text>
                <Box p={4} borderWidth="1px" borderRadius="md" bg="bg">
                  <Text>
                    <strong>From:</strong>{" "}
                    {companyName.trim() || "Your Company"}
                  </Text>
                  <Text>
                    <strong>To:</strong> Commons
                  </Text>
                  <Text mt={2}>
                    <strong>Values:</strong>
                  </Text>
                  <Text fontSize="sm">
                    Crew: 5 | Power: 5 | EV: 10 | Duration: Open
                  </Text>
                  <Text mt={2} fontSize="sm">
                    This step is illustrative only. No data is persisted.
                  </Text>
                </Box>
              </VStack>
            )}
            {step === 2 && (
              <VStack align="stretch" gap={4}>
                {playerId ? (
                  <>
                    <Text>
                      Place your starter infrastructure. Choose a board location
                      within 3 spaces of the commons.
                    </Text>
                    {starterInfra ? (
                      <Box p={4} borderWidth="1px" borderRadius="md" bg="bg">
                        <Text>
                          <strong>Type:</strong> {starterInfra.type}
                        </Text>
                        <Text>
                          <strong>Yield:</strong> {starterInfra.yield ?? 0}
                        </Text>
                        <Text>
                          <strong>Power Req:</strong>{" "}
                          {starterInfra.power_requirement ?? 0}
                        </Text>
                        <Text>
                          <strong>Crew Req:</strong>{" "}
                          {starterInfra.crew_requirement ?? 0}
                        </Text>
                        <Text mt={2}>
                          <strong>Current Location:</strong>{" "}
                          {starterInfra.location || "(none)"}
                        </Text>
                      </Box>
                    ) : (
                      <Text color="fg.muted">
                        Starter infrastructure not yet available. You can finish
                        and set location later.
                      </Text>
                    )}
                    <Field.Root>
                      <Field.Label>Starter Location (optional)</Field.Label>
                      <Input
                        placeholder="e.g. Sector A2"
                        value={infraLocation}
                        onChange={(e) => setInfraLocation(e.target.value)}
                      />
                      <Field.HelperText>
                        Leave blank to set later.
                      </Field.HelperText>
                    </Field.Root>
                  </>
                ) : (
                  <Box p={4} borderWidth="1px" borderRadius="md" bg="bg">
                    <Text>
                      You skipped player creation. If you had created a player,
                      their starter infrastructure would appear here for
                      placement.
                    </Text>
                  </Box>
                )}
              </VStack>
            )}
          </DialogBody>
          <DialogFooter>
            {step > 0 && (
              <Button
                variant="outline"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                Back
              </Button>
            )}
            {step === 0 && (
              <Flex gap={3} ml="auto">
                <Button variant="outline" onClick={skipPlayer}>
                  Skip
                </Button>
                <Button
                  colorPalette="flamingoGold"
                  onClick={handleCreatePlayer}
                  loading={addPlayer.isPending}
                  disabled={!companyName.trim()}
                >
                  Create Player
                </Button>
              </Flex>
            )}
            {step === 1 && (
              <Button
                ml="auto"
                colorPalette="flamingoGold"
                onClick={nextFromGovernanceSim}
              >
                Next
              </Button>
            )}
            {step === 2 && (
              <Button
                ml="auto"
                colorPalette="flamingoGold"
                onClick={finishWizard}
                loading={setStarterLoc.isPending}
              >
                Finish
              </Button>
            )}
          </DialogFooter>
          <DialogCloseTrigger />
        </DialogContent>
      </Portal>
    </DialogRoot>
  );
}
