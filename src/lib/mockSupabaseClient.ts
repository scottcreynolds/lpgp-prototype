import type {
  Contract,
  GamePhase,
  LedgerEntry,
  Player,
  Specialization,
} from "./database.types";
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
  CONTRACTS: "lpgp_contracts",
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
    localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify([]));
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
  initializeStorage();
  const gameState = getGameState();
  const players = getPlayers();
  const playerInfra = getPlayerInfrastructure();
  const contracts: Contract[] = JSON.parse(
    localStorage.getItem(STORAGE_KEYS.CONTRACTS) || "[]"
  );

  const summary = buildDashboardSummary(
    gameState,
    players,
    playerInfra,
    infrastructureDefinitions,
    contracts
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
  const infraDef = infrastructureDefinitions.find(
    (d) => d.type === infrastructureType
  );

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
    reason: `Built ${infrastructureType}${
      location ? ` at ${location}` : ""
    } for ${owner.name}`,
    processed: true,
    infrastructure_id: newInfra.id,
    contract_id: null,
    metadata: null,
    created_at: new Date().toISOString(),
  };

  ledger.push(newLedgerEntry);

  // Save all updates
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

async function rpcCreateContract(
  partyAId: string,
  partyBId: string,
  evFromAToB: number,
  evFromBToA: number,
  evIsPerRound: boolean,
  powerFromAToB: number,
  powerFromBToA: number,
  crewFromAToB: number,
  crewFromBToA: number,
  durationRounds: number | null
) {
  initializeStorage();
  const players = getPlayers();
  const contracts = JSON.parse(
    localStorage.getItem(STORAGE_KEYS.CONTRACTS) || "[]"
  );
  const ledger = JSON.parse(localStorage.getItem(STORAGE_KEYS.LEDGER) || "[]");
  const gameState = getGameState();

  // Validate players
  const partyA = players.find((p: Player) => p.id === partyAId);
  const partyB = players.find((p: Player) => p.id === partyBId);

  if (!partyA || !partyB) {
    return {
      data: [{ success: false, message: "One or both parties not found" }],
      error: null,
    };
  }

  // For one-time EV payments, deduct immediately from payer and add to receiver
  if (!evIsPerRound) {
    if (evFromAToB > 0) {
      if (partyA.ev < evFromAToB) {
        return {
          data: [
            { success: false, message: `${partyA.name} has insufficient EV` },
          ],
          error: null,
        };
      }
      partyA.ev -= evFromAToB;
      partyB.ev += evFromAToB;
    }
    if (evFromBToA > 0) {
      if (partyB.ev < evFromBToA) {
        return {
          data: [
            { success: false, message: `${partyB.name} has insufficient EV` },
          ],
          error: null,
        };
      }
      partyB.ev -= evFromBToA;
      partyA.ev += evFromBToA;
    }
    partyA.updated_at = new Date().toISOString();
    partyB.updated_at = new Date().toISOString();
  }

  // Create contract
  const newContract = {
    id: crypto.randomUUID(),
    party_a_id: partyAId,
    party_b_id: partyBId,
    ev_from_a_to_b: evFromAToB,
    ev_from_b_to_a: evFromBToA,
    ev_is_per_round: evIsPerRound,
    power_from_a_to_b: powerFromAToB,
    power_from_b_to_a: powerFromBToA,
    crew_from_a_to_b: crewFromAToB,
    crew_from_b_to_a: crewFromBToA,
    duration_rounds: durationRounds,
    rounds_remaining: durationRounds,
    status: "active",
    created_in_round: gameState.current_round,
    ended_in_round: null,
    reason_for_ending: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  contracts.push(newContract);

  // Create ledger entries for one-time EV payments
  if (!evIsPerRound) {
    if (evFromAToB > 0) {
      ledger.push({
        id: crypto.randomUUID(),
        player_id: partyAId,
        player_name: partyA.name,
        round: gameState.current_round,
        transaction_type: "CONTRACT_PAYMENT",
        amount: evFromAToB,
        ev_change: -evFromAToB,
        rep_change: 0,
        reason: `One-time payment to ${partyB.name} via contract`,
        processed: true,
        infrastructure_id: null,
        contract_id: newContract.id,
        metadata: null,
        created_at: new Date().toISOString(),
      });
      ledger.push({
        id: crypto.randomUUID(),
        player_id: partyBId,
        player_name: partyB.name,
        round: gameState.current_round,
        transaction_type: "CONTRACT_PAYMENT",
        amount: evFromAToB,
        ev_change: evFromAToB,
        rep_change: 0,
        reason: `One-time payment from ${partyA.name} via contract`,
        processed: true,
        infrastructure_id: null,
        contract_id: newContract.id,
        metadata: null,
        created_at: new Date().toISOString(),
      });
    }
    if (evFromBToA > 0) {
      ledger.push({
        id: crypto.randomUUID(),
        player_id: partyBId,
        player_name: partyB.name,
        round: gameState.current_round,
        transaction_type: "CONTRACT_PAYMENT",
        amount: evFromBToA,
        ev_change: -evFromBToA,
        rep_change: 0,
        reason: `One-time payment to ${partyA.name} via contract`,
        processed: true,
        infrastructure_id: null,
        contract_id: newContract.id,
        metadata: null,
        created_at: new Date().toISOString(),
      });
      ledger.push({
        id: crypto.randomUUID(),
        player_id: partyAId,
        player_name: partyA.name,
        round: gameState.current_round,
        transaction_type: "CONTRACT_PAYMENT",
        amount: evFromBToA,
        ev_change: evFromBToA,
        rep_change: 0,
        reason: `One-time payment from ${partyB.name} via contract`,
        processed: true,
        infrastructure_id: null,
        contract_id: newContract.id,
        metadata: null,
        created_at: new Date().toISOString(),
      });
    }
  }

  // Create ledger entry for contract creation
  ledger.push({
    id: crypto.randomUUID(),
    player_id: null,
    player_name: null,
    round: gameState.current_round,
    transaction_type: "CONTRACT_CREATED",
    amount: 0,
    ev_change: 0,
    rep_change: 0,
    reason: `Contract created between ${partyA.name} and ${partyB.name}`,
    processed: true,
    infrastructure_id: null,
    contract_id: newContract.id,
    metadata: null,
    created_at: new Date().toISOString(),
  });

  // Save all updates
  localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(contracts));
  localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
  localStorage.setItem(STORAGE_KEYS.LEDGER, JSON.stringify(ledger));

  // Notify subscribers
  notifySubscribers("contracts");
  notifySubscribers("players");
  notifySubscribers("ledger_entries");

  return {
    data: [
      {
        success: true,
        message: "Contract created successfully",
        contract_id: newContract.id,
      },
    ],
    error: null,
  };
}

async function rpcEndContract(
  contractId: string,
  isBroken: boolean,
  reason: string | null
) {
  initializeStorage();
  const contracts = JSON.parse(
    localStorage.getItem(STORAGE_KEYS.CONTRACTS) || "[]"
  ) as Contract[];
  const ledger = JSON.parse(localStorage.getItem(STORAGE_KEYS.LEDGER) || "[]");
  const players = getPlayers();
  const gameState = getGameState();

  // Find contract
  const contractIndex = contracts.findIndex((c) => c.id === contractId);

  if (contractIndex === -1) {
    return {
      data: [{ success: false, message: "Contract not found" }],
      error: null,
    };
  }

  const contract = contracts[contractIndex];

  if (contract.status !== "active") {
    return {
      data: [{ success: false, message: "Contract is not active" }],
      error: null,
    };
  }

  // Update contract status
  contract.status = isBroken ? "broken" : "ended";
  contract.ended_in_round = gameState.current_round;
  contract.reason_for_ending = reason;
  contract.updated_at = new Date().toISOString();

  // Find player names
  const partyA = players.find((p: Player) => p.id === contract.party_a_id);
  const partyB = players.find((p: Player) => p.id === contract.party_b_id);

  // Apply reputation penalty if broken
  if (isBroken && partyA && partyB) {
    const repPenalty = 5; // Fixed penalty for breaking contract
    partyA.rep -= repPenalty;
    partyB.rep -= repPenalty;
    partyA.updated_at = new Date().toISOString();
    partyB.updated_at = new Date().toISOString();

    // Create ledger entries for reputation penalty
    ledger.push({
      id: crypto.randomUUID(),
      player_id: partyA.id,
      player_name: partyA.name,
      round: gameState.current_round,
      transaction_type: "CONTRACT_BROKEN",
      amount: 0,
      ev_change: 0,
      rep_change: -repPenalty,
      reason: `Reputation penalty for breaking contract with ${partyB.name}`,
      processed: true,
      infrastructure_id: null,
      contract_id: contractId,
      metadata: null,
      created_at: new Date().toISOString(),
    });
    ledger.push({
      id: crypto.randomUUID(),
      player_id: partyB.id,
      player_name: partyB.name,
      round: gameState.current_round,
      transaction_type: "CONTRACT_BROKEN",
      amount: 0,
      ev_change: 0,
      rep_change: -repPenalty,
      reason: `Reputation penalty for breaking contract with ${partyA.name}`,
      processed: true,
      infrastructure_id: null,
      contract_id: contractId,
      metadata: null,
      created_at: new Date().toISOString(),
    });

    localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
  }

  // Create ledger entry for contract ending
  ledger.push({
    id: crypto.randomUUID(),
    player_id: null,
    player_name: null,
    round: gameState.current_round,
    transaction_type: isBroken ? "CONTRACT_BROKEN" : "CONTRACT_ENDED",
    amount: 0,
    ev_change: 0,
    rep_change: 0,
    reason:
      reason ||
      `Contract ${isBroken ? "broken" : "ended"} between ${
        partyA?.name || "Unknown"
      } and ${partyB?.name || "Unknown"}`,
    processed: true,
    infrastructure_id: null,
    contract_id: contractId,
    metadata: null,
    created_at: new Date().toISOString(),
  });

  // Save updates
  localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(contracts));
  localStorage.setItem(STORAGE_KEYS.LEDGER, JSON.stringify(ledger));

  // Notify subscribers
  notifySubscribers("contracts");
  if (isBroken) {
    notifySubscribers("players");
  }

  return {
    data: [
      {
        success: true,
        message: `Contract ${isBroken ? "broken" : "ended"} successfully`,
      },
    ],
    error: null,
  };
}

async function rpcAdvanceRound(currentVersion: number) {
  initializeStorage();
  const gameState = getGameState();
  const players: Player[] = getPlayers();
  const infra = getPlayerInfrastructure();
  const contracts = JSON.parse(
    localStorage.getItem(STORAGE_KEYS.CONTRACTS) || "[]"
  );
  const ledger = JSON.parse(localStorage.getItem(STORAGE_KEYS.LEDGER) || "[]");

  // Version / phase checks
  if (gameState.version !== currentVersion) {
    return {
      data: [
        {
          success: false,
          new_round: gameState.current_round,
          new_phase: gameState.current_phase as GamePhase,
          new_version: gameState.version,
          message: "Version mismatch - another update occurred",
        },
      ],
      error: null,
    };
  }

  if (gameState.current_phase !== "Operations") {
    return {
      data: [
        {
          success: false,
          new_round: gameState.current_round,
          new_phase: gameState.current_phase as GamePhase,
          new_version: gameState.version,
          message: "Advance Round is only allowed from Operations phase",
        },
      ],
      error: null,
    };
  }

  const round = gameState.current_round;

  // 1) Maintenance (rolled up per player for active, non-starter infra)
  const maintenanceByPlayer = new Map<
    string,
    { name: string; total: number }
  >();
  for (const pi of infra) {
    if (!pi.is_active || pi.is_starter) continue;
    const def = infrastructureDefinitions.find(
      (d) => d.id === pi.infrastructure_id
    );
    const cost = def?.maintenance_cost ?? 0;
    if (cost <= 0) continue;
    const player = players.find((p) => p.id === pi.player_id);
    if (!player) continue;
    const prev = maintenanceByPlayer.get(pi.player_id) || {
      name: player.name,
      total: 0,
    };
    prev.total += cost;
    maintenanceByPlayer.set(pi.player_id, prev);
  }

  maintenanceByPlayer.forEach((val, playerId) => {
    const idx = players.findIndex((p) => p.id === playerId);
    if (idx >= 0 && val.total > 0) {
      players[idx].ev -= val.total;
      players[idx].updated_at = new Date().toISOString();
      ledger.push({
        id: crypto.randomUUID(),
        player_id: playerId,
        player_name: val.name,
        round,
        transaction_type: "MAINTENANCE",
        amount: val.total,
        ev_change: -val.total,
        rep_change: 0,
        reason: `Round ${round} Maintenance`,
        processed: true,
        infrastructure_id: null,
        contract_id: null,
        metadata: null,
        created_at: new Date().toISOString(),
      });
    }
  });

  // 2) Per-round contract payments (double-entry)
  const activeContracts = contracts.filter(
    (c: Contract) => c.status === "active" && c.ev_is_per_round
  );
  for (const c of activeContracts) {
    const partyA = players.find((p) => p.id === c.party_a_id);
    const partyB = players.find((p) => p.id === c.party_b_id);
    if (!partyA || !partyB) continue;

    if (c.ev_from_a_to_b > 0) {
      partyA.ev -= c.ev_from_a_to_b;
      partyB.ev += c.ev_from_a_to_b;
      partyA.updated_at = new Date().toISOString();
      partyB.updated_at = new Date().toISOString();

      ledger.push({
        id: crypto.randomUUID(),
        player_id: partyA.id,
        player_name: partyA.name,
        round,
        transaction_type: "CONTRACT_PAYMENT",
        amount: c.ev_from_a_to_b,
        ev_change: -c.ev_from_a_to_b,
        rep_change: 0,
        reason: `Round ${round} contract payment: ${partyA.name} → ${partyB.name}`,
        processed: true,
        infrastructure_id: null,
        contract_id: c.id,
        metadata: null,
        created_at: new Date().toISOString(),
      });
      ledger.push({
        id: crypto.randomUUID(),
        player_id: partyB.id,
        player_name: partyB.name,
        round,
        transaction_type: "CONTRACT_PAYMENT",
        amount: c.ev_from_a_to_b,
        ev_change: c.ev_from_a_to_b,
        rep_change: 0,
        reason: `Round ${round} contract payment: ${partyA.name} → ${partyB.name}`,
        processed: true,
        infrastructure_id: null,
        contract_id: c.id,
        metadata: null,
        created_at: new Date().toISOString(),
      });
    }

    if (c.ev_from_b_to_a > 0) {
      partyB.ev -= c.ev_from_b_to_a;
      partyA.ev += c.ev_from_b_to_a;
      partyA.updated_at = new Date().toISOString();
      partyB.updated_at = new Date().toISOString();

      ledger.push({
        id: crypto.randomUUID(),
        player_id: partyB.id,
        player_name: partyB.name,
        round,
        transaction_type: "CONTRACT_PAYMENT",
        amount: c.ev_from_b_to_a,
        ev_change: -c.ev_from_b_to_a,
        rep_change: 0,
        reason: `Round ${round} contract payment: ${partyB.name} → ${partyA.name}`,
        processed: true,
        infrastructure_id: null,
        contract_id: c.id,
        metadata: null,
        created_at: new Date().toISOString(),
      });
      ledger.push({
        id: crypto.randomUUID(),
        player_id: partyA.id,
        player_name: partyA.name,
        round,
        transaction_type: "CONTRACT_PAYMENT",
        amount: c.ev_from_b_to_a,
        ev_change: c.ev_from_b_to_a,
        rep_change: 0,
        reason: `Round ${round} contract payment: ${partyB.name} → ${partyA.name}`,
        processed: true,
        infrastructure_id: null,
        contract_id: c.id,
        metadata: null,
        created_at: new Date().toISOString(),
      });
    }
  }

  // 3) Decrement finite contracts and expire
  for (const c of contracts) {
    if (c.status === "active" && typeof c.rounds_remaining === "number") {
      c.rounds_remaining -= 1;
    }
  }

  for (const c of contracts) {
    if (
      c.status === "active" &&
      typeof c.rounds_remaining === "number" &&
      c.rounds_remaining <= 0
    ) {
      c.status = "ended";
      c.ended_in_round = round;
      c.reason_for_ending = "Duration expired";
      const partyA = players.find((p) => p.id === c.party_a_id);
      const partyB = players.find((p) => p.id === c.party_b_id);
      ledger.push({
        id: crypto.randomUUID(),
        player_id: c.party_a_id,
        player_name: partyA?.name ?? null,
        round,
        transaction_type: "CONTRACT_ENDED",
        amount: 0,
        ev_change: 0,
        rep_change: 0,
        reason: `Contract with ${partyB?.name ?? "Unknown"} expired`,
        processed: true,
        infrastructure_id: null,
        contract_id: c.id,
        metadata: null,
        created_at: new Date().toISOString(),
      });
      ledger.push({
        id: crypto.randomUUID(),
        player_id: c.party_b_id,
        player_name: partyB?.name ?? null,
        round,
        transaction_type: "CONTRACT_ENDED",
        amount: 0,
        ev_change: 0,
        rep_change: 0,
        reason: `Contract with ${partyA?.name ?? "Unknown"} expired`,
        processed: true,
        infrastructure_id: null,
        contract_id: c.id,
        metadata: null,
        created_at: new Date().toISOString(),
      });
    }
  }

  // 4) Mark any remaining unprocessed entries for this round as processed
  for (const entry of ledger) {
    if (entry.round === round && entry.processed === false) {
      entry.processed = true;
    }
  }

  // 5) Advance to next round Governance, bump version
  const updatedState = {
    ...gameState,
    current_round: round + 1,
    current_phase: "Governance" as GamePhase,
    version: gameState.version + 1,
    updated_at: new Date().toISOString(),
  };

  // Save
  localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
  localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(contracts));
  localStorage.setItem(STORAGE_KEYS.LEDGER, JSON.stringify(ledger));
  saveGameState(updatedState);

  // Notify
  notifySubscribers("players");
  notifySubscribers("contracts");
  notifySubscribers("ledger_entries");

  return {
    data: [
      {
        success: true,
        new_round: updatedState.current_round,
        new_phase: updatedState.current_phase,
        new_version: updatedState.version,
        message: "Advanced to next round Governance",
      },
    ],
    error: null,
  };
}

// Mock Supabase client
export const mockSupabaseClient = {
  from: (tableName: string) => {
    const queryBuilder = {
      select: () => {
        let filterColumn: string | null = null;
        let filterValue: unknown = null;
        let orFilter: string | null = null;
        let orderColumn: string | null = null;
        let orderAscending = true;
        let limitValue: number | null = null;

        const selectBuilder = {
          eq: (column: string, value: unknown) => {
            filterColumn = column;
            filterValue = value;
            return selectBuilder;
          },
          or: (filter: string) => {
            orFilter = filter;
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
          then: (
            resolve: (value: { data: unknown; error: unknown | null }) => void
          ) => {
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
              let ledger = JSON.parse(
                localStorage.getItem(STORAGE_KEYS.LEDGER)!
              ) as LedgerEntry[];

              // Apply filter if specified
              if (filterColumn && filterValue !== null) {
                if (filterColumn === "player_id") {
                  ledger = ledger.filter(
                    (entry) => entry.player_id === filterValue
                  );
                } else if (filterColumn === "round") {
                  ledger = ledger.filter(
                    (entry) => entry.round === filterValue
                  );
                }
              }

              // Apply ordering
              if (orderColumn) {
                if (orderColumn === "created_at") {
                  ledger.sort((a, b) => {
                    const aVal = a.created_at;
                    const bVal = b.created_at;
                    if (aVal < bVal) return orderAscending ? -1 : 1;
                    if (aVal > bVal) return orderAscending ? 1 : -1;
                    return 0;
                  });
                }
              }

              // Apply limit
              if (limitValue) {
                ledger = ledger.slice(0, limitValue);
              }

              resolve({
                data: ledger,
                error: null,
              });
            } else if (tableName === "contracts") {
              let contracts = JSON.parse(
                localStorage.getItem(STORAGE_KEYS.CONTRACTS)!
              ) as Contract[];

              // Apply .or() filter if specified (e.g., "party_a_id.eq.uuid,party_b_id.eq.uuid")
              if (orFilter) {
                const conditions = orFilter.split(",");
                contracts = contracts.filter((contract) => {
                  return conditions.some((condition) => {
                    const [columnPath, value] = condition.split(".eq.");
                    if (columnPath === "party_a_id")
                      return contract.party_a_id === value;
                    if (columnPath === "party_b_id")
                      return contract.party_b_id === value;
                    return false;
                  });
                });
              }

              // Apply .eq() filter if specified
              if (filterColumn && filterValue !== null) {
                if (filterColumn === "party_a_id") {
                  contracts = contracts.filter(
                    (contract) => contract.party_a_id === filterValue
                  );
                } else if (filterColumn === "party_b_id") {
                  contracts = contracts.filter(
                    (contract) => contract.party_b_id === filterValue
                  );
                } else if (filterColumn === "status") {
                  contracts = contracts.filter(
                    (contract) => contract.status === filterValue
                  );
                }
              }

              // Apply ordering
              if (orderColumn) {
                if (orderColumn === "created_at") {
                  contracts.sort((a, b) => {
                    const aVal = a.created_at;
                    const bVal = b.created_at;
                    if (aVal < bVal) return orderAscending ? -1 : 1;
                    if (aVal > bVal) return orderAscending ? 1 : -1;
                    return 0;
                  });
                }
              }

              // Apply limit
              if (limitValue) {
                contracts = contracts.slice(0, limitValue);
              }

              resolve({
                data: contracts,
                error: null,
              });
            } else {
              resolve({
                data: [],
                error: {
                  message: `Table ${tableName} not implemented in mock`,
                },
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
      case "advance_round":
        return rpcAdvanceRound(params?.current_version as number);
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
      case "create_contract":
        return rpcCreateContract(
          params?.p_party_a_id as string,
          params?.p_party_b_id as string,
          params?.p_ev_from_a_to_b as number,
          params?.p_ev_from_b_to_a as number,
          params?.p_ev_is_per_round as boolean,
          params?.p_power_from_a_to_b as number,
          params?.p_power_from_b_to_a as number,
          params?.p_crew_from_a_to_b as number,
          params?.p_crew_from_b_to_a as number,
          params?.p_duration_rounds as number | null
        );
      case "end_contract":
        return rpcEndContract(
          params?.p_contract_id as string,
          params?.p_is_broken as boolean,
          params?.p_reason as string | null
        );
      // Stub implementations for other infrastructure/contract/ledger RPCs
      case "toggle_infrastructure_status":
      case "process_round_end":
        return Promise.resolve({
          data: [
            {
              success: true,
              message: `Mock ${functionName} - not yet implemented`,
            },
          ],
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
