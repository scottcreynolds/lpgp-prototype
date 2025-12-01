# Database Setup

## Overview

This directory contains SQL migrations for the Lunar Policy Gaming Platform database schema.

## Prerequisites

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from Project Settings → API

## Setup Instructions

### 1. Run Migrations (production-ready)

Run ALL files in `database/migrations` sequentially (numeric order) for full parity and to include corrective patches. Use the Supabase SQL Editor (paste contents per file) or Supabase CLI. Verify no errors after each file.

Complete order (as of repo state):

1. `001_initial_schema.sql`
2. `002_seed_data.sql`
3. `003_rpc_functions.sql`
4. `004_setup_phase.sql`
5. `005_reset_game_setup.sql`
6. `006_infrastructure_and_contracts.sql`
7. `007_infrastructure_and_contract_rpcs.sql`
8. `008_round_end_processing.sql`
9. `009_update_dashboard_summary.sql`
10. `010_advance_round.sql`
11. `011_fix_starter_infrastructure.sql`
12. `012_multigame_support.sql`
13. `013_null_round_defaults.sql`
14. `014_round_coalesce_safety.sql`
15. `015_add_player_uuid_retry.sql`
16. `016_fix_game_state_multi_game.sql`
17. `017_fix_game_state_multi_game_retry.sql`
18. `018_game_state_unique_game_id.sql`
19. `019_auto_activation_and_round_end_deactivation.sql`
20. `020_generic_round_end_auto_deactivate.sql`
21. `021_build_permissions.sql`
22. `022_game_admin_functions.sql`
23. `023_starter_infra_always_active.sql`
24. `024_auto_activate_extractors.sql`
25. `025_game_end_state.sql`
26. `026_fix_evaluate_end_game_ambiguity.sql`
27. `027_fix_evaluate_end_game_force_path.sql`
28. `028_fix_evaluate_end_game_uuid_array.sql`
29. `029_contract_rep_bonus.sql`
30. `030_contract_lifecycle_rep.sql`
31. `031_set_starter_infra_location.sql`

Utilities (zsh):

```zsh
# List migrations in run order
ls -1 database/migrations/*.sql | sort

# Preview a specific file (replace filename)
bat -n database/migrations/012_multigame_support.sql  # or: sed -n '1,120p' ...

# Build a preview bundle (review before applying)
ls -1 database/migrations/*.sql | sort | xargs cat > /tmp/lpgp_migrations_bundle.sql
open /tmp/lpgp_migrations_bundle.sql
```

Supabase CLI (optional):

```zsh
# Install CLI
npm install -g supabase

# Authenticate and link your project
supabase login
supabase link --project-ref <your-project-ref>

# Apply migrations sequentially with error stop
for f in $(ls -1 database/migrations/*.sql | sort); do
 echo "Applying $f" && supabase db execute --file "$f" || { echo "Error on $f"; break; }
done
```

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Initialize Game State

The app passes a game id via the URL (`?game=<uuid>`). On first load or when creating a new game, the client calls `ensure_game(p_game_id uuid)` and uses scoped RPCs. Clicking "Start New Game" in the header navigates to a new `?game=` and resets just that game's data via `reset_game(p_game_id uuid)`.

Quick checks:

```sql
SELECT * FROM players;
SELECT * FROM game_state;
```

If empty, initialize/reset a specific game id:

```sql
SELECT * FROM reset_game('your-game-uuid');
```

CLI example:

```zsh
supabase db query "SELECT * FROM reset_game('your-game-uuid');"
```

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
