-- LPGP - Auto-activation for Solar Arrays and Habitats, and end-of-round auto-deactivation
-- Version 0.1
-- This migration updates scoped RPCs to:
-- 1) Auto-activate Solar Array and Habitat on build
-- 2) Before round-end processing, auto-deactivate Solar Arrays/Habitats that cannot meet crew/power requirements

-- ============================================================================
-- BUILD INFRASTRUCTURE (scoped) - auto-activate Solar Array & Habitat
-- ============================================================================
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
  v_owner_name TEXT;
  v_current_round INTEGER;
  v_new_infrastructure_id UUID;
  v_should_auto_activate BOOLEAN := false;
BEGIN
  -- Get current round for this game
  SELECT current_round INTO v_current_round
  FROM game_state
  WHERE game_id = p_game_id
  ORDER BY updated_at DESC
  LIMIT 1;

  -- Get infra definition & cost
  SELECT id, cost INTO v_infra_def_id, v_cost
  FROM infrastructure_definitions
  WHERE type = p_infrastructure_type AND is_starter = false;

  IF v_infra_def_id IS NULL THEN
    RETURN QUERY SELECT false, 'Infrastructure type not found or is starter infrastructure'::TEXT, NULL::UUID, NULL::INTEGER;
    RETURN;
  END IF;

  -- Get builder EV and names
  SELECT ev, name INTO v_builder_ev, v_builder_name
  FROM players WHERE id = p_builder_id AND game_id = p_game_id;
  SELECT name INTO v_owner_name FROM players WHERE id = p_owner_id AND game_id = p_game_id;

  IF v_builder_ev IS NULL THEN
    RETURN QUERY SELECT false, 'Builder not in game'::TEXT, NULL::UUID, NULL::INTEGER;
    RETURN;
  END IF;

  IF v_builder_ev < v_cost THEN
    RETURN QUERY SELECT false, format('Insufficient EV. Required: %s, Available: %s', v_cost, v_builder_ev)::TEXT, NULL::UUID, v_builder_ev;
    RETURN;
  END IF;

  -- Deduct cost
  UPDATE players SET ev = ev - v_cost WHERE id = p_builder_id AND game_id = p_game_id;

  -- Determine if should auto-activate on build
  v_should_auto_activate := p_infrastructure_type IN ('Solar Array', 'Habitat');

  -- Insert infrastructure; auto-activate only Solar Array/Habitat
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
    -v_cost, 0, format('Built %s at %s for %s', p_infrastructure_type, p_location, v_owner_name), true,
    v_new_infrastructure_id,
    json_build_object('builder_id', p_builder_id, 'owner_id', p_owner_id, 'infrastructure_type', p_infrastructure_type, 'location', p_location),
    p_game_id
  );

  -- If auto-activated, add activation ledger entry for clarity
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

COMMENT ON FUNCTION build_infrastructure(uuid, uuid, uuid, text, text) IS 'Builds infrastructure; auto-activates Solar Array and Habitat on build.';

-- ============================================================================
-- PROCESS ROUND END (scoped) - auto-deactivate unsupported Solar/Habitat first
-- ============================================================================
CREATE OR REPLACE FUNCTION process_round_end(p_game_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  summary JSONB
) AS $$
DECLARE
  v_current_round INTEGER;
  v_total_maintenance INTEGER := 0;
  v_total_yields INTEGER := 0;
  v_total_contract_payments INTEGER := 0;
  v_contracts_expired INTEGER := 0;
  v_rec RECORD;
  v_player RECORD;
  v_avail_power INTEGER;
  v_avail_crew INTEGER;
  v_pi RECORD;
BEGIN
  -- Current round
  SELECT current_round INTO v_current_round FROM game_state WHERE game_id = p_game_id ORDER BY updated_at DESC LIMIT 1;

  -- 0) Auto-deactivate Solar Arrays/Habitats if insufficient crew/power
  FOR v_player IN SELECT id, name FROM players WHERE game_id = p_game_id LOOP
    -- Resolve crew shortages by deactivating Solar Arrays/Habitats (most recently built first)
    LOOP
      SELECT get_available_crew(v_player.id) INTO v_avail_crew;
      EXIT WHEN v_avail_crew >= 0;

      SELECT pi.id, idf.type
      INTO v_pi
      FROM player_infrastructure pi
      JOIN infrastructure_definitions idf ON idf.id = pi.infrastructure_id
      WHERE pi.player_id = v_player.id
        AND pi.game_id = p_game_id
        AND pi.is_active = true
        AND pi.is_starter = false
        AND idf.crew_requirement IS NOT NULL
        AND idf.type IN ('Solar Array', 'Habitat')
      ORDER BY pi.created_at DESC
      LIMIT 1;

      EXIT WHEN v_pi.id IS NULL; -- nothing eligible

      UPDATE player_infrastructure
      SET is_active = false, is_powered = false, is_crewed = false
      WHERE id = v_pi.id AND game_id = p_game_id;

      INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, infrastructure_id, game_id)
      VALUES (v_player.id, v_player.name, v_current_round, 'INFRASTRUCTURE_DEACTIVATED', 0, 0, 0, format('Auto-deactivated %s due to insufficient crew', v_pi.type), true, v_pi.id, p_game_id);
    END LOOP;

    -- Resolve power shortages by deactivating Habitats (most recently built first)
    LOOP
      SELECT get_available_power(v_player.id) INTO v_avail_power;
      EXIT WHEN v_avail_power >= 0;

      SELECT pi.id, idf.type
      INTO v_pi
      FROM player_infrastructure pi
      JOIN infrastructure_definitions idf ON idf.id = pi.infrastructure_id
      WHERE pi.player_id = v_player.id
        AND pi.game_id = p_game_id
        AND pi.is_active = true
        AND pi.is_starter = false
        AND idf.power_requirement IS NOT NULL
        AND idf.type = 'Habitat'
      ORDER BY pi.created_at DESC
      LIMIT 1;

      EXIT WHEN v_pi.id IS NULL; -- nothing eligible

      UPDATE player_infrastructure
      SET is_active = false, is_powered = false, is_crewed = false
      WHERE id = v_pi.id AND game_id = p_game_id;

      INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, infrastructure_id, game_id)
      VALUES (v_player.id, v_player.name, v_current_round, 'INFRASTRUCTURE_DEACTIVATED', 0, 0, 0, format('Auto-deactivated %s due to insufficient power', v_pi.type), true, v_pi.id, p_game_id);
    END LOOP;
  END LOOP;

  -- 1) Maintenance (rolled-up per player for active, non-starter infra)
  FOR v_rec IN
    SELECT pi.player_id, p.name AS player_name, SUM(idf.maintenance_cost) AS total_maintenance
    FROM player_infrastructure pi
    JOIN infrastructure_definitions idf ON idf.id = pi.infrastructure_id
    JOIN players p ON p.id = pi.player_id
    WHERE pi.is_active = true AND pi.is_starter = false AND idf.maintenance_cost > 0 AND pi.game_id = p_game_id
    GROUP BY pi.player_id, p.name
  LOOP
    UPDATE players SET ev = ev - v_rec.total_maintenance WHERE id = v_rec.player_id AND game_id = p_game_id;
    INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, game_id)
    VALUES (v_rec.player_id, v_rec.player_name, v_current_round, 'MAINTENANCE', v_rec.total_maintenance, -v_rec.total_maintenance, 0, format('Round %s Maintenance', v_current_round), true, p_game_id);
    v_total_maintenance := v_total_maintenance + v_rec.total_maintenance;
  END LOOP;

  -- 2) Yields
  FOR v_rec IN
    SELECT pi.player_id, p.name AS player_name, idf.type, idf.yield
    FROM player_infrastructure pi
    JOIN infrastructure_definitions idf ON idf.id = pi.infrastructure_id
    JOIN players p ON p.id = pi.player_id
    WHERE pi.is_active = true AND idf.yield IS NOT NULL AND idf.yield > 0 AND pi.game_id = p_game_id
  LOOP
    UPDATE players SET ev = ev + v_rec.yield WHERE id = v_rec.player_id AND game_id = p_game_id;
    INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, game_id)
    VALUES (v_rec.player_id, v_rec.player_name, v_current_round, 'YIELD', v_rec.yield, v_rec.yield, 0, format('Yield from %s', v_rec.type), true, p_game_id);
    v_total_yields := v_total_yields + v_rec.yield;
  END LOOP;

  -- 3) Per-round contract payments
  FOR v_rec IN
    SELECT c.id AS contract_id, c.party_a_id, c.party_b_id, pa.name AS party_a_name, pb.name AS party_b_name, c.ev_from_a_to_b, c.ev_from_b_to_a
    FROM contracts c
    JOIN players pa ON pa.id = c.party_a_id
    JOIN players pb ON pb.id = c.party_b_id
    WHERE c.status = 'active' AND c.ev_is_per_round = true AND (c.ev_from_a_to_b > 0 OR c.ev_from_b_to_a > 0) AND c.game_id = p_game_id
  LOOP
    IF v_rec.ev_from_a_to_b > 0 THEN
      UPDATE players SET ev = ev - v_rec.ev_from_a_to_b WHERE id = v_rec.party_a_id AND game_id = p_game_id;
      UPDATE players SET ev = ev + v_rec.ev_from_a_to_b WHERE id = v_rec.party_b_id AND game_id = p_game_id;
      INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, contract_id, game_id)
      VALUES (v_rec.party_a_id, v_rec.party_a_name, v_current_round, 'CONTRACT_PAYMENT', v_rec.ev_from_a_to_b, -v_rec.ev_from_a_to_b, 0, format('Round %s contract payment: %s → %s', v_current_round, v_rec.party_a_name, v_rec.party_b_name), true, v_rec.contract_id, p_game_id);
      INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, contract_id, game_id)
      VALUES (v_rec.party_b_id, v_rec.party_b_name, v_current_round, 'CONTRACT_PAYMENT', v_rec.ev_from_a_to_b, v_rec.ev_from_a_to_b, 0, format('Round %s contract payment: %s → %s', v_current_round, v_rec.party_a_name, v_rec.party_b_name), true, v_rec.contract_id, p_game_id);
      v_total_contract_payments := v_total_contract_payments + v_rec.ev_from_a_to_b;
    END IF;
    IF v_rec.ev_from_b_to_a > 0 THEN
      UPDATE players SET ev = ev - v_rec.ev_from_b_to_a WHERE id = v_rec.party_b_id AND game_id = p_game_id;
      UPDATE players SET ev = ev + v_rec.ev_from_b_to_a WHERE id = v_rec.party_a_id AND game_id = p_game_id;
      INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, contract_id, game_id)
      VALUES (v_rec.party_b_id, v_rec.party_b_name, v_current_round, 'CONTRACT_PAYMENT', v_rec.ev_from_b_to_a, -v_rec.ev_from_b_to_a, 0, format('Round %s contract payment: %s → %s', v_current_round, v_rec.party_b_name, v_rec.party_a_name), true, v_rec.contract_id, p_game_id);
      INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, contract_id, game_id)
      VALUES (v_rec.party_a_id, v_rec.party_a_name, v_current_round, 'CONTRACT_PAYMENT', v_rec.ev_from_b_to_a, v_rec.ev_from_b_to_a, 0, format('Round %s contract payment: %s → %s', v_current_round, v_rec.party_b_name, v_rec.party_a_name), true, v_rec.contract_id, p_game_id);
      v_total_contract_payments := v_total_contract_payments + v_rec.ev_from_b_to_a;
    END IF;
  END LOOP;

  -- 4) Decrement finite contracts
  UPDATE contracts SET rounds_remaining = rounds_remaining - 1 WHERE status = 'active' AND rounds_remaining IS NOT NULL AND game_id = p_game_id;

  -- 5) Auto-expire contracts
  FOR v_rec IN
    SELECT c.id AS contract_id, c.party_a_id, c.party_b_id, pa.name AS party_a_name, pb.name AS party_b_name
    FROM contracts c
    JOIN players pa ON pa.id = c.party_a_id
    JOIN players pb ON pb.id = c.party_b_id
    WHERE c.status = 'active' AND c.rounds_remaining IS NOT NULL AND c.rounds_remaining <= 0 AND c.game_id = p_game_id
  LOOP
    UPDATE contracts SET status = 'ended', ended_in_round = v_current_round, reason_for_ending = 'Duration expired' WHERE id = v_rec.contract_id AND game_id = p_game_id;
    INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, contract_id, game_id)
    VALUES (v_rec.party_a_id, v_rec.party_a_name, v_current_round, 'CONTRACT_ENDED', 0, 0, 0, format('Contract with %s expired', v_rec.party_b_name), true, v_rec.contract_id, p_game_id);
    INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, contract_id, game_id)
    VALUES (v_rec.party_b_id, v_rec.party_b_name, v_current_round, 'CONTRACT_ENDED', 0, 0, 0, format('Contract with %s expired', v_rec.party_a_name), true, v_rec.contract_id, p_game_id);
    v_contracts_expired := v_contracts_expired + 1;
  END LOOP;

  -- 6) Return summary
  RETURN QUERY SELECT true, 'Round end processing completed'::TEXT,
    jsonb_build_object(
      'round', v_current_round,
      'total_maintenance', v_total_maintenance,
      'total_yields', v_total_yields,
      'total_contract_payments', v_total_contract_payments,
      'contracts_expired', v_contracts_expired
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION process_round_end(uuid) IS 'Processes end-of-round; first auto-deactivates unsupported Solar Arrays/Habitats, then maintenance, yields, and contracts.';
