import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { gameKeys } from "./useGameData";

export function useUpdateInfrastructureLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      infrastructureId,
      location,
    }: {
      infrastructureId: string;
      location: string | null;
    }) => {
      const { data, error } = await supabase
        .from("player_infrastructure")
        .update({ location })
        .eq("id", infrastructureId)
        .select();

      if (error) {
        throw new Error(
          `Failed to update infrastructure location: ${error.message}`
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gameKeys.dashboard() });
    },
  });
}
