import { useState } from 'react';
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
  HStack,
  Box,
  Heading,
  Badge,
} from '@chakra-ui/react';
import { useCreateContract } from '../hooks/useGameData';
import { toaster } from './ui/toaster';
import type { DashboardPlayer } from '../lib/database.types';

interface CreateContractModalProps {
  players: DashboardPlayer[];
  currentRound: number;
  disabled?: boolean;
}

export function CreateContractModal({
  players,
  currentRound: _currentRound,
  disabled,
}: CreateContractModalProps) {
  const [open, setOpen] = useState(false);
  const createContract = useCreateContract();

  // Form state
  const [partyAId, setPartyAId] = useState('');
  const [partyBId, setPartyBId] = useState('');
  const [evFromAToB, setEvFromAToB] = useState(0);
  const [evFromBToA, setEvFromBToA] = useState(0);
  const [evIsPerRound, setEvIsPerRound] = useState(false);
  const [powerFromAToB, setPowerFromAToB] = useState(0);
  const [powerFromBToA, setPowerFromBToA] = useState(0);
  const [crewFromAToB, setCrewFromAToB] = useState(0);
  const [crewFromBToA, setCrewFromBToA] = useState(0);
  const [durationRounds, setDurationRounds] = useState<number | null>(null);

  const resetForm = () => {
    setPartyAId('');
    setPartyBId('');
    setEvFromAToB(0);
    setEvFromBToA(0);
    setEvIsPerRound(false);
    setPowerFromAToB(0);
    setPowerFromBToA(0);
    setCrewFromAToB(0);
    setCrewFromBToA(0);
    setDurationRounds(null);
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
        title: 'Validation Error',
        description: 'Please select both parties',
        type: 'error',
        duration: 3000,
      });
      return;
    }

    if (partyAId === partyBId) {
      toaster.create({
        title: 'Validation Error',
        description: 'Cannot create a contract with yourself',
        type: 'error',
        duration: 3000,
      });
      return;
    }

    // Check if there's any actual exchange
    const hasExchange =
      evFromAToB > 0 ||
      evFromBToA > 0 ||
      powerFromAToB > 0 ||
      powerFromBToA > 0 ||
      crewFromAToB > 0 ||
      crewFromBToA > 0;

    if (!hasExchange) {
      toaster.create({
        title: 'Validation Error',
        description: 'Contract must have at least one exchange',
        type: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      await createContract.mutateAsync({
        partyAId,
        partyBId,
        evFromAToB,
        evFromBToA,
        evIsPerRound,
        powerFromAToB,
        powerFromBToA,
        crewFromAToB,
        crewFromBToA,
        durationRounds,
      });

      const partyA = players.find((p) => p.id === partyAId);
      const partyB = players.find((p) => p.id === partyBId);

      toaster.create({
        title: 'Contract Created',
        description: `Contract between ${partyA?.name} and ${partyB?.name} created successfully`,
        type: 'success',
        duration: 3000,
      });

      setOpen(false);
    } catch (error) {
      toaster.create({
        title: 'Failed to Create Contract',
        description:
          error instanceof Error ? error.message : 'Failed to create contract',
        type: 'error',
        duration: 5000,
      });
    }
  };

  const partyA = players.find((p) => p.id === partyAId);
  const partyB = players.find((p) => p.id === partyBId);

  const netEv = evFromBToA - evFromAToB;
  const netPower = powerFromBToA - powerFromAToB;
  const netCrew = crewFromBToA - crewFromAToB;

  return (
    <DialogRoot open={open} onOpenChange={handleOpenChange} size="xl">
      <DialogTrigger asChild>
        <Button
          colorPalette="purple"
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
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            maxHeight: '90vh',
            overflow: 'auto',
          }}
        >
          <DialogHeader>
            <DialogTitle>Create New Contract</DialogTitle>
          </DialogHeader>

          <DialogBody>
            <VStack gap={4} align="stretch">
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
                        placeholder="Select Party A"
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
                        placeholder="Select Party B"
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

              {/* EV Exchange */}
              <Box>
                <Heading size="sm" mb={2} color="gray.900">
                  EV Exchange
                </Heading>
                <VStack gap={2} align="stretch">
                  <HStack gap={2}>
                    <Field.Root flex={1}>
                      <Field.Label>From A to B</Field.Label>
                      <Input
                        type="number"
                        min={0}
                        value={evFromAToB}
                        onChange={(e) =>
                          setEvFromAToB(parseInt(e.target.value) || 0)
                        }
                      />
                    </Field.Root>
                    <Field.Root flex={1}>
                      <Field.Label>From B to A</Field.Label>
                      <Input
                        type="number"
                        min={0}
                        value={evFromBToA}
                        onChange={(e) =>
                          setEvFromBToA(parseInt(e.target.value) || 0)
                        }
                      />
                    </Field.Root>
                  </HStack>
                  <Field.Root>
                    <Field.Label>Payment Type</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={evIsPerRound ? 'per-round' : 'one-time'}
                        onChange={(e) =>
                          setEvIsPerRound(e.target.value === 'per-round')
                        }
                      >
                        <option value="one-time">One-time Payment</option>
                        <option value="per-round">Per-round Payment</option>
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                    <Text fontSize="xs" color="fg.muted" mt={1}>
                      {evIsPerRound
                        ? 'Payment occurs each round while contract is active'
                        : 'Payment occurs only when contract is created'}
                    </Text>
                  </Field.Root>
                </VStack>
              </Box>

              {/* Power Exchange */}
              <Box>
                <Heading size="sm" mb={2} color="gray.900">
                  Power Capacity Sharing
                </Heading>
                <HStack gap={2}>
                  <Field.Root flex={1}>
                    <Field.Label>From A to B</Field.Label>
                    <Input
                      type="number"
                      min={0}
                      value={powerFromAToB}
                      onChange={(e) =>
                        setPowerFromAToB(parseInt(e.target.value) || 0)
                      }
                    />
                  </Field.Root>
                  <Field.Root flex={1}>
                    <Field.Label>From B to A</Field.Label>
                    <Input
                      type="number"
                      min={0}
                      value={powerFromBToA}
                      onChange={(e) =>
                        setPowerFromBToA(parseInt(e.target.value) || 0)
                      }
                    />
                  </Field.Root>
                </HStack>
              </Box>

              {/* Crew Exchange */}
              <Box>
                <Heading size="sm" mb={2} color="gray.900">
                  Crew Capacity Sharing
                </Heading>
                <HStack gap={2}>
                  <Field.Root flex={1}>
                    <Field.Label>From A to B</Field.Label>
                    <Input
                      type="number"
                      min={0}
                      value={crewFromAToB}
                      onChange={(e) =>
                        setCrewFromAToB(parseInt(e.target.value) || 0)
                      }
                    />
                  </Field.Root>
                  <Field.Root flex={1}>
                    <Field.Label>From B to A</Field.Label>
                    <Input
                      type="number"
                      min={0}
                      value={crewFromBToA}
                      onChange={(e) =>
                        setCrewFromBToA(parseInt(e.target.value) || 0)
                      }
                    />
                  </Field.Root>
                </HStack>
              </Box>

              {/* Duration */}
              <Field.Root>
                <Field.Label>Duration (Rounds)</Field.Label>
                <Input
                  type="number"
                  min={1}
                  value={durationRounds ?? ''}
                  onChange={(e) =>
                    setDurationRounds(
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                  placeholder="Leave empty for permanent"
                />
                <Text fontSize="xs" color="fg.muted" mt={1}>
                  Leave empty for a permanent contract
                </Text>
              </Field.Root>

              {/* Preview */}
              {partyA && partyB && (
                <Box
                  p={3}
                  bg="gray.50"
                  borderRadius="md"
                  borderWidth={1}
                  borderColor="gray.300"
                >
                  <Heading size="xs" mb={2} color="gray.900">
                    Net Flows to Party A ({partyA.name})
                  </Heading>
                  <VStack gap={1} align="stretch">
                    {(evFromAToB > 0 || evFromBToA > 0) && (
                      <HStack justify="space-between">
                        <Text fontSize="sm">EV:</Text>
                        <Badge
                          colorPalette={netEv >= 0 ? 'green' : 'red'}
                          size="sm"
                        >
                          {netEv >= 0 ? '+' : ''}
                          {netEv}
                          {evIsPerRound ? ' /round' : ' one-time'}
                        </Badge>
                      </HStack>
                    )}
                    {(powerFromAToB > 0 || powerFromBToA > 0) && (
                      <HStack justify="space-between">
                        <Text fontSize="sm">Power:</Text>
                        <Badge
                          colorPalette={netPower >= 0 ? 'green' : 'red'}
                          size="sm"
                        >
                          {netPower >= 0 ? '+' : ''}
                          {netPower}
                        </Badge>
                      </HStack>
                    )}
                    {(crewFromAToB > 0 || crewFromBToA > 0) && (
                      <HStack justify="space-between">
                        <Text fontSize="sm">Crew:</Text>
                        <Badge
                          colorPalette={netCrew >= 0 ? 'green' : 'red'}
                          size="sm"
                        >
                          {netCrew >= 0 ? '+' : ''}
                          {netCrew}
                        </Badge>
                      </HStack>
                    )}
                  </VStack>
                </Box>
              )}
            </VStack>
          </DialogBody>

          <DialogFooter>
            <DialogActionTrigger asChild>
              <Button variant="outline">Cancel</Button>
            </DialogActionTrigger>
            <Button
              colorPalette="purple"
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
