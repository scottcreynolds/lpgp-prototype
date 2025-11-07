import { isMockSupabase, supabase } from "@/lib/supabase";
import { Box, Button, Code, Heading, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";

type Result = {
  beforeActive: number;
  afterActive: number;
  deactivatedCount: number;
  notes: string[];
};

export default function DevHarness() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isMockSupabase || !import.meta.env.DEV) return null;

  async function runSimulation() {
    setRunning(true);
    setError(null);
    setResult(null);
    const notes: string[] = [];
    try {
      // Reset game for a clean slate
      await supabase.rpc("reset_game");

      // Get dashboard for player id and version
      const dash1 = await supabase.rpc("get_dashboard_summary");
      const gs1 = dash1.data.game_state;
      const player = dash1.data.players[0];
      if (!player) throw new Error("No player found in mock state");

      // Fund the player to afford builds
      await supabase.rpc("manual_adjustment", {
        p_player_id: player.id,
        p_ev_change: 300,
        p_rep_change: 0,
        p_reason: "DevHarness funding",
      });

      // Build capacity providers (auto-activate on build)
      await supabase.rpc("build_infrastructure", {
        p_builder_id: player.id,
        p_owner_id: player.id,
        p_infrastructure_type: "Solar Array",
        p_location: null,
      });
      await supabase.rpc("build_infrastructure", {
        p_builder_id: player.id,
        p_owner_id: player.id,
        p_infrastructure_type: "Habitat",
        p_location: null,
      });

      // Build six Helium-3 Extractors (require crew & power)
      const builtIds: string[] = [];
      for (let i = 0; i < 6; i++) {
        const r = await supabase.rpc("build_infrastructure", {
          p_builder_id: player.id,
          p_owner_id: player.id,
          p_infrastructure_type: "Helium-3 Extractor",
          p_location: null,
        });
        const id = r.data?.[0]?.infrastructure_id;
        if (id) builtIds.push(id);
      }

      // Activate all six to exceed capacity (25 cap vs 30 use)
      for (const id of builtIds) {
        await supabase.rpc("toggle_infrastructure_status", {
          p_infrastructure_id: id,
          p_target_status: true,
        });
      }

      // Count active extractors before advancing
      const dash2 = await supabase.rpc("get_dashboard_summary");
      const beforeActive = (
        dash2.data.players[0].infrastructure as Array<{
          type: string;
          is_active: boolean;
        }>
      ).filter((i) => i.type === "Helium-3 Extractor" && i.is_active).length;

      // Move to Operations: Setup -> Governance -> Operations
      await supabase.rpc("advance_phase", { current_version: gs1.version });
      const gs2 = (await supabase.rpc("get_dashboard_summary")).data.game_state;
      await supabase.rpc("advance_phase", { current_version: gs2.version });

      const gsOps = (await supabase.rpc("get_dashboard_summary")).data
        .game_state;

      // Advance round to trigger pre-round auto-deactivation
      await supabase.rpc("advance_round", { current_version: gsOps.version });

      // Inspect after state
      const dash3 = await supabase.rpc("get_dashboard_summary");
      const afterActive = (
        dash3.data.players[0].infrastructure as Array<{
          type: string;
          is_active: boolean;
        }>
      ).filter((i) => i.type === "Helium-3 Extractor" && i.is_active).length;

      const deactivatedCount = beforeActive - afterActive;
      notes.push(
        `Crew/Power capacity: 25 each; 6 extractors x 5 = 30 -> expect 1 auto-deactivated.`
      );
      setResult({ beforeActive, afterActive, deactivatedCount, notes });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <Box mt={6} p={4} borderWidth="1px" borderRadius="md">
      <Stack gap={3}>
        <Heading size="sm">Dev Harness (Mock Only)</Heading>
        <Text color="gray.500">
          Simulates auto-deactivation before round end by exceeding crew/power
          with Helium-3 Extractors.
        </Text>
        <Button size="sm" onClick={runSimulation} loading={running}>
          Run auto-deactivation simulation
        </Button>
        {error && (
          <Text color="red.500">
            Error: <Code>{error}</Code>
          </Text>
        )}
        {result && (
          <Box>
            <Text>
              Active H3 before: <b>{result.beforeActive}</b>
            </Text>
            <Text>
              Active H3 after: <b>{result.afterActive}</b>
            </Text>
            <Text>
              Auto-deactivated: <b>{result.deactivatedCount}</b>
            </Text>
            {result.notes.map((n, i) => (
              <Text key={i} color="gray.500">
                {n}
              </Text>
            ))}
          </Box>
        )}
      </Stack>
    </Box>
  );
}
