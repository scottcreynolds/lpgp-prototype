-- LPGP - Conditional auto-activation for extractors when capacity permits
-- Version 0.1
-- Date: 2025-11-10
-- Enhances build_infrastructure to auto-activate eligible infrastructure (Solar Array, Habitat, and
-- any extractor with satisfied crew/power requirements) immediately upon build.
-- Previously only Solar Array and Habitat auto-activated unconditionally.
-- Now: Resource extraction infrastructure (e.g., H2O Extractor, Helium-3 Extractor) will start active
-- if both power and crew capacity are sufficient at build time.

CREATE OR REPLACE FUNCTION build_infrastructure(
  p_game_id UUID,
  p_builder_id UUID,
  p_owner_id UUID,
  p_infrastructure_type TEXT,
  p_location TEXT
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  infrastructure_id UUID,
  new_ev INTEGER
) AS $$
DECLARE
  v_infra_def_id UUID;
  v_cost INTEGER;
  v_builder_ev INTEGER;
  v_builder_name TEXT;
  v_builder_spec TEXT;
  v_owner_name TEXT;
  v_current_round INTEGER;
  v_new_infrastructure_id UUID;
  v_should_auto_activate BOOLEAN := false;
  v_can_be_operated_by TEXT[];
  v_player_buildable BOOLEAN := true;
  v_power_req INTEGER;
  v_crew_req INTEGER;
  v_available_power INTEGER;
  v_available_crew INTEGER;
BEGIN
  -- Resolve current round
  SELECT current_round INTO v_current_round
  FROM game_state
  WHERE game_id = p_game_id
  ORDER BY updated_at DESC
  LIMIT 1;

  -- Get infra definition & permissions & requirements
  SELECT id, cost, can_be_operated_by, player_buildable, power_requirement, crew_requirement
    INTO v_infra_def_id, v_cost, v_can_be_operated_by, v_player_buildable, v_power_req, v_crew_req
  FROM infrastructure_definitions
  WHERE type = p_infrastructure_type AND is_starter = false;

  IF v_infra_def_id IS NULL THEN
    RETURN QUERY SELECT false, 'Infrastructure type not found or is starter infrastructure'::TEXT, NULL::UUID, NULL::INTEGER; RETURN;
  END IF;

  -- Builder info
  SELECT ev, name, specialization::TEXT INTO v_builder_ev, v_builder_name, v_builder_spec
  FROM players WHERE id = p_builder_id AND game_id = p_game_id;
  SELECT name INTO v_owner_name FROM players WHERE id = p_owner_id AND game_id = p_game_id;

  IF v_builder_ev IS NULL THEN
    RETURN QUERY SELECT false, 'Builder not in game'::TEXT, NULL::UUID, NULL::INTEGER; RETURN;
  END IF;

  -- Enforce player_buildable flag
  IF NOT v_player_buildable THEN
    RETURN QUERY SELECT false, 'This infrastructure cannot be built by players'::TEXT, NULL::UUID, v_builder_ev; RETURN;
  END IF;

  -- Specialization permission (reuse can_be_operated_by for build)
  IF v_can_be_operated_by IS NULL OR NOT (v_builder_spec = ANY (v_can_be_operated_by)) THEN
    RETURN QUERY SELECT false, 'Your specialization cannot build this infrastructure'::TEXT, NULL::UUID, v_builder_ev; RETURN;
  END IF;

  -- Affordability
  IF v_builder_ev < v_cost THEN
    RETURN QUERY SELECT false, format('Insufficient EV. Required: %s, Available: %s', v_cost, v_builder_ev)::TEXT, NULL::UUID, v_builder_ev; RETURN;
  END IF;

  -- Deduct cost
  UPDATE players SET ev = ev - v_cost WHERE id = p_builder_id AND game_id = p_game_id;

  -- Activation logic:
  -- Solar Array & Habitat always auto-activate (capacity providers / habitation)
  -- Other infra (e.g. extractors) auto-activate only if requirements are satisfied at build time.
  IF p_infrastructure_type IN ('Solar Array', 'Habitat') THEN
    v_should_auto_activate := true;
  ELSE
    -- Check available capacities before activation attempt
    SELECT get_available_power(p_owner_id), get_available_crew(p_owner_id)
      INTO v_available_power, v_available_crew;
    IF (v_power_req IS NULL OR v_available_power >= v_power_req)
       AND (v_crew_req IS NULL OR v_available_crew >= v_crew_req) THEN
      v_should_auto_activate := true;
    END IF;
  END IF;

  -- Insert infrastructure with activation state determined above
  INSERT INTO player_infrastructure (
    player_id, infrastructure_id, location, is_active, is_powered, is_crewed, is_starter, game_id
  ) VALUES (
    p_owner_id,
    v_infra_def_id,
    p_location,
    v_should_auto_activate,
    v_should_auto_activate,
    v_should_auto_activate,
    false,
    p_game_id
  ) RETURNING id INTO v_new_infrastructure_id;

  -- Ledger: build entry
  INSERT INTO ledger_entries (
    player_id, player_name, round, transaction_type, amount,
    ev_change, rep_change, reason, processed, infrastructure_id, metadata, game_id
  ) VALUES (
    p_builder_id, v_builder_name, v_current_round, 'BUILD_INFRASTRUCTURE', v_cost,
    -v_cost, 0, format('Built %s%s for %s', p_infrastructure_type, CASE WHEN p_location IS NULL THEN '' ELSE format(' at %s', p_location) END, v_owner_name), true,
    v_new_infrastructure_id,
    json_build_object('builder_id', p_builder_id, 'owner_id', p_owner_id, 'infrastructure_type', p_infrastructure_type, 'location', p_location),
    p_game_id
  );

  -- Optional activation ledger entry
  IF v_should_auto_activate THEN
    INSERT INTO ledger_entries (
      player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, infrastructure_id, game_id
    ) VALUES (
      p_owner_id,
      v_owner_name,
      v_current_round,
      'INFRASTRUCTURE_ACTIVATED',
      0, 0, 0,
      format('Auto-activated %s on build', p_infrastructure_type),
      true,
      v_new_infrastructure_id,
      p_game_id
    );
  END IF;

  RETURN QUERY SELECT true, 'Infrastructure built successfully'::TEXT, v_new_infrastructure_id, (v_builder_ev - v_cost);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION build_infrastructure(uuid, uuid, uuid, text, text) IS 'Builds infrastructure; auto-activates Solar Array & Habitat always; other infra activates if crew/power requirements satisfied.';
