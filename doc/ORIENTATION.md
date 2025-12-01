# LPGP Platform Orientation

This document gives a practical overview of how the Lunar Policy Gaming Platform (LPGP) works for facilitators, players, and developers. It summarizes gameplay flow, phases, core actions, data model, and system behaviors reflected in the codebase and migrations.

## Game Overview

- Objective: Cooperatively develop lunar infrastructure while balancing economics (EV), reputation (REP), and resource constraints. Players make decisions in structured phases across multiple rounds. The game can host multiple independent game instances identified by `game_id` (URL `?game=<uuid>`).
- Modes:
  - Mock mode: local-only, powered by localStorage via a mock Supabase client. Great for demos or development without a backend.
  - Real backend: Supabase Postgres with RPCs and realtime subscriptions, supporting multi-user play and concurrency control.

## Phases and Rounds

- Setup Phase (Round 0): Initialize the game with baseline state and starter infrastructure for at least one player. Reset actions return to this baseline state.
- Governance Phase: Players make policy and strategic decisions (e.g., adding players, planning builds, contracts). Concurrency control prevents conflicting transitions.
- Operations Phase: Executes builds/activations, runs extractors, updates EV/REP, processes contracts, and records ledger entries. At phase end, the system can auto-deactivate certain infrastructure and apply end-of-round logic.
- End of Round: Round-end processing aggregates outcomes, applies automatic activations/deactivations as needed, and advances to the next round’s Governance.

Advancement is guarded by optimistic locking via `game_state.version`. If two clients attempt to advance at once, only one succeeds; the other sees a version mismatch and must retry.

## Core Player Actions

- Add/Edit Player: Introduce new players or modify their name/specialization. Specializations can influence strategy and balance.
- Build Infrastructure: Acquire and construct infrastructure from `infrastructure_definitions`. Builds may change EV/REP and resource state and create ledger entries.
- Toggle Infrastructure Status: Activate/deactivate player-owned infrastructure. Some infrastructure auto-activates (e.g., extractors) under certain conditions; others auto-deactivate at round end.
- Create/End Contracts: Establish agreements that can modify REP, provide benefits, or impose costs. Contract lifecycle updates ledger and can adjust REP at key events.
- Manual Adjustments: Facilitators may adjust EV/REP directly for special rulings or events; all changes should be recorded in `ledger_entries`.

## Data Model (high level)

- `game_state`: Current `round`, `phase`, and `version` per `game_id`. `version` is used for optimistic locking.
- `players`: Player profiles with EV/REP and specialization, scoped by `game_id`.
- `infrastructure_definitions`: Catalog of buildable infrastructure types, costs, and effects.
- `player_infrastructure`: Instances of infrastructure owned by players, including activation status and location.
- `ledger_entries`: Immutable audit trail of all economic/reputation changes and operational events.

Multi-game support scopes all tables and RPCs by `game_id`. The UI ensures a `?game=<uuid>` is present and passes it to backend RPCs.

## Key RPCs and Server Logic

- `get_dashboard_summary(p_game_id)`: Aggregates the current state for rendering the dashboard (players, rankings, infra status, phase/round).
- `advance_phase(p_game_id, current_version)`: Moves the game to the next phase with a version check. Fails safely on mismatch.
- `advance_round(p_game_id, current_version)`: Runs end-of-round processing, applies auto-deactivation rules, and advances to next round governance.
- `reset_game(p_game_id)`: Resets the specified game to its initial Setup state (starter players and infrastructure).
- `add_player(...)`, `edit_player(...)`: Maintain player roster.
- `build_infrastructure(...)`, `toggle_infrastructure_status(...)`: Manage infrastructure lifecycle.
- `create_contract(...)`, `end_contract(...)`: Manage contract lifecycle, including REP adjustments.
- `manual_adjustment(...)`: Facilitator overrides; must insert ledger entries to preserve auditability.
- Round-end helpers: Functions that apply automatic activation/deactivation behaviors and compute end-game checks.

These RPCs are mirrored in the mock client to ensure parity when running without a backend.

## Dashboard and Data Flow

- The React dashboard fetches data via TanStack Query hooks (e.g., `useDashboardData()`) which call `supabase.rpc('get_dashboard_summary', { p_game_id })`.
- Query results hydrate client state in Zustand (`gameStore`) and drive UI sections: Game State display, Player Rankings, Infrastructure Cards, and Contract views.
- Realtime: Subscriptions listen for changes on relevant tables and trigger query invalidations, keeping the dashboard fresh across clients.

## Concurrency and Safety

- Optimistic Locking: `advance_phase` and `advance_round` require the caller to supply the current `version`. If the DB `version` differs, the mutation fails and the UI shows a retry prompt.
- Round End Safety: Migrations include guards to avoid null round data, coalesce logic, and ensure consistent transitions. Starter infrastructure behavior is resilient and often auto-activated.
- Permissions: Build and admin functions have checks to prevent invalid state transitions.

## Typical Turn Flow

1. Governance: Players propose and decide actions (builds, contracts, activations). The facilitator or authorized player submits actions through UI.
2. Operations: The system applies actions, updates EV/REP, activates/deactivates infra as per rules, and records ledger entries.
3. Round End: The game runs end-of-round processing, applies automatic rules (e.g., deactivate certain infra), and advances to next round’s Governance.

## Starting a New Game

- In the UI, click “Start New Game”; the app appends a new `?game=<uuid>` to the URL and calls the reset/ensure functions for that game.
- Setup Phase initializes starter state. Advancing from Setup moves to Round 1 Governance.

## Troubleshooting Essentials

- “Version mismatch” when advancing: Another client advanced first. Refresh and retry; the system prevented a race condition.
- Empty dashboard: Ensure a `?game=<uuid>` is present and “Start New Game” was used. If running against Supabase, verify migrations and run `reset_game('<uuid>')`.
- Realtime feels stale: Confirm subscriptions include all affected tables and invalidate the right query keys.

## Where to Look in the Repo

- UI Hooks and Store: `src/hooks/useGameData.ts`, `src/store/gameStore.ts`
- Supabase Facade: `src/lib/supabase.ts` and `src/lib/mockSupabaseClient.ts`
- Types Mirror DB: `src/lib/database.types.ts`
- SQL Migrations: `database/migrations/*.sql` (run sequentially for full parity)
- Setup Guides: `doc/SETUP.md` (end-to-end), `database/README.md` (migrations + CLI)

## Design Principles

- Single data-access facade: Components never import Supabase directly; they use the `supabase` export, which chooses mock vs real.
- Server state via React Query; client UI state via Zustand. Keep heavy data shaping in hooks, not components.
- Ledger-first mentality: All economic and reputation changes must be recorded.
- Mock/Real parity: Every new RPC or schema change should be mirrored in the mock client to preserve local dev UX.

## End Game and Evaluation

- The system includes end-game evaluation logic and fixes for edge cases (ambiguities, forced paths, UUID arrays). When conditions are met, the game can enter an end state. This is reflected in migrations around `025`–`028`.

---

For detailed setup, see `doc/SETUP.md`. For migration order and CLI utilities, see `database/README.md`. If you’re facilitating a session, ensure everyone uses the same `?game=<uuid>` and advance phases carefully to avoid concurrency conflicts.
