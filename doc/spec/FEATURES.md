# Features

## Dev Panel: Games list

- The games list now renders inline as a scrollable table inside the Developer panel, replacing the previous modal UX.
- Includes quick filtering, refresh, and inline delete confirmation.
- Only visible in development builds via `DeveloperPanel` (guarded by `import.meta.env.DEV`).

## Missing Features

## Completed ✅

- ✅ **Building infrastructure** - Players can build infrastructure during operations phase with all requirements met:
  - Build on behalf of others with selectable owner
  - Ledger tracks all transactions
  - Board location entry (optional)
  - Inventory reflects ownership
  - Active/dormant status based on power/crew requirements
  - Toggle infrastructure active/dormant
  - Modal view for managing all infrastructure

- ✅ **Contracts** - Full contract system implemented:
  - Create contracts between two players
  - Exchange EV (one-time or per-round), crew capacity, power capacity
  - Duration-based or permanent contracts
  - End or break contracts
  - Ledger tracks creation, payments, and endings
  - One-time EV payments process immediately
  - Contract sharing affects available power/crew on dashboard
  - Reputation penalties for breaking contracts

- ✅ **Manual Adjustments** - One-time EV/REP adjustments with required reason logging

- ✅ **Ledger view** - Display and filter ledger entries by player and round

- ✅ **Contract view** - Display active and past contracts with end/break functionality

- ✅ **Player infra view active/inactive** - Modal to view and manage infrastructure status

- ✅ **End-of-round processing + Advance Round**
  - "Advance Round" button appears during Operations (replaces "Next Phase")
  - Advances current round and sets phase to Governance with optimistic locking
  - Maintenance processed: rolled up per player for active, non-starter infrastructure; single MAINTENANCE ledger entry per player; EV can go negative
  - Per-round contract EV exchanges processed with double-entry ledger entries (payer loss + payee gain) and clear notes (e.g., "Round N contract payment: A → B")
  - Marks any remaining unprocessed ledger entries for that round as processed
  - Auto-starts the next round's Governance timer
  - Shows highest rep label in the round info (unique leader gets first issue and tiebreak; otherwise "No High Rep Bonus Active")

- ✅ **Multiplayer sessions (mock mode)**
  - Shareable link displayed in header with one-click copy (uses `?game=ID`)
  - New Game creates a fresh game ID and URL without extra deps (no router)
  - First-time visitors are prompted to join as a player or observe-only
  - Joining as a player is allowed only during Setup before Round 1
  - All mock data (players, infra, ledger, contracts) is scoped per game ID
  - Note: Supabase (real backend) parity to be added in a follow-up migration (add game_id, update RPCs)

  - Added `game_id` to game tables and indexed
  - Updated RPCs to accept `p_game_id` and filter by it (advance_phase/round, get_dashboard_summary, add_player, build/toggle infrastructure, contracts, manual_adjustment, process_round_end, reset_game)
  - Added `ensure_game(p_game_id)`
  - Frontend hooks now pass `p_game_id` and scope table queries/subscriptions by `game_id`
  - Migration file: `database/migrations/012_multigame_support.sql`

- ✅ **Operations Phase Turn Order (local)**
  - Local-only generation; not persisted to backend (client picks and shares verbally)
  - Button appears in Operations phase action row when no order exists for current round
  - 2s animated "quantum dice" sequence with progress bar & space-themed flavor text
  - Randomized order displayed in modal, then inline under Operations Phase heading as `1. Name, 2. Name, ...`
  - Order auto-clears when leaving Operations phase / entering a different phase
  - Implemented via `operationsTurnOrder` in `gameStore`, `TurnOrderModal` component, integrated in `GameStateDisplay`

- ✅ **Player specialization card selection** - Add Player modal now presents three specialization image cards (scaled ~75%) instead of a dropdown; responsive horizontal layout stacks vertically on narrow screens for improved clarity.

- ✅ **Helpful Tips Section**
  - Added `PhaseTipsPanel` collapsible panel under Game Status and above Player Rankings
  - Persists open/closed state and per-phase current tip index to localStorage
  - Tips are phase-scoped and navigable with previous/next controls and index indicator
  - Icons rendered via react-icons with Chakra's `Icon` wrapper; data is in `src/data/tips.json`
  - Lightweight runtime validation and typed access via `getTipsForPhase()`

- ✅ **Narrative Panel**
  - Phase and round-based narrative content displayed above game sections
  - Collapsible panel that auto-expands when new narrative appears
  - Supports optional images and multi-paragraph text (line breaks via `\n`)
  - Content defined in `src/data/narrative.json` with TypeScript types
  - Priority matching: exact phase+round > phase-only
  - Sample narratives for Setup, Round 1 Governance, and Round 1 Operations

## Up Next

As a new user I need a quick tutorial walkthrough of how to actually play the game, almost like a mock first round, when I set up my player. However, if I'm an experience player or if I'm facilitating the game on behalf of others, I should still have a path to simply creating players.

A multi-step wizard-style walkthrough could be a good way to "play" a mock first round during the setup phase. It would allow a player to select a specialization, build their first piece of starter infrastructure and designate where it goes on the game board, and simulate a first contract for that starter equipment.

Player creation should reuse the current [add player modal](../../src/components/AddPlayerModal.tsx), so we can just keep that part very simple.

Then it should take them to a "Governance Phase" tutorial step, where they will get some text about what happens in the Governance phase and be asked to create a simulated contract to pay into the commons fund in order to power and crew their starter infrastructure. No actual contract will be made but we can lay it out similar to a subset of [create contract modal](../../src/components/CreateContractModal.tsx) where it shows "From Player {player company name}" "to Commons", "5 power and Crew in exchange for 5 EV" and it can be laid out to look like a form but the values aren't editable.

Finally, it should take them to a screen to simulate Operations Phase where they get a little blurb about what happens in that phase and the opportunity to build and place their starter infrastructure, but the only selectable piece of infrastructure should be the one their specialization determines they start with, and also they input where the piece of infrastructure is placed on the board, similar to what already exists in the [Build Infrastructure modal](../../src/components/BuildInfrastructureModal.tsx). There should be instructions to go to the game board and decide where to place their piece, with the stipulation that it must be within 3 hex spaces of the commons infrastructure. This will be player enforced, we don't have to validate it.

This should be a seamless flow from modal to modal, and each one should be at least 80vw width of the viewport and should scroll with overflow.

The "Add Player" button on the game dashboard in the [game state](../../src/components/GameStateDisplay.tsx) should be de-emphasized and another button called "New Player Walkthrough" should be the primary action in setup phase.

The existing [add player modal](../../src/components/AddPlayerModal.tsx) should be augmented to also have the input to set the starter infrastructure location but it should only be visible if it is not "new player tutorial" mode.

## High Priority

- persistent actions row in top instead of in panels
- better example contracts
- editable contracts
- "how to use the game board" help and link to game board (configurable)
- facilitator prompts/tips?
- point to the game board more
- choosable infrastructure locations and check capacity
- persist turn order to everyone and implement next player
- High Rep Bonus randomize if tied
- emphasize high rep bonus value
- remove timer, add contract limit (make congigurable)
- more contract and build clarity?
- maybe contract types
- why is specialty meaningful?
- buy into commons
- Labels in general could be more readable, tooltips on things like "build on behalf of"
- additional tips (Setup tips exist, need more)
- context-specific tooltips
- move manual adjustment control
- assign user to player when they create it
- events and event cards
- icons on infrastructure
- pop up infrastructure reference table
- pop up tokens/icons reference guide
- turn order persistence & cross-client visibility (backend)
- editable infrastructure values
- editable win condition
- editable rep per contract/turn off system
- add tips to modals like build infrastrucuture/create contracts
- add texxt to manual adjustment

## Maybe

- contract templates "build on behalf, lease power or habitat, etc"
- next player button for moving through operations?
- turn planner
- skill tree
- scenario import
- event card import
- values editor
- player turns
- assigning power/crew to specific infrastructure (currently contracts share capacity but don't assign to specific pieces) (may not need)
