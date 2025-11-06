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

## Priority

- end of round calculations (contracts need per-round EV payments processed)
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
- explicit end of round
- assigning power/crew to specific infrastructure (currently contracts share capacity but don't assign to specific pieces)

### Bugs

- player leaderboard indicator not working
