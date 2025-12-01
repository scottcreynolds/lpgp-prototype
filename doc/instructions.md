# LPGP User Instructions

This guide explains how to use the Lunar Policy Gaming Platform (LPGP): getting started, core actions, session flow, rules, and where to get help.

## Quick Start

- Mock mode (no backend):
  1. Install and run:

    ```zsh
    pnpm install
    pnpm dev
    ```

  1. The app opens at `http://localhost:5173` and uses localStorage-based mock data. You’ll see: “🎭 Using mock data…”.

- Real Supabase (multi-user):
  1. Follow `doc/SETUP.md` to set up Supabase and run all migrations.
  2. Create `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
  3. Start with `pnpm dev`.

## Key Concepts

- Game ID: Each session uses a unique `?game=<uuid>` in the URL. Share this URL with participants to play together.
- Phases: Setup → Governance → Operations → End of Round.
- Metrics: EV (Economic Value) and REP (Reputation) track performance.
- Ledger: All EV/REP changes and major actions are recorded for auditability.

## Using the Dashboard

- Header Controls:
  - Start New Game: Creates a new `game_id` and initializes the board.
  - Advance Phase: Moves to the next phase. If a version mismatch appears, someone else advanced first—refresh and retry.

- Main Sections:
  - Game State: Shows current round, phase, and next actions.
  - Player Rankings: Lists players, EV/REP, and specialization.
  - Infrastructure: Cards showing player-owned infrastructure and their status.
  - Contracts: Active agreements affecting EV/REP.

## Common Actions

- Add Player: Open Add Player, enter name and specialization, confirm.
- Edit Player: Open Edit Player from the player list to change name or specialization.
- Build Infrastructure: Select an infrastructure card, review cost/effects, and build. Some infra auto-activate under conditions.
- Toggle Infrastructure: Activate/deactivate as needed; certain types auto-deactivate at round end.
- Create/End Contracts: Manage agreements; they can boost or reduce REP and affect operations.
- Manual Adjustments: Facilitator can apply EV/REP changes. These are recorded in the ledger.

## Session Flow

1. Setup (Round 0): Initialize players and starter infrastructure.
2. Governance: Decide policy, plan builds/contracts.
3. Operations: Apply builds, activate infrastructure, process effects.
4. End of Round: System applies automatic rules, then advances to next Governance.

## Rules Summary

- Starter Infrastructure: Provided in Setup, often auto-activated with no cost.
- Concurrency: Only one phase advance succeeds at a time (optimistic locking). Others will see a version mismatch.
- Round-End Behavior: Certain infrastructure auto-deactivates; extractors may auto-activate under conditions.
- Permissions: Build/admin functions include checks to prevent invalid states.
- End Game Checks: The system evaluates win/end conditions and sets an end state when met.

For the full rules and PRD, see:

- `doc/rules.md`
- `doc/PRD.md`

## Troubleshooting

- No data visible:
  - Ensure the URL contains `?game=<uuid>`.
  - Use “Start New Game” to initialize.
  - On Supabase, run `SELECT * FROM players;` and `SELECT * FROM game_state;` to verify.

- Version mismatch when advancing:
  - Another user advanced first. Refresh the page and try again.

- Realtime updates not appearing (Supabase):
  - Check that migrations were applied in full and realtime channels include all affected tables.

## Where to Find Help

- Orientation: `doc/ORIENTATION.md`
- Setup & Migrations: `doc/SETUP.md`, `database/README.md`
- Data & Types: `src/lib/database.types.ts`
- Client Logic: `src/hooks/useGameData.ts`, `src/store/gameStore.ts`
- Supabase Facade: `src/lib/supabase.ts` and `src/lib/mockSupabaseClient.ts`

## Tips for Facilitators

- Share the exact `?game=<uuid>` URL so everyone joins the same session.
- Advance phases deliberately and announce transitions.
- Use manual adjustments sparingly and record the rationale.
- If state diverges, use `Reset Game` (for the current `game_id`) and re-run the round.

## Privacy & Persistence

- Mock mode stores data in the browser’s localStorage (per device). Clearing storage resets the mock session.
- Supabase mode persists data in the database scoped by `game_id`.

---

If anything is unclear or you encounter issues, consult `doc/SETUP.md` for environment steps, `database/README.md` for migrations, and `doc/ORIENTATION.md` for system overview.
