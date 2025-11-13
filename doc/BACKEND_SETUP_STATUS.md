# Backend setup status and next steps

Updated: 2025-11-06

This document tracks the backend enablement (Supabase + Netlify) for LPGP and how to keep it healthy.

## Summary

- Supabase schema and RPCs are applied through migration 021 (build permissions, auto‑activation on build, and generic pre‑round auto‑deactivation).
- Realtime publication configured for: game_state, players, player_infrastructure, ledger_entries, contracts.
- Netlify environment variables are set so the app uses the real backend:
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY
- The app URL parameter `?game=<uuid>` scopes all operations; `ensure_game(p_game_id)` initializes state for a new game.

## What’s working

- RPCs used by the frontend:
  - get_dashboard_summary(p_game_id)
  - advance_phase(p_game_id, current_version)
  - advance_round(p_game_id, current_version)
  - reset_game(p_game_id)
  - add_player(p_game_id, ...)
  - build_infrastructure(p_game_id, ...)
  - toggle_infrastructure_status(p_game_id, ...)
  - create_contract(p_game_id, ...), end_contract(p_game_id, ...)
  - manual_adjustment(p_game_id, ...), process_round_end(p_game_id)
- Realtime updates for game_state, players, and player_infrastructure invalidate React Query keys as designed.

### Recent backend changes (019–021)

- Auto-activate Solar Arrays and Habitats on build; add activation ledger entry.
- Before round-end financials, auto-deactivate any active, non-starter infrastructure that lacks required crew/power (newest-first); write a ledger entry prefixed with "Auto-deactivated …".
- Enforce build permissions: add `player_buildable` flag to `infrastructure_definitions`; commons and starters are not player-buildable; builder specialization must be allowed by `can_be_operated_by`.

## How to operate

- To start a game, visit the app without a `?game=` param; the app adds one and calls `ensure_game` if needed.
- To share a session, copy the URL with `?game=<uuid>`.
- To force a clean slate for a game: call `reset_game(p_game_id)` via the UI.

## Netlify environment

- Verify or change these in Site configuration → Environment variables:
  - VITE_SUPABASE_URL = <https://ngnyybfutmzqldsiaoor.supabase.co>
  - VITE_SUPABASE_ANON_KEY = (anon key in Netlify; stored as secret)
- Redeploy after changes.

## Local development

- Create `.env.local` at the repo root to use the real backend:

```bash
VITE_SUPABASE_URL=https://ngnyybfutmzqldsiaoor.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

- Or omit these to use the built‑in mock client (logs: "🎭 Using mock data...").

## Realtime configuration

Realtime is enabled via the `supabase_realtime` publication. If you add new tables that should stream to the client, add them in a migration, for example:

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='your_table'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.your_table';
  END IF;
END $$;
```

## Next steps

- Optional: Add a scoped `edit_player(p_game_id, ...)` and update the UI hook to pass `p_game_id` for consistency.
- Add RLS policies if/when moving beyond a trusted environment (auth + per‑game access control).
- Add basic integration tests that call key RPCs (advance_phase/round, add_player, build/toggle infra) against a local Supabase or test schema.
- Consider surfacing contract and ledger realtime updates in the UI (enable queries and subscription filters).

## Troubleshooting

- Seeing mock mode? Ensure both Netlify env vars are present; console should NOT show "🎭 Using mock data...".
- No realtime updates? Confirm tables are in `supabase_realtime` and that subscriptions filter by `game_id`.
- Version mismatch when advancing: this is expected if two clients act concurrently; retry using the new `version`.
