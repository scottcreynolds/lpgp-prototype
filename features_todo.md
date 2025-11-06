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

## Up Next

TBD — pick next item from High Priority (e.g., turn order in each phase, multiplayers).

## High Priority

- unique gameid
- multiplayers
- turn order in each phase
- player stats view (basic version exists in rankings, may need expansion)
- clean up layout
- tips (Setup tips exist, need more)
- auto timer start
- styles (basic styling done, needs polish)
- event cards

## Maybe

- turn planner
- skill tree
- scenario import
- event card import
- values editor
- limit who can build what based on spec
- player turns
- assigning power/crew to specific infrastructure (currently contracts share capacity but don't assign to specific pieces)

### Bugs

- player leaderboard indicator not working
