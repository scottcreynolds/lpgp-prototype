# Missing Features

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

## Up Next

<!-- Helpful Tips Section implemented; moved to Completed ✅ -->

## High Priority

- determine a winner
- player stats view (basic version exists in rankings, may need expansion)
- clean up layout
- tips (Setup tips exist, need more)
- auto timer start
- event cards
- turn order persistence & cross-client visibility (backend)

## Maybe

- turn planner
- skill tree
- scenario import
- event card import
- values editor
- player turns
- assigning power/crew to specific infrastructure (currently contracts share capacity but don't assign to specific pieces) (may not need)

## Bugs
