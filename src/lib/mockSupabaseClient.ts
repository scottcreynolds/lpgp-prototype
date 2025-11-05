import type { GamePhase } from './database.types';
import {
  initialGameState,
  initialPlayers,
  initialPlayerInfrastructure,
  initialLedger,
  infrastructureDefinitions,
  buildDashboardSummary,
} from './mockData';

const STORAGE_KEYS = {
  GAME_STATE: 'lpgp_game_state',
  PLAYERS: 'lpgp_players',
  PLAYER_INFRASTRUCTURE: 'lpgp_player_infrastructure',
  LEDGER: 'lpgp_ledger',
} as const;

// Initialize localStorage with seed data if empty
function initializeStorage() {
  if (!localStorage.getItem(STORAGE_KEYS.GAME_STATE)) {
    localStorage.setItem(
      STORAGE_KEYS.GAME_STATE,
      JSON.stringify(initialGameState)
    );
    localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(initialPlayers));
    localStorage.setItem(
      STORAGE_KEYS.PLAYER_INFRASTRUCTURE,
      JSON.stringify(initialPlayerInfrastructure)
    );
    localStorage.setItem(STORAGE_KEYS.LEDGER, JSON.stringify(initialLedger));
  }
}

// Get data from localStorage
function getGameState() {
  initializeStorage();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.GAME_STATE)!);
}

function getPlayers() {
  initializeStorage();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.PLAYERS)!);
}

function getPlayerInfrastructure() {
  initializeStorage();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.PLAYER_INFRASTRUCTURE)!);
}

// Save data to localStorage
function saveGameState(state: typeof initialGameState) {
  localStorage.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify(state));
  notifySubscribers('game_state');
}

// TODO: Add save functions for players, infrastructure, and ledger when needed
// - savePlayers(players)
// - savePlayerInfrastructure(infra)
// - saveLedger(ledger)
// - getLedger()

// Subscription management
type SubscriptionCallback = () => void;
const subscribers: Map<string, Set<SubscriptionCallback>> = new Map();

function subscribe(table: string, callback: SubscriptionCallback) {
  if (!subscribers.has(table)) {
    subscribers.set(table, new Set());
  }
  subscribers.get(table)!.add(callback);
  return () => {
    subscribers.get(table)?.delete(callback);
  };
}

function notifySubscribers(table: string) {
  // Slight delay to simulate real-time latency
  setTimeout(() => {
    subscribers.get(table)?.forEach((callback) => callback());
  }, 100);
}

// Mock RPC functions
async function rpcGetDashboardSummary() {
  const gameState = getGameState();
  const players = getPlayers();
  const playerInfra = getPlayerInfrastructure();

  const summary = buildDashboardSummary(
    gameState,
    players,
    playerInfra,
    infrastructureDefinitions
  );

  return {
    data: summary,
    error: null,
  };
}

async function rpcAdvancePhase(currentVersion: number) {
  const gameState = getGameState();

  // Check version for optimistic locking
  if (gameState.version !== currentVersion) {
    return {
      data: [
        {
          success: false,
          new_round: gameState.current_round,
          new_phase: gameState.current_phase as GamePhase,
          new_version: gameState.version,
          error_message: 'Version mismatch - another update occurred',
        },
      ],
      error: null,
    };
  }

  // Determine next phase/round
  let newRound = gameState.current_round;
  let newPhase: GamePhase;

  if (gameState.current_phase === 'Governance') {
    newPhase = 'Operations';
  } else {
    newRound += 1;
    newPhase = 'Governance';
  }

  // Update game state
  const updatedState = {
    ...gameState,
    current_round: newRound,
    current_phase: newPhase,
    version: gameState.version + 1,
    updated_at: new Date().toISOString(),
  };

  saveGameState(updatedState);

  return {
    data: [
      {
        success: true,
        new_round: newRound,
        new_phase: newPhase,
        new_version: gameState.version + 1,
        error_message: null,
      },
    ],
    error: null,
  };
}

async function rpcResetGame() {
  // Reset to initial state
  localStorage.setItem(
    STORAGE_KEYS.GAME_STATE,
    JSON.stringify(initialGameState)
  );
  localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(initialPlayers));
  localStorage.setItem(
    STORAGE_KEYS.PLAYER_INFRASTRUCTURE,
    JSON.stringify(initialPlayerInfrastructure)
  );
  localStorage.setItem(STORAGE_KEYS.LEDGER, JSON.stringify(initialLedger));

  // Notify all subscribers
  notifySubscribers('game_state');
  notifySubscribers('players');
  notifySubscribers('player_infrastructure');

  return {
    data: [
      {
        success: true,
        message: 'Game reset successfully',
        player_count: 4,
      },
    ],
    error: null,
  };
}

// Mock Supabase client
export const mockSupabaseClient = {
  rpc: (functionName: string, params?: Record<string, unknown>) => {
    switch (functionName) {
      case 'get_dashboard_summary':
        return rpcGetDashboardSummary();
      case 'advance_phase':
        return rpcAdvancePhase(params?.current_version as number);
      case 'reset_game':
        return rpcResetGame();
      default:
        return Promise.resolve({
          data: null,
          error: { message: `Unknown RPC function: ${functionName}` },
        });
    }
  },

  channel: (_channelName: string) => {
    const handlers: Map<string, SubscriptionCallback> = new Map();

    const channelObj = {
      on: (
        _type: string,
        filter: { event: string; schema: string; table: string },
        callback: SubscriptionCallback
      ) => {
        const key = `${filter.table}`;
        handlers.set(key, callback);
        subscribe(filter.table, callback);
        return channelObj;
      },
      subscribe: () => {
        return Promise.resolve('SUBSCRIBED');
      },
      unsubscribe: () => {
        handlers.forEach((callback, key) => {
          const table = key.split(':')[0];
          subscribers.get(table)?.delete(callback);
        });
      },
    };

    return channelObj;
  },

  removeChannel: (channel: unknown) => {
    if (channel && typeof channel === 'object' && 'unsubscribe' in channel) {
      (channel as { unsubscribe: () => void }).unsubscribe();
    }
    return Promise.resolve('ok');
  },
};

// Type assertion to match Supabase client interface
export type MockSupabaseClient = typeof mockSupabaseClient;
