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
  Heading,
  HStack,
  Input,
  List,
  NativeSelect,
  Portal,
  RadioGroup,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useState } from "react";
import { useCreateContract } from "../hooks/useGameData";
import type { DashboardPlayer } from "../lib/database.types";
import { toaster } from "./ui/toasterInstance";

interface CreateContractModalProps {
  players: DashboardPlayer[];
  currentRound: number;
  disabled?: boolean;
}

export function CreateContractModal({
  players,
  disabled,
}: CreateContractModalProps) {
  type ValueDetails = string | { value?: string | null };
  const [open, setOpen] = useState(false);
  const createContract = useCreateContract();

  // Form state
  const [partyAId, setPartyAId] = useState("");
  const [partyBId, setPartyBId] = useState("");
  const [evFromAToB, setEvFromAToB] = useState("0");
  const [evFromBToA, setEvFromBToA] = useState("0");
  const [evIsPerRound, setEvIsPerRound] = useState(false);
  const [powerFromAToB, setPowerFromAToB] = useState("0");
  const [powerFromBToA, setPowerFromBToA] = useState("0");
  const [crewFromAToB, setCrewFromAToB] = useState("0");
  const [crewFromBToA, setCrewFromBToA] = useState("0");
  const [durationRounds, setDurationRounds] = useState("");

  const resetForm = () => {
    setPartyAId("");
    setPartyBId("");
    setEvFromAToB("0");
    setEvFromBToA("0");
    setEvIsPerRound(false);
    setPowerFromAToB("0");
    setPowerFromBToA("0");
    setCrewFromAToB("0");
    setCrewFromBToA("0");
    setDurationRounds("");
  };

  const handleOpenChange = (details: { open: boolean }) => {
    setOpen(details.open);
    if (details.open) {
      resetForm();
    }
  };

  const handleSubmit = async () => {
    if (!partyAId || !partyBId) {
      toaster.create({
        title: "Validation Error",
        description: "Please select both parties",
        type: "error",
        duration: 3000,
      });
      return;
    }

    if (partyAId === partyBId) {
      toaster.create({
        title: "Validation Error",
        description: "Cannot create a contract with yourself",
        type: "error",
        duration: 3000,
      });
      return;
    }

    // Parse and validate numbers
    const evAToB = parseInt(evFromAToB) || 0;
    const evBToA = parseInt(evFromBToA) || 0;
    const powerAToB = parseInt(powerFromAToB) || 0;
    const powerBToA = parseInt(powerFromBToA) || 0;
    const crewAToB = parseInt(crewFromAToB) || 0;
    const crewBToA = parseInt(crewFromBToA) || 0;
    const duration = durationRounds.trim() ? parseInt(durationRounds) : null;

    // Validate all parsed numbers are non-negative
    if (
      evAToB < 0 ||
      evBToA < 0 ||
      powerAToB < 0 ||
      powerBToA < 0 ||
      crewAToB < 0 ||
      crewBToA < 0
    ) {
      toaster.create({
        title: "Validation Error",
        description: "Values cannot be negative",
        type: "error",
        duration: 3000,
      });
      return;
    }

    if (duration !== null && duration < 1) {
      toaster.create({
        title: "Validation Error",
        description: "Duration must be at least 1 round",
        type: "error",
        duration: 3000,
      });
      return;
    }

    // Check if there's any actual exchange
    const hasExchange =
      evAToB > 0 ||
      evBToA > 0 ||
      powerAToB > 0 ||
      powerBToA > 0 ||
      crewAToB > 0 ||
      crewBToA > 0;

    if (!hasExchange) {
      toaster.create({
        title: "Validation Error",
        description: "Contract must have at least one exchange",
        type: "error",
        duration: 3000,
      });
      return;
    }

    try {
      await createContract.mutateAsync({
        partyAId,
        partyBId,
        evFromAToB: evAToB,
        evFromBToA: evBToA,
        evIsPerRound,
        powerFromAToB: powerAToB,
        powerFromBToA: powerBToA,
        crewFromAToB: crewAToB,
        crewFromBToA: crewBToA,
        durationRounds: duration,
      });

      const partyA = players.find((p) => p.id === partyAId);
      const partyB = players.find((p) => p.id === partyBId);

      toaster.create({
        title: "Contract Created",
        description: `Contract between ${partyA?.name} and ${partyB?.name} created successfully`,
        type: "success",
        duration: 3000,
      });

      setOpen(false);
    } catch (error) {
      toaster.create({
        title: "Failed to Create Contract",
        description:
          error instanceof Error ? error.message : "Failed to create contract",
        type: "error",
        duration: 5000,
      });
    }
  };

  const partyA = players.find((p) => p.id === partyAId);
  const partyB = players.find((p) => p.id === partyBId);

  // Disable all form controls until both parties are selected
  const formDisabled = !partyAId || !partyBId;

  // Parse values for preview
  const evAToB = parseInt(evFromAToB) || 0;
  const evBToA = parseInt(evFromBToA) || 0;
  const powerAToB = parseInt(powerFromAToB) || 0;
  const powerBToA = parseInt(powerFromBToA) || 0;
  const crewAToB = parseInt(crewFromAToB) || 0;
  const crewBToA = parseInt(crewFromBToA) || 0;

  // Net flows to Party A (positive = A receives, negative = A gives)
  const netEvA = evBToA - evAToB;
  const netPowerA = powerBToA - powerAToB;
  const netCrewA = crewBToA - crewAToB;

  // Net flows to Party B (opposite of Party A)
  const netEvB = evAToB - evBToA;
  const netPowerB = powerAToB - powerBToA;
  const netCrewB = crewAToB - crewBToA;

  return (
    <DialogRoot open={open} onOpenChange={handleOpenChange} size="xl">
      <DialogTrigger asChild>
        <Button
          colorPalette="sapphireWool"
          variant="solid"
          disabled={disabled}
          size="md"
        >
          Create Contract
        </Button>
      </DialogTrigger>

      <Portal>
        <DialogBackdrop />
        <DialogContent
          css={{
            position: "fixed",
            top: "40%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            maxHeight: "90vh",
            overflow: "scroll",
          }}
        >
          <DialogHeader>
            <DialogTitle>Create New Contract</DialogTitle>
          </DialogHeader>

          <DialogBody>
            <HStack gap={4} align="start">
              {/* Left side: Form */}
              <VStack gap={4} align="stretch" flex={1}>
                {/* Party Selection */}
                <Box>
                  <Heading size="sm" mb={2} color="fg.emphasized">
                    Parties
                  </Heading>
                  <VStack gap={2} align="stretch">
                    <Field.Root>
                      <Field.Label>Party A</Field.Label>
                      <NativeSelect.Root>
                        <NativeSelect.Field
                          value={partyAId}
                          onChange={(e) => setPartyAId(e.target.value)}
                        >
                          <option value="">Select Party A</option>
                          {players.map((player) => (
                            <option key={player.id} value={player.id}>
                              {player.name} (EV: {player.ev})
                            </option>
                          ))}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                      </NativeSelect.Root>
                    </Field.Root>

                    <Field.Root>
                      <Field.Label>Party B</Field.Label>
                      <NativeSelect.Root>
                        <NativeSelect.Field
                          value={partyBId}
                          onChange={(e) => setPartyBId(e.target.value)}
                        >
                          <option value="">Select Party B</option>
                          {players.map((player) => (
                            <option
                              key={player.id}
                              value={player.id}
                              disabled={player.id === partyAId}
                            >
                              {player.name} (EV: {player.ev})
                            </option>
                          ))}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                      </NativeSelect.Root>
                    </Field.Root>
                  </VStack>
                </Box>

                {formDisabled && (
                  <Text fontSize="sm" color="fg" mt={2}>
                    Select both parties to enable the rest of the fields
                  </Text>
                )}

                {/* EV Exchange */}
                <Box>
                  <Heading size="sm" mb={2} color="fg.emphasized">
                    EV Exchange
                  </Heading>
                  <VStack gap={2} align="stretch">
                    <HStack gap={2}>
                      <Field.Root flex={1}>
                        <Field.Label>
                          From {partyA?.name || "A"} to {partyB?.name || "B"}
                        </Field.Label>
                        <Input
                          type="text"
                          value={evFromAToB}
                          onChange={(e) => setEvFromAToB(e.target.value)}
                          disabled={formDisabled}
                          placeholder="0"
                        />
                      </Field.Root>
                      <Field.Root flex={1}>
                        <Field.Label>
                          From {partyB?.name || "B"} to {partyA?.name || "A"}
                        </Field.Label>
                        <Input
                          type="text"
                          value={evFromBToA}
                          onChange={(e) => setEvFromBToA(e.target.value)}
                          disabled={formDisabled}
                          placeholder="0"
                        />
                      </Field.Root>
                    </HStack>
                    <Field.Root>
                      <Field.Label>Payment Type</Field.Label>

                      <RadioGroup.Root
                        colorPalette="sapphireWool"
                        disabled={formDisabled}
                        onValueChange={(details: ValueDetails) => {
                          const val =
                            typeof details === "string"
                              ? details
                              : details?.value ?? String(details);
                          setEvIsPerRound(val === "per-round");
                        }}
                      >
                        <HStack gap={4} mt={2}>
                          <RadioGroup.Item key="one-time" value="one-time">
                            <RadioGroup.ItemHiddenInput />

                            <RadioGroup.ItemText>
                              One-time Payment
                            </RadioGroup.ItemText>
                            <RadioGroup.ItemIndicator />
                          </RadioGroup.Item>

                          <RadioGroup.Item key="per-round" value="per-round">
                            <RadioGroup.ItemHiddenInput />

                            <RadioGroup.ItemText>
                              Per-round Payment
                            </RadioGroup.ItemText>
                            <RadioGroup.ItemIndicator />
                          </RadioGroup.Item>
                        </HStack>
                      </RadioGroup.Root>
                      <Text fontSize="xs" color="fg" mt={2}>
                        {evIsPerRound
                          ? "Payment occurs each round while contract is active"
                          : "Payment occurs only when contract is created"}
                      </Text>
                    </Field.Root>
                  </VStack>
                </Box>

                {/* Power Exchange */}
                <Box>
                  <Heading size="sm" mb={2} color="fg.emphasized">
                    Power Capacity Sharing
                  </Heading>
                  <HStack gap={2}>
                    <Field.Root flex={1}>
                      <Field.Label>
                        From {partyA?.name || "A"} to {partyB?.name || "B"}
                      </Field.Label>
                      <Input
                        type="text"
                        value={powerFromAToB}
                        onChange={(e) => setPowerFromAToB(e.target.value)}
                        placeholder="0"
                        disabled={formDisabled}
                      />
                    </Field.Root>
                    <Field.Root flex={1}>
                      <Field.Label>
                        From {partyB?.name || "B"} to {partyA?.name || "A"}
                      </Field.Label>
                      <Input
                        type="text"
                        value={powerFromBToA}
                        onChange={(e) => setPowerFromBToA(e.target.value)}
                        placeholder="0"
                        disabled={formDisabled}
                      />
                    </Field.Root>
                  </HStack>
                </Box>

                {/* Crew Exchange */}
                <Box>
                  <Heading size="sm" mb={2} color="fg.emphasized">
                    Crew Capacity Sharing
                  </Heading>
                  <HStack gap={2}>
                    <Field.Root flex={1}>
                      <Field.Label>
                        From {partyA?.name || "A"} to {partyB?.name || "B"}
                      </Field.Label>
                      <Input
                        type="text"
                        value={crewFromAToB}
                        onChange={(e) => setCrewFromAToB(e.target.value)}
                        placeholder="0"
                        disabled={formDisabled}
                      />
                    </Field.Root>
                    <Field.Root flex={1}>
                      <Field.Label>
                        From {partyB?.name || "B"} to {partyA?.name || "A"}
                      </Field.Label>
                      <Input
                        type="text"
                        value={crewFromBToA}
                        onChange={(e) => setCrewFromBToA(e.target.value)}
                        placeholder="0"
                        disabled={formDisabled}
                      />
                    </Field.Root>
                  </HStack>
                </Box>

                {/* Duration */}
                <Field.Root>
                  <Field.Label>Duration (Rounds)</Field.Label>
                  <Input
                    type="text"
                    value={durationRounds}
                    onChange={(e) => setDurationRounds(e.target.value)}
                    placeholder="Leave empty for permanent"
                    disabled={formDisabled}
                  />
                  <Text fontSize="xs" color="fg" mt={1}>
                    Leave empty for a permanent contract
                  </Text>
                </Field.Root>
              </VStack>

              {/* Right side: Preview + Example Contracts (always visible) */}
              <VStack gap={3} align="stretch" width="320px" flexShrink={0}>
                <Heading size="sm" color="fg.emphasized">
                  Preview
                </Heading>

                {/* Party A Net Flows */}
                <Box
                  p={3}
                  bg="bg"
                  borderRadius="md"
                  borderWidth={1}
                  borderColor="border"
                >
                  <Heading size="xs" mb={2} color="fg.emphasized">
                    {partyA?.name || "Party A"} receives:
                  </Heading>
                  <VStack gap={1} align="stretch">
                    {(evAToB > 0 || evBToA > 0) && (
                      <HStack justify="space-between">
                        <Text fontSize="sm" color="fg">
                          EV:
                        </Text>
                        <Badge
                          colorPalette={netEvA >= 0 ? "green" : "red"}
                          size="sm"
                        >
                          {netEvA >= 0 ? "+" : ""}
                          {netEvA}
                          {evIsPerRound ? " /round" : " one-time"}
                        </Badge>
                      </HStack>
                    )}
                    {(powerAToB > 0 || powerBToA > 0) && (
                      <HStack justify="space-between">
                        <Text fontSize="sm" color="fg">
                          Power:
                        </Text>
                        <Badge
                          colorPalette={netPowerA >= 0 ? "green" : "red"}
                          size="sm"
                        >
                          {netPowerA >= 0 ? "+" : ""}
                          {netPowerA}
                        </Badge>
                      </HStack>
                    )}
                    {(crewAToB > 0 || crewBToA > 0) && (
                      <HStack justify="space-between">
                        <Text fontSize="sm" color="fg">
                          Crew:
                        </Text>
                        <Badge
                          colorPalette={netCrewA >= 0 ? "green" : "red"}
                          size="sm"
                        >
                          {netCrewA >= 0 ? "+" : ""}
                          {netCrewA}
                        </Badge>
                      </HStack>
                    )}
                  </VStack>
                </Box>

                {/* Party B Net Flows */}
                <Box
                  p={3}
                  bg="bg"
                  borderRadius="md"
                  borderWidth={1}
                  borderColor="border"
                >
                  <Heading size="xs" mb={2} color="fg.emphasized">
                    {partyB?.name || "Party B"} receives:
                  </Heading>
                  <VStack gap={1} align="stretch">
                    {(evAToB > 0 || evBToA > 0) && (
                      <HStack justify="space-between">
                        <Text fontSize="sm" color="fg">
                          EV:
                        </Text>
                        <Badge
                          colorPalette={netEvB >= 0 ? "green" : "red"}
                          size="sm"
                        >
                          {netEvB >= 0 ? "+" : ""}
                          {netEvB}
                          {evIsPerRound ? " /round" : " one-time"}
                        </Badge>
                      </HStack>
                    )}
                    {(powerAToB > 0 || powerBToA > 0) && (
                      <HStack justify="space-between">
                        <Text fontSize="sm" color="fg">
                          Power:
                        </Text>
                        <Badge
                          colorPalette={netPowerB >= 0 ? "green" : "red"}
                          size="sm"
                        >
                          {netPowerB >= 0 ? "+" : ""}
                          {netPowerB}
                        </Badge>
                      </HStack>
                    )}
                    {(crewAToB > 0 || crewBToA > 0) && (
                      <HStack justify="space-between">
                        <Text fontSize="sm" color="fg">
                          Crew:
                        </Text>
                        <Badge
                          colorPalette={netCrewB >= 0 ? "green" : "red"}
                          size="sm"
                        >
                          {netCrewB >= 0 ? "+" : ""}
                          {netCrewB}
                        </Badge>
                      </HStack>
                    )}
                  </VStack>
                </Box>

                {/* Example Contracts / Help Text */}
                <Box p={2}>
                  <Heading size="sm" mb={2} color="fg.emphasized">
                    Example Contracts
                  </Heading>
                  <Text fontSize="xs" color="fg" mt={1}>
                    Here are some examples of things you could do with
                    contracts. players.
                  </Text>
                  <List.Root fontSize="xs" mt={2}>
                    <List.Item>
                      Trade 10 EV per-round for Power or Crew Capacity.
                    </List.Item>
                    <List.Item>
                      Trade Crew Capacity for Power Capacity for the next 3
                      rounds.
                    </List.Item>
                    <List.Item>
                      Exchange one-time EV to have another player build you some
                      infrastructure that you can't build.
                    </List.Item>
                    <List.Item>
                      Exchange one-time EV and ongoing Crew Capacity for Power.
                    </List.Item>
                  </List.Root>
                </Box>
              </VStack>
            </HStack>
          </DialogBody>

          <DialogFooter>
            <DialogActionTrigger asChild>
              <Button colorPalette="subduedCrystal" variant="outline">
                Cancel
              </Button>
            </DialogActionTrigger>
            <Button
              colorPalette="flamingoGold"
              onClick={handleSubmit}
              loading={createContract.isPending}
              disabled={!partyAId || !partyBId || partyAId === partyBId}
            >
              Create Contract
            </Button>
          </DialogFooter>

          <DialogCloseTrigger />
        </DialogContent>
      </Portal>
    </DialogRoot>
  );
}
