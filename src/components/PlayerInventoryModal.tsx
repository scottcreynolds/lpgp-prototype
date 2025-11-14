import {
  Badge,
  Box,
  Button,
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
  HStack,
  Portal,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useState } from "react";
import { useToggleInfrastructureStatus } from "../hooks/useGameData";
import type { PlayerInfrastructureItem } from "../lib/database.types";
import { toaster } from "./ui/toasterInstance";

interface PlayerInventoryModalProps {
  playerId: string;
  playerName: string;
  infrastructure: PlayerInfrastructureItem[];
  trigger?: React.ReactNode; // optional custom trigger button
}

export function PlayerInventoryModal({
  playerName,
  infrastructure,
  trigger,
}: PlayerInventoryModalProps) {
  const [open, setOpen] = useState(false);
  const toggleStatus = useToggleInfrastructureStatus();

  const handleToggle = async (
    infrastructureId: string,
    currentStatus: boolean,
    type: string
  ) => {
    try {
      await toggleStatus.mutateAsync({
        infrastructureId,
        targetStatus: !currentStatus,
      });

      toaster.create({
        title: !currentStatus
          ? "Infrastructure Activated"
          : "Infrastructure Deactivated",
        description: `${type} ${
          !currentStatus ? "activated" : "deactivated"
        } successfully`,
        type: "success",
        duration: 3000,
      });
    } catch (error) {
      toaster.create({
        title: "Failed to Toggle Infrastructure",
        description:
          error instanceof Error
            ? error.message
            : "Failed to toggle infrastructure status",
        type: "error",
        duration: 5000,
      });
    }
  };

  const activeInfrastructure = infrastructure.filter((i) => i.is_active);
  const dormantInfrastructure = infrastructure.filter((i) => !i.is_active);

  return (
    <DialogRoot open={open} onOpenChange={(e) => setOpen(e.open)} size="xl">
      <DialogTrigger asChild>
        {trigger ?? (
          <Button colorPalette="flamingoGold" variant="surface" size="sm">
            Inventory ({infrastructure.length})
          </Button>
        )}
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
            <DialogTitle>{playerName}'s Infrastructure Inventory</DialogTitle>
          </DialogHeader>

          <DialogBody>
            <VStack gap={6} align="stretch">
              {/* Summary */}
              <Box
                p={3}
                bg="bg"
                borderRadius="md"
                borderWidth={1}
                borderColor="border"
              >
                <HStack justify="space-between">
                  <Text
                    fontSize="sm"
                    fontWeight="semibold"
                    color="fg.emphasized"
                  >
                    Total Infrastructure:
                  </Text>
                  <Badge colorPalette="purple" variant="subtle">
                    {infrastructure.length}
                  </Badge>
                </HStack>
                <HStack justify="space-between" mt={1}>
                  <Text fontSize="sm" color="fg">
                    Active:
                  </Text>
                  <Badge colorPalette="green" variant="subtle">
                    {activeInfrastructure.length}
                  </Badge>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="sm" color="fg">
                    Dormant:
                  </Text>
                  <Badge colorPalette="gray" variant="subtle">
                    {dormantInfrastructure.length}
                  </Badge>
                </HStack>
              </Box>

              {infrastructure.length === 0 ? (
                <Text color="fg" textAlign="center" py={4}>
                  No infrastructure yet
                </Text>
              ) : (
                <Table.Root size="sm" variant="outline">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Type</Table.ColumnHeader>
                      <Table.ColumnHeader>Location</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="center">
                        Power
                      </Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="center">
                        Crew
                      </Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="center">
                        Status
                      </Table.ColumnHeader>
                      <Table.ColumnHeader>Action</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {infrastructure.map((item) => (
                      <Table.Row key={item.id}>
                        <Table.Cell>
                          <VStack align="start" gap={0}>
                            <HStack gap={2}>
                              <Text
                                fontWeight="semibold"
                                fontSize="sm"
                                color="fg"
                              >
                                {item.type}
                              </Text>
                              {item.is_starter && (
                                <Badge size="xs" colorPalette="blue">
                                  Starter
                                </Badge>
                              )}
                            </HStack>
                          </VStack>
                        </Table.Cell>
                        <Table.Cell>
                          <Text fontSize="sm" color="fg">
                            {item.location || "Not specified"}
                          </Text>
                        </Table.Cell>
                        <Table.Cell textAlign="center">
                          {item.power_requirement ? (
                            <Badge size="xs" colorPalette="yellow">
                              {item.power_requirement}
                            </Badge>
                          ) : (
                            <Text fontSize="xs" color="fg">
                              -
                            </Text>
                          )}
                        </Table.Cell>
                        <Table.Cell textAlign="center">
                          {item.crew_requirement ? (
                            <Badge size="xs" colorPalette="cyan">
                              {item.crew_requirement}
                            </Badge>
                          ) : (
                            <Text fontSize="xs" color="fg">
                              -
                            </Text>
                          )}
                        </Table.Cell>
                        <Table.Cell textAlign="center">
                          <Badge
                            colorPalette={item.is_active ? "green" : "gray"}
                            size="sm"
                          >
                            {item.is_active ? "Active" : "Dormant"}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>
                          {!item.is_starter && (
                            <Button
                              size="xs"
                              variant="outline"
                              colorPalette={item.is_active ? "gray" : "green"}
                              onClick={() =>
                                handleToggle(item.id, item.is_active, item.type)
                              }
                              loading={toggleStatus.isPending}
                            >
                              {item.is_active ? "Deactivate" : "Activate"}
                            </Button>
                          )}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              )}

              {/* Legend */}
              {infrastructure.length > 0 && (
                <Box
                  p={3}
                  bg="bg"
                  borderRadius="md"
                  borderWidth={1}
                  borderColor="border"
                >
                  <Text
                    fontSize="xs"
                    fontWeight="semibold"
                    mb={2}
                    color="fg.emphasized"
                  >
                    Notes:
                  </Text>
                  <VStack align="start" gap={1} fontSize="xs" color="fg">
                    <Text>
                      • Starter infrastructure is always active and cannot be
                      deactivated
                    </Text>
                    <Text>
                      • Active infrastructure requires available power and crew
                    </Text>
                    <Text>
                      • Deactivating infrastructure frees up power and crew for
                      other uses
                    </Text>
                  </VStack>
                </Box>
              )}
            </VStack>
          </DialogBody>

          <DialogCloseTrigger />
        </DialogContent>
      </Portal>
    </DialogRoot>
  );
}
