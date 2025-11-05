-- Lunar Policy Gaming Platform - RPC Functions
-- Version 0.1

-- ============================================================================
-- ADVANCE PHASE
-- ============================================================================
-- Advances the game from Governance → Operations → Next Round (Governance)
-- Uses optimistic locking to prevent race conditions
CREATE OR REPLACE FUNCTION advance_phase(current_version INTEGER)
RETURNS TABLE (
  success BOOLEAN,
  new_round INTEGER,
  new_phase TEXT,
  new_version INTEGER,
  error_message TEXT
) AS $$
DECLARE
  v_current_round INTEGER;
  v_current_phase TEXT;
  v_stored_version INTEGER;
  v_new_round INTEGER;
  v_new_phase TEXT;
BEGIN
  -- Lock the game_state row for update
  SELECT current_round, current_phase, version
  INTO v_current_round, v_current_phase, v_stored_version
  FROM game_state
  WHERE id = 1
  FOR UPDATE;

  -- Check version for optimistic locking
  IF v_stored_version != current_version THEN
    RETURN QUERY SELECT
      false,
      v_current_round,
      v_current_phase,
      v_stored_version,
      'Version mismatch - another update occurred'::TEXT;
    RETURN;
  END IF;

  -- Determine next phase/round
  IF v_current_phase = 'Governance' THEN
    v_new_round := v_current_round;
    v_new_phase := 'Operations';
  ELSE
    v_new_round := v_current_round + 1;
    v_new_phase := 'Governance';
  END IF;

  -- Update game state
  UPDATE game_state
  SET
    current_round = v_new_round,
    current_phase = v_new_phase,
    version = version + 1,
    updated_at = NOW()
  WHERE id = 1;

  -- Return success
  RETURN QUERY SELECT
    true,
    v_new_round,
    v_new_phase,
    v_stored_version + 1,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RESET GAME
-- ============================================================================
-- Resets the game to initial state with 4 default players
CREATE OR REPLACE FUNCTION reset_game()
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  player_count INTEGER
) AS $$
DECLARE
  v_player1_id UUID;
  v_player2_id UUID;
  v_player3_id UUID;
  v_player4_id UUID;
  v_starter_h2o_id UUID;
  v_starter_solar_id UUID;
  v_starter_habitat_id UUID;
BEGIN
  -- Clear existing data
  DELETE FROM ledger_entries;
  DELETE FROM player_infrastructure;
  DELETE FROM players;

  -- Reset game state
  UPDATE game_state
  SET
    current_round = 1,
    current_phase = 'Governance',
    version = 0,
    updated_at = NOW()
  WHERE id = 1;

  -- Get starter infrastructure IDs
  SELECT id INTO v_starter_h2o_id
  FROM infrastructure_definitions
  WHERE type = 'Starter H2O Extractor';

  SELECT id INTO v_starter_solar_id
  FROM infrastructure_definitions
  WHERE type = 'Starter Solar Array';

  SELECT id INTO v_starter_habitat_id
  FROM infrastructure_definitions
  WHERE type = 'Starter Habitat';

  -- Create Player 1: Resource Extractor
  INSERT INTO players (name, specialization, ev, rep)
  VALUES ('Player 1', 'Resource Extractor', 50, 10)
  RETURNING id INTO v_player1_id;

  INSERT INTO player_infrastructure (player_id, infrastructure_id, is_powered, is_crewed, is_starter)
  VALUES (v_player1_id, v_starter_h2o_id, true, true, true);

  INSERT INTO ledger_entries (player_id, round, transaction_type, amount, reason)
  VALUES (v_player1_id, 1, 'GAME_START', 50, 'Initial EV');

  -- Create Player 2: Infrastructure Provider
  INSERT INTO players (name, specialization, ev, rep)
  VALUES ('Player 2', 'Infrastructure Provider', 50, 10)
  RETURNING id INTO v_player2_id;

  INSERT INTO player_infrastructure (player_id, infrastructure_id, is_powered, is_crewed, is_starter)
  VALUES (v_player2_id, v_starter_solar_id, true, true, true);

  INSERT INTO ledger_entries (player_id, round, transaction_type, amount, reason)
  VALUES (v_player2_id, 1, 'GAME_START', 50, 'Initial EV');

  -- Create Player 3: Operations Manager
  INSERT INTO players (name, specialization, ev, rep)
  VALUES ('Player 3', 'Operations Manager', 50, 10)
  RETURNING id INTO v_player3_id;

  INSERT INTO player_infrastructure (player_id, infrastructure_id, is_powered, is_crewed, is_starter)
  VALUES (v_player3_id, v_starter_habitat_id, true, true, true);

  INSERT INTO ledger_entries (player_id, round, transaction_type, amount, reason)
  VALUES (v_player3_id, 1, 'GAME_START', 50, 'Initial EV');

  -- Create Player 4: Resource Extractor (variation)
  INSERT INTO players (name, specialization, ev, rep)
  VALUES ('Player 4', 'Resource Extractor', 50, 10)
  RETURNING id INTO v_player4_id;

  INSERT INTO player_infrastructure (player_id, infrastructure_id, is_powered, is_crewed, is_starter)
  VALUES (v_player4_id, v_starter_h2o_id, true, true, true);

  INSERT INTO ledger_entries (player_id, round, transaction_type, amount, reason)
  VALUES (v_player4_id, 1, 'GAME_START', 50, 'Initial EV');

  -- Return success
  RETURN QUERY SELECT
    true,
    'Game reset successfully'::TEXT,
    4;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GET DASHBOARD SUMMARY
-- ============================================================================
-- Returns aggregated data for the dashboard display
CREATE OR REPLACE FUNCTION get_dashboard_summary()
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'game_state', (
      SELECT json_build_object(
        'round', current_round,
        'phase', current_phase,
        'version', version
      )
      FROM game_state
      WHERE id = 1
    ),
    'players', (
      SELECT json_agg(
        json_build_object(
          'id', p.id,
          'name', p.name,
          'specialization', p.specialization,
          'ev', p.ev,
          'rep', p.rep,
          'infrastructure', (
            SELECT json_agg(
              json_build_object(
                'type', id_def.type,
                'cost', id_def.cost,
                'maintenance_cost', id_def.maintenance_cost,
                'capacity', id_def.capacity,
                'yield', id_def.yield,
                'power_requirement', id_def.power_requirement,
                'crew_requirement', id_def.crew_requirement,
                'is_powered', pi.is_powered,
                'is_crewed', pi.is_crewed,
                'is_starter', pi.is_starter
              )
            )
            FROM player_infrastructure pi
            JOIN infrastructure_definitions id_def ON pi.infrastructure_id = id_def.id
            WHERE pi.player_id = p.id
          ),
          'totals', (
            SELECT json_build_object(
              'total_power_capacity', COALESCE(SUM(CASE WHEN id_def.capacity IS NOT NULL AND id_def.type LIKE '%Solar%' THEN id_def.capacity ELSE 0 END), 0),
              'total_power_used', COALESCE(SUM(CASE WHEN pi.is_powered = false AND id_def.power_requirement IS NOT NULL THEN 0 ELSE COALESCE(id_def.power_requirement, 0) END), 0),
              'total_crew_capacity', COALESCE(SUM(CASE WHEN id_def.capacity IS NOT NULL AND id_def.type LIKE '%Habitat%' THEN id_def.capacity ELSE 0 END), 0),
              'total_crew_used', COALESCE(SUM(CASE WHEN pi.is_crewed = false AND id_def.crew_requirement IS NOT NULL THEN 0 ELSE COALESCE(id_def.crew_requirement, 0) END), 0),
              'total_maintenance_cost', COALESCE(SUM(CASE WHEN pi.is_starter = false THEN id_def.maintenance_cost ELSE 0 END), 0),
              'total_yield', COALESCE(SUM(CASE WHEN pi.is_powered = true AND pi.is_crewed = true THEN COALESCE(id_def.yield, 0) ELSE 0 END), 0),
              'infrastructure_count', COUNT(*)
            )
            FROM player_infrastructure pi
            JOIN infrastructure_definitions id_def ON pi.infrastructure_id = id_def.id
            WHERE pi.player_id = p.id
          )
        )
        ORDER BY p.ev DESC, p.rep DESC
      )
      FROM players p
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION advance_phase IS 'Advances game phase with optimistic locking to prevent race conditions';
COMMENT ON FUNCTION reset_game IS 'Resets game to initial state with 4 default players';
COMMENT ON FUNCTION get_dashboard_summary IS 'Returns complete dashboard data including game state and player summaries';
