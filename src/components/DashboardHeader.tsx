import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  HStack,
  Input,
  Text,
} from "@chakra-ui/react";
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

  return (
    <Box bg="bg" borderBottomWidth={1} borderColor="border" py={4}>
      <Container maxW="container.xl">
        <Flex justify="space-between" align="center" gap={4}>
          <Heading size="lg">Lunar Policy Gaming Platform</Heading>
          <HStack gap={2} flexWrap="wrap" align="center">
            <HStack gap={2}>
              <Input
                readOnly
                value={getShareUrl()}
                size="sm"
                width={{ base: "220px", md: "360px" }}
              />
              <Button size="sm" variant="outline" onClick={handleCopyLink}>
                Copy Link
              </Button>
            </HStack>
            <Text display={{ base: "none", md: "block" }} color="fg.muted">
              Share this link for others to join
            </Text>
            <Button
              onClick={handleStartNewGame}
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
