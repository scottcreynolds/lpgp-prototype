import { create } from 'zustand';
import type { DashboardSummary, GamePhase } from '../lib/database.types';

interface GameStore {
  // Current game state
  currentRound: number;
  currentPhase: GamePhase;
  version: number;

  // Dashboard data
  dashboardData: DashboardSummary | null;

  // Actions
  setGameState: (round: number, phase: GamePhase, version: number) => void;
  setDashboardData: (data: DashboardSummary) => void;
  reset: () => void;
}

const initialState = {
  currentRound: 1,
  currentPhase: 'Governance' as GamePhase,
  version: 0,
  dashboardData: null,
};

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,

  setGameState: (round, phase, version) =>
    set({
      currentRound: round,
      currentPhase: phase,
      version,
    }),

  setDashboardData: (data) =>
    set({
      dashboardData: data,
      currentRound: data.game_state.round,
      currentPhase: data.game_state.phase,
      version: data.game_state.version,
    }),

  reset: () => set(initialState),
}));
