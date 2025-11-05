-- Update reset_game to start in Setup phase (round 0)

CREATE OR REPLACE FUNCTION reset_game()
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  player_count INTEGER
) AS $$
DECLARE
  v_player_id UUID;
  v_starter_h2o_id UUID;
BEGIN
  -- Clear existing data
  DELETE FROM ledger_entries;
  DELETE FROM player_infrastructure;
  DELETE FROM players;

  -- Reset game state to pre-first-round Setup
  UPDATE game_state
  SET
    current_round = 0,
    current_phase = 'Setup',
    version = 0,
    updated_at = NOW()
  WHERE id = 1;

  -- Get starter infrastructure ID
  SELECT id INTO v_starter_h2o_id
  FROM infrastructure_definitions
  WHERE type = 'Starter H2O Extractor';

  -- Create default player: Resource Extractor
  INSERT INTO players (name, specialization, ev, rep)
  VALUES ('Luna Corp', 'Resource Extractor', 50, 10)
  RETURNING id INTO v_player_id;

  INSERT INTO player_infrastructure (player_id, infrastructure_id, is_powered, is_crewed, is_starter)
  VALUES (v_player_id, v_starter_h2o_id, true, true, true);

  INSERT INTO ledger_entries (player_id, round, transaction_type, amount, reason)
  VALUES (v_player_id, 1, 'GAME_START', 50, 'Initial EV');

  -- Return success
  RETURN QUERY SELECT
    true,
    'Game reset successfully'::TEXT,
    1;
END;
$$ LANGUAGE plpgsql;
