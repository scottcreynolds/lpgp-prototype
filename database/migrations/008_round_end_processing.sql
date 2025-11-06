-- Lunar Policy Gaming Platform - Round End Processing
-- Version 0.2
-- Handles end-of-round calculations: maintenance, yields, contract payments

-- ============================================================================
-- PROCESS ROUND END
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
  v_player_record RECORD;
  v_contract_record RECORD;
  v_infra_record RECORD;
BEGIN
  -- Get current round
  SELECT current_round INTO v_current_round
  FROM game_state WHERE id = 1;

  -- ========================================================================
  -- 1. PROCESS MAINTENANCE COSTS
  -- ========================================================================
  FOR v_infra_record IN
    SELECT
      pi.player_id,
      p.name as player_name,
      idef.type,
      idef.maintenance_cost
    FROM player_infrastructure pi
    JOIN infrastructure_definitions idef ON pi.infrastructure_id = idef.id
    JOIN players p ON pi.player_id = p.id
    WHERE pi.is_active = true
      AND pi.is_starter = false
      AND idef.maintenance_cost > 0
  LOOP
    -- Deduct maintenance
    UPDATE players
    SET ev = ev - v_infra_record.maintenance_cost
    WHERE id = v_infra_record.player_id;

    -- Log to ledger
    INSERT INTO ledger_entries (
      player_id, player_name, round, transaction_type, amount,
      ev_change, rep_change, reason, processed
    )
    VALUES (
      v_infra_record.player_id,
      v_infra_record.player_name,
      v_current_round,
      'MAINTENANCE',
      v_infra_record.maintenance_cost,
      -v_infra_record.maintenance_cost,
      0,
      format('Maintenance for %s', v_infra_record.type),
      true
    );

    v_total_maintenance := v_total_maintenance + v_infra_record.maintenance_cost;
  END LOOP;

  -- ========================================================================
  -- 2. PROCESS YIELDS
  -- ========================================================================
  FOR v_infra_record IN
    SELECT
      pi.player_id,
      p.name as player_name,
      idef.type,
      idef.yield
    FROM player_infrastructure pi
    JOIN infrastructure_definitions idef ON pi.infrastructure_id = idef.id
    JOIN players p ON pi.player_id = p.id
    WHERE pi.is_active = true
      AND idef.yield IS NOT NULL
      AND idef.yield > 0
  LOOP
    -- Grant yield
    UPDATE players
    SET ev = ev + v_infra_record.yield
    WHERE id = v_infra_record.player_id;

    -- Log to ledger
    INSERT INTO ledger_entries (
      player_id, player_name, round, transaction_type, amount,
      ev_change, rep_change, reason, processed
    )
    VALUES (
      v_infra_record.player_id,
      v_infra_record.player_name,
      v_current_round,
      'YIELD',
      v_infra_record.yield,
      v_infra_record.yield,
      0,
      format('Yield from %s', v_infra_record.type),
      true
    );

    v_total_yields := v_total_yields + v_infra_record.yield;
  END LOOP;

  -- ========================================================================
  -- 3. PROCESS PER-ROUND CONTRACT PAYMENTS
  -- ========================================================================
  FOR v_contract_record IN
    SELECT
      c.id as contract_id,
      c.party_a_id,
      c.party_b_id,
      pa.name as party_a_name,
      pb.name as party_b_name,
      c.ev_from_a_to_b,
      c.ev_from_b_to_a
    FROM contracts c
    JOIN players pa ON c.party_a_id = pa.id
    JOIN players pb ON c.party_b_id = pb.id
    WHERE c.status = 'active'
      AND c.ev_is_per_round = true
      AND (c.ev_from_a_to_b > 0 OR c.ev_from_b_to_a > 0)
  LOOP
    -- Transfer from A to B
    IF v_contract_record.ev_from_a_to_b > 0 THEN
      UPDATE players
      SET ev = ev - v_contract_record.ev_from_a_to_b
      WHERE id = v_contract_record.party_a_id;

      UPDATE players
      SET ev = ev + v_contract_record.ev_from_a_to_b
      WHERE id = v_contract_record.party_b_id;

      -- Log for party A
      INSERT INTO ledger_entries (
        player_id, player_name, round, transaction_type, amount,
        ev_change, rep_change, reason, processed, contract_id
      )
      VALUES (
        v_contract_record.party_a_id,
        v_contract_record.party_a_name,
        v_current_round,
        'CONTRACT_PAYMENT',
        v_contract_record.ev_from_a_to_b,
        -v_contract_record.ev_from_a_to_b,
        0,
        format('Contract payment to %s', v_contract_record.party_b_name),
        true,
        v_contract_record.contract_id
      );

      -- Log for party B
      INSERT INTO ledger_entries (
        player_id, player_name, round, transaction_type, amount,
        ev_change, rep_change, reason, processed, contract_id
      )
      VALUES (
        v_contract_record.party_b_id,
        v_contract_record.party_b_name,
        v_current_round,
        'CONTRACT_PAYMENT',
        v_contract_record.ev_from_a_to_b,
        v_contract_record.ev_from_a_to_b,
        0,
        format('Contract payment from %s', v_contract_record.party_a_name),
        true,
        v_contract_record.contract_id
      );

      v_total_contract_payments := v_total_contract_payments + v_contract_record.ev_from_a_to_b;
    END IF;

    -- Transfer from B to A
    IF v_contract_record.ev_from_b_to_a > 0 THEN
      UPDATE players
      SET ev = ev - v_contract_record.ev_from_b_to_a
      WHERE id = v_contract_record.party_b_id;

      UPDATE players
      SET ev = ev + v_contract_record.ev_from_b_to_a
      WHERE id = v_contract_record.party_a_id;

      -- Log for party B
      INSERT INTO ledger_entries (
        player_id, player_name, round, transaction_type, amount,
        ev_change, rep_change, reason, processed, contract_id
      )
      VALUES (
        v_contract_record.party_b_id,
        v_contract_record.party_b_name,
        v_current_round,
        'CONTRACT_PAYMENT',
        v_contract_record.ev_from_b_to_a,
        -v_contract_record.ev_from_b_to_a,
        0,
        format('Contract payment to %s', v_contract_record.party_a_name),
        true,
        v_contract_record.contract_id
      );

      -- Log for party A
      INSERT INTO ledger_entries (
        player_id, player_name, round, transaction_type, amount,
        ev_change, rep_change, reason, processed, contract_id
      )
      VALUES (
        v_contract_record.party_a_id,
        v_contract_record.party_a_name,
        v_current_round,
        'CONTRACT_PAYMENT',
        v_contract_record.ev_from_b_to_a,
        v_contract_record.ev_from_b_to_a,
        0,
        format('Contract payment from %s', v_contract_record.party_b_name),
        true,
        v_contract_record.contract_id
      );

      v_total_contract_payments := v_total_contract_payments + v_contract_record.ev_from_b_to_a;
    END IF;
  END LOOP;

  -- ========================================================================
  -- 4. DECREMENT CONTRACT DURATIONS
  -- ========================================================================
  UPDATE contracts
  SET rounds_remaining = rounds_remaining - 1
  WHERE status = 'active'
    AND rounds_remaining IS NOT NULL;

  -- ========================================================================
  -- 5. AUTO-EXPIRE CONTRACTS (AFTER PROCESSING)
  -- ========================================================================
  FOR v_contract_record IN
    SELECT
      c.id as contract_id,
      c.party_a_id,
      c.party_b_id,
      pa.name as party_a_name,
      pb.name as party_b_name
    FROM contracts c
    JOIN players pa ON c.party_a_id = pa.id
    JOIN players pb ON c.party_b_id = pb.id
    WHERE c.status = 'active'
      AND c.rounds_remaining IS NOT NULL
      AND c.rounds_remaining <= 0
  LOOP
    -- Mark contract as ended
    UPDATE contracts
    SET
      status = 'ended',
      ended_in_round = v_current_round,
      reason_for_ending = 'Duration expired'
    WHERE id = v_contract_record.contract_id;

    -- Log contract ending
    INSERT INTO ledger_entries (
      player_id, player_name, round, transaction_type, amount,
      ev_change, rep_change, reason, processed, contract_id
    )
    VALUES (
      v_contract_record.party_a_id,
      v_contract_record.party_a_name,
      v_current_round,
      'CONTRACT_ENDED',
      0, 0, 0,
      format('Contract with %s expired', v_contract_record.party_b_name),
      true,
      v_contract_record.contract_id
    );

    INSERT INTO ledger_entries (
      player_id, player_name, round, transaction_type, amount,
      ev_change, rep_change, reason, processed, contract_id
    )
    VALUES (
      v_contract_record.party_b_id,
      v_contract_record.party_b_name,
      v_current_round,
      'CONTRACT_ENDED',
      0, 0, 0,
      format('Contract with %s expired', v_contract_record.party_a_name),
      true,
      v_contract_record.contract_id
    );

    v_contracts_expired := v_contracts_expired + 1;
  END LOOP;

  -- ========================================================================
  -- 6. RETURN SUMMARY
  -- ========================================================================
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

COMMENT ON FUNCTION process_round_end IS 'Processes all end-of-round calculations including maintenance, yields, and contract payments';
