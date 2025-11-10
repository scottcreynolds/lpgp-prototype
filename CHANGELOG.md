# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project currently follows date-stamped entries while pre-1.0.

## 2025-11-05 – Setup Phase & Round Start Workflow

## 2025-11-10 – Conditional Auto-Activation for Extractors

### Changed

- Updated `build_infrastructure` logic (migration `024_auto_activate_extractors.sql`) so newly built non-capacity infrastructure (e.g., H2O Extractor, Helium-3 Extractor) auto-activates immediately only if both crew and power requirements are currently satisfied. Solar Arrays and Habitats still always auto-activate on build.

### Backend/Database

- Added migration `024_auto_activate_extractors.sql` overriding `build_infrastructure` with capacity checks using `get_available_power` / `get_available_crew` before activation.

### Mock Client

- Mirrored activation logic in `rpcBuildInfrastructure` inside `src/lib/mockSupabaseClient.ts` to keep local development behavior consistent.

### Impact

- Prevents extractors from starting dormant when adequate capacity exists, reducing manual activation steps.
- Extractors still build dormant when insufficient crew or power remain, preserving balancing rules.

### Added

- New pre-first-round Setup phase (no timer).
- Setup is now the default state for a new (or reset) game.
- "Begin Round 1" button during Setup that advances directly to Round 1 – Governance (with optimistic locking).
- Setup Tips modal that defaults to open and can be toggled via an info icon. Text adapts to light/dark mode for readability.

### Changed

- Phase timer is hidden during Setup; it appears starting in Governance.
- Game header shows "Setup Phase" instead of "Round 0" in Setup.
- Game phase types extended to include `"Setup"`.

### Backend/Database

- Added migration to allow the new phase and initialize to Setup:
  - `database/migrations/004_setup_phase.sql`
    - Expands `game_state.current_phase` CHECK to include `Setup`.
    - Sets default phase to `Setup` and updates the single row to round `0` / phase `Setup`.
- Updated `reset_game()` to start in Setup:
  - `database/migrations/005_reset_game_setup.sql`
    - Resets the `game_state` row to round `0` / phase `Setup`.
    - Leaves player seeding behavior intact (1 default player + starter infra).
- No change to `advance_phase` contract; behavior from Setup is supported:
  - If phase != Governance, advancing sets `round = round + 1` and `phase = Governance`. From Setup (round 0), this becomes Round 1 – Governance.

### Frontend/Types/Mock

- Types: `src/lib/database.types.ts` `GamePhase` now includes `'Setup'`.
- Mock initial state: `src/lib/mockData.ts` `initialGameState` set to round `0`, phase `Setup`.
- Store default state: `src/store/gameStore.ts` initialized to round `0`, phase `Setup`.
- UI changes:
  - `src/components/GameStateDisplay.tsx` – hides timer in Setup, shows "Setup Phase" heading, and uses a "Begin Round 1" button; includes an ℹ icon to open tips.
  - `src/components/SetupTips.tsx` – new modal with adaptive semantic colors (`fg`, `fg.muted`) so text remains readable in dark mode.

### Migration / Upgrade Notes

1. If you are using a real Supabase backend, apply the new migrations in order:
   - `004_setup_phase.sql`
   - `005_reset_game_setup.sql`
2. Rebuild the app after pulling changes.
3. Mock mode users: clear localStorage if you want a clean start; otherwise the app will continue from your existing mock state.

### Known Issues (unchanged)

- Lint: pre-existing errors in `src/components/ui/color-mode.tsx` and `src/components/ui/toaster.tsx` remain and don’t affect this feature.
