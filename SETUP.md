# LPGP Dashboard Setup Guide

This guide will walk you through setting up the Lunar Policy Gaming Platform dashboard from scratch.

## Prerequisites

- Node.js 18+ installed
- pnpm package manager
- A Supabase account (free tier works fine)

## Step 1: Supabase Setup

### 1.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in/create an account
2. Click "New Project"
3. Fill in the project details:
   - Project name: `lpgp-prototype` (or your choice)
   - Database password: Save this somewhere safe
   - Region: Choose closest to you
4. Click "Create new project" and wait for it to initialize (~2 minutes)

### 1.2 Run Database Migrations

1. In your Supabase project, go to the **SQL Editor** (left sidebar)
2. Run the migration files in order by copying and pasting each file's contents:
   - First: `database/migrations/001_initial_schema.sql`
   - Second: `database/migrations/002_seed_data.sql`
   - Third: `database/migrations/003_rpc_functions.sql`
3. After each file, click "Run" and verify there are no errors

### 1.3 Get Your API Credentials

1. Go to **Project Settings** → **API** (in left sidebar)
2. Find and copy these two values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

## Step 2: Local Environment Setup

### 2.1 Create Environment File

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Then edit `.env.local` and add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2.2 Install Dependencies

```bash
pnpm install
```

## Step 3: Run the Application

### 3.1 Start Development Server

```bash
pnpm dev
```

The app should now be running at `http://localhost:5173`

### 3.2 Initialize the Game

1. Open the application in your browser
2. Click the **"Start New Game"** button in the header
3. Confirm the action
4. You should see:
   - 4 players with 50 EV and 10 REP each
   - Round 1 - Governance Phase
   - Infrastructure cards showing starter equipment

## Step 4: Test the Dashboard

### 4.1 Test Phase Advancement

1. Click **"Next Phase"** button
2. Verify it advances to "Round 1 - Operations Phase"
3. Click again to advance to "Round 2 - Governance Phase"

### 4.2 Test Real-Time Updates

1. Open the Supabase SQL Editor
2. Manually update a player's EV:
   ```sql
   UPDATE players SET ev = 100 WHERE name = 'Player 1';
   ```
3. The dashboard should update within ~5 seconds
4. Try opening the app in multiple browser tabs and clicking "Next Phase" - both should update

### 4.3 Test Concurrent Update Protection

1. Open the app in two browser windows side-by-side
2. Click "Next Phase" in both windows **quickly** (within 1 second)
3. Only one should succeed; the other should show an error about version mismatch
4. Refresh the failed window - it should now show the correct phase

## Troubleshooting

### "Failed to fetch dashboard" Error

- **Check environment variables**: Make sure `.env.local` has correct values
- **Verify migrations**: Ensure all 3 migration files ran without errors in Supabase
- **Check browser console**: Look for network errors or 401/403 responses

### "Version mismatch" Errors

This is actually **expected behavior** when two users try to advance the phase simultaneously. The optimistic locking is working correctly. Simply refresh and try again.

### No Data Showing

1. Make sure you clicked "Start New Game" to initialize data
2. Check Supabase SQL Editor:
   ```sql
   SELECT * FROM players;
   SELECT * FROM game_state;
   ```
3. If tables are empty, re-run the `reset_game()` function:
   ```sql
   SELECT * FROM reset_game();
   ```

## Architecture Overview

### Data Flow

1. **Dashboard** component fetches data via `useDashboardData()` hook
2. Hook calls Supabase RPC function `get_dashboard_summary()`
3. Data is cached in TanStack Query and synced to Zustand store
4. Real-time subscriptions listen for database changes
5. On change, queries are invalidated and refetched automatically

### Race Condition Protection

The `advance_phase()` RPC function uses **optimistic locking**:
- Takes current `version` as parameter
- Only updates if database version matches
- Returns error if versions don't match (someone else updated first)
- Increments version on successful update

### Key Technologies

- **React 19** - UI framework
- **Chakra UI v3** - Component library
- **TanStack Query** - Server state management
- **Zustand** - Client state management
- **Supabase** - Backend (Postgres + real-time subscriptions)
- **TypeScript** - Type safety

## Next Steps

Now that the basic dashboard is working, you can:

1. Add player name editing functionality
2. Implement the timer for Governance phase
3. Add manual EV/REP adjustment controls
4. Create infrastructure building interface
5. Implement contracts system
6. Add territory claiming functionality

See the [PRD](/doc/PRD.md) and [Rules](/doc/rules.md) for full feature specifications.
