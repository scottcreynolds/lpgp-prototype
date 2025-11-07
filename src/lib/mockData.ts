import type {
  Contract,
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
  game_id: "mock-default",
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
    player_buildable: false,
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
    player_buildable: false,
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
    player_buildable: false,
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
    player_buildable: true,
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
    player_buildable: true,
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
    player_buildable: true,
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
    player_buildable: true,
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
    game_id: "mock-default",
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
    location: null,
    is_active: true,
    created_at: new Date().toISOString(),
    game_id: "mock-default",
  },
];

// Ledger Entries
export const initialLedger: LedgerEntry[] = [
  {
    id: "ledger-1",
    player_id: playerIds[0],
    player_name: "Luna Corp",
    round: 1,
    transaction_type: "GAME_START",
    amount: 50,
    ev_change: 50,
    rep_change: 0,
    reason: "Initial EV",
    processed: true,
    infrastructure_id: null,
    contract_id: null,
    metadata: null,
    created_at: new Date().toISOString(),
    game_id: "mock-default",
  },
];

// Helper to build dashboard summary from mock data
export function buildDashboardSummary(
  gameState: GameState,
  players: Player[],
  playerInfra: PlayerInfrastructure[],
  infraDefs: InfrastructureDefinition[],
  contracts?: Contract[]
): DashboardSummary {
  // Get active contracts if provided
  const activeContracts = contracts?.filter((c) => c.status === "active") || [];

  return {
    game_state: {
      round: gameState.current_round,
      phase: gameState.current_phase,
      version: gameState.version,
    },
    players: players
      .sort((a, b) => {
        // Sort by EV descending, then REP descending
        if (b.ev !== a.ev) return b.ev - a.ev;
        return b.rep - a.rep;
      })
      .map((player) => {
        const playerInfrastructure = playerInfra.filter(
          (pi) => pi.player_id === player.id
        );

        const infrastructure = playerInfrastructure.map((pi) => {
          const def = infraDefs.find((d) => d.id === pi.infrastructure_id)!;
          return {
            id: pi.id,
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
            location: pi.location,
            is_active: pi.is_active,
          };
        });

        // Calculate base totals from infrastructure
        const total_power_capacity = infrastructure.reduce(
          (sum, i) =>
            sum +
            (i.capacity && i.type.includes("Solar") && i.is_active
              ? i.capacity
              : 0),
          0
        );

        const total_power_used = infrastructure.reduce(
          (sum, i) =>
            sum +
            (i.is_active && i.power_requirement ? i.power_requirement : 0),
          0
        );

        const total_crew_capacity = infrastructure.reduce(
          (sum, i) =>
            sum +
            (i.capacity && i.type.includes("Habitat") && i.is_active
              ? i.capacity
              : 0),
          0
        );

        const total_crew_used = infrastructure.reduce(
          (sum, i) =>
            sum + (i.is_active && i.crew_requirement ? i.crew_requirement : 0),
          0
        );

        // Calculate contract adjustments for this player
        let contractPowerAdjustment = 0;
        let contractCrewAdjustment = 0;

        activeContracts.forEach((contract) => {
          if (contract.party_a_id === player.id) {
            // Player is Party A: receives B->A, gives A->B
            contractPowerAdjustment +=
              contract.power_from_b_to_a - contract.power_from_a_to_b;
            contractCrewAdjustment +=
              contract.crew_from_b_to_a - contract.crew_from_a_to_b;
          } else if (contract.party_b_id === player.id) {
            // Player is Party B: receives A->B, gives B->A
            contractPowerAdjustment +=
              contract.power_from_a_to_b - contract.power_from_b_to_a;
            contractCrewAdjustment +=
              contract.crew_from_a_to_b - contract.crew_from_b_to_a;
          }
        });

        const totals = {
          total_power_capacity,
          total_power_used,
          total_crew_capacity,
          total_crew_used,
          total_maintenance_cost: infrastructure.reduce(
            (sum, i) =>
              sum + (i.is_starter || !i.is_active ? 0 : i.maintenance_cost),
            0
          ),
          total_yield: infrastructure.reduce(
            (sum, i) => sum + (i.is_active && i.yield ? i.yield : 0),
            0
          ),
          infrastructure_count: infrastructure.length,
          available_power:
            total_power_capacity - total_power_used + contractPowerAdjustment,
          available_crew:
            total_crew_capacity - total_crew_used + contractCrewAdjustment,
        };

        return {
          ...player,
          infrastructure,
          totals,
        };
      }),
  };
}
