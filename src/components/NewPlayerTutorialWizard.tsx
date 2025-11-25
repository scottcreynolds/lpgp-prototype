import { useAddPlayer } from "@/hooks/useGameData";
import { useSetStarterInfraLocation } from "@/hooks/useSetStarterInfraLocation";
import type { Specialization } from "@/lib/database.types";
import SpecializationSelector from "./SpecializationSelector";

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
  Input,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import LocationPicker from "./LocationPicker";
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
  const [infraLocationName, setInfraLocationName] = useState("");
  const [infraLocationNumber, setInfraLocationNumber] = useState<
    string | number
  >("");

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
      setInfraLocationName("");
      setInfraLocationNumber("");
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
    // If player exists and location name provided, persist via RPC
    if (playerId && infraLocationName.trim()) {
      // combine name + optional number
      const combinedLocation = `${infraLocationName}${
        infraLocationNumber !== "" ? ` ${infraLocationNumber}` : ""
      }`.trim();
      try {
        await setStarterLoc.mutateAsync({
          playerId,
          location: combinedLocation,
        });
        toaster.create({
          title: "Location Saved",
          description: `Starter infrastructure placed at ${combinedLocation}`,
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
            top: "40%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "90vw",
            maxWidth: "90vw",
            maxHeight: "90vh",
            overflow: "auto",
          }}
        >
          <DialogHeader>
            <DialogTitle ref={headingRef} tabIndex={-1}>
              {step === 0 && "Step 1 of 3: Create Your Player"}
              {step === 1 && "Step 2 of 3: Governance Phase Simulation"}
              {step === 2 && "Step 3 of 3: Operations Phase Simulation"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            {step === 0 && (
              <VStack align="stretch" gap={5}>
                <Text fontSize="md">
                  Welcome to the game! Let's get you started by creating your
                  player. Choose a unique and fun company name and
                  specialization to begin your journey. Click the cards below to
                  see details about each specialization.
                </Text>
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
                  <SpecializationSelector
                    specialization={specialization}
                    onChange={(s) => setSpecialization(s)}
                  />
                </Field.Root>
              </VStack>
            )}
            {step === 1 && (
              <VStack align="stretch" gap={4}>
                <Text fontSize="md">
                  In the Governance Phase, players negotiate and establish
                  contracts to support their operations. These might include
                  permeanent or temporary leases of Power or Crew capacity in
                  exchange for per-round EV, or an agreement to build a Helium-3
                  extractor on behalf of a player whose specialization does not
                  have the ability to do so.
                </Text>
                <Text fontSize="md">
                  Contracts between players not only allow you to share and
                  exchange resources, they also grant you reputation, for as
                  long as both players uphold the agreement. Below is a
                  simulated contract preview to illustrate how your player might
                  engage in this phase.
                </Text>
                <Text fontSize="md">
                  Below is a simulated contract preview to illustrate how your
                  player might engage in this phase. In it, you agree to pay per
                  round for the right to use the starting commons
                  infrastructure.
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
                    Crew: 5 | Power: 5 | EV: 10 (per-round) | Duration: Open
                  </Text>
                </Box>
                <Text fontSize="sm" color="fg">
                  Contracts can only be entered into during the Governance
                  Phase, so plan ahead!
                </Text>
              </VStack>
            )}
            {step === 2 && (
              <VStack align="stretch" gap={4}>
                <Text fontSize="md">
                  In the Operations Phase, players build and place their
                  infrastructure on the game board. You need the right amoung of
                  EV to build it, and you need the available crew and power
                  capacity to operate it and gain from its resource yield, so
                  make sure you make deals with other players to get that
                  capacity when you need it.
                </Text>
                <Text fontSize="md">
                  Reference the game board to decide where to build. You can
                  build only on the locations with icons that match your type,
                  and each space can only support a maximum of three
                  installations.
                </Text>
                <Text fontSize="md">
                  Some spaces support multiple types of infrastructure, so
                  choose wisely based on your strategy and specialization. And
                  if there is space available, you can even move in on someone
                  else's territory, since you can't own land on the moon!
                </Text>
                {playerId ? (
                  <>
                    <Text>
                      Place your starter infrastructure. Look at the game board
                      and choose a location that will support the type of
                      infrastructure you're building. Your spot must be within
                      three spaces of the commons infrastructure on Astra-3/4/6.
                    </Text>
                    {starterInfra ? (
                      <Box p={4} borderWidth="1px" borderRadius="md" bg="bg">
                        <Text mb={2} fontWeight="semibold">
                          You have starter infrastructure based on your chosen
                          specialization, but now you need to decide where to
                          place it. Look at the game board, choose a spot, and
                          place your infrastructure token when you're done.
                        </Text>
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
                    <LocationPicker
                      valueName={infraLocationName}
                      onNameChange={setInfraLocationName}
                      valueNumber={infraLocationNumber}
                      onNumberChange={setInfraLocationNumber}
                      helperText={"Choose a region and slot number."}
                    />
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
                <Text fontSize="sm" color="fg">
                  Don't forget to always place your specific infrastructure
                  token on the game board once you've chosen a location!
                </Text>
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
