-- Ensure ON CONFLICT (game_id) works by making game_id unique on game_state

BEGIN;

-- 1) Deduplicate any accidental duplicates per game_id (keep most recent)
WITH ranked AS (
  SELECT ctid, game_id,
         row_number() OVER (PARTITION BY game_id ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST) AS rn
  FROM game_state
  WHERE game_id IS NOT NULL
)
DELETE FROM game_state g USING ranked r
WHERE g.ctid = r.ctid AND r.rn > 1;

-- 2) Drop existing non-unique index if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = 'idx_game_state_game_id'
  ) THEN
    EXECUTE 'DROP INDEX IF EXISTS idx_game_state_game_id';
  END IF;
END $$;

-- 3) Create a unique index for conflict target
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_state_game_id_unique ON game_state(game_id);

COMMIT;
