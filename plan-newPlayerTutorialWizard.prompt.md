# New Player Tutorial Wizard Implementation Plan

Three-step 80vw modal onboarding during Setup phase.

## Overview

Wizard Steps:

1. Player Creation (reuse existing add-player logic; Skip advances without a player)
2. Governance Contract Simulation (static: 5 crew, 5 power, 10 EV, open duration; no persistence)
3. Starter Infrastructure Placement (lookup existing starter infra via player_id + is_starter; persist location only if player exists)

UI Adjustments:

- Add new Walkthrough primary button (uses current Add Player styling)
- Convert existing Add Player button to outline variant
- Extend AddPlayerModal with non-required starter location field (hidden during tutorial)

Persistence:

- New RPC to update starter infrastructure location (mock + real), only invoked if player exists and a location is entered.

Graceful Handling:

- If player creation skipped: placeholder player name (“Your Company”), no infra lookup/persist
- Missing starter infra: show fallback text; allow finish without persistence

## Detailed Steps

1. Wizard Component

   - File: `src/components/NewPlayerTutorialWizard.tsx`
   - State: `step`, `playerId` (uuid | null)
   - Width: enforce 80vw (Chakra modal style override)
   - Embed AddPlayer form logic (import internal form segment or refactor form into a shared subcomponent)
   - Skip button on Step 1 sets `playerId = null` and advances to Step 2
   - Footer navigation: Back (steps > 0), Next / Finish contextually
   - Close resets local state

2. Dashboard Integration

   - File: `src/components/GameStateDisplay.tsx`
   - Add “New Player Walkthrough” button (primary variant same as existing Add Player original style)
   - Change existing Add Player button to `variant="outline"`
   - Show Walkthrough button only during Setup phase (same gating as Add Player)
   - Manage wizard open/close state

3. Add Player Extension

   - File: `src/components/AddPlayerModal.tsx`
   - Props: `onPlayerCreated?: (id: string) => void`, `hideStarterLocation?: boolean`
   - Add non-required starter location input (text field) guarded by `!hideStarterLocation`
   - On successful creation: invoke `onPlayerCreated(playerId)`
   - Do not alter existing specialization/starter infra creation logic

4. RPC & Mock Implementation

   - Migration file: `database/migrations/031_set_starter_infra_location.sql`
   - SQL Function: `set_starter_infrastructure_location(p_game_id uuid, p_player_id uuid, p_location text)`
     - UPDATE `player_infrastructure` SET `board_location = p_location` WHERE `player_id = p_player_id` AND `is_starter = true` AND `game_id = p_game_id`
     - Return success boolean + message
   - Update `src/lib/database.types.ts` with RPC definition
   - Add mock implementation in `src/lib/mockSupabaseClient.ts`
   - Hook: `useSetStarterInfraLocation()` (React Query mutation calling `supabase.rpc('set_starter_infrastructure_location', {...})`)

5. Governance Simulation Step

   - Static layout styled like subset of `CreateContractModal`
   - Display: From {playerName || "Your Company"} → Commons
   - Values: Crew 5, Power 5, EV 10, Duration: Open
   - Read-only: disabled Chakra `FormControl` or plain text blocks
   - Next button advances to Step 3; no RPC calls

6. Starter Placement Step

   - If `playerId` exists:
     - Query starter infra: existing pattern (React Query) selecting from `player_infrastructure` filtered by `player_id` & `is_starter`
     - Show infra summary (type/yield/power/crew) and location input (text)
     - Instructional text: choose a location within 3 spaces of the commons infrastructure
     - Finish: if location entered call mutation then close; if empty just close
   - If `playerId` null:
     - Show informational placeholder explaining starter infra would appear after player creation
     - Primary button labeled “Close” simply closes wizard

7. Query Invalidation

   - After location update: invalidate dashboard keys (e.g., `gameKeys.dashboard()`), and any infra-specific keys if defined

8. Error Handling

   - RPC failure or missing infra: show toaster error; allow Finish without persisting
   - Defensive checks for null `playerId` before lookup/mutation

9. UX / Accessibility

   - Step indicator ("Step X of 3") in header
   - Focus management on step change (focus first heading)
   - Keyboard navigation preserved (Tab order; Enter triggers primary button)

10. Testing Outline (later)

- Wizard state transitions (step advancement, skip path)
- Player creation sets playerId
- Skipped path: no infra query or location RPC invoked
- Successful location persistence invalidates queries
- Error path: shows toast, allows finish

## Data & Types Changes

- Extend `database.types.ts` RPC interface
- Ensure mock client parity for new RPC
- No schema changes besides new function (board_location assumed existing; if not, confirm and add column migration)

## Open Verifications (Pre-Implementation)

- Confirm `player_infrastructure` has `board_location` column; if missing, create migration before RPC
- Ensure existing query keys for infra/location display (else add one)

## Completion Criteria

- Wizard launches and navigates through all three steps
- Player creation works identically to existing modal when used
- Contract simulation displays fixed values correctly
- Starter location persists only when player exists and location entered
- Reopening wizard during Setup resets previous state
- Add Player button downgraded; Walkthrough button primary
