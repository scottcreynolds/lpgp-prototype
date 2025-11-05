# LPGP Project Status

**Last Updated:** 2025-11-05

## Project Overview

The Lunar Policy Gaming Platform (LPGP) is a serious-game for simulating cooperative lunar development being developed as part of a student research project. This is the companion automated scorekeeping and dashboard system.

## Tech Stack

- **Frontend:** React 19 (TypeScript)
- **UI Library:** Chakra UI v3
- **State Management:** Zustand + TanStack Query
- **Backend:** Supabase (PostgreSQL)
- **Build Tool:** Vite
- **Package Manager:** pnpm

## Current Features Implemented

### Dashboard Components

1. **DashboardHeader** - Game controls and player management
   - Add Player button with modal
   - Advance Phase button
   - Reset Game button
   - Toast notifications for actions

2. **GameStateDisplay** - Current game state information
   - Current round and phase display
   - Game version tracking

3. **PlayerRankings** - Player leaderboard
   - Sortable table with rank, player name, specialization, EV, REP
   - Winner and "close to winning" badges
   - Edit player functionality via modal
   - **NEW:** Scrollable table with 600px max height using Table.ScrollArea

4. **InfrastructureCards** - Player infrastructure overview
   - Grid layout of player cards
   - Infrastructure counts with icons
   - Power and crew capacity tracking with shortage warnings
   - Maintenance cost and yield display
   - Net income per round calculation
   - **NEW:** Edit player functionality on each card

5. **EditPlayerModal** (Reusable Component)
   - Edit player name and specialization
   - Dropdown with specialization descriptions
   - Form validation
   - Loading states during mutation

6. **AddPlayerModal**
   - Add new players to the game
   - Select specialization at creation
   - Form validation

## Data Flow

### Hooks (src/hooks/useGameData.ts)

- `useDashboardData()` - Fetches dashboard summary with real-time subscriptions
- `useAdvancePhase()` - Advances game phase with optimistic locking
- `useResetGame()` - Resets game to initial state
- `useAddPlayer()` - Adds new player with specialization
- `useEditPlayer()` - Updates player name and specialization

### Store (src/store/gameStore.ts)

- Zustand store for local game state
- Synced with TanStack Query for server state

## Recent Changes (Current Session)

### Completed
1. ✅ Added EditPlayerModal to InfrastructureCards component
   - Edit button appears in top-right of each player card (Flex layout)
   - Uses same modal and hook as PlayerRankings

2. ✅ Made PlayerRankings scrollable
   - Wrapped table in Table.ScrollArea with maxH="600px"
   - Table header remains visible while scrolling
   - Accommodates many players without breaking layout

### Files Modified
- `src/components/InfrastructureCards.tsx` - Added edit functionality
- `src/components/PlayerRankings.tsx` - Added scrollable area

## Database Schema (Supabase)

### Tables
- `game_state` - Current game round, phase, version
- `players` - Player info (id, name, specialization, ev, rep)
- `player_infrastructure` - Player-owned infrastructure
- `territories` - Territory ownership and data
- `events` - Game event log
- `ledger` - Financial transaction log

### RPC Functions
- `get_dashboard_summary()` - Returns complete dashboard data
- `advance_phase(current_version)` - Advances game with optimistic locking
- `reset_game()` - Resets all game state
- `add_player(player_name, player_specialization)` - Creates new player
- `edit_player(p_player_id, p_player_name, p_player_specialization)` - Updates player

## Known Issues

None currently reported.

## Development Environment

- Dev server runs on: `http://localhost:5173/`
- Start dev server: `pnpm dev`
- Build: `pnpm build`

## Next Steps / Future Considerations

1. **Territory Management** - UI for viewing and managing territories (data exists in backend)
2. **Event Log Viewer** - Display recent game events from the events table
3. **Transaction History** - View ledger entries for financial tracking
4. **Game Configuration** - UI for editing game mechanics/parameters
5. **Multi-game Support** - Handle multiple game instances with unique URLs
6. **Testing** - Add unit and integration tests
7. **Performance** - Monitor query performance with many players/rounds

## Architecture Notes

- Components are independent and focused (separation of concerns)
- Data mutations use TanStack Query with optimistic updates
- Real-time updates via Supabase subscriptions
- Defensive coding with optional chaining and fallback values
- Toast notifications for user feedback on all mutations
- Optimistic locking prevents race conditions (version-based)

## Documentation

- Project requirements: `./doc/PRD.md`
- Game rules: `./doc/rules.md`
- Code guidelines: `./CLAUDE.md`
- Global config: `/Users/scottcreynolds/CLAUDE.md`

## Git Status

**Current Branch:** main
**Recent Commits:**
- 74527c5 - add tanstack query
- 6bf2fd6 - initialize and add chakra-ui

**Uncommitted Changes:**
- M CLAUDE.md
- ?? doc/
- ?? status.md (this file)

---

*This status document should be updated at the end of each significant development session.*
