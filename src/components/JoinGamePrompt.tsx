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
  Field,
  Input,
  NativeSelect,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useAddPlayer } from "../hooks/useGameData";
import type { GamePhase, Specialization } from "../lib/database.types";
import { getSession, setSession } from "../lib/gameSession";
import { toaster } from "./ui/toasterInstance";

interface JoinGamePromptProps {
  phase: GamePhase;
}

const specializations: Specialization[] = [
  "Resource Extractor",
  "Infrastructure Provider",
  "Operations Manager",
];

export function JoinGamePrompt({ phase }: JoinGamePromptProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [spec, setSpec] = useState<Specialization>("Resource Extractor");
  const addPlayer = useAddPlayer();

  // Open only if no session yet
  useEffect(() => {
    const s = getSession();
    if (!s) setOpen(true);
  }, []);

  const canJoinAsPlayer = phase === "Setup";

  const handleJoin = async () => {
    if (!name.trim()) return;
    try {
      const result = await addPlayer.mutateAsync({
        name: name.trim(),
        specialization: spec,
      });
      const playerId = result?.player_id as string | undefined;
      if (playerId) {
        setSession({ playerId, observer: false });
        toaster.create({
          title: "Joined game",
          description: `${name.trim()} joined as ${spec}`,
          type: "success",
          duration: 3000,
        });
        setOpen(false);
      } else {
        throw new Error("Failed to get player id");
      }
    } catch (error) {
      toaster.create({
        title: "Unable to join",
        description: error instanceof Error ? error.message : "Join failed",
        type: "error",
        duration: 4000,
      });
    }
  };

  const handleObserve = () => {
    setSession({ observer: true });
    toaster.create({
      title: "Observer mode",
      description: "You're viewing as an observer",
      type: "info",
      duration: 2500,
    });
    setOpen(false);
  };

  return (
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
              <Text color="fg.muted">
                Join as a player or continue as an observer. You can only join
                during the Setup phase.
              </Text>
              <Field.Root>
                <Field.Label>Company Name</Field.Label>
                <Input
                  placeholder="Enter company name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>Specialization</Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={spec}
                    onChange={(e) => setSpec(e.target.value as Specialization)}
                  >
                    {specializations.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>
              {!canJoinAsPlayer && (
                <Text color="fg" fontSize="sm">
                  Joining as a player is disabled (not in Setup). You can enter
                  as an observer.
                </Text>
              )}
            </VStack>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={handleObserve}>
              Observe Only
            </Button>
            <Button
              colorPalette="green"
              onClick={handleJoin}
              loading={addPlayer.isPending}
              disabled={!canJoinAsPlayer || !name.trim()}
            >
              Join as Player
            </Button>
          </DialogFooter>
          <DialogCloseTrigger />
        </DialogContent>
      </Portal>
    </DialogRoot>
  );
}
