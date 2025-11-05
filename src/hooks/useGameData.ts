import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/gameStore';
import type { DashboardSummary, Specialization } from '../lib/database.types';

// Query key factory
export const gameKeys = {
  all: ['game'] as const,
  dashboard: () => [...gameKeys.all, 'dashboard'] as const,
  state: () => [...gameKeys.all, 'state'] as const,
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
      const { data, error } = await supabase.rpc('get_dashboard_summary');

      if (error) {
        throw new Error(`Failed to fetch dashboard: ${error.message}`);
      }

      if (!data) {
        throw new Error('No dashboard data returned');
      }

      return data as DashboardSummary;
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
    const channel = supabase
      .channel('game-state-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_state',
        },
        () => {
          // Refetch dashboard when game state changes
          queryClient.invalidateQueries({ queryKey: gameKeys.dashboard() });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: gameKeys.dashboard() });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_infrastructure',
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
      const { data, error } = await supabase.rpc('advance_phase', {
        current_version: version,
      });

      if (error) {
        throw new Error(`Failed to advance phase: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error('No response from advance_phase');
      }

      const result = data[0];

      if (!result.success) {
        throw new Error(
          result.error_message || 'Failed to advance phase - unknown error'
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
 * Resets the game to initial state
 */
export function useResetGame() {
  const queryClient = useQueryClient();
  const resetStore = useGameStore((state) => state.reset);

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('reset_game');

      if (error) {
        throw new Error(`Failed to reset game: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error('No response from reset_game');
      }

      const result = data[0];

      if (!result.success) {
        throw new Error('Failed to reset game');
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
      const { data, error } = await supabase.rpc('add_player', {
        player_name: name,
        player_specialization: specialization,
      });

      if (error) {
        throw new Error(`Failed to add player: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error('No response from add_player');
      }

      const result = data[0];

      if (!result.success) {
        throw new Error(result.message || 'Failed to add player');
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
      const { data, error } = await supabase.rpc('edit_player', {
        p_player_id: playerId,
        p_player_name: name,
        p_player_specialization: specialization,
      });

      if (error) {
        throw new Error(`Failed to edit player: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error('No response from edit_player');
      }

      const result = data[0];

      if (!result.success) {
        throw new Error(result.message || 'Failed to edit player');
      }

      return result;
    },
    onSuccess: () => {
      // Refetch dashboard to show updated player
      queryClient.invalidateQueries({ queryKey: gameKeys.dashboard() });
    },
  });
}
