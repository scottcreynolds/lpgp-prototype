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
  Input,
  NativeSelect,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import {
  useBuildInfrastructure,
  useInfrastructureDefinitions,
} from "../hooks/useGameData";
import type { DashboardPlayer } from "../lib/database.types";
import { toaster } from "./ui/toasterInstance";

interface BuildInfrastructureModalProps {
  builderId: string;
  builderName: string;
  builderEv: number;
  players: DashboardPlayer[];
  disabled?: boolean;
}

export function BuildInfrastructureModal({
  builderId,
  builderName,
  builderEv,
  players,
  disabled = false,
}: BuildInfrastructureModalProps) {
  const [open, setOpen] = useState(false);
  const [ownerId, setOwnerId] = useState(builderId);
  const [infrastructureType, setInfrastructureType] = useState("");
  const [location, setLocation] = useState("");

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
      await buildInfrastructure.mutateAsync({
        builderId,
        ownerId,
        infrastructureType,
        location: location.trim() || null,
      });

      toaster.create({
        title: "Infrastructure Built",
        description: `${infrastructureType} built successfully${
          location ? ` at ${location}` : ""
        }`,
        type: "success",
        duration: 3000,
      });

      // Reset form and close modal
      setOwnerId(builderId);
      setInfrastructureType("");
      setLocation("");
      setOpen(false);
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

  const handleOpenChange = (details: { open: boolean }) => {
    setOpen(details.open);
    if (!details.open) {
      // Reset form when modal closes
      setOwnerId(builderId);
      setInfrastructureType("");
      setLocation("");
    }
  };

  return (
    <DialogRoot
      open={open}
      onOpenChange={handleOpenChange}
      size="xl"
      closeOnEscape
    >
      <DialogTrigger asChild>
        <Button
          colorPalette="blue"
          variant="outline"
          size="sm"
          disabled={disabled}
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
                  bg="bg.muted"
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
                              {player.id === builderId ? " (You)" : ""}
                            </option>
                          ))}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                      </NativeSelect.Root>
                      <Field.HelperText>
                        You can build infrastructure for another player
                      </Field.HelperText>
                    </Field.Root>

                    {/* Location */}
                    <Field.Root>
                      <Field.Label>Board Location</Field.Label>
                      <Input
                        placeholder="Enter board space (e.g., A-5, Crater Rim)"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      />
                      <Field.HelperText>
                        Specify where on the board this infrastructure will be
                        placed
                      </Field.HelperText>
                    </Field.Root>
                  </VStack>

                  {/* Right side: Infrastructure Details */}
                  {selectedInfrastructure && (
                    <Box
                      flex={1}
                      p={3}
                      bg="bg.muted"
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
                          <Text color="fg.muted">Build Cost:</Text>
                          <Badge
                            colorPalette={canAfford ? "green" : "red"}
                            variant="subtle"
                          >
                            {selectedInfrastructure.cost} EV
                          </Badge>
                        </HStack>
                        <HStack justify="space-between">
                          <Text color="fg.muted">Maintenance (per round):</Text>
                          <Text color="fg">
                            {selectedInfrastructure.maintenance_cost} EV
                          </Text>
                        </HStack>
                        {selectedInfrastructure.yield && (
                          <HStack justify="space-between">
                            <Text color="fg.muted">Yield (per round):</Text>
                            <Badge colorPalette="green" variant="subtle">
                              +{selectedInfrastructure.yield} EV
                            </Badge>
                          </HStack>
                        )}
                        {selectedInfrastructure.capacity && (
                          <HStack justify="space-between">
                            <Text color="fg.muted">Capacity:</Text>
                            <Text color="fg">
                              {selectedInfrastructure.capacity}
                            </Text>
                          </HStack>
                        )}
                        {selectedInfrastructure.power_requirement && (
                          <HStack justify="space-between">
                            <Text color="fg.muted">Power Requirement:</Text>
                            <Text color="fg">
                              {selectedInfrastructure.power_requirement}
                            </Text>
                          </HStack>
                        )}
                        {selectedInfrastructure.crew_requirement && (
                          <HStack justify="space-between">
                            <Text color="fg.muted">Crew Requirement:</Text>
                            <Text color="fg">
                              {selectedInfrastructure.crew_requirement}
                            </Text>
                          </HStack>
                        )}
                      </VStack>

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
                buildInfrastructure.isPending
              }
            >
              Build Infrastructure
            </Button>
          </DialogFooter>

          <DialogCloseTrigger />
        </DialogContent>
      </Portal>
    </DialogRoot>
  );
}
