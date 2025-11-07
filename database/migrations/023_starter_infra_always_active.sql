-- Ensure starter infrastructure is always active and cannot be deactivated
-- Fixes regressions introduced by later function overrides

-- 1) Backfill: set existing starter infrastructure to active
UPDATE player_infrastructure
SET is_active = true, is_powered = true, is_crewed = true
WHERE is_starter = true AND is_active = false;

-- 2) add_player: always create starter infra as active (scoped to game_id)
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
  -- Ensure a game row exists
  PERFORM ensure_game(p_game_id);

  -- Read current state
  SELECT current_round, current_phase
    INTO v_current_round, v_current_phase
  FROM game_state
  WHERE game_id = p_game_id
  ORDER BY updated_at DESC
  LIMIT 1;

  -- Enforce join window
  IF COALESCE(v_current_phase, 'Setup') <> 'Setup' OR COALESCE(v_current_round, 0) <> 0 THEN
    RETURN QUERY SELECT false, 'Joining is only allowed during Setup before Round 1'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Create player with deterministic id retry, mirroring 015 retry logic
  <<insert_player>>
  LOOP
    v_attempts := v_attempts + 1;
    v_player_id := uuid_generate_v4();
    BEGIN
      INSERT INTO players (id, name, specialization, ev, rep, game_id)
      VALUES (v_player_id, player_name, player_specialization, 50, 10, p_game_id);
      EXIT insert_player;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempts < 3 THEN
        CONTINUE insert_player;
      ELSE
        RAISE;
      END IF;
    END;
  END LOOP insert_player;

  -- Starter infra by specialization
  IF player_specialization = 'Resource Extractor' THEN
    SELECT id INTO v_starter_infra_id FROM infrastructure_definitions WHERE type = 'Starter H2O Extractor';
  ELSIF player_specialization = 'Infrastructure Provider' THEN
    SELECT id INTO v_starter_infra_id FROM infrastructure_definitions WHERE type = 'Starter Solar Array';
  ELSE
    SELECT id INTO v_starter_infra_id FROM infrastructure_definitions WHERE type = 'Starter Habitat';
  END IF;

  -- Ensure starter infra is active at creation
  INSERT INTO player_infrastructure (
    player_id, infrastructure_id, location, is_active, is_powered, is_crewed, is_starter, game_id
  ) VALUES (
    v_player_id, v_starter_infra_id, NULL, true, true, true, true, p_game_id
  );

  -- Ledger entry (round may be 0 on first join)
  INSERT INTO ledger_entries (player_id, round, transaction_type, amount, reason, processed, game_id)
  VALUES (v_player_id, COALESCE(v_current_round, 0), 'GAME_START', 50, 'Initial EV', true, p_game_id);

  RETURN QUERY SELECT true, 'Player added successfully'::TEXT, v_player_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION add_player(UUID, TEXT, TEXT) IS 'Adds a new player; starter infrastructure is created active.';

-- 3) reset_game (scoped): ensure default starter is active
CREATE OR REPLACE FUNCTION reset_game(
  p_game_id UUID
) RETURNS TABLE (success BOOLEAN, message TEXT, player_count INTEGER) AS $$
DECLARE
  v_player_id UUID;
  v_starter_h2o_id UUID;
BEGIN
  -- Clear existing data for this game id
  DELETE FROM ledger_entries WHERE game_id = p_game_id OR p_game_id IS NULL;
  DELETE FROM player_infrastructure WHERE game_id = p_game_id OR p_game_id IS NULL;
  DELETE FROM players WHERE game_id = p_game_id OR p_game_id IS NULL;

  -- Reset game state row
  PERFORM ensure_game(p_game_id);
  UPDATE game_state
  SET current_round = 0, current_phase = 'Setup', version = 0, updated_at = NOW()
  WHERE game_id = p_game_id;

  -- Starter def
  SELECT id INTO v_starter_h2o_id FROM infrastructure_definitions WHERE type = 'Starter H2O Extractor';

  -- Create default player for this game
  INSERT INTO players (name, specialization, ev, rep, game_id)
  VALUES ('Luna Corp', 'Resource Extractor', 50, 10, p_game_id)
  RETURNING id INTO v_player_id;

  -- Starter infra should be active
  INSERT INTO player_infrastructure (
    player_id, infrastructure_id, location, is_active, is_powered, is_crewed, is_starter, game_id
  ) VALUES (
    v_player_id, v_starter_h2o_id, NULL, true, true, true, true, p_game_id
  );

  INSERT INTO ledger_entries (player_id, round, transaction_type, amount, reason, processed, game_id)
  VALUES (v_player_id, 0, 'GAME_START', 50, 'Initial EV', true, p_game_id);

  RETURN QUERY SELECT true, 'Game reset successfully'::TEXT, 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reset_game(UUID) IS 'Resets a single game to Setup; starter infra is set active.';

-- 4) toggle_infrastructure_status: prevent deactivating starter infra
CREATE OR REPLACE FUNCTION toggle_infrastructure_status(
  p_game_id UUID,
  p_infrastructure_id UUID,
  p_target_status BOOLEAN
) RETURNS TABLE (success BOOLEAN, message TEXT, is_active BOOLEAN) AS $$
DECLARE
  v_player_id UUID;
  v_power_req INTEGER;
  v_crew_req INTEGER;
  v_available_power INTEGER;
  v_available_crew INTEGER;
  v_infra_type TEXT;
  v_current_status BOOLEAN;
  v_player_name TEXT;
  v_current_round INTEGER;
  v_is_starter BOOLEAN;
BEGIN
  SELECT current_round INTO v_current_round FROM game_state WHERE game_id = p_game_id ORDER BY updated_at DESC LIMIT 1;

  SELECT pi.player_id, pi.is_active, pi.is_starter, idef.power_requirement, idef.crew_requirement, idef.type, p.name
    INTO v_player_id, v_current_status, v_is_starter, v_power_req, v_crew_req, v_infra_type, v_player_name
    FROM player_infrastructure pi
    JOIN infrastructure_definitions idef ON pi.infrastructure_id = idef.id
    JOIN players p ON pi.player_id = p.id
    WHERE pi.id = p_infrastructure_id AND pi.game_id = p_game_id;
  IF v_player_id IS NULL THEN RETURN QUERY SELECT false, 'Infrastructure not found'::TEXT, false; RETURN; END IF;

  -- Guard: starter infra cannot be deactivated
  IF v_is_starter = true AND p_target_status = false THEN
    RETURN QUERY SELECT false, 'Starter infrastructure cannot be deactivated'::TEXT, v_current_status;
    RETURN;
  END IF;

  IF p_target_status = true AND v_current_status = false THEN
    SELECT get_available_power(v_player_id), get_available_crew(v_player_id) INTO v_available_power, v_available_crew;
    IF v_power_req IS NOT NULL AND v_available_power < v_power_req THEN RETURN QUERY SELECT false, format('Insufficient power. Required: %s, Available: %s', v_power_req, v_available_power)::TEXT, false; RETURN; END IF;
    IF v_crew_req IS NOT NULL AND v_available_crew < v_crew_req THEN RETURN QUERY SELECT false, format('Insufficient crew capacity. Required: %s, Available: %s', v_crew_req, v_available_crew)::TEXT, false; RETURN; END IF;
    UPDATE player_infrastructure SET is_active = true, is_powered = true, is_crewed = true WHERE id = p_infrastructure_id AND game_id = p_game_id;
    INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, infrastructure_id, game_id)
    VALUES (v_player_id, v_player_name, v_current_round, 'INFRASTRUCTURE_ACTIVATED', 0, 0, 0, format('Activated %s', v_infra_type), true, p_infrastructure_id, p_game_id);
    RETURN QUERY SELECT true, 'Infrastructure activated'::TEXT, true;
  ELSIF p_target_status = false AND v_current_status = true THEN
    UPDATE player_infrastructure SET is_active = false, is_powered = false, is_crewed = false WHERE id = p_infrastructure_id AND game_id = p_game_id;
    INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, infrastructure_id, game_id)
    VALUES (v_player_id, v_player_name, v_current_round, 'INFRASTRUCTURE_DEACTIVATED', 0, 0, 0, format('Deactivated %s', v_infra_type), true, p_infrastructure_id, p_game_id);
    RETURN QUERY SELECT true, 'Infrastructure deactivated'::TEXT, false;
  ELSE
    RETURN QUERY SELECT true, 'Already in target status'::TEXT, v_current_status;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION toggle_infrastructure_status(UUID, UUID, BOOLEAN) IS 'Activates/deactivates infrastructure; starter infra cannot be deactivated.';
