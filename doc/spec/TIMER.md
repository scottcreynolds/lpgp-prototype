# Timer Synchronization Options

This document outlines two robust ways to keep the phase timer in sync across all players’ screens using our current stack (Supabase + Realtime, React, TanStack Query, Zustand). Both approaches fit the repo’s conventions: RPC-first, Realtime for invalidations/updates, and mock parity.

## Option 2: Deadline timestamp (lightweight, recommended for now)

A minimal, durable approach where the database stores a single deadline timestamp and optional paused remainder.

### Option 2 — Concept

- Store `deadline_at` (timestamptz) and, if paused, `paused_remaining_sec` (int).
- Start: `deadline_at = now() + duration`.
- Pause: compute remaining and set `paused_remaining_sec = remaining`; set `deadline_at = NULL`.
- Resume: `deadline_at = now() + paused_remaining_sec`; clear `paused_remaining_sec`.
- Reset: clear both or set a new duration.

Clients derive remaining time as:

- Running: `remaining = max(0, deadline_at - server_now)`.
- Paused: `remaining = paused_remaining_sec`.

### Option 2 — Schema sketch

Use either new columns on `game_state` (simplest) or a dedicated `phase_timers` table keyed by `(game_id, round, phase)`.

```sql
-- Option A: columns added to game_state
ALTER TABLE public.game_state
  ADD COLUMN IF NOT EXISTS timer_deadline_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS timer_paused_remaining_sec int4 NULL;

-- Option B: dedicated table
CREATE TABLE IF NOT EXISTS public.phase_timers (
  game_id uuid NOT NULL REFERENCES public.game_state(game_id) ON DELETE CASCADE,
  round int NOT NULL,
  phase text NOT NULL CHECK (phase IN ('Setup','Governance','Operations')),
  deadline_at timestamptz NULL,
  paused_remaining_sec int4 NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (game_id, round, phase)
);
```

### Option 2 — RPCs

- `start_timer(p_game_id, p_round, p_phase, p_duration_sec)` → sets `deadline_at`.
- `pause_timer(p_game_id, p_round, p_phase)` → computes remaining from `deadline_at`, stores `paused_remaining_sec`, clears `deadline_at`.
- `resume_timer(p_game_id, p_round, p_phase)` → sets new `deadline_at` from paused remaining.
- `reset_timer(p_game_id, p_round, p_phase, p_duration_sec)` → clears or sets new deadline.

These should use `now()` on the server to avoid client clock skew and return the updated timer payload for immediate UI updates.

### Option 2 — Client behavior

- Subscribe to table changes (we already subscribe via `useDashboardData`); include the timer fields in the summary RPC.
- On render, compute remaining using server-provided timestamps/values.
- Keep a 1Hz local tick for smooth display, but correct using server values whenever new data arrives.
- Replace the current `useGameStore` local-start with DB updates (or only use store as a derived cache).

### Option 2 — Pros

- Simple schema and mental model.
- Durable and correct for late joiners.
- Minimal code churn in UI.

### Option 2 — Cons

- Requires a migration + mock parity.
- Slightly less granular state than full model (below), but sufficient for our needs.

### Option 2 — Edge cases

- Phase change while running: reset/reseed deadline in the same transaction that changes phase (e.g., inside `advance_round`).
- Race conditions: add optimistic version checks like we use for `advance_phase` to avoid double pause/resume.
- Time drift: always use server `now()`; clients should not act as authority.

### Option 2 — Repo parity steps

- Migration file under `database/migrations/` with columns/table and RPCs.
- Extend `get_dashboard_summary()` to include the timer fields.
- Mock parity in `src/lib/mockSupabaseClient.ts` to store and compute the same fields via localStorage.
- Add types to `src/lib/database.types.ts`.
- Update UI to read from dashboard timer fields; stop client-only auto-starts.

---

## Option 1: Database-authoritative full state (more explicit control)

Store full timer state in the database: duration, started time, paused flag, and paused remainder.

### Option 1 — Concept

- Persist: `duration_sec`, `started_at` (timestamptz), `is_paused` (bool), `remaining_on_pause_sec` (int).
- Running remaining = `max(0, duration_sec - (server_now - started_at))`.
- Paused remaining = `remaining_on_pause_sec`.

### Option 1 — Schema sketch

Again, either extend `game_state` or add a `phase_timers` table.

```sql
ALTER TABLE public.game_state
  ADD COLUMN IF NOT EXISTS timer_duration_sec int4 DEFAULT 300 NOT NULL,
  ADD COLUMN IF NOT EXISTS timer_started_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS timer_is_paused bool NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS timer_remaining_on_pause_sec int4 DEFAULT 300 NOT NULL;
```

Or the equivalent columns in `phase_timers` keyed by `(game_id, round, phase)`.

### Option 1 — RPCs

- `start_timer(p_game_id, p_round, p_phase, p_duration_sec)` → sets `started_at = now()`, `is_paused = false`, initializes `duration_sec`.
- `pause_timer(p_game_id, p_round, p_phase)` → computes remaining from `started_at/duration`, stores `remaining_on_pause_sec`, sets `is_paused = true`, clears `started_at`.
- `resume_timer(p_game_id, p_round, p_phase)` → sets `started_at = now()`, `is_paused = false` using `remaining_on_pause_sec` as the new duration window (or keep `duration_sec` and track elapsed separately).
- `reset_timer(p_game_id, p_round, p_phase, p_duration_sec)` → set duration and pause with full remaining.

Include optimistic version checks or row locks to avoid conflicting updates.

### Option 1 — Client behavior

- Subscribe to timer fields via `get_dashboard_summary()`/Realtime.
- Derive remaining from server fields; tick locally for smoothness.
- UI actions call the RPCs; no client-only state is authoritative.

### Option 1 — Pros

- Expressive: full control and transparent state for debugging.
- Easy to evolve (e.g., storing who paused, auto-advance flags, etc.).

### Option 1 — Cons

- Slightly more schema/API surface than the deadline-only approach.
- Same migration + mock parity needs.

### Option 1 — Edge cases

- Mid-phase changes to duration: clamp or recalc `remaining_on_pause_sec` safely.
- Governance auto-start: perform the `start_timer` inside the `advance_round` RPC so all clients see the new timer atomically with the phase change.

### Option 1 — Repo parity steps

- Migration and RPCs.
- Add timer fields to summary types and mock client.
- Update UI to consume server-derived remaining; keep local 1Hz tick only for rendering.

---

## Recommendation and integration notes

- Pick Option 2 (deadline) for a lightweight, durable implementation that maps cleanly to UI, or Option 1 if you want richer, explicit state.
- Move the existing "auto-start on Governance" behavior from the client (`useAdvanceRound.onSuccess`) into the `advance_round` RPC so the timer change and phase change happen together on the server.
- Maintain mock parity so local dev without Supabase behaves consistently.
