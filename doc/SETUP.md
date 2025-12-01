# LPGP Dashboard Setup Guide

This guide will walk you through setting up the Lunar Policy Gaming Platform dashboard from scratch.

## Prerequisites

- Node.js 18+ installed
- pnpm package manager
- Optional: A Supabase account (free tier works fine)

## Backend Modes

- Mock mode (default): If `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` are missing, the app uses a localStorage-backed mock client and logs: "🎭 Using mock data...".
- Real Supabase: Add `.env.local` with those vars. See [database/README.md](../database/README.md).

## Step 1: Supabase Setup (Optional)

Only needed if you want real-time multi-user via Supabase instead of mock mode.

### 1.1 Create a Supabase Project

1. Go to <https://supabase.com> and create/sign in.
2. Click "New Project".
3. Fill in details:
   - Project name: `lpgp-prototype` (or your choice)
   - Database password: Save it
   - Region: Closest to you
4. Wait for initialization (~2 minutes).

### 1.2 Run Database Migrations (production-ready)

For full feature parity and fixes, run ALL files in `database/migrations` sequentially (numeric order). Use the Supabase SQL Editor (paste contents per file) or Supabase CLI against your project. Verify no errors after each file.

Complete order (as of repo state):

1. `001_initial_schema.sql`
2. `002_seed_data.sql`
3. `003_rpc_functions.sql`
4. `004_setup_phase.sql` — adds Setup phase (round 0)
5. `005_reset_game_setup.sql` — reset starts in Setup
6. `006_infrastructure_and_contracts.sql`
7. `007_infrastructure_and_contract_rpcs.sql`
8. `008_round_end_processing.sql`
9. `009_update_dashboard_summary.sql`
10. `010_advance_round.sql`
11. `011_fix_starter_infrastructure.sql`
12. `012_multigame_support.sql` — adds game_id scoping
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

Notes:

- Multi-game: RPCs accept `p_game_id` and data is scoped by `game_id`. The app will add `?game=<uuid>` to the URL if missing.
- Realtime publication must include relevant tables (see examples in [database/README.md](../database/README.md)).
- Some files are corrective or retry patches; they are required for parity.

Utility (optional) — zsh helpers for ordering and previewing:

```zsh
# List migrations in run order
ls -1 database/migrations/*.sql | sort

# Preview a single file before running (replace filename)
bat -n database/migrations/012_multigame_support.sql  # or: sed -n '1,120p' ...

# Generate a concatenated preview bundle (do NOT paste blindly; review first)
ls -1 database/migrations/*.sql | sort | xargs cat > /tmp/lpgp_migrations_bundle.sql
open /tmp/lpgp_migrations_bundle.sql
```

Supabase CLI (optional): If you prefer CLI over the SQL Editor, authenticate and target your project, then apply files one-by-one to preserve visibility of errors:

```zsh
# Install CLI if needed
npm install -g supabase

# Login and link your project
supabase login
supabase link --project-ref <your-project-ref>

# Apply each migration in numeric order for clear error handling
for f in $(ls -1 database/migrations/*.sql | sort); do
  echo "Applying $f" && supabase db execute --file "$f" || { echo "Error on $f"; break; }
done
```

### 1.3 Get Your API Credentials

Project Settings → API:

- Project URL (e.g. `https://xxxxx.supabase.co`)
- anon public key (under "Project API keys")

## Step 2: Local Environment Setup

### 2.1 Create Environment File (only for real Supabase)

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

If you omit `.env.local`, the app will run in mock mode automatically.

### 2.2 Install Dependencies

```bash
pnpm install
```

## Step 3: Run the Application

### 3.1 Start Development Server

```bash
pnpm dev
```

- App runs at `http://localhost:5173`
- Mock mode shows: "🎭 Using mock data..."

### 3.2 Initialize the Game

- The app URL will include `?game=<uuid>` automatically if missing.
- In Setup phase (round 0), use the header controls:
  - Start New Game: initializes the selected game instance
  - Advance Phase: from Setup → Round 1 Governance

You should see:

- 1 default player (mock and SQL may differ based on current migrations)
- Round 0 – Setup (then Round 1 – Governance after advancing)
- Starter infrastructure active for the starter player

## Step 4: Test the Dashboard

### 4.1 Test Phase Advancement

1. Click "Begin Round 1" (from Setup) or "Next Phase" as appropriate.
2. Verify transitions:
   - Setup → Round 1 Governance
   - Governance → Operations
   - Operations → Round 2 Governance

### 4.2 Test Real-Time Updates (Supabase only)

1. Open Supabase SQL Editor and update a player’s EV:

   ```sql
   UPDATE players SET ev = 100 WHERE name = 'Luna Corp';
   ```

2. The dashboard should update via React Query invalidations.

### 4.3 Test Concurrent Update Protection

- Open two browser windows for the same `?game=<uuid>`
- Click "Next Phase" in both quickly
- One succeeds; the other shows a version mismatch (optimistic locking)
- Retry using the updated version or refresh

## Troubleshooting

### "Failed to fetch dashboard"

- Check `.env.local` values (real backend only)
- Verify migrations ran without errors
- Inspect browser console/network for 401/403

### "Version mismatch"

Expected when two clients advance simultaneously. Optimistic locking is working. Refresh and try again.

### No Data Showing

- Ensure you initialized via "Start New Game" in header
- In Supabase:

  ```sql
  SELECT * FROM players;
  SELECT * FROM game_state;
  ```

- If empty, run:

  ```sql
  SELECT * FROM reset_game('your-game-uuid');
  ```

Or use CLI with a param:

```zsh
supabase db query "SELECT * FROM reset_game('your-game-uuid');"
```

## Architecture Overview

- Single data-access facade: [`src/lib/supabase.ts`](../src/lib/supabase.ts)
- Server state via TanStack Query; UI state via Zustand. See hooks in [`src/hooks/useGameData.ts`](../src/hooks/useGameData.ts) and store in [`src/store/gameStore.ts`](../src/store/gameStore.ts).
- Mock vs real is automatically selected; do not check env vars elsewhere.

### Data Flow

1. Dashboard fetches via `useDashboardData()` → `get_dashboard_summary(p_game_id)`
2. React Query caches and syncs to Zustand
3. Supabase realtime invalidates the correct query keys

### Race Condition Protection

`advance_phase(p_game_id, current_version)` uses optimistic locking:

- Compares provided version to DB
- Updates only on match, then increments

## Development

- Build: `pnpm build`
- Type check: `pnpm exec tsc --noEmit`
- Lint: `pnpm lint`

## Next Steps

- Player name editing
- Governance phase timer
- Manual EV/REP adjustments
- Infrastructure building UI
- Contracts system
- Territory claiming

See PRD: [doc/PRD.md](./PRD.md) and Rules: [doc/rules.md](./rules.md) for specifications.
