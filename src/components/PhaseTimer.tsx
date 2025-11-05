import {
  Box,
  Button,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  HStack,
  Input,
  Text,
} from "@chakra-ui/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GamePhase } from "../lib/database.types";
import { useGameStore } from "../store/gameStore";

interface PhaseTimerProps {
  round: number;
  phase: GamePhase;
}

function formatMMSS(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function PhaseTimer({ round, phase }: PhaseTimerProps) {
  const ensureTimer = useGameStore((s) => s.ensureTimer);
  const getRemainingSeconds = useGameStore((s) => s.getRemainingSeconds);
  const startTimer = useGameStore((s) => s.startTimer);
  const pauseTimer = useGameStore((s) => s.pauseTimer);
  const resetTimer = useGameStore((s) => s.resetTimer);
  const setTimerMinutes = useGameStore((s) => s.setTimerMinutes);
  const timers = useGameStore((s) => s.timers);

  const key = useMemo(() => `${round}:${phase}`, [round, phase]);
  const timerState = timers[key];

  // Ensure timer exists for current round/phase
  useEffect(() => {
    ensureTimer(round, phase);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, phase]);

  // Local tick to force rerenders while running
  const [tick, setTick] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const isRunning = !!timerState?.isRunning;
  const remaining = getRemainingSeconds(round, phase);
  const isExpired = remaining <= 0;

  // Start/stop local interval based on running state
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        setTick((t) => t + 1);
      }, 1000);
    } else if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  // Expiry modal handling
  const [open, setOpen] = useState(false);
  const prevRemainingRef = useRef<number>(remaining);
  useEffect(() => {
    const prev = prevRemainingRef.current;
    if (prev > 0 && remaining <= 0) {
      // Auto-pause and show dialog on expiry
      pauseTimer(round, phase);
      setOpen(true);
    }
    prevRemainingRef.current = remaining;
  }, [remaining, pauseTimer, round, phase]);

  const handleStartPause = () => {
    if (isRunning) {
      pauseTimer(round, phase);
    } else if (!isExpired) {
      startTimer(round, phase);
    }
  };

  const onChangeMinutes = (valueString: string) => {
    const minutes = parseInt(valueString, 10);
    if (Number.isNaN(minutes)) return;
    // Pause when editing to avoid confusion
    pauseTimer(round, phase);
    setTimerMinutes(round, phase, minutes);
  };

  const handleCloseDialog = () => setOpen(false);

  const timeColor = isExpired ? "red.600" : "gray.900";

  return (
    <Box
      px={4}
      py={3}
      bg="gray.100"
      borderRadius="md"
      borderWidth={1}
      borderColor="gray.300"
    >
      <Text fontSize="sm" color="gray.800" mb={1} fontWeight="semibold">
        Timer
      </Text>
      <Text
        fontSize="2xl"
        fontWeight="bold"
        fontFamily="mono"
        color={timeColor}
      >
        {formatMMSS(remaining)}
      </Text>
      <HStack gap={2} mt={2}>
        <Input
          type="number"
          size="sm"
          min={0}
          max={180}
          value={Math.floor((timerState?.durationSec ?? 300) / 60)}
          onChange={(e) => onChangeMinutes(e.target.value)}
          width="90px"
          aria-label="Timer minutes"
        />
        <Button
          size="sm"
          onClick={handleStartPause}
          disabled={isExpired}
          colorPalette={isRunning ? "gray" : "blue"}
        >
          {isRunning ? "Pause" : "Start"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => resetTimer(round, phase)}
        >
          Reset
        </Button>
      </HStack>
      {/* Hidden tick to appease lint for unused state variable */}
      <Box display="none">{tick}</Box>

      <DialogRoot open={open} onOpenChange={(e) => setOpen(e.open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Phase time is up</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text>
              The timer for Round {round} - {phase} has expired.
            </Text>
          </DialogBody>
          <DialogFooter>
            <Button onClick={handleCloseDialog} colorPalette="red">
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </Box>
  );
}
