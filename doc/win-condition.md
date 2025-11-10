# Win Condition (Implemented)

This document describes the implemented endgame logic, data changes, and UI behavior.

## Overview

There are two paths to end the game:

- Automatic end: after advancing a round, the client evaluates whether any player(s) met the configured thresholds.
- Manual end: an "End Game" button in the header forces a final ranking regardless of thresholds.

When the game ends, we update persistent state, write a ledger entry, show a winner modal to all clients, and lock gameplay actions.

## Configuration

Configured in `src/config/gameSettings.ts`:

- `evThreshold` (default 500)
- `repThreshold` (default 0; 0 disables REP requirement)
- `autoWinEnabled` (boolean)
- `tieMode` (currently `tiebreaker-ev-plus-rep`)

Threshold semantics: EV and REP thresholds are ANDed. If `repThreshold` is 0, REP is ignored (EV-only).

## Evaluation Logic

1. Determine the set of players meeting EV (and REP if > 0).
2. If exactly one qualifies → Single winner.
3. If multiple qualify → compare EV + REP aggregates:
   - Unique top aggregate → Tiebreaker victory (single winner).
   - Still tied → Cooperative victory among top aggregate players.
4. Manual end (force) always applies step 3 using EV + REP regardless of thresholds.

Victory types returned to clients and stored:

- `single`, `tiebreaker`, `cooperative`.

## Persistence and Broadcast

On end, we persist to `game_state`:

- `ended` (boolean), `ended_at` (timestamp)
- `winner_player_ids` (text[] of player UUIDs)
- `victory_type` (`single` | `tiebreaker` | `cooperative`)
- `win_ev_threshold`, `win_rep_threshold` (snapshot of config)

We also write a ledger entry with transaction type `GAME_ENDED` summarizing winners and victory type. Clients subscribe to `game_state` updates via the dashboard summary.

## RPC

`evaluate_end_game(p_game_id uuid, p_force boolean, p_ev_threshold int, p_rep_threshold int)`

- Idempotent: early returns if already ended.
- Computes winners and updates `game_state` + inserts `GAME_ENDED` in one transaction.
- Client triggers automatically after round advance (if `autoWinEnabled`) and manually from the header (with `p_force = true`).

## Client Integration

- Zustand store holds `gameEnded`, `victoryType`, `winnerIds`.
- Winner modal in `Dashboard.tsx` renders when `gameEnded` becomes true, listing winners and other players (EV/REP).
- UI lockout after end: disabled/hidden actions include:
  - Advance Phase / Advance Round buttons
  - Add Player
  - Build Infrastructure
  - Create Contract, End Contract, Break Contract
  - Manual Adjustments
  - Turn Order generation
  - Phase Timer hidden

## Tie Handling Summary

- Threshold tie → resolve by EV + REP; if still tied → Cooperative victory.
- Manual end always uses EV + REP; if tied → Cooperative victory.

## Mock Mode Parity

The mock Supabase client mirrors `evaluate_end_game` behavior so the feature works without a real backend.

## Notes / Future Work

- Consider server-side auto-evaluation at round end to reduce client responsibility.
- Additional tie modes can be added via `tieMode`.
- Export/replay view for ended games could enhance analysis.
