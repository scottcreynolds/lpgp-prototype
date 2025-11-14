-- 030_contract_lifecycle_rep.sql
-- Comprehensive contract reputation system with configurable lifecycle bonuses/penalties
--
-- Replaces three functions with parameterized versions:
-- 1. create_contract - accepts rep_bonus_create parameter
-- 2. end_contract - accepts breaker_id and configurable penalties/bonuses
-- 3. process_round_end - accepts rep_bonus_per_round for upkeep bonuses
--
-- Features:
-- * Zero values skip ledger entry creation (no noise)
-- * Breaker/victim distinction with separate penalties
-- * Completion bonus for successful endings (mutual or natural expiry)
-- * Per-round upkeep bonus for all active contracts
-- * Full audit trail using reason_for_ending field
--
-- Safe to run: wrapped in transaction, uses CREATE OR REPLACE

BEGIN;

-- ============================================================================
-- 1. CREATE_CONTRACT - with configurable creation bonus
-- ============================================================================
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
  p_duration_rounds INTEGER DEFAULT NULL,
  p_rep_bonus_create INTEGER DEFAULT 1
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

  -- One-time EV payments processed immediately if not per-round
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

  -- Reputation bonus for entering into a contract (conditional)
  IF p_rep_bonus_create > 0 THEN
    UPDATE players SET rep = rep + p_rep_bonus_create WHERE id = p_party_a_id AND game_id = p_game_id;
    UPDATE players SET rep = rep + p_rep_bonus_create WHERE id = p_party_b_id AND game_id = p_game_id;
    INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, contract_id, game_id)
    VALUES (p_party_a_id, v_party_a_name, v_current_round, 'REP_GAIN', p_rep_bonus_create, 0, p_rep_bonus_create, format('Reputation bonus for new contract with %s', v_party_b_name), true, v_new_contract_id, p_game_id);
    INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, contract_id, game_id)
    VALUES (p_party_b_id, v_party_b_name, v_current_round, 'REP_GAIN', p_rep_bonus_create, 0, p_rep_bonus_create, format('Reputation bonus for new contract with %s', v_party_a_name), true, v_new_contract_id, p_game_id);
  END IF;

  -- System-level creation entry (kept for audit trail)
  INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, contract_id, game_id)
  VALUES (NULL, NULL, v_current_round, 'CONTRACT_CREATED', 0, 0, 0, format('Contract created between %s and %s', v_party_a_name, v_party_b_name), true, v_new_contract_id, p_game_id);

  RETURN QUERY SELECT true, 'Contract created successfully'::TEXT, v_new_contract_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_contract IS 'Creates a contract between two players with configurable creation REP bonus';

-- ============================================================================
-- 2. END_CONTRACT - with breaker identification and configurable penalties/bonuses
-- ============================================================================
CREATE OR REPLACE FUNCTION end_contract(
  p_game_id UUID,
  p_contract_id UUID,
  p_is_broken BOOLEAN DEFAULT false,
  p_reason TEXT DEFAULT NULL,
  p_breaker_id UUID DEFAULT NULL,
  p_rep_penalty_breaker INTEGER DEFAULT 5,
  p_rep_penalty_victim INTEGER DEFAULT 0,
  p_rep_bonus_completion INTEGER DEFAULT 2
) RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
  v_contract RECORD;
  v_party_a RECORD;
  v_party_b RECORD;
  v_current_round INTEGER;
  v_breaker_name TEXT;
  v_victim_name TEXT;
  v_victim_id UUID;
  v_completion_reason TEXT;
BEGIN
  SELECT current_round INTO v_current_round FROM game_state WHERE game_id = p_game_id ORDER BY updated_at DESC LIMIT 1;
  SELECT * INTO v_contract FROM contracts WHERE id = p_contract_id AND game_id = p_game_id;
  
  IF v_contract IS NULL THEN 
    RETURN QUERY SELECT false, 'Contract not found'::TEXT; 
    RETURN; 
  END IF;
  
  IF v_contract.status <> 'active' THEN 
    RETURN QUERY SELECT false, 'Contract is not active'::TEXT; 
    RETURN; 
  END IF;
  
  SELECT * INTO v_party_a FROM players WHERE id = v_contract.party_a_id AND game_id = p_game_id;
  SELECT * INTO v_party_b FROM players WHERE id = v_contract.party_b_id AND game_id = p_game_id;

  -- Update contract status
  UPDATE contracts 
  SET status = CASE WHEN p_is_broken THEN 'broken' ELSE 'ended' END,
      ended_in_round = v_current_round,
      reason_for_ending = p_reason,
      updated_at = NOW()
  WHERE id = p_contract_id AND game_id = p_game_id;

  IF p_is_broken THEN
    -- Apply penalties only if contract is broken
    -- Identify breaker and victim
    IF p_breaker_id = v_party_a.id THEN
      v_breaker_name := v_party_a.name;
      v_victim_name := v_party_b.name;
      v_victim_id := v_party_b.id;
    ELSE
      v_breaker_name := v_party_b.name;
      v_victim_name := v_party_a.name;
      v_victim_id := v_party_a.id;
    END IF;

    -- Apply penalty to breaker (conditional)
    IF p_rep_penalty_breaker > 0 THEN
      UPDATE players SET rep = rep - p_rep_penalty_breaker WHERE id = p_breaker_id AND game_id = p_game_id;
      INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, contract_id, game_id)
      VALUES (p_breaker_id, v_breaker_name, v_current_round, 'CONTRACT_BROKEN', 0, 0, -p_rep_penalty_breaker, format('Reputation penalty for breaking contract with %s', v_victim_name), true, p_contract_id, p_game_id);
    END IF;

    -- Apply penalty to victim (conditional, typically 0)
    IF p_rep_penalty_victim > 0 THEN
      UPDATE players SET rep = rep - p_rep_penalty_victim WHERE id = v_victim_id AND game_id = p_game_id;
      INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, contract_id, game_id)
      VALUES (v_victim_id, v_victim_name, v_current_round, 'CONTRACT_BROKEN', 0, 0, -p_rep_penalty_victim, format('Contract broken by %s', v_breaker_name), true, p_contract_id, p_game_id);
    END IF;
  ELSE
    -- Contract ended successfully - award completion bonus (conditional)
    IF p_rep_bonus_completion > 0 THEN
      -- Determine completion reason for ledger
      v_completion_reason := COALESCE(p_reason, 'Mutual agreement');
      
      UPDATE players SET rep = rep + p_rep_bonus_completion WHERE id = v_party_a.id AND game_id = p_game_id;
      UPDATE players SET rep = rep + p_rep_bonus_completion WHERE id = v_party_b.id AND game_id = p_game_id;
      
      INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, contract_id, game_id)
      VALUES (v_party_a.id, v_party_a.name, v_current_round, 'REP_GAIN', p_rep_bonus_completion, 0, p_rep_bonus_completion, format('Contract completion bonus with %s (%s)', v_party_b.name, v_completion_reason), true, p_contract_id, p_game_id);
      
      INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, contract_id, game_id)
      VALUES (v_party_b.id, v_party_b.name, v_current_round, 'REP_GAIN', p_rep_bonus_completion, 0, p_rep_bonus_completion, format('Contract completion bonus with %s (%s)', v_party_a.name, v_completion_reason), true, p_contract_id, p_game_id);
    END IF;
  END IF;

  -- System ledger entry
  INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, contract_id, game_id)
  VALUES (NULL, NULL, v_current_round, CASE WHEN p_is_broken THEN 'CONTRACT_BROKEN' ELSE 'CONTRACT_ENDED' END, 0, 0, 0, COALESCE(p_reason, 'Contract ended'), true, p_contract_id, p_game_id);

  RETURN QUERY SELECT true, format('Contract %s successfully', CASE WHEN p_is_broken THEN 'broken' ELSE 'ended' END)::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION end_contract IS 'Ends or breaks a contract with configurable REP penalties/bonuses and breaker identification';

-- ============================================================================
-- 3. PROCESS_ROUND_END - with per-round contract upkeep bonus
-- ============================================================================
CREATE OR REPLACE FUNCTION process_round_end(
  p_game_id UUID,
  p_rep_bonus_per_round INTEGER DEFAULT 1
) RETURNS TABLE (
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
  SELECT COALESCE(current_round, 0) INTO v_current_round
  FROM game_state WHERE game_id = p_game_id ORDER BY updated_at DESC LIMIT 1;

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
      AND pi.game_id = p_game_id
      AND p.game_id = p_game_id
  LOOP
    -- Deduct maintenance
    UPDATE players
    SET ev = ev - v_infra_record.maintenance_cost
    WHERE id = v_infra_record.player_id AND game_id = p_game_id;

    -- Log to ledger
    INSERT INTO ledger_entries (
      player_id, player_name, round, transaction_type, amount,
      ev_change, rep_change, reason, processed, game_id
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
      true,
      p_game_id
    );

    v_total_maintenance := v_total_maintenance + v_infra_record.maintenance_cost;
  END LOOP;

  -- ========================================================================
  -- 2. PROCESS INFRASTRUCTURE YIELDS
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
      AND idef.yield > 0
      AND pi.game_id = p_game_id
      AND p.game_id = p_game_id
  LOOP
    -- Add yield
    UPDATE players
    SET ev = ev + v_infra_record.yield
    WHERE id = v_infra_record.player_id AND game_id = p_game_id;

    -- Log to ledger
    INSERT INTO ledger_entries (
      player_id, player_name, round, transaction_type, amount,
      ev_change, rep_change, reason, processed, game_id
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
      true,
      p_game_id
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
      AND c.game_id = p_game_id
      AND pa.game_id = p_game_id
      AND pb.game_id = p_game_id
  LOOP
    -- Transfer from A to B
    IF v_contract_record.ev_from_a_to_b > 0 THEN
      UPDATE players
      SET ev = ev - v_contract_record.ev_from_a_to_b
      WHERE id = v_contract_record.party_a_id AND game_id = p_game_id;

      UPDATE players
      SET ev = ev + v_contract_record.ev_from_a_to_b
      WHERE id = v_contract_record.party_b_id AND game_id = p_game_id;

      -- Log for party A
      INSERT INTO ledger_entries (
        player_id, player_name, round, transaction_type, amount,
        ev_change, rep_change, reason, processed, contract_id, game_id
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
        v_contract_record.contract_id,
        p_game_id
      );

      -- Log for party B
      INSERT INTO ledger_entries (
        player_id, player_name, round, transaction_type, amount,
        ev_change, rep_change, reason, processed, contract_id, game_id
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
        v_contract_record.contract_id,
        p_game_id
      );

      v_total_contract_payments := v_total_contract_payments + v_contract_record.ev_from_a_to_b;
    END IF;

    -- Transfer from B to A
    IF v_contract_record.ev_from_b_to_a > 0 THEN
      UPDATE players
      SET ev = ev - v_contract_record.ev_from_b_to_a
      WHERE id = v_contract_record.party_b_id AND game_id = p_game_id;

      UPDATE players
      SET ev = ev + v_contract_record.ev_from_b_to_a
      WHERE id = v_contract_record.party_a_id AND game_id = p_game_id;

      -- Log for party B
      INSERT INTO ledger_entries (
        player_id, player_name, round, transaction_type, amount,
        ev_change, rep_change, reason, processed, contract_id, game_id
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
        v_contract_record.contract_id,
        p_game_id
      );

      -- Log for party A
      INSERT INTO ledger_entries (
        player_id, player_name, round, transaction_type, amount,
        ev_change, rep_change, reason, processed, contract_id, game_id
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
        v_contract_record.contract_id,
        p_game_id
      );

      v_total_contract_payments := v_total_contract_payments + v_contract_record.ev_from_b_to_a;
    END IF;
  END LOOP;

  -- ========================================================================
  -- 4. PROCESS PER-ROUND CONTRACT UPKEEP BONUSES
  -- ========================================================================
  IF p_rep_bonus_per_round > 0 THEN
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
        AND c.game_id = p_game_id
        AND pa.game_id = p_game_id
        AND pb.game_id = p_game_id
    LOOP
      -- Award upkeep bonus to party A
      UPDATE players
      SET rep = rep + p_rep_bonus_per_round
      WHERE id = v_contract_record.party_a_id AND game_id = p_game_id;

      INSERT INTO ledger_entries (
        player_id, player_name, round, transaction_type, amount,
        ev_change, rep_change, reason, processed, contract_id, game_id
      )
      VALUES (
        v_contract_record.party_a_id,
        v_contract_record.party_a_name,
        v_current_round,
        'REP_GAIN',
        p_rep_bonus_per_round,
        0,
        p_rep_bonus_per_round,
        format('Contract upkeep bonus with %s', v_contract_record.party_b_name),
        true,
        v_contract_record.contract_id,
        p_game_id
      );

      -- Award upkeep bonus to party B
      UPDATE players
      SET rep = rep + p_rep_bonus_per_round
      WHERE id = v_contract_record.party_b_id AND game_id = p_game_id;

      INSERT INTO ledger_entries (
        player_id, player_name, round, transaction_type, amount,
        ev_change, rep_change, reason, processed, contract_id, game_id
      )
      VALUES (
        v_contract_record.party_b_id,
        v_contract_record.party_b_name,
        v_current_round,
        'REP_GAIN',
        p_rep_bonus_per_round,
        0,
        p_rep_bonus_per_round,
        format('Contract upkeep bonus with %s', v_contract_record.party_a_name),
        true,
        v_contract_record.contract_id,
        p_game_id
      );
    END LOOP;
  END IF;

  -- ========================================================================
  -- 5. DECREMENT CONTRACT DURATIONS
  -- ========================================================================
  UPDATE contracts
  SET rounds_remaining = rounds_remaining - 1
  WHERE status = 'active'
    AND rounds_remaining IS NOT NULL
    AND game_id = p_game_id;

  -- ========================================================================
  -- 6. AUTO-EXPIRE CONTRACTS (AFTER PROCESSING)
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
      AND c.game_id = p_game_id
      AND pa.game_id = p_game_id
      AND pb.game_id = p_game_id
  LOOP
    -- Mark contract as ended
    UPDATE contracts
    SET
      status = 'ended',
      ended_in_round = v_current_round,
      reason_for_ending = 'Duration expired'
    WHERE id = v_contract_record.contract_id AND game_id = p_game_id;

    -- Log contract ending
    INSERT INTO ledger_entries (
      player_id, player_name, round, transaction_type, amount,
      ev_change, rep_change, reason, processed, contract_id, game_id
    )
    VALUES (
      v_contract_record.party_a_id,
      v_contract_record.party_a_name,
      v_current_round,
      'CONTRACT_ENDED',
      0, 0, 0,
      format('Contract with %s expired', v_contract_record.party_b_name),
      true,
      v_contract_record.contract_id,
      p_game_id
    );

    INSERT INTO ledger_entries (
      player_id, player_name, round, transaction_type, amount,
      ev_change, rep_change, reason, processed, contract_id, game_id
    )
    VALUES (
      v_contract_record.party_b_id,
      v_contract_record.party_b_name,
      v_current_round,
      'CONTRACT_ENDED',
      0, 0, 0,
      format('Contract with %s expired', v_contract_record.party_a_name),
      true,
      v_contract_record.contract_id,
      p_game_id
    );

    v_contracts_expired := v_contracts_expired + 1;
  END LOOP;

  -- ========================================================================
  -- 7. RETURN SUMMARY
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

COMMENT ON FUNCTION process_round_end IS 'Processes end-of-round: maintenance, yields, contract payments, and per-round REP bonuses';

COMMIT;
