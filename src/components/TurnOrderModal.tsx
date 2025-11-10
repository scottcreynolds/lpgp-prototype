import type { DashboardPlayer } from "@/lib/database.types";
import { useGameStore } from "@/store/gameStore";
import {
  Box,
  Button,
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
  Flex,
  Portal,
  Progress,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useCallback, useState } from "react";

interface TurnOrderModalProps {
  players: DashboardPlayer[];
  round: number;
  disabled?: boolean;
  onGenerated?: (order: string[]) => void;
}

// Simple Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function TurnOrderModal({
  players,
  round,
  disabled,
  onGenerated,
}: TurnOrderModalProps) {
  const setOrder = useGameStore((s) => s.setOperationsTurnOrder);
  const existing = useGameStore((s) => s.operationsTurnOrder[round]);

  const [open, setOpen] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [order, setOrderState] = useState<string[]>(existing ?? []);
  const [phaseText, setPhaseText] = useState("Initializing quantum dice...");

  const rollingDurationMs = 2000; // 2s total animation duration
  const updateIntervalMs = 120; // progress tick

  const beginRoll = useCallback(() => {
    setIsRolling(true);
    setProgress(0);
    setPhaseText("Calibrating lunar gravity field...");
    const started = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - started;
      const pct = Math.min(
        100,
        Math.round((elapsed / rollingDurationMs) * 100)
      );
      setProgress(pct);
      if (
        elapsed > rollingDurationMs * 0.3 &&
        elapsed < rollingDurationMs * 0.6
      ) {
        setPhaseText("Entangling crew assignment particles...");
      } else if (
        elapsed >= rollingDurationMs * 0.6 &&
        elapsed < rollingDurationMs * 0.9
      ) {
        setPhaseText("Stabilizing turn vector in low orbit...");
      }
      if (elapsed >= rollingDurationMs) {
        clearInterval(interval);
        const randomized = shuffle(players.map((p) => p.name));
        setOrderState(randomized);
        setOrder(round, randomized);
        setPhaseText("Turn order locked. Prepare for operations!");
        setIsRolling(false);
        onGenerated?.(randomized);
      }
    }, updateIntervalMs);
  }, [players, round, setOrder, onGenerated]);

  const handleOpenChange = (e: { open: boolean }) => {
    setOpen(e.open);
    if (e.open && !existing) {
      // Only generate if not already generated for this round
      beginRoll();
    }
  };

  return (
    <DialogRoot open={open} onOpenChange={handleOpenChange} size="lg">
      <DialogTrigger asChild>
        <Button
          colorPalette="flamingoGold"
          color="flamingoGold.500"
          variant="outline"
          disabled={disabled || players.length === 0 || !!existing}
        >
          {existing ? "Turn Order Generated" : "Generate Turn Order"}
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
            width: "min(95vw, 680px)",
          }}
        >
          <DialogHeader>
            <DialogTitle>Operations Phase Turn Order</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <VStack gap={4} align="stretch">
              {isRolling ? (
                <Box>
                  <Text fontSize="sm" mb={2} color="fg.emphasized">
                    {phaseText}
                  </Text>
                  <Progress.Root value={progress} max={100} size="sm">
                    <Progress.Track>
                      <Progress.Range />
                    </Progress.Track>
                  </Progress.Root>
                  <Flex mt={4} justify="center" gap={4}>
                    {/* Dice animation: simple pulsing squares */}
                    {[0, 1, 2].map((i) => (
                      <Box
                        key={i}
                        w="48px"
                        h="48px"
                        borderRadius="md"
                        bg="purple.500"
                        animation="pulse 0.9s ease-in-out infinite"
                        css={{
                          animationDelay: `${i * 0.15}s`,
                          boxShadow: "0 0 0 3px rgba(128,0,255,0.3)",
                        }}
                      />
                    ))}
                  </Flex>
                  <Text
                    mt={3}
                    fontSize="xs"
                    textAlign="center"
                    color="fg.muted"
                  >
                    Synchronizing lunar command algorithms...
                  </Text>
                </Box>
              ) : (
                <Box>
                  {order.length > 0 ? (
                    <VStack align="stretch" gap={2}>
                      <Text fontSize="sm" color="fg.emphasized" mb={1}>
                        Final Order:
                      </Text>
                      {order.map((name, idx) => (
                        <Flex
                          key={name}
                          p={2}
                          borderWidth="1px"
                          borderColor="gray.200"
                          borderRadius="md"
                          bg="bg"
                          align="center"
                          gap={3}
                        >
                          <Box
                            w="28px"
                            h="28px"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            fontWeight="bold"
                            borderRadius="full"
                            bg="purple.600"
                            color="white"
                            fontSize="sm"
                          >
                            {idx + 1}
                          </Box>
                          <Text fontSize="sm" fontWeight="medium" color="fg">
                            {name}
                          </Text>
                        </Flex>
                      ))}
                    </VStack>
                  ) : (
                    <Text fontSize="sm" color="fg">
                      No players available to generate an order.
                    </Text>
                  )}
                </Box>
              )}
            </VStack>
          </DialogBody>
          <DialogFooter>
            <Flex w="100%" justify="space-between" align="center">
              <DialogCloseTrigger asChild>
                <Button variant="ghost">Close</Button>
              </DialogCloseTrigger>
              {!isRolling && order.length > 0 && (
                <Text fontSize="xs" color="fg.muted">
                  Share this order verbally with other players.
                </Text>
              )}
            </Flex>
          </DialogFooter>
        </DialogContent>
      </Portal>
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(1.25); opacity: 1; }
          100% { transform: scale(1); opacity: 0.85; }
        }
      `}</style>
    </DialogRoot>
  );
}
