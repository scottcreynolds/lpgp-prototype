-- Game admin utilities: list and delete games
-- Provides list_games() and delete_game(p_game_id)

-- Lists all games with basic metadata
CREATE OR REPLACE FUNCTION list_games()
RETURNS TABLE (
  game_id UUID,
  round INTEGER,
  phase TEXT,
  updated_at TIMESTAMPTZ,
  player_names TEXT[],
  player_count INTEGER
) AS $$
  SELECT
    gs.game_id,
    COALESCE(gs.current_round, 0) AS round,
    COALESCE(gs.current_phase::TEXT, 'Setup') AS phase,
    gs.updated_at,
    COALESCE(
      (
        SELECT ARRAY(
          SELECT p.name
          FROM players p
          WHERE p.game_id = gs.game_id
          ORDER BY p.created_at ASC
        )
      ), ARRAY[]::TEXT[]
    ) AS player_names,
    (
      SELECT COUNT(*)::INT
      FROM players p
      WHERE p.game_id = gs.game_id
    ) AS player_count
  FROM game_state gs
  ORDER BY gs.updated_at DESC NULLS LAST;
$$ LANGUAGE sql STABLE;

-- Deletes a game and all related rows
CREATE OR REPLACE FUNCTION delete_game(p_game_id UUID)
RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
BEGIN
  -- Delete dependent rows first
  DELETE FROM contracts WHERE game_id = p_game_id;
  DELETE FROM ledger_entries WHERE game_id = p_game_id;
  DELETE FROM player_infrastructure WHERE game_id = p_game_id;
  DELETE FROM players WHERE game_id = p_game_id;
  DELETE FROM game_state WHERE game_id = p_game_id;

  RETURN QUERY SELECT true, 'Game deleted';
END;
$$ LANGUAGE plpgsql;
