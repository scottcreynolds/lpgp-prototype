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

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Initialize Game State

The game will automatically initialize when you click "Start New Game" in the dashboard, which calls the `reset_game()` RPC function.

## Database Schema

### Tables

- **game_state** - Tracks current round and phase with optimistic locking
- **players** - Player information (EV, REP, specialization)
- **infrastructure_definitions** - Master list of infrastructure types
- **player_infrastructure** - Tracks player-owned infrastructure
- **ledger_entries** - Audit log of all transactions

### RPC Functions

- **advance_phase(current_version)** - Advances game phase with race condition protection
- **reset_game()** - Resets to initial state with 4 players
- **get_dashboard_summary()** - Returns aggregated dashboard data

## Development Notes

- All EV/REP changes should create ledger entries
- The `version` field in `game_state` prevents concurrent phase advancement
- Starter infrastructure has zero cost and no power/crew requirements
- Commons infrastructure is tracked but not assigned to specific players
