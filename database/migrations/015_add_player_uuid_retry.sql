-- Robust UUID generation and retry for add_player to avoid duplicate key errors

BEGIN;

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
  v_attempts INT := 0;
BEGIN
  PERFORM ensure_game(p_game_id);

  SELECT current_round, current_phase
    INTO v_current_round, v_current_phase
  FROM game_state
  WHERE game_id = p_game_id
  ORDER BY updated_at DESC
  LIMIT 1;

  IF COALESCE(v_current_phase, 'Setup') <> 'Setup' OR COALESCE(v_current_round, 0) <> 0 THEN
    RETURN QUERY SELECT false, 'Joining is only allowed during Setup before Round 1'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  <<insert_player>>
  LOOP
    v_attempts := v_attempts + 1;
    v_player_id := uuid_generate_v4(); -- uuid-ossp extension enabled in initial schema
    BEGIN
      INSERT INTO players (id, name, specialization, ev, rep, game_id)
      VALUES (v_player_id, player_name, player_specialization, 50, 10, p_game_id);
      EXIT insert_player; -- success
    EXCEPTION WHEN unique_violation THEN
      -- Extremely unlikely UUID collision; retry a few times
      IF v_attempts < 3 THEN
        CONTINUE insert_player;
      ELSE
        RAISE;
      END IF;
    END;
  END LOOP insert_player;

  IF player_specialization = 'Resource Extractor' THEN
    SELECT id INTO v_starter_infra_id FROM infrastructure_definitions WHERE type = 'Starter H2O Extractor';
  ELSIF player_specialization = 'Infrastructure Provider' THEN
    SELECT id INTO v_starter_infra_id FROM infrastructure_definitions WHERE type = 'Starter Solar Array';
  ELSE
    SELECT id INTO v_starter_infra_id FROM infrastructure_definitions WHERE type = 'Starter Habitat';
  END IF;

  INSERT INTO player_infrastructure (player_id, infrastructure_id, is_powered, is_crewed, is_starter, game_id)
  VALUES (v_player_id, v_starter_infra_id, true, true, true, p_game_id);

  INSERT INTO ledger_entries (player_id, round, transaction_type, amount, reason, processed, game_id)
  VALUES (v_player_id, COALESCE(v_current_round, 0), 'GAME_START', 50, 'Initial EV', true, p_game_id);

  RETURN QUERY SELECT true, 'Player added successfully'::TEXT, v_player_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;
