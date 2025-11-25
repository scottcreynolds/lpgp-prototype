import { create } from "zustand";
import type { DashboardSummary, GamePhase } from "../lib/database.types";

// Timer defaults
const DEFAULT_TIMER_SECONDS = 3 * 60; // 5 minutes

type PhaseKey = string; // `${round}:${phase}`

interface PhaseTimerState {
  durationSec: number; // configured duration
  remainingSec: number; // remaining when paused or at last start
  startedAt: number | null; // epoch ms when started
  isRunning: boolean;
}

interface GameStore {
  // Current game state
  currentRound: number;
  currentPhase: GamePhase;
  version: number;
  gameEnded: boolean;
  victoryType: string | null;
  winnerIds: string[];

  // Dashboard data
  dashboardData: DashboardSummary | null;

  // Phase timers keyed by `${round}:${phase}`
  timers: Record<PhaseKey, PhaseTimerState>;

  // Local-only: per-round Operations turn order (array of player names)
  operationsTurnOrder: Record<number, string[]>;

  // Actions
  setGameState: (round: number, phase: GamePhase, version: number) => void;
  setDashboardData: (data: DashboardSummary) => void;
  reset: () => void;

  // Turn order actions
  setOperationsTurnOrder: (round: number, order: string[]) => void;
  clearOperationsTurnOrder: (round: number) => void;

  // Timer actions
  usePhaseTimer?: boolean;
  ensureTimer: (round: number, phase: GamePhase) => void;
  setTimerMinutes: (round: number, phase: GamePhase, minutes: number) => void;
  startTimer: (round: number, phase: GamePhase) => void;
  pauseTimer: (round: number, phase: GamePhase) => void;
  resetTimer: (round: number, phase: GamePhase) => void;
  getRemainingSeconds: (round: number, phase: GamePhase) => number;
}

const initialState = {
  currentRound: 0,
  currentPhase: "Setup" as GamePhase,
  version: 0,
  gameEnded: false,
  victoryType: null as string | null,
  winnerIds: [] as string[],
  dashboardData: null,
  timers: {} as Record<PhaseKey, PhaseTimerState>,
  operationsTurnOrder: {} as Record<number, string[]>,
  usePhaseTimer: false,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  setGameState: (round, phase, version) =>
    set((state) => {
      // If we are not in Operations, ensure any turn order for this round is cleared
      let updates: Partial<GameStore> = {
        currentRound: round,
        currentPhase: phase,
        version,
      };
      if (phase !== "Operations" && state.operationsTurnOrder[round]) {
        const rest = { ...state.operationsTurnOrder };
        delete rest[round];
        updates = { ...updates, operationsTurnOrder: rest };
      }
      return updates;
    }),

  setDashboardData: (data) =>
    set(() => {
      const safe = {
        game_state: data.game_state ?? {
          round: 0,
          phase: "Setup" as GamePhase,
          version: 0,
        },
        players: data.players ?? [],
      };
      // Narrow type for extended game_state shape
      const gsExt = safe.game_state as typeof safe.game_state & {
        ended?: boolean;
        victory_type?: string | null;
        winner_player_ids?: string[] | null;
      };
      return {
        dashboardData: safe,
        currentRound: safe.game_state.round,
        currentPhase: safe.game_state.phase,
        version: safe.game_state.version,
        gameEnded: gsExt.ended ?? false,
        victoryType: gsExt.victory_type ?? null,
        winnerIds: gsExt.winner_player_ids ?? [],
      };
    }),

  reset: () => set(initialState),

  // Local, per-round Operations turn order
  setOperationsTurnOrder: (round, order) =>
    set((state) => ({
      operationsTurnOrder: { ...state.operationsTurnOrder, [round]: order },
    })),

  clearOperationsTurnOrder: (round) =>
    set((state) => {
      if (!state.operationsTurnOrder[round]) return {};
      const rest = { ...state.operationsTurnOrder };
      delete rest[round];
      return { operationsTurnOrder: rest };
    }),

  // Ensure a timer entry exists for a given round/phase
  ensureTimer: (round, phase) =>
    set((state) => {
      const key = `${round}:${phase}`;
      if (state.timers[key]) return {};
      return {
        timers: {
          ...state.timers,
          [key]: {
            durationSec: DEFAULT_TIMER_SECONDS,
            remainingSec: DEFAULT_TIMER_SECONDS,
            startedAt: null,
            isRunning: false,
          },
        },
      };
    }),

  setTimerMinutes: (round, phase, minutes) =>
    set((state) => {
      const key = `${round}:${phase}`;
      const seconds = Math.max(0, Math.floor(minutes * 60));
      const prev = state.timers[key];
      const next: PhaseTimerState = prev
        ? {
            ...prev,
            durationSec: seconds,
            // If remaining exceeds new duration, clamp it
            remainingSec: Math.min(prev.remainingSec, seconds),
          }
        : {
            durationSec: seconds,
            remainingSec: seconds,
            startedAt: null,
            isRunning: false,
          };
      return { timers: { ...state.timers, [key]: next } };
    }),

  startTimer: (round, phase) =>
    set((state) => {
      const key = `${round}:${phase}`;
      const t = state.timers[key] ?? {
        durationSec: DEFAULT_TIMER_SECONDS,
        remainingSec: DEFAULT_TIMER_SECONDS,
        startedAt: null,
        isRunning: false,
      };
      if (t.isRunning || t.remainingSec <= 0) {
        return { timers: { ...state.timers, [key]: t } };
      }
      return {
        timers: {
          ...state.timers,
          [key]: { ...t, isRunning: true, startedAt: Date.now() },
        },
      };
    }),

  pauseTimer: (round, phase) =>
    set((state) => {
      const key = `${round}:${phase}`;
      const t = state.timers[key];
      if (!t) return {};
      if (!t.isRunning) return {};
      const elapsed = t.startedAt
        ? Math.floor((Date.now() - t.startedAt) / 1000)
        : 0;
      const remaining = Math.max(0, t.remainingSec - elapsed);
      return {
        timers: {
          ...state.timers,
          [key]: {
            ...t,
            isRunning: false,
            startedAt: null,
            remainingSec: remaining,
          },
        },
      };
    }),

  resetTimer: (round, phase) =>
    set((state) => {
      const key = `${round}:${phase}`;
      const t = state.timers[key];
      const duration = t?.durationSec ?? DEFAULT_TIMER_SECONDS;
      return {
        timers: {
          ...state.timers,
          [key]: {
            durationSec: duration,
            remainingSec: duration,
            startedAt: null,
            isRunning: false,
          },
        },
      };
    }),

  getRemainingSeconds: (round, phase) => {
    const key = `${round}:${phase}`;
    const t = get().timers[key];
    if (!t) return DEFAULT_TIMER_SECONDS;
    if (!t.isRunning) return t.remainingSec;
    const elapsed = t.startedAt
      ? Math.floor((Date.now() - t.startedAt) / 1000)
      : 0;
    return Math.max(0, t.remainingSec - elapsed);
  },
}));
