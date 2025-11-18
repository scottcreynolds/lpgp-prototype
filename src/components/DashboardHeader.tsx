import { useGameStore } from "@/store/gameStore";
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  HStack,
  Icon,
  IconButton,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react";
import { LuCopy, LuMoon } from "react-icons/lu";
import { useEndGame } from "../hooks/useGameData";
import { createNewGameAndNavigate, getShareUrl } from "../lib/gameSession";
import { toaster } from "./ui/toasterInstance";

export function DashboardHeader() {
  const handleStartNewGame = async () => {
    if (
      !window.confirm("Start a brand new game? You'll get a new link to share.")
    ) {
      return;
    }

    try {
      await createNewGameAndNavigate();
      toaster.create({
        title: "New Game Created",
        description: "Share the new link with players to join",
        type: "success",
        duration: 3000,
      });
    } catch (error) {
      toaster.create({
        title: "Failed to start new game",
        description:
          error instanceof Error ? error.message : "Unexpected error",
        type: "error",
        duration: 5000,
      });
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      toaster.create({
        title: "Link copied",
        description: "Game invite link copied to clipboard",
        type: "success",
        duration: 2000,
      });
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = getShareUrl();
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      toaster.create({
        title: "Link copied",
        description: "Game invite link copied to clipboard",
        type: "success",
        duration: 2000,
      });
    }
  };

  const endGame = useEndGame();
  const gameEnded = useGameStore((s) => s.gameEnded);

  return (
    <Box bg="bg" borderBottomWidth={1} borderColor="border" py={4}>
      <Container maxW="container.xl">
        <VStack gap={3} align="stretch">
          {/* Top Row: Icon + Title + Start New Game */}
          <Flex justify="space-between" align="center">
            <HStack gap={3}>
              <Icon fontSize="3xl" color="moonGrey.500">
                <LuMoon />
              </Icon>
              <Heading size="2xl">Lunar Policy Gaming Platform</Heading>
            </HStack>
            <Button
              onClick={handleStartNewGame}
              variant="solid"
              colorPalette="flamingoGold"
              size="lg"
            >
              Start New Game
            </Button>
          </Flex>

          {/* Second Row: Share Link + End Game */}
          <Flex justify="space-between" align="center" gap={4}>
            <HStack gap={2} flex={1}>
              <Input
                readOnly
                value={getShareUrl()}
                size="sm"
                width={{ base: "220px", md: "360px" }}
              />
              <IconButton
                size="sm"
                variant="outline"
                onClick={handleCopyLink}
                colorPalette="sapphireBlue"
              >
                <LuCopy />
                Copy Link
              </IconButton>
              <Text
                fontSize="xs"
                display={{ base: "none", md: "block" }}
                color="fg"
              >
                Share this link for others to join
              </Text>
            </HStack>
            {!gameEnded && (
              <Button
                variant="outline"
                colorPalette="flamingoGold"
                size="sm"
                loading={endGame.isPending}
                onClick={async () => {
                  const confirmed = window.confirm(
                    "End Game now? This will force a final winner calculation using EV+REP ranking (cooperative if tied)."
                  );
                  if (!confirmed) return;
                  try {
                    await endGame.mutateAsync();
                  } catch {
                    // onError in hook shows toast
                  }
                }}
              >
                End Game
              </Button>
            )}
          </Flex>
        </VStack>
      </Container>
    </Box>
  );
}
