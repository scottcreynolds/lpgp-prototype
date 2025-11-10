-- Fix ambiguous column references in evaluate_end_game
-- Qualify game_state columns to avoid ambiguity with OUT column names

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
  -- Qualify columns from game_state to avoid ambiguity with OUT params
  SELECT gs.ended, gs.victory_type, gs.winner_player_ids
    INTO v_ended, v_victory_type, v_winner_ids
  FROM game_state gs
  WHERE gs.game_id = p_game_id
  ORDER BY gs.updated_at DESC
  LIMIT 1;

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

  -- Persist end state (target table columns are unambiguous here)
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
    NULL, 'System', (
      SELECT gs.current_round FROM game_state gs WHERE gs.game_id = p_game_id ORDER BY gs.updated_at DESC LIMIT 1
    ),
    'GAME_ENDED', 0, 0, 0,
    CONCAT('Game ended - ', v_victory_type, ' victory'),
    true, NULL, NULL,
    jsonb_build_object('winners', v_winner_ids, 'victory_type', v_victory_type, 'ev_threshold', p_ev_threshold, 'rep_threshold', p_rep_threshold),
    p_game_id
  );

  RETURN QUERY SELECT true, true, v_victory_type, v_winner_ids, v_threshold_met;
END; $$ LANGUAGE plpgsql;

COMMENT ON FUNCTION evaluate_end_game IS 'Evaluates and persists game end state; supports forced manual termination.';
