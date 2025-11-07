-- LPGP - Generic auto-deactivation before round end calculations
-- Version 0.1
-- Broadens auto-deactivation to ANY active, non-starter infrastructure that requires crew and/or power
-- when total available capacity is insufficient. This runs BEFORE maintenance and yields.

-- ============================================================================
-- REPLACE: process_round_end(p_game_id)
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

  -- 0) Auto-deactivate any unsupported infrastructure before financials
  FOR v_player IN SELECT id, name FROM players WHERE game_id = p_game_id LOOP
    -- Resolve crew shortages by deactivating any active, non-starter infra with crew requirements (newest first)
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
      ORDER BY pi.created_at DESC
      LIMIT 1;

      EXIT WHEN v_pi.id IS NULL; -- nothing eligible

      UPDATE player_infrastructure
      SET is_active = false, is_powered = false, is_crewed = false
      WHERE id = v_pi.id AND game_id = p_game_id;

      INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, infrastructure_id, game_id)
      VALUES (v_player.id, v_player.name, v_current_round, 'INFRASTRUCTURE_DEACTIVATED', 0, 0, 0, format('Auto-deactivated %s due to insufficient crew', v_pi.type), true, v_pi.id, p_game_id);
    END LOOP;

    -- Resolve power shortages by deactivating any active, non-starter infra with power requirements (newest first)
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

COMMENT ON FUNCTION process_round_end(uuid) IS 'Before financials, auto-deactivate any unsupported infrastructure (crew/power), then run maintenance, yields, and contracts.';
