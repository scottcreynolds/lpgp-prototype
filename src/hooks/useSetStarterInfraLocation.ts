import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentGameId } from "../lib/gameSession";
import { supabase } from "../lib/supabase";
import { gameKeys } from "./useGameData";

export function useSetStarterInfraLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      playerId,
      location,
    }: {
      playerId: string;
      location: string;
    }) => {
      const { data, error } = await supabase.rpc(
        "set_starter_infrastructure_location",
        {
          p_game_id: getCurrentGameId(),
          p_player_id: playerId,
          p_location: location,
        }
      );
      if (error) {
        throw new Error(
          `Failed to set starter infrastructure location: ${error.message}`
        );
      }
      if (!data || data.length === 0) {
        throw new Error("No response from set_starter_infrastructure_location");
      }
      const result = data[0];
      if (!result.success) {
        throw new Error(result.message || "Failed to set location");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gameKeys.dashboard() });
    },
  });
}
