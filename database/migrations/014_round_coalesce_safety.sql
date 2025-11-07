-- Safety: ensure game exists and coalesce current_round to 0 in key RPCs

BEGIN;

-- build_infrastructure: ensure game and coalesce round
CREATE OR REPLACE FUNCTION build_infrastructure(
  p_game_id UUID,
  p_builder_id UUID,
  p_owner_id UUID,
  p_infrastructure_type TEXT,
  p_location TEXT
) RETURNS TABLE (success BOOLEAN, message TEXT, infrastructure_id UUID, new_ev INTEGER) AS $$
DECLARE
  v_infra_def_id UUID;
  v_cost INTEGER;
  v_builder_ev INTEGER;
  v_builder_name TEXT;
  v_owner_name TEXT;
  v_current_round INTEGER;
  v_new_infrastructure_id UUID;
BEGIN
  PERFORM ensure_game(p_game_id);
  SELECT COALESCE(current_round, 0) INTO v_current_round FROM game_state WHERE game_id = p_game_id ORDER BY updated_at DESC LIMIT 1;

  SELECT id, cost INTO v_infra_def_id, v_cost FROM infrastructure_definitions WHERE type = p_infrastructure_type AND is_starter = false;
  IF v_infra_def_id IS NULL THEN
    RETURN QUERY SELECT false, 'Infrastructure type not found or is starter infrastructure'::TEXT, NULL::UUID, NULL::INTEGER; RETURN;
  END IF;

  SELECT ev, name INTO v_builder_ev, v_builder_name FROM players WHERE id = p_builder_id AND game_id = p_game_id;
  SELECT name INTO v_owner_name FROM players WHERE id = p_owner_id AND game_id = p_game_id;
  IF v_builder_ev IS NULL THEN
    RETURN QUERY SELECT false, 'Builder not in game'::TEXT, NULL::UUID, NULL::INTEGER; RETURN;
  END IF;

  IF v_builder_ev < v_cost THEN
    RETURN QUERY SELECT false, format('Insufficient EV. Required: %s, Available: %s', v_cost, v_builder_ev)::TEXT, NULL::UUID, v_builder_ev; RETURN;
  END IF;

  UPDATE players SET ev = ev - v_cost WHERE id = p_builder_id AND game_id = p_game_id;

  INSERT INTO player_infrastructure (player_id, infrastructure_id, location, is_active, is_powered, is_crewed, is_starter, game_id)
  VALUES (p_owner_id, v_infra_def_id, p_location, false, false, false, false, p_game_id)
  RETURNING id INTO v_new_infrastructure_id;

  INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, infrastructure_id, metadata, game_id)
  VALUES (p_builder_id, v_builder_name, v_current_round, 'BUILD_INFRASTRUCTURE', v_cost, -v_cost, 0, format('Built %s at %s for %s', p_infrastructure_type, p_location, v_owner_name), true, v_new_infrastructure_id, json_build_object('builder_id', p_builder_id, 'owner_id', p_owner_id, 'infrastructure_type', p_infrastructure_type, 'location', p_location), p_game_id);

  RETURN QUERY SELECT true, 'Infrastructure built successfully'::TEXT, v_new_infrastructure_id, (v_builder_ev - v_cost);
END;
$$ LANGUAGE plpgsql;

-- toggle_infrastructure_status: ensure game and coalesce round
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
BEGIN
  PERFORM ensure_game(p_game_id);
  SELECT COALESCE(current_round, 0) INTO v_current_round FROM game_state WHERE game_id = p_game_id ORDER BY updated_at DESC LIMIT 1;

  SELECT pi.player_id, pi.is_active, idef.power_requirement, idef.crew_requirement, idef.type, p.name
    INTO v_player_id, v_current_status, v_power_req, v_crew_req, v_infra_type, v_player_name
    FROM player_infrastructure pi
    JOIN infrastructure_definitions idef ON pi.infrastructure_id = idef.id
    JOIN players p ON pi.player_id = p.id
    WHERE pi.id = p_infrastructure_id AND pi.game_id = p_game_id;
  IF v_player_id IS NULL THEN
    RETURN QUERY SELECT false, 'Infrastructure not found'::TEXT, false; RETURN;
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

-- create_contract: ensure game and coalesce round
CREATE OR REPLACE FUNCTION create_contract(
  p_game_id UUID,
  p_party_a_id UUID,
  p_party_b_id UUID,
  p_ev_from_a_to_b INTEGER DEFAULT 0,
  p_ev_from_b_to_a INTEGER DEFAULT 0,
  p_ev_is_per_round BOOLEAN DEFAULT false,
  p_power_from_a_to_b INTEGER DEFAULT 0,
  p_power_from_b_to_a INTEGER DEFAULT 0,
  p_crew_from_a_to_b INTEGER DEFAULT 0,
  p_crew_from_b_to_a INTEGER DEFAULT 0,
  p_duration_rounds INTEGER DEFAULT NULL
) RETURNS TABLE (success BOOLEAN, message TEXT, contract_id UUID) AS $$
DECLARE
  v_current_round INTEGER;
  v_new_contract_id UUID;
  v_party_a_name TEXT;
  v_party_b_name TEXT;
  v_party_a_ev INTEGER;
  v_party_b_ev INTEGER;
BEGIN
  PERFORM ensure_game(p_game_id);
  SELECT COALESCE(current_round, 0) INTO v_current_round FROM game_state WHERE game_id = p_game_id ORDER BY updated_at DESC LIMIT 1;
  SELECT name, ev INTO v_party_a_name, v_party_a_ev FROM players WHERE id = p_party_a_id AND game_id = p_game_id;
  SELECT name, ev INTO v_party_b_name, v_party_b_ev FROM players WHERE id = p_party_b_id AND game_id = p_game_id;

  INSERT INTO contracts (party_a_id, party_b_id, ev_from_a_to_b, ev_from_b_to_a, ev_is_per_round, power_from_a_to_b, power_from_b_to_a, crew_from_a_to_b, crew_from_b_to_a, duration_rounds, rounds_remaining, status, created_in_round, game_id)
  VALUES (p_party_a_id, p_party_b_id, p_ev_from_a_to_b, p_ev_from_b_to_a, p_ev_is_per_round, p_power_from_a_to_b, p_power_from_b_to_a, p_crew_from_a_to_b, p_crew_from_b_to_a, p_duration_rounds, p_duration_rounds, 'active', v_current_round, p_game_id)
  RETURNING id INTO v_new_contract_id;

  IF p_ev_is_per_round = false THEN
    IF p_ev_from_a_to_b > 0 THEN
      UPDATE players SET ev = ev - p_ev_from_a_to_b WHERE id = p_party_a_id AND game_id = p_game_id;
      UPDATE players SET ev = ev + p_ev_from_a_to_b WHERE id = p_party_b_id AND game_id = p_game_id;
      INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, contract_id, game_id)
      VALUES (p_party_a_id, v_party_a_name, v_current_round, 'CONTRACT_PAYMENT', p_ev_from_a_to_b, -p_ev_from_a_to_b, 0, format('One-time payment to %s via contract', v_party_b_name), true, v_new_contract_id, p_game_id);
      INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, contract_id, game_id)
      VALUES (p_party_b_id, v_party_b_name, v_current_round, 'CONTRACT_PAYMENT', p_ev_from_a_to_b, p_ev_from_a_to_b, 0, format('One-time payment from %s via contract', v_party_a_name), true, v_new_contract_id, p_game_id);
    END IF;
    IF p_ev_from_b_to_a > 0 THEN
      UPDATE players SET ev = ev - p_ev_from_b_to_a WHERE id = p_party_b_id AND game_id = p_game_id;
      UPDATE players SET ev = ev + p_ev_from_b_to_a WHERE id = p_party_a_id AND game_id = p_game_id;
      INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, contract_id, game_id)
      VALUES (p_party_b_id, v_party_b_name, v_current_round, 'CONTRACT_PAYMENT', p_ev_from_b_to_a, -p_ev_from_b_to_a, 0, format('One-time payment to %s via contract', v_party_a_name), true, v_new_contract_id, p_game_id);
      INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, contract_id, game_id)
      VALUES (p_party_a_id, v_party_a_name, v_current_round, 'CONTRACT_PAYMENT', p_ev_from_b_to_a, p_ev_from_b_to_a, 0, format('One-time payment from %s via contract', v_party_b_name), true, v_new_contract_id, p_game_id);
    END IF;
  END IF;

  INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, contract_id, game_id)
  VALUES (NULL, NULL, v_current_round, 'CONTRACT_CREATED', 0, 0, 0, format('Contract created between %s and %s', v_party_a_name, v_party_b_name), true, v_new_contract_id, p_game_id);

  RETURN QUERY SELECT true, 'Contract created successfully'::TEXT, v_new_contract_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;
