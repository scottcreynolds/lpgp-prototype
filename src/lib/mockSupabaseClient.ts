import type { GamePhase, Player, Specialization } from "./database.types";
import {
  buildDashboardSummary,
  infrastructureDefinitions,
  initialGameState,
  initialLedger,
  initialPlayerInfrastructure,
  initialPlayers,
} from "./mockData";

const STORAGE_KEYS = {
  GAME_STATE: "lpgp_game_state",
  PLAYERS: "lpgp_players",
  PLAYER_INFRASTRUCTURE: "lpgp_player_infrastructure",
  LEDGER: "lpgp_ledger",
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
  notifySubscribers("game_state");
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
          error_message: "Version mismatch - another update occurred",
        },
      ],
      error: null,
    };
  }

  // Determine next phase/round
  let newRound = gameState.current_round;
  let newPhase: GamePhase;

  if (gameState.current_phase === "Governance") {
    newPhase = "Operations";
  } else {
    newRound += 1;
    newPhase = "Governance";
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
  notifySubscribers("game_state");
  notifySubscribers("players");
  notifySubscribers("player_infrastructure");

  return {
    data: [
      {
        success: true,
        message: "Game reset successfully",
        player_count: 1,
      },
    ],
    error: null,
  };
}

async function rpcAddPlayer(name: string, specialization: Specialization) {
  const players = getPlayers();
  const playerInfra = getPlayerInfrastructure();
  const ledger = JSON.parse(localStorage.getItem(STORAGE_KEYS.LEDGER)!);
  const gameState = getGameState();

  // Generate new player ID
  const newPlayerId = crypto.randomUUID();

  // Create new player
  const newPlayer = {
    id: newPlayerId,
    name,
    specialization,
    ev: 50,
    rep: 10,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Determine starter infrastructure based on specialization
  let starterInfraId: string;
  if (specialization === "Resource Extractor") {
    starterInfraId = infrastructureDefinitions.find(
      (d) => d.type === "Starter H2O Extractor"
    )!.id;
  } else if (specialization === "Infrastructure Provider") {
    starterInfraId = infrastructureDefinitions.find(
      (d) => d.type === "Starter Solar Array"
    )!.id;
  } else {
    // Operations Manager
    starterInfraId = infrastructureDefinitions.find(
      (d) => d.type === "Starter Habitat"
    )!.id;
  }

  // Add starter infrastructure
  const newInfra = {
    id: `pi-${newPlayerId}`,
    player_id: newPlayerId,
    infrastructure_id: starterInfraId,
    is_powered: true,
    is_crewed: true,
    is_starter: true,
    created_at: new Date().toISOString(),
  };

  // Add ledger entry
  const newLedgerEntry = {
    id: `ledger-${newPlayerId}`,
    player_id: newPlayerId,
    round: gameState.current_round,
    transaction_type: "GAME_START" as const,
    amount: 50,
    reason: "Initial EV",
    metadata: null,
    created_at: new Date().toISOString(),
  };

  // Save updated data
  players.push(newPlayer);
  playerInfra.push(newInfra);
  ledger.push(newLedgerEntry);

  localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
  localStorage.setItem(
    STORAGE_KEYS.PLAYER_INFRASTRUCTURE,
    JSON.stringify(playerInfra)
  );
  localStorage.setItem(STORAGE_KEYS.LEDGER, JSON.stringify(ledger));

  // Notify subscribers
  notifySubscribers("players");
  notifySubscribers("player_infrastructure");

  return {
    data: [
      {
        success: true,
        message: "Player added successfully",
        player_id: newPlayerId,
      },
    ],
    error: null,
  };
}

async function rpcEditPlayer(
  playerId: string,
  name: string,
  specialization: Specialization
) {
  const players = getPlayers();

  // Find the player
  const playerIndex = players.findIndex((p: Player) => p.id === playerId);

  if (playerIndex === -1) {
    return {
      data: [
        {
          success: false,
          message: "Player not found",
        },
      ],
      error: null,
    };
  }

  // Update player
  players[playerIndex] = {
    ...players[playerIndex],
    name,
    specialization,
    updated_at: new Date().toISOString(),
  };

  // Save updated players
  localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));

  // Notify subscribers
  notifySubscribers("players");

  return {
    data: [
      {
        success: true,
        message: "Player updated successfully",
      },
    ],
    error: null,
  };
}

async function rpcBuildInfrastructure(
  builderId: string,
  ownerId: string,
  infrastructureType: string,
  location: string | null
) {
  const players = getPlayers();
  const playerInfra = getPlayerInfrastructure();
  const ledger = JSON.parse(localStorage.getItem(STORAGE_KEYS.LEDGER)!);
  const gameState = getGameState();

  // Find builder and infrastructure definition
  const builderIndex = players.findIndex((p: Player) => p.id === builderId);
  const owner = players.find((p: Player) => p.id === ownerId);
  const infraDef = infrastructureDefinitions.find((d) => d.type === infrastructureType);

  if (builderIndex === -1) {
    return {
      data: [{ success: false, message: "Builder not found" }],
      error: null,
    };
  }

  if (!owner) {
    return {
      data: [{ success: false, message: "Owner not found" }],
      error: null,
    };
  }

  if (!infraDef) {
    return {
      data: [{ success: false, message: "Infrastructure type not found" }],
      error: null,
    };
  }

  // Check if builder can afford it
  if (players[builderIndex].ev < infraDef.cost) {
    return {
      data: [{ success: false, message: "Insufficient EV" }],
      error: null,
    };
  }

  // Deduct cost from builder
  players[builderIndex].ev -= infraDef.cost;
  players[builderIndex].updated_at = new Date().toISOString();

  // Create new infrastructure entry
  const newInfra = {
    id: crypto.randomUUID(),
    player_id: ownerId,
    infrastructure_id: infraDef.id,
    is_powered: true,
    is_crewed: true,
    is_starter: false,
    location: location,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  playerInfra.push(newInfra);

  // Create ledger entry
  const newLedgerEntry = {
    id: crypto.randomUUID(),
    player_id: builderId,
    player_name: players[builderIndex].name,
    round: gameState.current_round,
    transaction_type: "INFRASTRUCTURE_BUILT" as const,
    amount: infraDef.cost,
    ev_change: -infraDef.cost,
    rep_change: 0,
    reason: `Built ${infrastructureType}${location ? ` at ${location}` : ''} for ${owner.name}`,
    processed: true,
    infrastructure_id: newInfra.id,
    contract_id: null,
    metadata: null,
    created_at: new Date().toISOString(),
  };

  ledger.push(newLedgerEntry);

  // Save all updates
  localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
  localStorage.setItem(STORAGE_KEYS.PLAYER_INFRASTRUCTURE, JSON.stringify(playerInfra));
  localStorage.setItem(STORAGE_KEYS.LEDGER, JSON.stringify(ledger));

  // Notify subscribers
  notifySubscribers("players");
  notifySubscribers("player_infrastructure");

  return {
    data: [
      {
        success: true,
        message: "Infrastructure built successfully",
        infrastructure_id: newInfra.id,
      },
    ],
    error: null,
  };
}

async function rpcManualAdjustment(
  playerId: string,
  evChange: number,
  repChange: number,
  reason: string
) {
  const players = getPlayers();
  const ledger = JSON.parse(localStorage.getItem(STORAGE_KEYS.LEDGER)!);
  const gameState = getGameState();

  // Find player
  const playerIndex = players.findIndex((p: Player) => p.id === playerId);

  if (playerIndex === -1) {
    return {
      data: [{ success: false, message: "Player not found" }],
      error: null,
    };
  }

  // Apply adjustments
  players[playerIndex].ev += evChange;
  players[playerIndex].rep += repChange;
  players[playerIndex].updated_at = new Date().toISOString();

  // Create ledger entry
  const newLedgerEntry = {
    id: crypto.randomUUID(),
    player_id: playerId,
    player_name: players[playerIndex].name,
    round: gameState.current_round,
    transaction_type: "MANUAL_ADJUSTMENT" as const,
    amount: evChange,
    ev_change: evChange,
    rep_change: repChange,
    reason: reason,
    processed: true,
    infrastructure_id: null,
    contract_id: null,
    metadata: null,
    created_at: new Date().toISOString(),
  };

  ledger.push(newLedgerEntry);

  // Save updates
  localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
  localStorage.setItem(STORAGE_KEYS.LEDGER, JSON.stringify(ledger));

  // Notify subscribers
  notifySubscribers("players");

  return {
    data: [
      {
        success: true,
        message: "Adjustment applied successfully",
        new_ev: players[playerIndex].ev,
        new_rep: players[playerIndex].rep,
      },
    ],
    error: null,
  };
}

// Mock Supabase client
export const mockSupabaseClient = {
  from: (tableName: string) => {
    const queryBuilder = {
      select: (_columns: string = "*") => {
        let filterColumn: string | null = null;
        let filterValue: unknown = null;
        let orderColumn: string | null = null;
        let orderAscending = true;
        let limitValue: number | null = null;

        const selectBuilder = {
          eq: (column: string, value: unknown) => {
            filterColumn = column;
            filterValue = value;
            return selectBuilder;
          },
          order: (column: string, options?: { ascending?: boolean }) => {
            orderColumn = column;
            orderAscending = options?.ascending ?? true;
            return selectBuilder;
          },
          limit: (n: number) => {
            limitValue = n;
            return selectBuilder;
          },
          then: (resolve: (value: { data: unknown; error: unknown | null }) => void) => {
            // Execute the query
            if (tableName === "infrastructure_definitions") {
              // Filter to only non-starter infrastructure
              const nonStarterInfra = infrastructureDefinitions.filter(
                (infra) => !infra.is_starter
              );
              resolve({
                data: nonStarterInfra,
                error: null,
              });
            } else if (tableName === "ledger_entries") {
              let ledger = JSON.parse(localStorage.getItem(STORAGE_KEYS.LEDGER)!);

              // Apply filter if specified
              if (filterColumn && filterValue !== null) {
                ledger = ledger.filter((entry: any) => entry[filterColumn!] === filterValue);
              }

              // Apply ordering
              if (orderColumn) {
                ledger.sort((a: any, b: any) => {
                  const aVal = a[orderColumn!];
                  const bVal = b[orderColumn!];
                  if (aVal < bVal) return orderAscending ? -1 : 1;
                  if (aVal > bVal) return orderAscending ? 1 : -1;
                  return 0;
                });
              }

              // Apply limit
              if (limitValue) {
                ledger = ledger.slice(0, limitValue);
              }

              resolve({
                data: ledger,
                error: null,
              });
            } else {
              resolve({
                data: [],
                error: { message: `Table ${tableName} not implemented in mock` },
              });
            }
          },
        };
        return selectBuilder;
      },
    };
    return queryBuilder;
  },

  rpc: (functionName: string, params?: Record<string, unknown>) => {
    switch (functionName) {
      case "get_dashboard_summary":
        return rpcGetDashboardSummary();
      case "advance_phase":
        return rpcAdvancePhase(params?.current_version as number);
      case "reset_game":
        return rpcResetGame();
      case "add_player":
        return rpcAddPlayer(
          params?.player_name as string,
          params?.player_specialization as Specialization
        );
      case "edit_player":
        return rpcEditPlayer(
          params?.p_player_id as string,
          params?.p_player_name as string,
          params?.p_player_specialization as Specialization
        );
      case "build_infrastructure":
        return rpcBuildInfrastructure(
          params?.p_builder_id as string,
          params?.p_owner_id as string,
          params?.p_infrastructure_type as string,
          params?.p_location as string | null
        );
      case "manual_adjustment":
        return rpcManualAdjustment(
          params?.p_player_id as string,
          params?.p_ev_change as number,
          params?.p_rep_change as number,
          params?.p_reason as string
        );
      // Stub implementations for other infrastructure/contract/ledger RPCs
      case "toggle_infrastructure_status":
      case "create_contract":
      case "end_contract":
      case "process_round_end":
        return Promise.resolve({
          data: [{ success: true, message: `Mock ${functionName} - not yet implemented` }],
          error: null,
        });
      default:
        return Promise.resolve({
          data: null,
          error: { message: `Unknown RPC function: ${functionName}` },
        });
    }
  },

  channel: () => {
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
        return Promise.resolve("SUBSCRIBED");
      },
      unsubscribe: () => {
        handlers.forEach((callback, key) => {
          const table = key.split(":")[0];
          subscribers.get(table)?.delete(callback);
        });
      },
    };

    return channelObj;
  },

  removeChannel: (channel: unknown) => {
    if (channel && typeof channel === "object" && "unsubscribe" in channel) {
      (channel as { unsubscribe: () => void }).unsubscribe();
    }
    return Promise.resolve("ok");
  },
};

// Type assertion to match Supabase client interface
export type MockSupabaseClient = typeof mockSupabaseClient;
