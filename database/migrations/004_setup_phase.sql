-- Add Setup phase and make it the initial/default state

BEGIN;

-- Allow 'Setup' as a valid phase and make it default
ALTER TABLE game_state DROP CONSTRAINT IF EXISTS game_state_current_phase_check;
ALTER TABLE game_state ALTER COLUMN current_phase SET DEFAULT 'Setup';
ALTER TABLE game_state ADD CONSTRAINT game_state_current_phase_check CHECK (
  current_phase IN ('Setup', 'Governance', 'Operations')
);

-- Initialize to Setup (pre-first-round) state
UPDATE game_state
SET current_round = 0,
    current_phase = 'Setup',
    version = 0,
    updated_at = NOW()
WHERE id = 1;

COMMIT;
