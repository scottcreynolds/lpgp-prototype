-- Game End State & Evaluation RPC
-- Adds endgame columns, new transaction type GAME_ENDED, and evaluate_end_game(p_game_id,...)

ALTER TABLE game_state
ADD COLUMN IF NOT EXISTS ended BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS winner_player_ids TEXT[] NULL,
ADD COLUMN IF NOT EXISTS victory_type TEXT NULL,
ADD COLUMN IF NOT EXISTS win_ev_threshold INT NULL,
ADD COLUMN IF NOT EXISTS win_rep_threshold INT NULL;

-- Extend ledger transaction types to include GAME_ENDED
ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_transaction_type_check;
ALTER TABLE ledger_entries ADD CONSTRAINT ledger_entries_transaction_type_check
CHECK (
  transaction_type IN (
    'EV_GAIN','EV_LOSS','REP_GAIN','REP_LOSS','BUILD_INFRASTRUCTURE','MAINTENANCE','YIELD',
    'MANUAL_ADJUSTMENT','GAME_START','COMMONS_MAINTENANCE','CONTRACT_CREATED','CONTRACT_PAYMENT',
    'CONTRACT_ENDED','CONTRACT_BROKEN','INFRASTRUCTURE_ACTIVATED','INFRASTRUCTURE_DEACTIVATED','GAME_ENDED'
  )
);

-- Update dashboard summary to include ended fields (multi-game version)
CREATE OR REPLACE FUNCTION get_dashboard_summary(p_game_id UUID)
RETURNS JSON AS $$
DECLARE v_result JSON; BEGIN
  SELECT json_build_object(
    'game_state', (
      SELECT json_build_object(
        'round', gs.current_round,
        'phase', gs.current_phase,
        'version', gs.version,
        'ended', gs.ended,
        'victory_type', gs.victory_type,
        'winner_player_ids', gs.winner_player_ids
      ) FROM game_state gs WHERE gs.game_id = p_game_id ORDER BY gs.updated_at DESC LIMIT 1
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
                'id', pi.id,
                'type', id_def.type,
                'cost', id_def.cost,
                'maintenance_cost', id_def.maintenance_cost,
                'capacity', id_def.capacity,
                'yield', id_def.yield,
                'power_requirement', id_def.power_requirement,
                'crew_requirement', id_def.crew_requirement,
                'is_powered', pi.is_powered,
                'is_crewed', pi.is_crewed,
                'is_starter', pi.is_starter,
                'location', pi.location,
                'is_active', pi.is_active
              ) ORDER BY id_def.type
            ) FROM player_infrastructure pi JOIN infrastructure_definitions id_def ON pi.infrastructure_id = id_def.id WHERE pi.player_id = p.id AND pi.game_id = p_game_id
          ),
          'totals', (
            SELECT json_build_object(
              'total_power_capacity', COALESCE(SUM(CASE WHEN id_def.capacity IS NOT NULL AND id_def.type LIKE '%Solar%' AND pi.is_active = true THEN id_def.capacity ELSE 0 END),0),
              'total_power_used', COALESCE(SUM(CASE WHEN pi.is_active = true AND id_def.power_requirement IS NOT NULL THEN id_def.power_requirement ELSE 0 END),0),
              'total_crew_capacity', COALESCE(SUM(CASE WHEN id_def.capacity IS NOT NULL AND id_def.type LIKE '%Habitat%' AND pi.is_active = true THEN id_def.capacity ELSE 0 END),0),
              'total_crew_used', COALESCE(SUM(CASE WHEN pi.is_active = true AND id_def.crew_requirement IS NOT NULL THEN id_def.crew_requirement ELSE 0 END),0),
              'total_maintenance_cost', COALESCE(SUM(CASE WHEN pi.is_starter = false AND pi.is_active = true THEN id_def.maintenance_cost ELSE 0 END),0),
              'total_yield', COALESCE(SUM(CASE WHEN pi.is_active = true THEN COALESCE(id_def.yield,0) ELSE 0 END),0),
              'infrastructure_count', COUNT(*),
              'available_power', get_available_power(p.id),
              'available_crew', get_available_crew(p.id)
            ) FROM player_infrastructure pi JOIN infrastructure_definitions id_def ON pi.infrastructure_id = id_def.id WHERE pi.player_id = p.id AND pi.game_id = p_game_id
          )
        ) ORDER BY p.ev DESC, p.rep DESC
      ) FROM players p WHERE p.game_id = p_game_id
    )
  ) INTO v_result; RETURN v_result; END; $$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_dashboard_summary(uuid) IS 'Returns dashboard data including endgame state.';

-- Endgame evaluation RPC
CREATE OR REPLACE FUNCTION evaluate_end_game(
  p_game_id UUID,
  p_force BOOLEAN DEFAULT false,
  p_ev_threshold INT DEFAULT 500,
  p_rep_threshold INT DEFAULT 0
) RETURNS TABLE (
  success BOOLEAN,
  ended BOOLEAN,
  victory_type TEXT,
  winner_player_ids TEXT[],
  threshold_met BOOLEAN
) AS $$
DECLARE
  v_ended BOOLEAN;
  v_victory_type TEXT;
  v_winner_ids TEXT[];
  v_threshold_met BOOLEAN;
BEGIN
  SELECT ended, victory_type, winner_player_ids INTO v_ended, v_victory_type, v_winner_ids
  FROM game_state WHERE game_id = p_game_id ORDER BY updated_at DESC LIMIT 1;

  IF COALESCE(v_ended,false) THEN
    RETURN QUERY SELECT true, true, v_victory_type, v_winner_ids, true; -- already ended
    RETURN;
  END IF;

  -- Gather players
  WITH candidates AS (
    SELECT id, ev, rep, (ev + rep) AS score,
           CASE WHEN ev >= p_ev_threshold AND (p_rep_threshold = 0 OR rep >= p_rep_threshold) THEN true ELSE false END AS meets
    FROM players WHERE game_id = p_game_id
  )
  SELECT array_agg(id) FILTER (WHERE meets) INTO v_winner_ids FROM candidates WHERE meets;

  v_threshold_met := (v_winner_ids IS NOT NULL AND array_length(v_winner_ids,1) > 0);

  IF NOT v_threshold_met AND NOT p_force THEN
    RETURN QUERY SELECT true, false, NULL::TEXT, NULL::TEXT[], false; -- no end
    RETURN;
  END IF;

  -- Determine pool
  IF NOT v_threshold_met THEN
    -- Force path: rank all
    SELECT array_agg(id ORDER BY score DESC, ev DESC, rep DESC) INTO v_winner_ids FROM candidates;
  END IF;

  -- Resolve tiebreakers
  -- Compute top score among threshold or forced pool
  WITH pool AS (
    SELECT * FROM players WHERE game_id = p_game_id AND id = ANY(v_winner_ids)
  ), scored AS (
    SELECT id, ev, rep, (ev + rep) AS score FROM pool
  )
  SELECT array_agg(id) INTO v_winner_ids FROM scored WHERE score = (SELECT MAX(score) FROM scored);

  IF array_length(v_winner_ids,1) = 1 THEN
    v_victory_type := CASE WHEN v_threshold_met THEN 'single' ELSE 'tiebreaker' END;
  ELSE
    v_victory_type := 'cooperative';
  END IF;

  -- Persist end state
  UPDATE game_state
  SET ended = true,
      ended_at = NOW(),
      winner_player_ids = v_winner_ids,
      victory_type = v_victory_type,
      win_ev_threshold = p_ev_threshold,
      win_rep_threshold = p_rep_threshold,
      updated_at = NOW()
  WHERE game_id = p_game_id;

  -- Ledger broadcast (system entry)
  INSERT INTO ledger_entries (
    player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, infrastructure_id, contract_id, metadata, game_id
  ) VALUES (
    NULL, 'System', (SELECT current_round FROM game_state WHERE game_id = p_game_id ORDER BY updated_at DESC LIMIT 1),
    'GAME_ENDED', 0, 0, 0,
    CONCAT('Game ended - ', v_victory_type, ' victory'),
    true, NULL, NULL,
    jsonb_build_object('winners', v_winner_ids, 'victory_type', v_victory_type, 'ev_threshold', p_ev_threshold, 'rep_threshold', p_rep_threshold),
    p_game_id
  );

  RETURN QUERY SELECT true, true, v_victory_type, v_winner_ids, v_threshold_met;
END; $$ LANGUAGE plpgsql;

COMMENT ON FUNCTION evaluate_end_game IS 'Evaluates and persists game end state; supports forced manual termination.';
