import { ensureDialogClosed } from "@/lib/ui";
import {
  Badge,
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
  NativeSelect,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useMemo, useRef, useState } from "react";
import {
  useBuildInfrastructure,
  useInfrastructureDefinitions,
} from "../hooks/useGameData";
import type { DashboardPlayer } from "../lib/database.types";
import LocationPicker from "./LocationPicker";
import { toaster } from "./ui/toasterInstance";

interface BuildInfrastructureModalProps {
  builderId: string;
  builderName: string;
  builderEv: number;
  players: DashboardPlayer[];
  disabled?: boolean;
  gameEnded?: boolean; // explicit override if game has ended
}

export function BuildInfrastructureModal({
  builderId,
  builderName,
  builderEv,
  players,
  disabled = false,
  gameEnded = false,
}: BuildInfrastructureModalProps) {
  // Use uncontrolled open state for the dialog to avoid backdrop/stale
  // overlay issues when closing after async operations. We still handle
  // the `onOpenChange` callback to reset local form state when the
  // dialog is closed.
  const [ownerId, setOwnerId] = useState(builderId);
  const [infrastructureType, setInfrastructureType] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationNumber, setLocationNumber] = useState<string | number>("");

  const { data: infrastructure, isLoading: infrastructureLoading } =
    useInfrastructureDefinitions();
  const buildInfrastructure = useBuildInfrastructure();

  // Resolve builder specialization from players list
  const builder = useMemo(
    () => players.find((p) => p.id === builderId),
    [players, builderId]
  );

  // Only include infrastructure the builder can actually build
  const buildableInfrastructure = useMemo(
    () =>
      (infrastructure || []).filter(
        (def: { player_buildable: boolean; can_be_operated_by: string[] }) =>
          def.player_buildable &&
          (builder?.specialization
            ? def.can_be_operated_by.includes(builder.specialization)
            : true)
      ),
    [infrastructure, builder]
  );

  const selectedInfrastructure = infrastructure?.find(
    (i: { type: string }) => i.type === infrastructureType
  );

  // Resolve owner (could differ from builder)
  const owner = useMemo(
    () => players.find((p) => p.id === ownerId),
    [players, ownerId]
  );

  // Compute auto-activation prediction mirroring backend logic
  const activationPrediction = useMemo(() => {
    if (!selectedInfrastructure || !owner) return null;
    const type = selectedInfrastructure.type;
    const powerReq = selectedInfrastructure.power_requirement || 0;
    const crewReq = selectedInfrastructure.crew_requirement || 0;
    // Capacity providers always auto-activate
    const isAlways = type === "Solar Array" || type === "Habitat";
    if (isAlways) {
      return {
        willAutoActivate: true,
        reason: "Capacity provider auto-activates",
        missing: [] as string[],
      };
    }
    const availPower = owner.totals.available_power;
    const availCrew = owner.totals.available_crew;
    const hasPower = powerReq === 0 || availPower >= powerReq;
    const hasCrew = crewReq === 0 || availCrew >= crewReq;
    const willAuto = hasPower && hasCrew;
    const missing: string[] = [];
    if (!hasPower && powerReq > 0) {
      missing.push(
        `power ${availPower}/${powerReq} (needs ${powerReq - availPower} more)`
      );
    }
    if (!hasCrew && crewReq > 0) {
      missing.push(
        `crew ${availCrew}/${crewReq} (needs ${crewReq - availCrew} more)`
      );
    }
    return {
      willAutoActivate: willAuto,
      reason: willAuto ? "Requirements satisfied" : "Insufficient capacity",
      missing,
    };
  }, [selectedInfrastructure, owner]);

  const canAfford = selectedInfrastructure
    ? builderEv >= selectedInfrastructure.cost
    : true;

  const handleSubmit = async () => {
    if (!infrastructureType) {
      return;
    }

    if (!canAfford) {
      toaster.create({
        title: "Insufficient EV",
        description: `Need ${selectedInfrastructure?.cost} EV, but only have ${builderEv} EV`,
        type: "error",
        duration: 5000,
      });
      return;
    }

    try {
      // Combine named location and number into single string to store
      const combinedLocation = locationName
        ? `${locationName}${locationNumber !== "" ? ` ${locationNumber}` : ""}`
        : null;

      await buildInfrastructure.mutateAsync({
        builderId,
        ownerId,
        infrastructureType,
        location: combinedLocation ? combinedLocation.trim() : null,
      });

      toaster.create({
        title: "Infrastructure Built",
        description: `${infrastructureType} built successfully${
          combinedLocation ? ` at ${combinedLocation}` : ""
        }`,
        type: "success",
        duration: 3000,
      });

      // Reset form and close modal
      setOwnerId(builderId);
      setInfrastructureType("");
      setLocationName("");
      setLocationNumber("");
      // Programmatically close the dialog by clicking the hidden close
      // trigger (uncontrolled dialog mode). Delay to next tick so any
      // pending state updates settle. Also dispatch an Escape key event
      // as a fallback for implementations that listen for keyboard
      // events to close dialogs. Finally call the global helper which
      // performs a defensive overlay cleanup if needed.
      setTimeout(() => {
        closeTriggerRef.current?.click();
        try {
          window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        } catch {
          /* ignore */
        }
      }, 0);
      setTimeout(() => ensureDialogClosed(), 250);
    } catch (error) {
      toaster.create({
        title: "Failed to Build Infrastructure",
        description:
          error instanceof Error
            ? error.message
            : "Failed to build infrastructure",
        type: "error",
        duration: 5000,
      });
    }
  };

  const handleOpenChange = (details: boolean | { open: boolean }) => {
    // Radix/Chakra can pass either an object like { open: boolean }
    // or sometimes a raw boolean. Handle both safely. We only need the
    // callback to detect when the dialog is closed so we can reset
    // local form state; we intentionally do NOT control the open
    // state here to avoid mismatches that can leave the backdrop
    // mounted after async close operations.
    const isOpen = typeof details === "boolean" ? details : details.open;
    if (!isOpen) {
      // Reset form when modal closes
      setOwnerId(builderId);
      setInfrastructureType("");
      setLocationName("");
      setLocationNumber("");
    }
  };

  const closeTriggerRef = useRef<HTMLButtonElement | null>(null);

  return (
    <DialogRoot onOpenChange={handleOpenChange} size="xl" closeOnEscape>
      <DialogTrigger asChild>
        <Button
          colorPalette="sapphireWool"
          variant="solid"
          size="sm"
          disabled={disabled || gameEnded}
        >
          Build
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
            <DialogTitle>Build Infrastructure</DialogTitle>
          </DialogHeader>

          <DialogBody>
            <form
              id="build-infra-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
            >
              <VStack gap={4} align="stretch">
                {/* Builder Info */}
                <Box
                  p={3}
                  bg="bg"
                  borderRadius="md"
                  borderWidth={1}
                  borderColor="border"
                >
                  <Text
                    fontSize="sm"
                    fontWeight="semibold"
                    color="fg.emphasized"
                  >
                    Builder: {builderName}
                  </Text>
                  <Text fontSize="sm" color="fg">
                    Available EV: {builderEv}
                  </Text>
                </Box>

                {/* Main Content: Form on left, Details on right */}
                <HStack gap={4} align="start">
                  {/* Left side: Form */}
                  <VStack gap={4} align="stretch" flex={1}>
                    {/* Infrastructure Type Selection */}
                    <Field.Root>
                      <Field.Label>Infrastructure Type</Field.Label>
                      <NativeSelect.Root>
                        <NativeSelect.Field
                          value={infrastructureType}
                          onChange={(e) =>
                            setInfrastructureType(e.target.value)
                          }
                        >
                          <option value="">
                            {infrastructureLoading
                              ? "Loading..."
                              : "Select infrastructure..."}
                          </option>
                          {buildableInfrastructure?.map(
                            (infra: {
                              id: string;
                              type: string;
                              cost: number;
                            }) => (
                              <option key={infra.id} value={infra.type}>
                                {infra.type} (Cost: {infra.cost} EV)
                              </option>
                            )
                          )}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                      </NativeSelect.Root>
                    </Field.Root>

                    {/* Owner Selection */}
                    <Field.Root>
                      <Field.Label>Owner</Field.Label>
                      <NativeSelect.Root>
                        <NativeSelect.Field
                          value={ownerId}
                          onChange={(e) => setOwnerId(e.target.value)}
                        >
                          {players.map((player) => (
                            <option key={player.id} value={player.id}>
                              {player.name}
                            </option>
                          ))}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                      </NativeSelect.Root>
                      <Field.HelperText color="fg">
                        TIP: You can build infrastructure for another player
                      </Field.HelperText>
                    </Field.Root>

                    <LocationPicker
                      valueName={locationName}
                      onNameChange={setLocationName}
                      valueNumber={locationNumber}
                      onNumberChange={setLocationNumber}
                      helperText={
                        "Select a named region and optionally enter a slot number"
                      }
                    />
                  </VStack>

                  {/* Right side: Infrastructure Details */}
                  {selectedInfrastructure && (
                    <Box
                      flex={1}
                      p={3}
                      bg="bg"
                      borderRadius="md"
                      borderWidth={1}
                      borderColor="border"
                    >
                      <Text
                        fontSize="sm"
                        fontWeight="semibold"
                        mb={2}
                        color="fg.emphasized"
                      >
                        Infrastructure Details
                      </Text>
                      <VStack gap={1} align="stretch" fontSize="sm">
                        <HStack justify="space-between">
                          <Text color="fg">Build Cost:</Text>
                          <Badge
                            colorPalette={canAfford ? "green" : "red"}
                            variant="subtle"
                          >
                            {selectedInfrastructure.cost} EV
                          </Badge>
                        </HStack>
                        <HStack justify="space-between">
                          <Text color="fg">Maintenance (per round):</Text>
                          <Text color="fg">
                            {selectedInfrastructure.maintenance_cost} EV
                          </Text>
                        </HStack>
                        {selectedInfrastructure.yield && (
                          <HStack justify="space-between">
                            <Text color="fg">Yield (per round):</Text>
                            <Badge colorPalette="green" variant="subtle">
                              +{selectedInfrastructure.yield} EV
                            </Badge>
                          </HStack>
                        )}
                        {selectedInfrastructure.capacity && (
                          <HStack justify="space-between">
                            <Text color="fg">Capacity:</Text>
                            <Text color="fg">
                              {selectedInfrastructure.capacity}
                            </Text>
                          </HStack>
                        )}
                        {selectedInfrastructure.power_requirement && (
                          <HStack justify="space-between">
                            <Text color="fg">Power Requirement:</Text>
                            <Text color="fg">
                              {selectedInfrastructure.power_requirement}
                            </Text>
                          </HStack>
                        )}
                        {selectedInfrastructure.crew_requirement && (
                          <HStack justify="space-between">
                            <Text color="fg">Crew Requirement:</Text>
                            <Text color="fg">
                              {selectedInfrastructure.crew_requirement}
                            </Text>
                          </HStack>
                        )}
                      </VStack>

                      {activationPrediction && (
                        <Box
                          mt={3}
                          p={2}
                          borderWidth={1}
                          borderRadius="md"
                          borderColor="border"
                        >
                          <HStack justify="space-between" align="start">
                            <VStack gap={1} align="start" flex={1}>
                              <Text
                                fontSize="xs"
                                fontWeight="bold"
                                color="fg.emphasized"
                              >
                                Activation on Build
                              </Text>
                              {activationPrediction.willAutoActivate ? (
                                <Text fontSize="xs" color="fg">
                                  Will <strong>auto-activate</strong>:{" "}
                                  {activationPrediction.reason}
                                </Text>
                              ) : (
                                <Text fontSize="xs" color="fg">
                                  Will start <strong>dormant</strong>:{" "}
                                  {activationPrediction.reason}
                                </Text>
                              )}
                              {activationPrediction.missing.length > 0 && (
                                <Text fontSize="xs" color="fg.muted">
                                  Missing:{" "}
                                  {activationPrediction.missing.join(", ")}
                                </Text>
                              )}
                            </VStack>
                            <Badge
                              colorPalette={
                                activationPrediction.willAutoActivate
                                  ? "green"
                                  : "gray"
                              }
                              variant="subtle"
                              size="sm"
                            >
                              {activationPrediction.willAutoActivate
                                ? "Auto"
                                : "Dormant"}
                            </Badge>
                          </HStack>
                        </Box>
                      )}

                      {!canAfford && (
                        <Badge colorPalette="red" mt={2} width="full">
                          Insufficient EV to build
                        </Badge>
                      )}
                    </Box>
                  )}
                </HStack>
              </VStack>
            </form>
          </DialogBody>

          <DialogFooter>
            <DialogActionTrigger asChild>
              <Button variant="outline">Cancel</Button>
            </DialogActionTrigger>
            <Button
              colorPalette="blue"
              type="submit"
              form="build-infra-form"
              loading={buildInfrastructure.isPending}
              disabled={
                !infrastructureType ||
                !canAfford ||
                buildInfrastructure.isPending ||
                gameEnded
              }
            >
              Build Infrastructure
            </Button>
          </DialogFooter>

          <DialogCloseTrigger asChild>
            <button
              ref={closeTriggerRef}
              aria-hidden
              style={{ display: "none" }}
              tabIndex={-1}
            />
          </DialogCloseTrigger>
        </DialogContent>
      </Portal>
    </DialogRoot>
  );
}
