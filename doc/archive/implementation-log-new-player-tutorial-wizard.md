# Implementation Log: New Player Tutorial Wizard & Starter Infrastructure Location RPC

Date: 2025-11-23
Branch: `new-player-tutorial`
Author: GitHub Copilot (AI Assistant)

## Summary

Implemented a three-step onboarding wizard shown during the Setup phase to guide new players through:

1. Player creation
2. Governance contract simulation (static, non-persistent)
3. Starter infrastructure placement (optional location persistence)

Added a new RPC `set_starter_infrastructure_location` (migration 031) to allow setting the `location` for a player's starter infrastructure after creation. Maintains parity between real Supabase backend and the local mock client.

## Files Added / Modified

- Added migration: `database/migrations/031_set_starter_infra_location.sql`
- Updated types: `src/lib/database.types.ts` (added RPC definition)
- Mock RPC implementation: `src/lib/mockSupabaseClient.ts` (case in `rpc` switch)
- New hook: `src/hooks/useSetStarterInfraLocation.ts`
- Extended modal: `src/components/AddPlayerModal.tsx` (optional starter location field, returns player id)
- New component: `src/components/NewPlayerTutorialWizard.tsx`
- Integration: `src/components/GameStateDisplay.tsx` (primary "New Player Walkthrough" button + outline Add Player button)

## RPC Details

Function: `set_starter_infrastructure_location(p_game_id uuid, p_player_id uuid, p_location text)`
Behavior:

- Validates presence of `p_player_id`.
- Trims input and stores `NULL` if blank.
- Updates only the starter infrastructure row (`is_starter = true`) for specified `game_id`.
- Returns `{ success, message }` tuple.

Mock Parity:

- Mirrors logic: iterates player infrastructure, updates matching starter infra, notifies subscribers.

## UI Flow

Wizard (`NewPlayerTutorialWizard`):

- Step 1: Create player (or Skip). On success stores `playerId` and shows toast.
- Step 2: Static preview of a governance-style contract (illustrative only).
- Step 3: If player exists, shows starter infrastructure summary and optional location input; persists via RPC on Finish.
- Skipped Path: Shows informational placeholder on Step 3, Finish simply closes.

Buttons in Setup phase:

- `New Player Walkthrough` (primary, starts wizard)
- `Add Player` (outline, legacy direct creation path; location field hidden here to drive users through wizard for placement step)

## Query Invalidation

- On player creation & location persistence: invalidates `gameKeys.dashboard()` to refresh infrastructure and player state.

## Accessibility / UX

- Step headers include "Step X of 3" context.
- Focus moves to heading on step changes.
- Allows skip with graceful fallback (no infra placement attempt when `playerId` is null).
- Error toasts do not block completion.

## Migration Application

- Initial attempt failed due to escaped apostrophe; corrected by doubling quote in COMMENT string.
- Migration `031_set_starter_infra_location` applied successfully to Supabase.

## Edge Cases Considered

- Missing player id (skip path): no RPC call attempted.
- Blank location input: update stores `NULL` (treated as unset) and still returns success.
- Starter infrastructure not yet visible immediately after creation (race): wizard tolerates missing infra and allows later placement.

## Potential Follow-Ups / Enhancements

- Add automated tests for wizard steps & mutation flows.
- Consider adding visual board helper / location validation rules.
- Persist tutorial completion state to avoid re-showing for the same player.
- Add analytics/logging for onboarding funnel.
- Surface location directly in player card after placement.

## Manual Verification Steps (Suggested)

1. Start app in mock mode (`pnpm dev`).
2. Open Setup phase dashboard.
3. Click `New Player Walkthrough` → create a player.
4. Proceed through steps; set a location on Step 3; Finish.
5. Confirm starter infrastructure gains `location` in dashboard.
6. Repeat and test Skip path (ensure no RPC errors).

## Risks / Notes

- Wizard relies on fresh dashboard data; potential timing issues if query cache stale—currently mitigated by invalidation on mutations.
- Direct Add Player path bypasses immediate location setting—intended (tutorial encourages placement).

## Code Reference Quick Links

- RPC Type: `database.types.ts` → `set_starter_infrastructure_location`
- Mock RPC: `mockSupabaseClient.ts` switch case
- Hook: `useSetStarterInfraLocation.ts`
- Wizard: `NewPlayerTutorialWizard.tsx`
- Integration: `GameStateDisplay.tsx`

## Completion Criteria Met

- Wizard implemented with 3 steps.
- Player creation working and returns ID for subsequent steps.
- Static governance simulation displayed.
- Location persistence RPC functional & applied.
- Buttons updated (primary wizard, outline Add Player).
- Re-opening wizard resets state.

---
End of log.
