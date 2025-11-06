-- Lunar Policy Gaming Platform - Infrastructure and Contract RPC Functions
-- Version 0.2

-- ============================================================================
-- BUILD INFRASTRUCTURE
-- ============================================================================
CREATE OR REPLACE FUNCTION build_infrastructure(
  p_builder_id UUID,
  p_owner_id UUID,
  p_infrastructure_type TEXT,
  p_location TEXT
)
RETURNS TABLE (
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
BEGIN
  -- Get current round
  SELECT current_round INTO v_current_round
  FROM game_state WHERE id = 1;

  -- Get infrastructure definition
  SELECT id, cost INTO v_infra_def_id, v_cost
  FROM infrastructure_definitions
  WHERE type = p_infrastructure_type AND is_starter = false;

  IF v_infra_def_id IS NULL THEN
    RETURN QUERY SELECT
      false,
      'Infrastructure type not found or is starter infrastructure'::TEXT,
      NULL::UUID,
      NULL::INTEGER;
    RETURN;
  END IF;

  -- Get builder's current EV and name
  SELECT ev, name INTO v_builder_ev, v_builder_name
  FROM players WHERE id = p_builder_id;

  -- Get owner's name
  SELECT name INTO v_owner_name
  FROM players WHERE id = p_owner_id;

  -- Check if builder has enough EV
  IF v_builder_ev < v_cost THEN
    RETURN QUERY SELECT
      false,
      format('Insufficient EV. Required: %s, Available: %s', v_cost, v_builder_ev)::TEXT,
      NULL::UUID,
      v_builder_ev;
    RETURN;
  END IF;

  -- Deduct cost from builder
  UPDATE players
  SET ev = ev - v_cost
  WHERE id = p_builder_id;

  -- Create infrastructure for owner
  INSERT INTO player_infrastructure (
    player_id,
    infrastructure_id,
    location,
    is_active,
    is_powered,
    is_crewed,
    is_starter
  )
  VALUES (
    p_owner_id,
    v_infra_def_id,
    p_location,
    false, -- Starts dormant, must be manually activated
    false,
    false,
    false
  )
  RETURNING id INTO v_new_infrastructure_id;

  -- Create ledger entry for builder
  INSERT INTO ledger_entries (
    player_id,
    player_name,
    round,
    transaction_type,
    amount,
    ev_change,
    rep_change,
    reason,
    processed,
    infrastructure_id,
    metadata
  )
  VALUES (
    p_builder_id,
    v_builder_name,
    v_current_round,
    'BUILD_INFRASTRUCTURE',
    v_cost,
    -v_cost,
    0,
    format('Built %s at %s for %s', p_infrastructure_type, p_location, v_owner_name),
    true, -- Immediately processed
    v_new_infrastructure_id,
    json_build_object(
      'builder_id', p_builder_id,
      'owner_id', p_owner_id,
      'infrastructure_type', p_infrastructure_type,
      'location', p_location
    )
  );

  RETURN QUERY SELECT
    true,
    'Infrastructure built successfully'::TEXT,
    v_new_infrastructure_id,
    (v_builder_ev - v_cost);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION build_infrastructure IS 'Builds infrastructure for a player, deducting cost from builder';

-- ============================================================================
-- TOGGLE INFRASTRUCTURE STATUS
-- ============================================================================
CREATE OR REPLACE FUNCTION toggle_infrastructure_status(
  p_infrastructure_id UUID,
  p_target_status BOOLEAN
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  is_active BOOLEAN
) AS $$
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
  -- Get current round
  SELECT current_round INTO v_current_round
  FROM game_state WHERE id = 1;

  -- Get infrastructure details
  SELECT
    pi.player_id,
    pi.is_active,
    idef.power_requirement,
    idef.crew_requirement,
    idef.type,
    p.name
  INTO
    v_player_id,
    v_current_status,
    v_power_req,
    v_crew_req,
    v_infra_type,
    v_player_name
  FROM player_infrastructure pi
  JOIN infrastructure_definitions idef ON pi.infrastructure_id = idef.id
  JOIN players p ON pi.player_id = p.id
  WHERE pi.id = p_infrastructure_id;

  IF v_player_id IS NULL THEN
    RETURN QUERY SELECT false, 'Infrastructure not found'::TEXT, false;
    RETURN;
  END IF;

  -- If trying to activate
  IF p_target_status = true AND v_current_status = false THEN
    -- Calculate available capacity (this will be replaced with proper calculation)
    SELECT
      get_available_power(v_player_id),
      get_available_crew(v_player_id)
    INTO v_available_power, v_available_crew;

    -- Check if player has enough capacity
    IF v_power_req IS NOT NULL AND v_available_power < v_power_req THEN
      RETURN QUERY SELECT
        false,
        format('Insufficient power. Required: %s, Available: %s', v_power_req, v_available_power)::TEXT,
        false;
      RETURN;
    END IF;

    IF v_crew_req IS NOT NULL AND v_available_crew < v_crew_req THEN
      RETURN QUERY SELECT
        false,
        format('Insufficient crew capacity. Required: %s, Available: %s', v_crew_req, v_available_crew)::TEXT,
        false;
      RETURN;
    END IF;

    -- Activate infrastructure
    UPDATE player_infrastructure
    SET is_active = true, is_powered = true, is_crewed = true
    WHERE id = p_infrastructure_id;

    -- Log to ledger
    INSERT INTO ledger_entries (
      player_id, player_name, round, transaction_type, amount,
      ev_change, rep_change, reason, processed, infrastructure_id
    )
    VALUES (
      v_player_id, v_player_name, v_current_round, 'INFRASTRUCTURE_ACTIVATED', 0,
      0, 0, format('Activated %s', v_infra_type), true, p_infrastructure_id
    );

    RETURN QUERY SELECT true, 'Infrastructure activated'::TEXT, true;

  -- If trying to deactivate
  ELSIF p_target_status = false AND v_current_status = true THEN
    UPDATE player_infrastructure
    SET is_active = false, is_powered = false, is_crewed = false
    WHERE id = p_infrastructure_id;

    -- Log to ledger
    INSERT INTO ledger_entries (
      player_id, player_name, round, transaction_type, amount,
      ev_change, rep_change, reason, processed, infrastructure_id
    )
    VALUES (
      v_player_id, v_player_name, v_current_round, 'INFRASTRUCTURE_DEACTIVATED', 0,
      0, 0, format('Deactivated %s', v_infra_type), true, p_infrastructure_id
    );

    RETURN QUERY SELECT true, 'Infrastructure deactivated'::TEXT, false;

  ELSE
    -- Already in target status
    RETURN QUERY SELECT true, 'Already in target status'::TEXT, v_current_status;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION toggle_infrastructure_status IS 'Activates or deactivates infrastructure based on capacity availability';

-- ============================================================================
-- GET AVAILABLE POWER (Helper Function)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_available_power(p_player_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_total_capacity INTEGER;
  v_used_capacity INTEGER;
  v_from_contracts INTEGER;
BEGIN
  -- Get total power capacity from owned Solar Arrays
  SELECT COALESCE(SUM(idef.capacity), 0)
  INTO v_total_capacity
  FROM player_infrastructure pi
  JOIN infrastructure_definitions idef ON pi.infrastructure_id = idef.id
  WHERE pi.player_id = p_player_id
    AND idef.type LIKE '%Solar%'
    AND pi.is_active = true;

  -- Get power used by active infrastructure
  SELECT COALESCE(SUM(idef.power_requirement), 0)
  INTO v_used_capacity
  FROM player_infrastructure pi
  JOIN infrastructure_definitions idef ON pi.infrastructure_id = idef.id
  WHERE pi.player_id = p_player_id
    AND pi.is_active = true
    AND idef.power_requirement IS NOT NULL;

  -- Get power from contracts (party_a receives from party_b, party_b receives from party_a)
  SELECT COALESCE(SUM(
    CASE
      WHEN party_a_id = p_player_id THEN power_from_b_to_a
      WHEN party_b_id = p_player_id THEN power_from_a_to_b
      ELSE 0
    END
  ), 0)
  INTO v_from_contracts
  FROM contracts
  WHERE (party_a_id = p_player_id OR party_b_id = p_player_id)
    AND status = 'active';

  RETURN v_total_capacity + v_from_contracts - v_used_capacity;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_available_power IS 'Calculates available power capacity for a player including contracts';

-- ============================================================================
-- GET AVAILABLE CREW (Helper Function)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_available_crew(p_player_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_total_capacity INTEGER;
  v_used_capacity INTEGER;
  v_from_contracts INTEGER;
BEGIN
  -- Get total crew capacity from owned Habitats
  SELECT COALESCE(SUM(idef.capacity), 0)
  INTO v_total_capacity
  FROM player_infrastructure pi
  JOIN infrastructure_definitions idef ON pi.infrastructure_id = idef.id
  WHERE pi.player_id = p_player_id
    AND idef.type LIKE '%Habitat%'
    AND pi.is_active = true;

  -- Get crew used by active infrastructure
  SELECT COALESCE(SUM(idef.crew_requirement), 0)
  INTO v_used_capacity
  FROM player_infrastructure pi
  JOIN infrastructure_definitions idef ON pi.infrastructure_id = idef.id
  WHERE pi.player_id = p_player_id
    AND pi.is_active = true
    AND idef.crew_requirement IS NOT NULL;

  -- Get crew from contracts
  SELECT COALESCE(SUM(
    CASE
      WHEN party_a_id = p_player_id THEN crew_from_b_to_a
      WHEN party_b_id = p_player_id THEN crew_from_a_to_b
      ELSE 0
    END
  ), 0)
  INTO v_from_contracts
  FROM contracts
  WHERE (party_a_id = p_player_id OR party_b_id = p_player_id)
    AND status = 'active';

  RETURN v_total_capacity + v_from_contracts - v_used_capacity;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_available_crew IS 'Calculates available crew capacity for a player including contracts';

-- ============================================================================
-- CREATE CONTRACT
-- ============================================================================
CREATE OR REPLACE FUNCTION create_contract(
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
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  contract_id UUID
) AS $$
DECLARE
  v_current_round INTEGER;
  v_new_contract_id UUID;
  v_party_a_name TEXT;
  v_party_b_name TEXT;
  v_party_a_ev INTEGER;
  v_party_b_ev INTEGER;
BEGIN
  -- Get current round
  SELECT current_round INTO v_current_round
  FROM game_state WHERE id = 1;

  -- Get player names and EV
  SELECT name, ev INTO v_party_a_name, v_party_a_ev FROM players WHERE id = p_party_a_id;
  SELECT name, ev INTO v_party_b_name, v_party_b_ev FROM players WHERE id = p_party_b_id;

  -- Create contract
  INSERT INTO contracts (
    party_a_id, party_b_id,
    ev_from_a_to_b, ev_from_b_to_a, ev_is_per_round,
    power_from_a_to_b, power_from_b_to_a,
    crew_from_a_to_b, crew_from_b_to_a,
    duration_rounds, rounds_remaining,
    status, created_in_round
  )
  VALUES (
    p_party_a_id, p_party_b_id,
    p_ev_from_a_to_b, p_ev_from_b_to_a, p_ev_is_per_round,
    p_power_from_a_to_b, p_power_from_b_to_a,
    p_crew_from_a_to_b, p_crew_from_b_to_a,
    p_duration_rounds, p_duration_rounds,
    'active', v_current_round
  )
  RETURNING id INTO v_new_contract_id;

  -- If one-time EV exchange, process immediately
  IF NOT p_ev_is_per_round THEN
    -- Transfer from A to B
    IF p_ev_from_a_to_b > 0 THEN
      UPDATE players SET ev = ev - p_ev_from_a_to_b WHERE id = p_party_a_id;
      UPDATE players SET ev = ev + p_ev_from_a_to_b WHERE id = p_party_b_id;

      INSERT INTO ledger_entries (
        player_id, player_name, round, transaction_type, amount,
        ev_change, rep_change, reason, processed, contract_id
      )
      VALUES (
        p_party_a_id, v_party_a_name, v_current_round, 'CONTRACT_PAYMENT', p_ev_from_a_to_b,
        -p_ev_from_a_to_b, 0, format('One-time payment to %s', v_party_b_name), true, v_new_contract_id
      );

      INSERT INTO ledger_entries (
        player_id, player_name, round, transaction_type, amount,
        ev_change, rep_change, reason, processed, contract_id
      )
      VALUES (
        p_party_b_id, v_party_b_name, v_current_round, 'CONTRACT_PAYMENT', p_ev_from_a_to_b,
        p_ev_from_a_to_b, 0, format('One-time payment from %s', v_party_a_name), true, v_new_contract_id
      );
    END IF;

    -- Transfer from B to A
    IF p_ev_from_b_to_a > 0 THEN
      UPDATE players SET ev = ev - p_ev_from_b_to_a WHERE id = p_party_b_id;
      UPDATE players SET ev = ev + p_ev_from_b_to_a WHERE id = p_party_a_id;

      INSERT INTO ledger_entries (
        player_id, player_name, round, transaction_type, amount,
        ev_change, rep_change, reason, processed, contract_id
      )
      VALUES (
        p_party_b_id, v_party_b_name, v_current_round, 'CONTRACT_PAYMENT', p_ev_from_b_to_a,
        -p_ev_from_b_to_a, 0, format('One-time payment to %s', v_party_a_name), true, v_new_contract_id
      );

      INSERT INTO ledger_entries (
        player_id, player_name, round, transaction_type, amount,
        ev_change, rep_change, reason, processed, contract_id
      )
      VALUES (
        p_party_a_id, v_party_a_name, v_current_round, 'CONTRACT_PAYMENT', p_ev_from_b_to_a,
        p_ev_from_b_to_a, 0, format('One-time payment from %s', v_party_b_name), true, v_new_contract_id
      );
    END IF;
  END IF;

  -- Log contract creation
  INSERT INTO ledger_entries (
    player_id, player_name, round, transaction_type, amount,
    ev_change, rep_change, reason, processed, contract_id
  )
  VALUES (
    p_party_a_id, v_party_a_name, v_current_round, 'CONTRACT_CREATED', 0,
    0, 0, format('Contract created with %s', v_party_b_name), true, v_new_contract_id
  );

  INSERT INTO ledger_entries (
    player_id, player_name, round, transaction_type, amount,
    ev_change, rep_change, reason, processed, contract_id
  )
  VALUES (
    p_party_b_id, v_party_b_name, v_current_round, 'CONTRACT_CREATED', 0,
    0, 0, format('Contract created with %s', v_party_a_name), true, v_new_contract_id
  );

  RETURN QUERY SELECT true, 'Contract created successfully'::TEXT, v_new_contract_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_contract IS 'Creates a contract between two players with optional EV and capacity exchanges';

-- ============================================================================
-- END CONTRACT
-- ============================================================================
CREATE OR REPLACE FUNCTION end_contract(
  p_contract_id UUID,
  p_is_broken BOOLEAN DEFAULT false,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_current_round INTEGER;
  v_party_a_id UUID;
  v_party_b_id UUID;
  v_party_a_name TEXT;
  v_party_b_name TEXT;
  v_status TEXT;
BEGIN
  -- Get current round
  SELECT current_round INTO v_current_round
  FROM game_state WHERE id = 1;

  -- Get contract details
  SELECT party_a_id, party_b_id, status
  INTO v_party_a_id, v_party_b_id, v_status
  FROM contracts
  WHERE id = p_contract_id;

  IF v_party_a_id IS NULL THEN
    RETURN QUERY SELECT false, 'Contract not found'::TEXT;
    RETURN;
  END IF;

  IF v_status != 'active' THEN
    RETURN QUERY SELECT false, 'Contract is not active'::TEXT;
    RETURN;
  END IF;

  -- Get player names
  SELECT name INTO v_party_a_name FROM players WHERE id = v_party_a_id;
  SELECT name INTO v_party_b_name FROM players WHERE id = v_party_b_id;

  -- Update contract status
  UPDATE contracts
  SET
    status = CASE WHEN p_is_broken THEN 'broken' ELSE 'ended' END,
    ended_in_round = v_current_round,
    reason_for_ending = p_reason
  WHERE id = p_contract_id;

  -- Log contract ending
  INSERT INTO ledger_entries (
    player_id, player_name, round, transaction_type, amount,
    ev_change, rep_change, reason, processed, contract_id
  )
  VALUES (
    v_party_a_id, v_party_a_name, v_current_round,
    CASE WHEN p_is_broken THEN 'CONTRACT_BROKEN' ELSE 'CONTRACT_ENDED' END,
    0, 0, 0,
    COALESCE(p_reason, format('Contract %s with %s',
      CASE WHEN p_is_broken THEN 'broken' ELSE 'ended' END, v_party_b_name)),
    true, p_contract_id
  );

  INSERT INTO ledger_entries (
    player_id, player_name, round, transaction_type, amount,
    ev_change, rep_change, reason, processed, contract_id
  )
  VALUES (
    v_party_b_id, v_party_b_name, v_current_round,
    CASE WHEN p_is_broken THEN 'CONTRACT_BROKEN' ELSE 'CONTRACT_ENDED' END,
    0, 0, 0,
    COALESCE(p_reason, format('Contract %s with %s',
      CASE WHEN p_is_broken THEN 'broken' ELSE 'ended' END, v_party_a_name)),
    true, p_contract_id
  );

  RETURN QUERY SELECT true, 'Contract ended successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION end_contract IS 'Ends or breaks a contract';

-- ============================================================================
-- MANUAL ADJUSTMENT
-- ============================================================================
CREATE OR REPLACE FUNCTION manual_adjustment(
  p_player_id UUID,
  p_ev_change INTEGER DEFAULT 0,
  p_rep_change INTEGER DEFAULT 0,
  p_reason TEXT DEFAULT 'Manual adjustment'
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  new_ev INTEGER,
  new_rep INTEGER
) AS $$
DECLARE
  v_current_round INTEGER;
  v_player_name TEXT;
  v_new_ev INTEGER;
  v_new_rep INTEGER;
BEGIN
  -- Get current round
  SELECT current_round INTO v_current_round
  FROM game_state WHERE id = 1;

  -- Get player name
  SELECT name INTO v_player_name FROM players WHERE id = p_player_id;

  IF v_player_name IS NULL THEN
    RETURN QUERY SELECT false, 'Player not found'::TEXT, NULL::INTEGER, NULL::INTEGER;
    RETURN;
  END IF;

  -- Update player
  UPDATE players
  SET ev = ev + p_ev_change, rep = rep + p_rep_change
  WHERE id = p_player_id
  RETURNING ev, rep INTO v_new_ev, v_new_rep;

  -- Log to ledger
  INSERT INTO ledger_entries (
    player_id, player_name, round, transaction_type, amount,
    ev_change, rep_change, reason, processed
  )
  VALUES (
    p_player_id, v_player_name, v_current_round, 'MANUAL_ADJUSTMENT',
    GREATEST(ABS(p_ev_change), ABS(p_rep_change)),
    p_ev_change, p_rep_change, p_reason, true
  );

  RETURN QUERY SELECT true, 'Adjustment applied successfully'::TEXT, v_new_ev, v_new_rep;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION manual_adjustment IS 'Manually adjusts player EV and/or REP with reason logging';
