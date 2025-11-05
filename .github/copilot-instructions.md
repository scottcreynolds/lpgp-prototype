# Copilot instructions for lpgp-prototype

These notes help AI agents work productively in this repo. Keep guidance concrete and follow existing patterns.

## Stack & workflows

- Tooling: Vite + React 19 + TypeScript, Chakra UI v3, TanStack Query 5, Zustand, Supabase (optional).
- Package manager: pnpm. Common scripts: `pnpm dev`, `pnpm build` (tsc then vite), `pnpm lint`.
- Path alias: `@/*` resolves to `src/*` (see `tsconfig.app.json` and `vite-tsconfig-paths`). Example: `import { Provider } from "@/components/ui/provider"`.
- Backend modes:
  - Mock mode (default): if `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` are missing, app uses a localStorage-backed mock client and logs: "🎭 Using mock data...".
  - Real Supabase: add `.env.local` with those vars. See `database/README.md` and `SETUP.md`.

## Architecture (big picture)

- Single data-access facade: `src/lib/supabase.ts` exports `supabase`, returning the mock client or a real Supabase client. Do not check env vars anywhere else.
- Server state via TanStack Query; client UI state via Zustand (`src/store/gameStore.ts`). Query results hydrate the store in `useDashboardData()`.
- Real-time: subscriptions are registered inside hooks using `supabase.channel(...).on('postgres_changes', ...)` and trigger Query invalidations.
- UI: Chakra UI v3 components, toaster from `src/components/ui/toaster.tsx`, color mode via `next-themes` provider in `src/components/ui/provider.tsx`.

## Data flow and conventions

- All backend calls are RPCs: call `supabase.rpc('<fn>', params)` from hooks. Example in `src/hooks/useGameData.ts`:
  - Query: `get_dashboard_summary` → updates store via `setDashboardData` and refetches every 5s as a fallback.
  - Mutations: `advance_phase`, `reset_game`, `add_player`, `edit_player` → on success, invalidate `gameKeys.dashboard()`.
- Query keys: use the factory in `useGameData.ts` (`gameKeys.all/dashboard/state`). Add new keys alongside existing ones.
- Optimistic locking: advancing phase requires the `version` from store (`useGameStore`) passed to `advance_phase`. If a version mismatch occurs, surface the error to the user.
- Types are source-of-truth in `src/lib/database.types.ts` and mirror Supabase schema + RPC return shapes. Update these when changing schema.

## Mock vs real backend parity

- Mock client: `src/lib/mockSupabaseClient.ts` stores state in localStorage and implements the minimal Supabase interface used here: `rpc`, `channel`, `removeChannel`.
- When adding a new RPC or subscription:
  1. Implement the SQL in `database/migrations/003_rpc_functions.sql` (or a new migration).
  2. Add the mock implementation in `mockSupabaseClient.ts` with equivalent behavior.
  3. Extend types in `database.types.ts` if needed and update any derived shapes used by the UI.
  4. Wire React Query invalidations and, if relevant, postgres_changes subscriptions.

## Database surface (current)

- Tables: `game_state`, `players`, `player_infrastructure`, `infrastructure_definitions`, `ledger_entries`.
- RPCs used by the app (see `database/migrations/003_rpc_functions.sql`):
  - `get_dashboard_summary()` → dashboard aggregate used by `useDashboardData()`.
  - `advance_phase(current_version)` → relies on `game_state.version` for concurrency control.
  - `reset_game()` → resets to initial state (1 default player in SQL; mock mirrors this).
  - `add_player(player_name, player_specialization)` and `edit_player(p_player_id, p_player_name, p_player_specialization)`.

## UI patterns to follow

- Keep components small and focused. Example patterns: `AddPlayerModal` and `EditPlayerModal` handle form state locally and delegate side effects to hooks; show feedback via `toaster` and mutation `isPending`.
- Dashboard composition: `Dashboard` fetches data via `useDashboardData`, renders sections (`GameStateDisplay`, `PlayerRankings`, `InfrastructureCards`). Keep data shaping in hooks or helpers, not in components.
- Styling and layout: use Chakra UI components; avoid Tailwind. Prefer the design tokens and variants already in use.

## Gotchas and tips

- Do not import `@supabase/supabase-js` directly in components; always use the facade `supabase` from `src/lib/supabase.ts`.
- When adding schema or RPCs, keep mock and SQL in sync to preserve dev experience without a backend.
- If real-time updates seem stale, ensure subscriptions include all affected tables and that you invalidate the correct query keys.
- Use `pnpm` for any new scripts or deps. Prefer coding small utilities locally; ask before adding new dependencies.

Key references: `README.md`, `CLAUDE.md`, `src/hooks/useGameData.ts`, `src/lib/{supabase.ts,mockSupabaseClient.ts,database.types.ts,mockData.ts}`, `src/store/gameStore.ts`, `database/migrations/*`.
