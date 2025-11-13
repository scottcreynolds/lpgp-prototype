import {
  Button,
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useAddPlayer } from "../hooks/useGameData";
import type { GamePhase, Specialization } from "../lib/database.types";
import { getSession, setSession } from "../lib/gameSession";
import { AddPlayerModal } from "./AddPlayerModal";
import { toaster } from "./ui/toasterInstance";

interface JoinGamePromptProps {
  phase: GamePhase;
}

export function JoinGamePrompt({ phase }: JoinGamePromptProps) {
  const [open, setOpen] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const addPlayer = useAddPlayer();

  // Open only if no session yet
  useEffect(() => {
    const s = getSession();
    if (!s) setOpen(true);
  }, []);

  const canJoinAsPlayer = phase === "Setup";

  const handleSelectPlayerPath = () => {
    if (!canJoinAsPlayer) {
      toaster.create({
        title: "Cannot join now",
        description: "Players may only join during Setup phase.",
        type: "warning",
        duration: 3500,
      });
      return;
    }
    setOpen(false);
    setShowAddPlayer(true);
  };

  const handleObserve = () => {
    setSession({ observer: true });
    toaster.create({
      title: "Non-player mode",
      description: "You're viewing as an observer/facilitator.",
      type: "info",
      duration: 2500,
    });
    setOpen(false);
  };

  const handleAddPlayer = async (
    name: string,
    specialization: Specialization
  ) => {
    try {
      const result = await addPlayer.mutateAsync({ name, specialization });
      const playerId = result?.player_id as string | undefined;
      if (!playerId) throw new Error("Missing player id after add");
      setSession({ playerId, observer: false });
      toaster.create({
        title: "Joined game",
        description: `${name} joined as ${specialization}`,
        type: "success",
        duration: 3000,
      });
    } catch (error) {
      toaster.create({
        title: "Unable to join",
        description: error instanceof Error ? error.message : "Join failed",
        type: "error",
        duration: 4000,
      });
    } finally {
      setShowAddPlayer(false);
    }
  };

  return (
    <>
      <DialogRoot open={open} onOpenChange={(e) => setOpen(e.open)}>
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
              <DialogTitle>Join this Game</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <VStack gap={4} align="stretch">
                <Text color="fg">
                  Choose how you'd like to view this game. Player joining is
                  only allowed during Setup.
                </Text>
                {!canJoinAsPlayer && (
                  <Text color="fg" fontSize="sm">
                    Player joining is disabled (not in Setup). You can observe.
                  </Text>
                )}
              </VStack>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={handleObserve}>
                Facilitate/Observe
              </Button>
              <Button
                colorPalette="green"
                onClick={handleSelectPlayerPath}
                disabled={!canJoinAsPlayer}
              >
                Join as Player
              </Button>
            </DialogFooter>
            <DialogCloseTrigger />
          </DialogContent>
        </Portal>
      </DialogRoot>
      {showAddPlayer && (
        <AddPlayerModal
          externalOpen={showAddPlayer}
          onExternalClose={() => setShowAddPlayer(false)}
          hideTrigger
          onAddPlayer={handleAddPlayer}
          isPending={addPlayer.isPending}
        />
      )}
    </>
  );
}
