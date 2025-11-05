import type {
  DashboardSummary,
  GameState,
  InfrastructureDefinition,
  LedgerEntry,
  Player,
  PlayerInfrastructure,
} from "./database.types";

// Generate stable UUIDs for mock data
const playerIds = ["11111111-1111-1111-1111-111111111111"];

const infraIds = {
  starterH2O: "aaaa1111-1111-1111-1111-111111111111",
  starterSolar: "aaaa2222-2222-2222-2222-222222222222",
  starterHabitat: "aaaa3333-3333-3333-3333-333333333333",
  habitat: "bbbb1111-1111-1111-1111-111111111111",
  solarArray: "bbbb2222-2222-2222-2222-222222222222",
  h2oExtractor: "bbbb3333-3333-3333-3333-333333333333",
  he3Extractor: "bbbb4444-4444-4444-4444-444444444444",
};

// Game State
export const initialGameState: GameState = {
  id: 1,
  current_round: 0,
  current_phase: "Setup",
  version: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Infrastructure Definitions
export const infrastructureDefinitions: InfrastructureDefinition[] = [
  {
    id: infraIds.starterH2O,
    type: "Starter H2O Extractor",
    cost: 0,
    maintenance_cost: 0,
    capacity: null,
    yield: 12,
    power_requirement: null,
    crew_requirement: null,
    can_be_operated_by: ["Resource Extractor"],
    is_starter: true,
    created_at: new Date().toISOString(),
  },
  {
    id: infraIds.starterSolar,
    type: "Starter Solar Array",
    cost: 0,
    maintenance_cost: 0,
    capacity: 25,
    yield: null,
    power_requirement: null,
    crew_requirement: null,
    can_be_operated_by: ["Infrastructure Provider"],
    is_starter: true,
    created_at: new Date().toISOString(),
  },
  {
    id: infraIds.starterHabitat,
    type: "Starter Habitat",
    cost: 0,
    maintenance_cost: 0,
    capacity: 25,
    yield: null,
    power_requirement: null,
    crew_requirement: null,
    can_be_operated_by: ["Operations Manager"],
    is_starter: true,
    created_at: new Date().toISOString(),
  },
  {
    id: infraIds.habitat,
    type: "Habitat",
    cost: 15,
    maintenance_cost: 10,
    capacity: 25,
    yield: null,
    power_requirement: 10,
    crew_requirement: 5,
    can_be_operated_by: ["Operations Manager", "Infrastructure Provider"],
    is_starter: false,
    created_at: new Date().toISOString(),
  },
  {
    id: infraIds.solarArray,
    type: "Solar Array",
    cost: 10,
    maintenance_cost: 5,
    capacity: 25,
    yield: null,
    power_requirement: null,
    crew_requirement: 5,
    can_be_operated_by: ["Infrastructure Provider", "Resource Extractor"],
    is_starter: false,
    created_at: new Date().toISOString(),
  },
  {
    id: infraIds.h2oExtractor,
    type: "H2O Extractor",
    cost: 10,
    maintenance_cost: 5,
    capacity: null,
    yield: 12,
    power_requirement: 5,
    crew_requirement: 5,
    can_be_operated_by: ["Resource Extractor", "Infrastructure Provider"],
    is_starter: false,
    created_at: new Date().toISOString(),
  },
  {
    id: infraIds.he3Extractor,
    type: "Helium-3 Extractor",
    cost: 20,
    maintenance_cost: 5,
    capacity: null,
    yield: 20,
    power_requirement: 5,
    crew_requirement: 5,
    can_be_operated_by: ["Resource Extractor"],
    is_starter: false,
    created_at: new Date().toISOString(),
  },
];

// Players
export const initialPlayers: Player[] = [
  {
    id: playerIds[0],
    name: "Luna Corp",
    specialization: "Resource Extractor",
    ev: 50,
    rep: 10,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Player Infrastructure
export const initialPlayerInfrastructure: PlayerInfrastructure[] = [
  {
    id: "pi-1",
    player_id: playerIds[0],
    infrastructure_id: infraIds.starterH2O,
    is_powered: true,
    is_crewed: true,
    is_starter: true,
    created_at: new Date().toISOString(),
  },
];

// Ledger Entries
export const initialLedger: LedgerEntry[] = [
  {
    id: "ledger-1",
    player_id: playerIds[0],
    round: 1,
    transaction_type: "GAME_START",
    amount: 50,
    reason: "Initial EV",
    metadata: null,
    created_at: new Date().toISOString(),
  },
];

// Helper to build dashboard summary from mock data
export function buildDashboardSummary(
  gameState: GameState,
  players: Player[],
  playerInfra: PlayerInfrastructure[],
  infraDefs: InfrastructureDefinition[]
): DashboardSummary {
  return {
    game_state: {
      round: gameState.current_round,
      phase: gameState.current_phase,
      version: gameState.version,
    },
    players: players.map((player) => {
      const playerInfrastructure = playerInfra.filter(
        (pi) => pi.player_id === player.id
      );

      const infrastructure = playerInfrastructure.map((pi) => {
        const def = infraDefs.find((d) => d.id === pi.infrastructure_id)!;
        return {
          type: def.type,
          cost: def.cost,
          maintenance_cost: def.maintenance_cost,
          capacity: def.capacity,
          yield: def.yield,
          power_requirement: def.power_requirement,
          crew_requirement: def.crew_requirement,
          is_powered: pi.is_powered,
          is_crewed: pi.is_crewed,
          is_starter: pi.is_starter,
        };
      });

      // Calculate totals
      const totals = {
        total_power_capacity: infrastructure.reduce(
          (sum, i) =>
            sum + (i.capacity && i.type.includes("Solar") ? i.capacity : 0),
          0
        ),
        total_power_used: infrastructure.reduce(
          (sum, i) =>
            sum +
            (i.is_powered === false && i.power_requirement
              ? 0
              : i.power_requirement || 0),
          0
        ),
        total_crew_capacity: infrastructure.reduce(
          (sum, i) =>
            sum + (i.capacity && i.type.includes("Habitat") ? i.capacity : 0),
          0
        ),
        total_crew_used: infrastructure.reduce(
          (sum, i) =>
            sum +
            (i.is_crewed === false && i.crew_requirement
              ? 0
              : i.crew_requirement || 0),
          0
        ),
        total_maintenance_cost: infrastructure.reduce(
          (sum, i) => sum + (i.is_starter ? 0 : i.maintenance_cost),
          0
        ),
        total_yield: infrastructure.reduce(
          (sum, i) =>
            sum +
            (i.is_powered && i.is_crewed && i.yield ? i.yield : i.yield || 0),
          0
        ),
        infrastructure_count: infrastructure.length,
      };

      return {
        ...player,
        infrastructure,
        totals,
      };
    }),
  };
}
