-- Defensive defaults and join rules for add_player to avoid NULL round

BEGIN;

-- Ensure add_player uses a safe round and enforces Setup-only join
CREATE OR REPLACE FUNCTION add_player(
  p_game_id UUID,
  player_name TEXT,
  player_specialization TEXT
) RETURNS TABLE (success BOOLEAN, message TEXT, player_id UUID) AS $$
DECLARE
  v_player_id UUID;
  v_starter_infra_id UUID;
  v_current_round INTEGER;
  v_current_phase TEXT;
BEGIN
  -- Ensure a game row exists for this game id
  PERFORM ensure_game(p_game_id);

  -- Read current state (may still be NULL on first-ever call depending on prior state)
  SELECT current_round, current_phase
    INTO v_current_round, v_current_phase
  FROM game_state
  WHERE game_id = p_game_id
  ORDER BY updated_at DESC
  LIMIT 1;

  -- Enforce join window: only allowed during Setup before Round 1
  IF COALESCE(v_current_phase, 'Setup') <> 'Setup' OR COALESCE(v_current_round, 0) <> 0 THEN
    RETURN QUERY SELECT false, 'Joining is only allowed during Setup before Round 1'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Create player with starting balances
  INSERT INTO players (name, specialization, ev, rep, game_id)
  VALUES (player_name, player_specialization, 50, 10, p_game_id)
  RETURNING id INTO v_player_id;

  -- Starter infrastructure by specialization
  IF player_specialization = 'Resource Extractor' THEN
    SELECT id INTO v_starter_infra_id FROM infrastructure_definitions WHERE type = 'Starter H2O Extractor';
  ELSIF player_specialization = 'Infrastructure Provider' THEN
    SELECT id INTO v_starter_infra_id FROM infrastructure_definitions WHERE type = 'Starter Solar Array';
  ELSE
    SELECT id INTO v_starter_infra_id FROM infrastructure_definitions WHERE type = 'Starter Habitat';
  END IF;

  INSERT INTO player_infrastructure (player_id, infrastructure_id, is_powered, is_crewed, is_starter, game_id)
  VALUES (v_player_id, v_starter_infra_id, true, true, true, p_game_id);

  -- Ledger entry: coalesce round to 0 to avoid NULL violation
  INSERT INTO ledger_entries (player_id, round, transaction_type, amount, reason, processed, game_id)
  VALUES (v_player_id, COALESCE(v_current_round, 0), 'GAME_START', 50, 'Initial EV', true, p_game_id);

  RETURN QUERY SELECT true, 'Player added successfully'::TEXT, v_player_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;
