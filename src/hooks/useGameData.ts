import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { DashboardSummary, Specialization } from "../lib/database.types";
import { getCurrentGameId } from "../lib/gameSession";
import { supabase } from "../lib/supabase";
import { useGameStore } from "../store/gameStore";

// Query key factory
export const gameKeys = {
  all: ["game"] as const,
  dashboard: () => [...gameKeys.all, "dashboard"] as const,
  state: () => [...gameKeys.all, "state"] as const,
  infrastructure: () => [...gameKeys.all, "infrastructure"] as const,
  contracts: () => [...gameKeys.all, "contracts"] as const,
  ledger: () => [...gameKeys.all, "ledger"] as const,
};

/**
 * Fetches dashboard summary data
 */
export function useDashboardData() {
  const setDashboardData = useGameStore((state) => state.setDashboardData);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: gameKeys.dashboard(),
    queryFn: async (): Promise<DashboardSummary> => {
      const gameId = getCurrentGameId();
      const fetchSummary = async () =>
        await supabase.rpc("get_dashboard_summary", { p_game_id: gameId });

      // First attempt
      const first = await fetchSummary();
      let data = first.data as {
        game_state?: DashboardSummary["game_state"] | null;
        players?: DashboardSummary["players"] | null;
      } | null;
      const error = first.error;

      if (error) {
        throw new Error(`Failed to fetch dashboard: ${error.message}`);
      }

      // If the game hasn't been initialized on the server yet, ensure it exists and retry once
      if (!data || data.game_state == null) {
        try {
          await supabase.rpc("ensure_game", { p_game_id: gameId as string });
        } catch {
          // ignore ensure_game failure and continue with fallback
        }
        const retry = await fetchSummary();
        data =
          (retry.data as {
            game_state?: DashboardSummary["game_state"] | null;
            players?: DashboardSummary["players"] | null;
          } | null) ?? data;
      }

      // Final guard: coalesce to safe defaults to avoid null access in UI
      const raw = data || {};
      const safe: DashboardSummary = {
        game_state: raw.game_state ?? { round: 0, phase: "Setup", version: 0 },
        players: (raw.players as DashboardSummary["players"] | undefined) ?? [],
      };

      return safe;
    },
    refetchInterval: 5000, // Refetch every 5 seconds as fallback
  });

  // Update Zustand store when data changes
  useEffect(() => {
    if (query.data) {
      setDashboardData(query.data);
    }
  }, [query.data, setDashboardData]);

  // Set up real-time subscription to game_state changes
  useEffect(() => {
    const gameId = getCurrentGameId();
    const channel = supabase
      .channel("game-state-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_state",
          filter: gameId ? `game_id=eq.${gameId}` : undefined,
        },
        () => {
          // Refetch dashboard when game state changes
          queryClient.invalidateQueries({ queryKey: gameKeys.dashboard() });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: gameId ? `game_id=eq.${gameId}` : undefined,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: gameKeys.dashboard() });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "player_infrastructure",
          filter: gameId ? `game_id=eq.${gameId}` : undefined,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: gameKeys.dashboard() });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

/**
 * Advances the game phase with optimistic locking
 */
export function useAdvancePhase() {
  const queryClient = useQueryClient();
  const version = useGameStore((state) => state.version);

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("advance_phase", {
        p_game_id: getCurrentGameId(),
        current_version: version,
      });

      if (error) {
        throw new Error(`Failed to advance phase: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error("No response from advance_phase");
      }

      const result = data[0];

      if (!result.success) {
        throw new Error(
          result.error_message || "Failed to advance phase - unknown error"
        );
      }

      return result;
    },
    onSuccess: () => {
      // Invalidate dashboard to refetch latest data
      queryClient.invalidateQueries({ queryKey: gameKeys.dashboard() });
    },
  });
}

/**
 * Processes end-of-round and advances to next round Governance (single RPC)
 */
export function useAdvanceRound() {
  const queryClient = useQueryClient();
  const version = useGameStore((state) => state.version);
  const startTimer = useGameStore((s) => s.startTimer);

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("advance_round", {
        p_game_id: getCurrentGameId(),
        current_version: version,
      });

      if (error) {
        throw new Error(`Failed to advance round: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error("No response from advance_round");
      }

      const result = data[0] as {
        success: boolean;
        new_round: number;
        new_phase: string;
        new_version: number;
        message?: string | null;
      };

      if (!result.success) {
        throw new Error(result.message || "Failed to advance round");
      }

      return result;
    },
    onSuccess: (result) => {
      // Start the next Governance timer automatically
      if (result?.new_phase === "Governance") {
        startTimer(result.new_round, "Governance");
      }
      // Refresh everything
      queryClient.invalidateQueries({ queryKey: gameKeys.all });
    },
  });
}

/**
 * Resets the game to initial state
 */
export function useResetGame() {
  const queryClient = useQueryClient();
  const resetStore = useGameStore((state) => state.reset);

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("reset_game", {
        p_game_id: getCurrentGameId(),
      });

      if (error) {
        throw new Error(`Failed to reset game: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error("No response from reset_game");
      }

      const result = data[0];

      if (!result.success) {
        throw new Error("Failed to reset game");
      }

      return result;
    },
    onSuccess: () => {
      // Reset Zustand store
      resetStore();
      // Refetch all game data
      queryClient.invalidateQueries({ queryKey: gameKeys.all });
    },
  });
}

/**
 * Adds a new player to the game
 */
export function useAddPlayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      specialization,
    }: {
      name: string;
      specialization: Specialization;
    }) => {
      const { data, error } = await supabase.rpc("add_player", {
        p_game_id: getCurrentGameId(),
        player_name: name,
        player_specialization: specialization,
      });

      if (error) {
        throw new Error(`Failed to add player: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error("No response from add_player");
      }

      const result = data[0];

      if (!result.success) {
        throw new Error(result.message || "Failed to add player");
      }

      return result;
    },
    onSuccess: () => {
      // Refetch dashboard to show new player
      queryClient.invalidateQueries({ queryKey: gameKeys.dashboard() });
    },
  });
}

/**
 * Edits an existing player's name and specialization
 */
export function useEditPlayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      playerId,
      name,
      specialization,
    }: {
      playerId: string;
      name: string;
      specialization: Specialization;
    }) => {
      const { data, error } = await supabase.rpc("edit_player", {
        p_player_id: playerId,
        p_player_name: name,
        p_player_specialization: specialization,
      });

      if (error) {
        throw new Error(`Failed to edit player: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error("No response from edit_player");
      }

      const result = data[0];

      if (!result.success) {
        throw new Error(result.message || "Failed to edit player");
      }

      return result;
    },
    onSuccess: () => {
      // Refetch dashboard to show updated player
      queryClient.invalidateQueries({ queryKey: gameKeys.dashboard() });
    },
  });
}

/**
 * Fetches infrastructure definitions
 */
export function useInfrastructureDefinitions() {
  return useQuery({
    queryKey: gameKeys.infrastructure(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("infrastructure_definitions")
        .select("*")
        .eq("is_starter", false)
        .order("type");

      if (error) {
        throw new Error(`Failed to fetch infrastructure: ${error.message}`);
      }

      return data;
    },
  });
}

/**
 * Builds infrastructure for a player
 */
export function useBuildInfrastructure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      builderId,
      ownerId,
      infrastructureType,
      location,
    }: {
      builderId: string;
      ownerId: string;
      infrastructureType: string;
      location: string | null;
    }) => {
      const { data, error } = await supabase.rpc("build_infrastructure", {
        p_game_id: getCurrentGameId(),
        p_builder_id: builderId,
        p_owner_id: ownerId,
        p_infrastructure_type: infrastructureType,
        p_location: location,
      });

      if (error) {
        throw new Error(`Failed to build infrastructure: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error("No response from build_infrastructure");
      }

      const result = data[0];

      if (!result.success) {
        throw new Error(result.message || "Failed to build infrastructure");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gameKeys.dashboard() });
      queryClient.invalidateQueries({ queryKey: gameKeys.ledger() });
    },
  });
}

/**
 * Toggles infrastructure active/dormant status
 */
export function useToggleInfrastructureStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      infrastructureId,
      targetStatus,
    }: {
      infrastructureId: string;
      targetStatus: boolean;
    }) => {
      const { data, error } = await supabase.rpc(
        "toggle_infrastructure_status",
        {
          p_game_id: getCurrentGameId(),
          p_infrastructure_id: infrastructureId,
          p_target_status: targetStatus,
        }
      );

      if (error) {
        throw new Error(`Failed to toggle infrastructure: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error("No response from toggle_infrastructure_status");
      }

      const result = data[0];

      if (!result.success) {
        throw new Error(result.message || "Failed to toggle infrastructure");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gameKeys.dashboard() });
    },
  });
}

/**
 * Fetches contracts with optional filtering
 */
export function useContracts(playerId?: string) {
  return useQuery({
    queryKey: [...gameKeys.contracts(), playerId],
    queryFn: async () => {
      let query = supabase
        .from("contracts")
        .select(
          "*, party_a:players!party_a_id(name), party_b:players!party_b_id(name)"
        )
        .eq("game_id", getCurrentGameId() as string)
        .order("created_at", { ascending: false });

      if (playerId) {
        query = query.or(`party_a_id.eq.${playerId},party_b_id.eq.${playerId}`);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch contracts: ${error.message}`);
      }

      return data;
    },
  });
}

/**
 * Creates a contract between two players
 */
export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      partyAId,
      partyBId,
      evFromAToB = 0,
      evFromBToA = 0,
      evIsPerRound = false,
      powerFromAToB = 0,
      powerFromBToA = 0,
      crewFromAToB = 0,
      crewFromBToA = 0,
      durationRounds = null,
    }: {
      partyAId: string;
      partyBId: string;
      evFromAToB?: number;
      evFromBToA?: number;
      evIsPerRound?: boolean;
      powerFromAToB?: number;
      powerFromBToA?: number;
      crewFromAToB?: number;
      crewFromBToA?: number;
      durationRounds?: number | null;
    }) => {
      const { data, error } = await supabase.rpc("create_contract", {
        p_game_id: getCurrentGameId(),
        p_party_a_id: partyAId,
        p_party_b_id: partyBId,
        p_ev_from_a_to_b: evFromAToB,
        p_ev_from_b_to_a: evFromBToA,
        p_ev_is_per_round: evIsPerRound,
        p_power_from_a_to_b: powerFromAToB,
        p_power_from_b_to_a: powerFromBToA,
        p_crew_from_a_to_b: crewFromAToB,
        p_crew_from_b_to_a: crewFromBToA,
        p_duration_rounds: durationRounds,
      });

      if (error) {
        throw new Error(`Failed to create contract: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error("No response from create_contract");
      }

      const result = data[0];

      if (!result.success) {
        throw new Error(result.message || "Failed to create contract");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gameKeys.contracts() });
      queryClient.invalidateQueries({ queryKey: gameKeys.dashboard() });
      queryClient.invalidateQueries({ queryKey: gameKeys.ledger() });
    },
  });
}

/**
 * Ends a contract
 */
export function useEndContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contractId,
      isBroken = false,
      reason = null,
    }: {
      contractId: string;
      isBroken?: boolean;
      reason?: string | null;
    }) => {
      const { data, error } = await supabase.rpc("end_contract", {
        p_game_id: getCurrentGameId(),
        p_contract_id: contractId,
        p_is_broken: isBroken,
        p_reason: reason,
      });

      if (error) {
        throw new Error(`Failed to end contract: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error("No response from end_contract");
      }

      const result = data[0];

      if (!result.success) {
        throw new Error(result.message || "Failed to end contract");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gameKeys.contracts() });
      queryClient.invalidateQueries({ queryKey: gameKeys.dashboard() });
      queryClient.invalidateQueries({ queryKey: gameKeys.ledger() });
    },
  });
}

/**
 * Manually adjusts player EV and/or REP
 */
export function useManualAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      playerId,
      evChange = 0,
      repChange = 0,
      reason = "Manual adjustment",
    }: {
      playerId: string;
      evChange?: number;
      repChange?: number;
      reason?: string;
    }) => {
      const { data, error } = await supabase.rpc("manual_adjustment", {
        p_game_id: getCurrentGameId(),
        p_player_id: playerId,
        p_ev_change: evChange,
        p_rep_change: repChange,
        p_reason: reason,
      });

      if (error) {
        throw new Error(`Failed to make adjustment: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error("No response from manual_adjustment");
      }

      const result = data[0];

      if (!result.success) {
        throw new Error(result.message || "Failed to make adjustment");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gameKeys.dashboard() });
      queryClient.invalidateQueries({ queryKey: gameKeys.ledger() });
    },
  });
}

/**
 * Fetches ledger entries with optional filtering
 */
export function useLedger(playerId?: string, round?: number) {
  return useQuery({
    queryKey: [...gameKeys.ledger(), playerId, round],
    queryFn: async () => {
      let query = supabase
        .from("ledger_entries")
        .select("*, players(name)")
        .eq("game_id", getCurrentGameId() as string)
        .order("created_at", { ascending: false })
        .limit(100);

      if (playerId) {
        query = query.eq("player_id", playerId);
      }

      if (round !== undefined) {
        query = query.eq("round", round);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch ledger: ${error.message}`);
      }

      return data;
    },
  });
}

/**
 * Processes round end calculations
 */
export function useProcessRoundEnd() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("process_round_end", {
        p_game_id: getCurrentGameId(),
      });

      if (error) {
        throw new Error(`Failed to process round end: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error("No response from process_round_end");
      }

      const result = data[0];

      if (!result.success) {
        throw new Error(result.message || "Failed to process round end");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gameKeys.all });
    },
  });
}
