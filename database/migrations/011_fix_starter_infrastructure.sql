-- Lunar Policy Gaming Platform - Fix Starter Infrastructure
-- Version 0.2
-- Ensures starter infrastructure is always active and cannot be deactivated

-- ============================================================================
-- UPDATE EXISTING STARTER INFRASTRUCTURE TO BE ACTIVE
-- ============================================================================
UPDATE player_infrastructure
SET is_active = true
WHERE is_starter = true AND is_active = false;

-- ============================================================================
-- UPDATE ADD_PLAYER TO SET STARTER INFRASTRUCTURE AS ACTIVE
-- ============================================================================
CREATE OR REPLACE FUNCTION add_player(
  player_name TEXT,
  player_specialization TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  player_id UUID
) AS $$
DECLARE
  v_player_id UUID;
  v_starter_infra_id UUID;
  v_current_round INTEGER;
BEGIN
  -- Get current round
  SELECT current_round INTO v_current_round
  FROM game_state
  WHERE id = 1;

  -- Create new player
  INSERT INTO players (name, specialization, ev, rep)
  VALUES (player_name, player_specialization, 50, 10)
  RETURNING id INTO v_player_id;

  -- Determine and add starter infrastructure
  IF player_specialization = 'Resource Extractor' THEN
    SELECT id INTO v_starter_infra_id
    FROM infrastructure_definitions
    WHERE type = 'Starter H2O Extractor';
  ELSIF player_specialization = 'Infrastructure Provider' THEN
    SELECT id INTO v_starter_infra_id
    FROM infrastructure_definitions
    WHERE type = 'Starter Solar Array';
  ELSE
    -- Operations Manager
    SELECT id INTO v_starter_infra_id
    FROM infrastructure_definitions
    WHERE type = 'Starter Habitat';
  END IF;

  -- Add starter infrastructure (always active)
  INSERT INTO player_infrastructure (player_id, infrastructure_id, is_powered, is_crewed, is_starter, is_active)
  VALUES (v_player_id, v_starter_infra_id, true, true, true, true);

  -- Add ledger entry
  INSERT INTO ledger_entries (player_id, round, transaction_type, amount, reason)
  VALUES (v_player_id, v_current_round, 'GAME_START', 50, 'Initial EV');

  -- Return success
  RETURN QUERY SELECT
    true,
    'Player added successfully'::TEXT,
    v_player_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION add_player IS 'Adds a new player with starting EV, REP, and starter infrastructure (always active)';

-- ============================================================================
-- UPDATE TOGGLE_INFRASTRUCTURE_STATUS TO PREVENT DEACTIVATING STARTER
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
  v_is_starter BOOLEAN;
BEGIN
  -- Get current round
  SELECT current_round INTO v_current_round
  FROM game_state WHERE id = 1;

  -- Get infrastructure details
  SELECT
    pi.player_id,
    pi.is_active,
    pi.is_starter,
    idef.power_requirement,
    idef.crew_requirement,
    idef.type,
    p.name
  INTO
    v_player_id,
    v_current_status,
    v_is_starter,
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

  -- Prevent deactivating starter infrastructure
  IF v_is_starter = true AND p_target_status = false THEN
    RETURN QUERY SELECT false, 'Starter infrastructure cannot be deactivated'::TEXT, v_current_status;
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

COMMENT ON FUNCTION toggle_infrastructure_status IS 'Activates or deactivates infrastructure (starter infrastructure cannot be deactivated)';
