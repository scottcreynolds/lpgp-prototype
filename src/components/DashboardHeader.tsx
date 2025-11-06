import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  HStack,
} from "@chakra-ui/react";
import { useAddPlayer, useResetGame } from "../hooks/useGameData";
import type { Specialization } from "../lib/database.types";
import { AddPlayerModal } from "./AddPlayerModal";
import { toaster } from "./ui/toasterInstance";

export function DashboardHeader() {
  const resetGame = useResetGame();
  const addPlayer = useAddPlayer();

  const handleResetGame = async () => {
    if (
      !window.confirm(
        "Are you sure you want to start a new game? This will reset all progress."
      )
    ) {
      return;
    }

    try {
      await resetGame.mutateAsync();
      toaster.create({
        title: "Game Reset",
        description: "Started a new game with 1 default player",
        type: "success",
        duration: 3000,
      });
    } catch (error) {
      toaster.create({
        title: "Reset Failed",
        description:
          error instanceof Error ? error.message : "Failed to reset game",
        type: "error",
        duration: 5000,
      });
    }
  };

  const handleAddPlayer = async (
    name: string,
    specialization: Specialization
  ) => {
    try {
      await addPlayer.mutateAsync({ name, specialization });
      toaster.create({
        title: "Player Added",
        description: `${name} joined as ${specialization}`,
        type: "success",
        duration: 3000,
      });
    } catch (error) {
      toaster.create({
        title: "Failed to Add Player",
        description:
          error instanceof Error ? error.message : "Failed to add player",
        type: "error",
        duration: 5000,
      });
    }
  };

  return (
    <Box bg="bg" borderBottomWidth={1} borderColor="border" py={4}>
      <Container maxW="container.xl">
        <Flex justify="space-between" align="center">
          <Heading size="lg">Lunar Policy Gaming Platform</Heading>
          <HStack gap={3}>
            <AddPlayerModal
              onAddPlayer={handleAddPlayer}
              isPending={addPlayer.isPending}
            />
            <Button
              onClick={handleResetGame}
              loading={resetGame.isPending}
              colorPalette="red"
              variant="outline"
            >
              Start New Game
            </Button>
          </HStack>
        </Flex>
      </Container>
    </Box>
  );
}
