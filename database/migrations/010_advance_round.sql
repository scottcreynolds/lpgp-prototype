-- Lunar Policy Gaming Platform - Advance Round and Round-End Aggregation
-- Version 0.1
-- Adds advance_round RPC and updates process_round_end to roll up maintenance per player

-- ============================================================================
-- REPLACE: process_round_end()
-- ============================================================================
CREATE OR REPLACE FUNCTION process_round_end()
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
BEGIN
  -- Current round
  SELECT current_round INTO v_current_round FROM game_state WHERE id = 1;

  -- 1) Maintenance (rolled-up per player for active, non-starter infra)
  FOR v_rec IN
    SELECT pi.player_id,
           p.name AS player_name,
           SUM(idf.maintenance_cost) AS total_maintenance
    FROM player_infrastructure pi
    JOIN infrastructure_definitions idf ON idf.id = pi.infrastructure_id
    JOIN players p ON p.id = pi.player_id
    WHERE pi.is_active = true
      AND pi.is_starter = false
      AND idf.maintenance_cost > 0
    GROUP BY pi.player_id, p.name
  LOOP
    -- Deduct rolled-up maintenance from player
    UPDATE players SET ev = ev - v_rec.total_maintenance WHERE id = v_rec.player_id;

    -- Ledger: one entry per player
    INSERT INTO ledger_entries (
      player_id, player_name, round, transaction_type, amount,
      ev_change, rep_change, reason, processed
    ) VALUES (
      v_rec.player_id,
      v_rec.player_name,
      v_current_round,
      'MAINTENANCE',
      v_rec.total_maintenance,
      -v_rec.total_maintenance,
      0,
      format('Round %s Maintenance', v_current_round),
      true
    );

    v_total_maintenance := v_total_maintenance + v_rec.total_maintenance;
  END LOOP;

  -- 2) Yields (unchanged)
  FOR v_rec IN
    SELECT pi.player_id,
           p.name AS player_name,
           idf.type,
           idf.yield
    FROM player_infrastructure pi
    JOIN infrastructure_definitions idf ON idf.id = pi.infrastructure_id
    JOIN players p ON p.id = pi.player_id
    WHERE pi.is_active = true
      AND idf.yield IS NOT NULL
      AND idf.yield > 0
  LOOP
    UPDATE players SET ev = ev + v_rec.yield WHERE id = v_rec.player_id;

    INSERT INTO ledger_entries (
      player_id, player_name, round, transaction_type, amount,
      ev_change, rep_change, reason, processed
    ) VALUES (
      v_rec.player_id,
      v_rec.player_name,
      v_current_round,
      'YIELD',
      v_rec.yield,
      v_rec.yield,
      0,
      format('Yield from %s', v_rec.type),
      true
    );

    v_total_yields := v_total_yields + v_rec.yield;
  END LOOP;

  -- 3) Per-round contract payments (double-entry)
  FOR v_rec IN
    SELECT c.id AS contract_id,
           c.party_a_id,
           c.party_b_id,
           pa.name AS party_a_name,
           pb.name AS party_b_name,
           c.ev_from_a_to_b,
           c.ev_from_b_to_a
    FROM contracts c
    JOIN players pa ON pa.id = c.party_a_id
    JOIN players pb ON pb.id = c.party_b_id
    WHERE c.status = 'active'
      AND c.ev_is_per_round = true
      AND (c.ev_from_a_to_b > 0 OR c.ev_from_b_to_a > 0)
  LOOP
    IF v_rec.ev_from_a_to_b > 0 THEN
      UPDATE players SET ev = ev - v_rec.ev_from_a_to_b WHERE id = v_rec.party_a_id;
      UPDATE players SET ev = ev + v_rec.ev_from_a_to_b WHERE id = v_rec.party_b_id;

      INSERT INTO ledger_entries (
        player_id, player_name, round, transaction_type, amount,
        ev_change, rep_change, reason, processed, contract_id
      ) VALUES (
        v_rec.party_a_id, v_rec.party_a_name, v_current_round, 'CONTRACT_PAYMENT',
        v_rec.ev_from_a_to_b, -v_rec.ev_from_a_to_b, 0,
        format('Round %s contract payment: %s → %s', v_current_round, v_rec.party_a_name, v_rec.party_b_name),
        true, v_rec.contract_id
      );

      INSERT INTO ledger_entries (
        player_id, player_name, round, transaction_type, amount,
        ev_change, rep_change, reason, processed, contract_id
      ) VALUES (
        v_rec.party_b_id, v_rec.party_b_name, v_current_round, 'CONTRACT_PAYMENT',
        v_rec.ev_from_a_to_b, v_rec.ev_from_a_to_b, 0,
        format('Round %s contract payment: %s → %s', v_current_round, v_rec.party_a_name, v_rec.party_b_name),
        true, v_rec.contract_id
      );

      v_total_contract_payments := v_total_contract_payments + v_rec.ev_from_a_to_b;
    END IF;

    IF v_rec.ev_from_b_to_a > 0 THEN
      UPDATE players SET ev = ev - v_rec.ev_from_b_to_a WHERE id = v_rec.party_b_id;
      UPDATE players SET ev = ev + v_rec.ev_from_b_to_a WHERE id = v_rec.party_a_id;

      INSERT INTO ledger_entries (
        player_id, player_name, round, transaction_type, amount,
        ev_change, rep_change, reason, processed, contract_id
      ) VALUES (
        v_rec.party_b_id, v_rec.party_b_name, v_current_round, 'CONTRACT_PAYMENT',
        v_rec.ev_from_b_to_a, -v_rec.ev_from_b_to_a, 0,
        format('Round %s contract payment: %s → %s', v_current_round, v_rec.party_b_name, v_rec.party_a_name),
        true, v_rec.contract_id
      );

      INSERT INTO ledger_entries (
        player_id, player_name, round, transaction_type, amount,
        ev_change, rep_change, reason, processed, contract_id
      ) VALUES (
        v_rec.party_a_id, v_rec.party_a_name, v_current_round, 'CONTRACT_PAYMENT',
        v_rec.ev_from_b_to_a, v_rec.ev_from_b_to_a, 0,
        format('Round %s contract payment: %s → %s', v_current_round, v_rec.party_b_name, v_rec.party_a_name),
        true, v_rec.contract_id
      );

      v_total_contract_payments := v_total_contract_payments + v_rec.ev_from_b_to_a;
    END IF;
  END LOOP;

  -- 4) Decrement finite contracts
  UPDATE contracts
  SET rounds_remaining = rounds_remaining - 1
  WHERE status = 'active' AND rounds_remaining IS NOT NULL;

  -- 5) Auto-expire contracts
  FOR v_rec IN
    SELECT c.id AS contract_id,
           c.party_a_id,
           c.party_b_id,
           pa.name AS party_a_name,
           pb.name AS party_b_name
    FROM contracts c
    JOIN players pa ON pa.id = c.party_a_id
    JOIN players pb ON pb.id = c.party_b_id
    WHERE c.status = 'active'
      AND c.rounds_remaining IS NOT NULL
      AND c.rounds_remaining <= 0
  LOOP
    UPDATE contracts
    SET status = 'ended', ended_in_round = v_current_round, reason_for_ending = 'Duration expired'
    WHERE id = v_rec.contract_id;

    INSERT INTO ledger_entries (
      player_id, player_name, round, transaction_type, amount,
      ev_change, rep_change, reason, processed, contract_id
    ) VALUES (
      v_rec.party_a_id, v_rec.party_a_name, v_current_round, 'CONTRACT_ENDED',
      0, 0, 0, format('Contract with %s expired', v_rec.party_b_name), true, v_rec.contract_id
    );

    INSERT INTO ledger_entries (
      player_id, player_name, round, transaction_type, amount,
      ev_change, rep_change, reason, processed, contract_id
    ) VALUES (
      v_rec.party_b_id, v_rec.party_b_name, v_current_round, 'CONTRACT_ENDED',
      0, 0, 0, format('Contract with %s expired', v_rec.party_a_name), true, v_rec.contract_id
    );

    v_contracts_expired := v_contracts_expired + 1;
  END LOOP;

  -- 6) Return summary
  RETURN QUERY SELECT
    true,
    'Round end processing completed'::TEXT,
    jsonb_build_object(
      'round', v_current_round,
      'total_maintenance', v_total_maintenance,
      'total_yields', v_total_yields,
      'total_contract_payments', v_total_contract_payments,
      'contracts_expired', v_contracts_expired
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION process_round_end IS 'Processes end-of-round: rolled-up maintenance, yields, contract payments, and expirations';

-- ============================================================================
-- NEW: advance_round(current_version)
-- ============================================================================
CREATE OR REPLACE FUNCTION advance_round(current_version INTEGER)
RETURNS TABLE (
  success BOOLEAN,
  new_round INTEGER,
  new_phase TEXT,
  new_version INTEGER,
  message TEXT
) AS $$
DECLARE
  v_current_round INTEGER;
  v_current_phase TEXT;
  v_stored_version INTEGER;
  v_new_round INTEGER;
  v_new_phase TEXT := 'Governance';
BEGIN
  -- Lock game_state
  SELECT current_round, current_phase, version
  INTO v_current_round, v_current_phase, v_stored_version
  FROM game_state WHERE id = 1 FOR UPDATE;

  IF v_stored_version != current_version THEN
    RETURN QUERY SELECT false, v_current_round, v_current_phase, v_stored_version,
      'Version mismatch - another update occurred'::TEXT;
    RETURN;
  END IF;

  IF v_current_phase != 'Operations' THEN
    RETURN QUERY SELECT false, v_current_round, v_current_phase, v_stored_version,
      'Advance Round is only allowed from Operations phase'::TEXT;
    RETURN;
  END IF;

  -- Run end-of-round processing for current round
  PERFORM * FROM process_round_end();

  -- Mark any remaining unprocessed entries for this round as processed
  UPDATE ledger_entries SET processed = true
  WHERE processed = false AND round = v_current_round;

  -- Advance round and phase, bump version
  v_new_round := v_current_round + 1;

  UPDATE game_state
  SET current_round = v_new_round,
      current_phase = v_new_phase,
      version = version + 1,
      updated_at = NOW()
  WHERE id = 1;

  RETURN QUERY SELECT true, v_new_round, v_new_phase, v_stored_version + 1,
    'Advanced to next round Governance'::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION advance_round IS 'Processes round end and advances to next round Governance with optimistic locking';
