-- LPGP - Set Starter Infrastructure Location
-- Version 0.1
-- Date: 2025-11-23
-- Adds RPC to set (or update) the board/location value for a player's starter infrastructure.
-- Multi-game aware via p_game_id.
-- Only updates starter infrastructure (is_starter = true) for the specified player.
-- Returns success boolean and message.

CREATE OR REPLACE FUNCTION set_starter_infrastructure_location(
  p_game_id UUID,
  p_player_id UUID,
  p_location TEXT
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_updated_count INTEGER := 0;
BEGIN
  IF p_player_id IS NULL THEN
    RETURN QUERY SELECT false, 'No player id provided'::TEXT; RETURN;
  END IF;

  UPDATE player_infrastructure
  SET location = NULLIF(TRIM(p_location), '')
  WHERE player_id = p_player_id
    AND is_starter = true
    AND game_id = p_game_id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count = 0 THEN
    RETURN QUERY SELECT false, 'Starter infrastructure not found for player'::TEXT; RETURN;
  END IF;

  RETURN QUERY SELECT true, 'Starter infrastructure location updated'::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_starter_infrastructure_location(uuid, uuid, text) IS 'Sets location for a player''s starter infrastructure in a specific game.';
