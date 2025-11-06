# Database Setup

## Overview

This directory contains SQL migrations for the Lunar Policy Gaming Platform database schema.

## Prerequisites

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from Project Settings → API

## Setup Instructions

### 1. Run Migrations

In your Supabase project, navigate to the SQL Editor and run the migration files in order:

1. `001_initial_schema.sql` - Creates tables and indexes
2. `002_seed_data.sql` - Populates infrastructure definitions
3. `003_rpc_functions.sql` - Creates RPC functions
4. `012_multigame_support.sql` - Adds multi-game scoping (game_id) and updates RPCs

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Initialize Game State

The app passes a game id via the URL (`?game=<uuid>`). On first load or when creating a new game, the client calls `ensure_game(p_game_id uuid)` and uses scoped RPCs. Clicking "Start New Game" in the header navigates to a new `?game=` and resets just that game's data via `reset_game(p_game_id uuid)`.

## Database Schema

### Tables

- **game_state** - Tracks current round and phase with optimistic locking
- **players** - Player information (EV, REP, specialization)
- **infrastructure_definitions** - Master list of infrastructure types
- **player_infrastructure** - Tracks player-owned infrastructure
- **ledger_entries** - Audit log of all transactions

### RPC Functions

- advance_phase(p_game_id uuid, current_version int) - Advances phase with optimistic locking
- advance_round(p_game_id uuid, current_version int) - Processes round end and advances to next round governance
- reset_game(p_game_id uuid) - Resets only the specified game's data (initial Setup, 1 starter player)
- ensure_game(p_game_id uuid) - Ensures a game_state row exists for the provided game id
- get_dashboard_summary(p_game_id uuid) - Returns aggregated dashboard data for the game
- add_player(p_game_id uuid, player_name text, player_specialization text)
- build_infrastructure(p_game_id uuid, ...)
- toggle_infrastructure_status(p_game_id uuid, ...)
- create_contract(p_game_id uuid, ...)
- end_contract(p_game_id uuid, ...)
- manual_adjustment(p_game_id uuid, ...)
- process_round_end(p_game_id uuid)

## Development Notes

- All EV/REP changes should create ledger entries
- The `version` field in `game_state` prevents concurrent phase advancement
- Starter infrastructure has zero cost and no power/crew requirements
- Commons infrastructure is tracked but not assigned to specific players
