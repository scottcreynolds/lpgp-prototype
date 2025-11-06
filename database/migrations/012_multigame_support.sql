-- LPGP - Multi-game Support
-- Adds game_id scoping and RPCs that accept p_game_id

-- Enable gen_random_uuid if not enabled (Supabase usually has it)
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Add game_id to tables
ALTER TABLE IF EXISTS game_state ADD COLUMN IF NOT EXISTS game_id UUID;
ALTER TABLE IF EXISTS players ADD COLUMN IF NOT EXISTS game_id UUID;
ALTER TABLE IF EXISTS player_infrastructure ADD COLUMN IF NOT EXISTS game_id UUID;
ALTER TABLE IF EXISTS ledger_entries ADD COLUMN IF NOT EXISTS game_id UUID;
ALTER TABLE IF EXISTS contracts ADD COLUMN IF NOT EXISTS game_id UUID;

-- Backfill existing rows with a default game scoped by the single-row state
DO $$
DECLARE gid UUID;
BEGIN
  SELECT COALESCE(game_id, gen_random_uuid()) INTO gid FROM game_state WHERE id = 1;
  UPDATE game_state SET game_id = COALESCE(game_id, gid) WHERE id = 1;
  UPDATE players SET game_id = COALESCE(game_id, gid) WHERE game_id IS NULL;
  UPDATE player_infrastructure SET game_id = COALESCE(game_id, gid) WHERE game_id IS NULL;
  UPDATE ledger_entries SET game_id = COALESCE(game_id, gid) WHERE game_id IS NULL;
  UPDATE contracts SET game_id = COALESCE(game_id, gid) WHERE game_id IS NULL;
END $$;

-- Indexes for scoping
CREATE INDEX IF NOT EXISTS idx_game_state_game_id ON game_state(game_id);
CREATE INDEX IF NOT EXISTS idx_players_game_id ON players(game_id);
CREATE INDEX IF NOT EXISTS idx_pi_game_id ON player_infrastructure(game_id);
CREATE INDEX IF NOT EXISTS idx_ledger_game_id ON ledger_entries(game_id);
CREATE INDEX IF NOT EXISTS idx_contracts_game_id ON contracts(game_id);

-- 2) Ensure a game row exists (no default players)
CREATE OR REPLACE FUNCTION ensure_game(p_game_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO game_state (id, current_round, current_phase, version, created_at, updated_at, game_id)
  SELECT 1, 0, 'Setup', 0, NOW(), NOW(), p_game_id
  ON CONFLICT (id) DO NOTHING;

  -- If an existing row with id=1 exists for another game, insert a new row
  IF NOT EXISTS (SELECT 1 FROM game_state WHERE game_id = p_game_id) THEN
    INSERT INTO game_state (current_round, current_phase, version, created_at, updated_at, game_id)
    VALUES (0, 'Setup', 0, NOW(), NOW(), p_game_id);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 3) Scoped Dashboard Summary
CREATE OR REPLACE FUNCTION get_dashboard_summary(p_game_id UUID)
RETURNS JSON AS $$
DECLARE v_result JSON;
BEGIN
  SELECT json_build_object(
    'game_state', (
      SELECT json_build_object(
        'round', gs.current_round,
        'phase', gs.current_phase,
        'version', gs.version
      )
      FROM game_state gs
      WHERE gs.game_id = p_game_id
      ORDER BY gs.updated_at DESC
      LIMIT 1
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
              )
            )
            FROM player_infrastructure pi
            JOIN infrastructure_definitions id_def ON pi.infrastructure_id = id_def.id
            WHERE pi.player_id = p.id AND pi.game_id = p_game_id
            ORDER BY id_def.type
          ),
          'totals', (
            SELECT json_build_object(
              'total_power_capacity', COALESCE(SUM(CASE WHEN id_def.capacity IS NOT NULL AND id_def.type LIKE '%Solar%' AND pi.is_active = true THEN id_def.capacity ELSE 0 END), 0),
              'total_power_used', COALESCE(SUM(CASE WHEN pi.is_active = true AND id_def.power_requirement IS NOT NULL THEN id_def.power_requirement ELSE 0 END), 0),
              'total_crew_capacity', COALESCE(SUM(CASE WHEN id_def.capacity IS NOT NULL AND id_def.type LIKE '%Habitat%' AND pi.is_active = true THEN id_def.capacity ELSE 0 END), 0),
              'total_crew_used', COALESCE(SUM(CASE WHEN pi.is_active = true AND id_def.crew_requirement IS NOT NULL THEN id_def.crew_requirement ELSE 0 END), 0),
              'total_maintenance_cost', COALESCE(SUM(CASE WHEN pi.is_starter = false AND pi.is_active = true THEN id_def.maintenance_cost ELSE 0 END), 0),
              'total_yield', COALESCE(SUM(CASE WHEN pi.is_active = true THEN COALESCE(id_def.yield, 0) ELSE 0 END), 0),
              'infrastructure_count', COUNT(*),
              'available_power', get_available_power(p.id),
              'available_crew', get_available_crew(p.id)
            )
            FROM player_infrastructure pi
            JOIN infrastructure_definitions id_def ON pi.infrastructure_id = id_def.id
            WHERE pi.player_id = p.id AND pi.game_id = p_game_id
          )
        )
        ORDER BY p.ev DESC, p.rep DESC
      )
      FROM players p
      WHERE p.game_id = p_game_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_dashboard_summary IS 'Returns complete dashboard data for a game including game state, player summaries, and calculated capacities';

-- Reset game for a specific game_id
CREATE OR REPLACE FUNCTION reset_game(p_game_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  player_count INTEGER
) AS $$
DECLARE
  v_player_id UUID;
  v_starter_h2o_id UUID;
BEGIN
  -- Clear existing data for this game
  DELETE FROM ledger_entries WHERE game_id = p_game_id;
  DELETE FROM player_infrastructure WHERE game_id = p_game_id;
  DELETE FROM players WHERE game_id = p_game_id;

  -- Ensure a game_state row exists and reset it
  PERFORM ensure_game(p_game_id);
  UPDATE game_state
  SET current_round = 0,
      current_phase = 'Setup',
      version = 0,
      updated_at = NOW()
  WHERE game_id = p_game_id;

  -- Get starter infrastructure ID
  SELECT id INTO v_starter_h2o_id
  FROM infrastructure_definitions
  WHERE type = 'Starter H2O Extractor';

  -- Create default player for this game
  INSERT INTO players (name, specialization, ev, rep, game_id)
  VALUES ('Luna Corp', 'Resource Extractor', 50, 10, p_game_id)
  RETURNING id INTO v_player_id;

  INSERT INTO player_infrastructure (player_id, infrastructure_id, is_powered, is_crewed, is_starter, game_id)
  VALUES (v_player_id, v_starter_h2o_id, true, true, true, p_game_id);

  INSERT INTO ledger_entries (player_id, round, transaction_type, amount, reason, processed, game_id)
  VALUES (v_player_id, 1, 'GAME_START', 50, 'Initial EV', true, p_game_id);

  RETURN QUERY SELECT true, 'Game reset successfully'::TEXT, 1;
END;
$$ LANGUAGE plpgsql;

-- 4) Player management scoped to a game
CREATE OR REPLACE FUNCTION add_player(
  p_game_id UUID,
  player_name TEXT,
  player_specialization TEXT
) RETURNS TABLE (success BOOLEAN, message TEXT, player_id UUID) AS $$
DECLARE v_player_id UUID; v_starter_infra_id UUID; v_current_round INTEGER; BEGIN
  SELECT current_round INTO v_current_round FROM game_state WHERE game_id = p_game_id ORDER BY updated_at DESC LIMIT 1;

  INSERT INTO players (name, specialization, ev, rep, game_id)
  VALUES (player_name, player_specialization, 50, 10, p_game_id)
  RETURNING id INTO v_player_id;

  IF player_specialization = 'Resource Extractor' THEN
    SELECT id INTO v_starter_infra_id FROM infrastructure_definitions WHERE type = 'Starter H2O Extractor';
  ELSIF player_specialization = 'Infrastructure Provider' THEN
    SELECT id INTO v_starter_infra_id FROM infrastructure_definitions WHERE type = 'Starter Solar Array';
  ELSE
    SELECT id INTO v_starter_infra_id FROM infrastructure_definitions WHERE type = 'Starter Habitat';
  END IF;

  INSERT INTO player_infrastructure (player_id, infrastructure_id, is_powered, is_crewed, is_starter, game_id)
  VALUES (v_player_id, v_starter_infra_id, true, true, true, p_game_id);

  INSERT INTO ledger_entries (player_id, round, transaction_type, amount, reason, processed, game_id)
  VALUES (v_player_id, v_current_round, 'GAME_START', 50, 'Initial EV', true, p_game_id);

  RETURN QUERY SELECT true, 'Player added successfully'::TEXT, v_player_id;
END; $$ LANGUAGE plpgsql;

-- 5) Build infrastructure (scoped)
CREATE OR REPLACE FUNCTION build_infrastructure(
  p_game_id UUID,
  p_builder_id UUID,
  p_owner_id UUID,
  p_infrastructure_type TEXT,
  p_location TEXT
) RETURNS TABLE (success BOOLEAN, message TEXT, infrastructure_id UUID, new_ev INTEGER) AS $$
DECLARE v_infra_def_id UUID; v_cost INTEGER; v_builder_ev INTEGER; v_builder_name TEXT; v_owner_name TEXT; v_current_round INTEGER; v_new_infrastructure_id UUID; BEGIN
  SELECT current_round INTO v_current_round FROM game_state WHERE game_id = p_game_id ORDER BY updated_at DESC LIMIT 1;

  SELECT id, cost INTO v_infra_def_id, v_cost FROM infrastructure_definitions WHERE type = p_infrastructure_type AND is_starter = false;
  IF v_infra_def_id IS NULL THEN RETURN QUERY SELECT false, 'Infrastructure type not found or is starter infrastructure'::TEXT, NULL::UUID, NULL::INTEGER; RETURN; END IF;

  SELECT ev, name INTO v_builder_ev, v_builder_name FROM players WHERE id = p_builder_id AND game_id = p_game_id;
  SELECT name INTO v_owner_name FROM players WHERE id = p_owner_id AND game_id = p_game_id;
  IF v_builder_ev IS NULL THEN RETURN QUERY SELECT false, 'Builder not in game'::TEXT, NULL::UUID, NULL::INTEGER; RETURN; END IF;

  IF v_builder_ev < v_cost THEN RETURN QUERY SELECT false, format('Insufficient EV. Required: %s, Available: %s', v_cost, v_builder_ev)::TEXT, NULL::UUID, v_builder_ev; RETURN; END IF;

  UPDATE players SET ev = ev - v_cost WHERE id = p_builder_id AND game_id = p_game_id;

  INSERT INTO player_infrastructure (player_id, infrastructure_id, location, is_active, is_powered, is_crewed, is_starter, game_id)
  VALUES (p_owner_id, v_infra_def_id, p_location, false, false, false, false, p_game_id)
  RETURNING id INTO v_new_infrastructure_id;

  INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, infrastructure_id, metadata, game_id)
  VALUES (p_builder_id, v_builder_name, v_current_round, 'BUILD_INFRASTRUCTURE', v_cost, -v_cost, 0, format('Built %s at %s for %s', p_infrastructure_type, p_location, v_owner_name), true, v_new_infrastructure_id, json_build_object('builder_id', p_builder_id, 'owner_id', p_owner_id, 'infrastructure_type', p_infrastructure_type, 'location', p_location), p_game_id);

  RETURN QUERY SELECT true, 'Infrastructure built successfully'::TEXT, v_new_infrastructure_id, (v_builder_ev - v_cost);
END; $$ LANGUAGE plpgsql;

-- 6) Toggle infra active/dormant (scoped)
CREATE OR REPLACE FUNCTION toggle_infrastructure_status(
  p_game_id UUID,
  p_infrastructure_id UUID,
  p_target_status BOOLEAN
) RETURNS TABLE (success BOOLEAN, message TEXT, is_active BOOLEAN) AS $$
DECLARE v_player_id UUID; v_power_req INTEGER; v_crew_req INTEGER; v_available_power INTEGER; v_available_crew INTEGER; v_infra_type TEXT; v_current_status BOOLEAN; v_player_name TEXT; v_current_round INTEGER; BEGIN
  SELECT current_round INTO v_current_round FROM game_state WHERE game_id = p_game_id ORDER BY updated_at DESC LIMIT 1;

  SELECT pi.player_id, pi.is_active, idef.power_requirement, idef.crew_requirement, idef.type, p.name
    INTO v_player_id, v_current_status, v_power_req, v_crew_req, v_infra_type, v_player_name
    FROM player_infrastructure pi
    JOIN infrastructure_definitions idef ON pi.infrastructure_id = idef.id
    JOIN players p ON pi.player_id = p.id
    WHERE pi.id = p_infrastructure_id AND pi.game_id = p_game_id;
  IF v_player_id IS NULL THEN RETURN QUERY SELECT false, 'Infrastructure not found'::TEXT, false; RETURN; END IF;

  IF p_target_status = true AND v_current_status = false THEN
    SELECT get_available_power(v_player_id), get_available_crew(v_player_id) INTO v_available_power, v_available_crew;
    IF v_power_req IS NOT NULL AND v_available_power < v_power_req THEN RETURN QUERY SELECT false, format('Insufficient power. Required: %s, Available: %s', v_power_req, v_available_power)::TEXT, false; RETURN; END IF;
    IF v_crew_req IS NOT NULL AND v_available_crew < v_crew_req THEN RETURN QUERY SELECT false, format('Insufficient crew capacity. Required: %s, Available: %s', v_crew_req, v_available_crew)::TEXT, false; RETURN; END IF;
    UPDATE player_infrastructure SET is_active = true, is_powered = true, is_crewed = true WHERE id = p_infrastructure_id AND game_id = p_game_id;
    INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, infrastructure_id, game_id)
    VALUES (v_player_id, v_player_name, v_current_round, 'INFRASTRUCTURE_ACTIVATED', 0, 0, 0, format('Activated %s', v_infra_type), true, p_infrastructure_id, p_game_id);
    RETURN QUERY SELECT true, 'Infrastructure activated'::TEXT, true;
  ELSIF p_target_status = false AND v_current_status = true THEN
    UPDATE player_infrastructure SET is_active = false, is_powered = false, is_crewed = false WHERE id = p_infrastructure_id AND game_id = p_game_id;
    INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, infrastructure_id, game_id)
    VALUES (v_player_id, v_player_name, v_current_round, 'INFRASTRUCTURE_DEACTIVATED', 0, 0, 0, format('Deactivated %s', v_infra_type), true, p_infrastructure_id, p_game_id);
    RETURN QUERY SELECT true, 'Infrastructure deactivated'::TEXT, false;
  ELSE
    RETURN QUERY SELECT true, 'Already in target status'::TEXT, v_current_status;
  END IF;
END; $$ LANGUAGE plpgsql;

-- 7) Contracts (scoped)
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
  p_duration_rounds INTEGER DEFAULT NULL
) RETURNS TABLE (success BOOLEAN, message TEXT, contract_id UUID) AS $$
DECLARE v_current_round INTEGER; v_new_contract_id UUID; v_party_a_name TEXT; v_party_b_name TEXT; v_party_a_ev INTEGER; v_party_b_ev INTEGER; BEGIN
  SELECT current_round INTO v_current_round FROM game_state WHERE game_id = p_game_id ORDER BY updated_at DESC LIMIT 1;
  SELECT name, ev INTO v_party_a_name, v_party_a_ev FROM players WHERE id = p_party_a_id AND game_id = p_game_id;
  SELECT name, ev INTO v_party_b_name, v_party_b_ev FROM players WHERE id = p_party_b_id AND game_id = p_game_id;

  INSERT INTO contracts (party_a_id, party_b_id, ev_from_a_to_b, ev_from_b_to_a, ev_is_per_round, power_from_a_to_b, power_from_b_to_a, crew_from_a_to_b, crew_from_b_to_a, duration_rounds, rounds_remaining, status, created_in_round, game_id)
  VALUES (p_party_a_id, p_party_b_id, p_ev_from_a_to_b, p_ev_from_b_to_a, p_ev_is_per_round, p_power_from_a_to_b, p_power_from_b_to_a, p_crew_from_a_to_b, p_crew_from_b_to_a, p_duration_rounds, p_duration_rounds, 'active', v_current_round, p_game_id)
  RETURNING id INTO v_new_contract_id;

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

  INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, contract_id, game_id)
  VALUES (NULL, NULL, v_current_round, 'CONTRACT_CREATED', 0, 0, 0, format('Contract created between %s and %s', v_party_a_name, v_party_b_name), true, v_new_contract_id, p_game_id);

  RETURN QUERY SELECT true, 'Contract created successfully'::TEXT, v_new_contract_id;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION end_contract(
  p_game_id UUID,
  p_contract_id UUID,
  p_is_broken BOOLEAN DEFAULT false,
  p_reason TEXT DEFAULT NULL
) RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE v_contract RECORD; v_party_a RECORD; v_party_b RECORD; v_current_round INTEGER; BEGIN
  SELECT current_round INTO v_current_round FROM game_state WHERE game_id = p_game_id ORDER BY updated_at DESC LIMIT 1;
  SELECT * INTO v_contract FROM contracts WHERE id = p_contract_id AND game_id = p_game_id;
  IF v_contract IS NULL THEN RETURN QUERY SELECT false, 'Contract not found'::TEXT; RETURN; END IF;
  IF v_contract.status <> 'active' THEN RETURN QUERY SELECT false, 'Contract is not active'::TEXT; RETURN; END IF;
  SELECT * INTO v_party_a FROM players WHERE id = v_contract.party_a_id AND game_id = p_game_id;
  SELECT * INTO v_party_b FROM players WHERE id = v_contract.party_b_id AND game_id = p_game_id;

  UPDATE contracts SET status = CASE WHEN p_is_broken THEN 'broken' ELSE 'ended' END, ended_in_round = v_current_round, reason_for_ending = p_reason, updated_at = NOW() WHERE id = p_contract_id AND game_id = p_game_id;

  IF p_is_broken THEN
    UPDATE players SET rep = rep - 5 WHERE id IN (v_party_a.id, v_party_b.id) AND game_id = p_game_id;
    INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, contract_id, game_id)
    VALUES (v_party_a.id, v_party_a.name, v_current_round, 'CONTRACT_BROKEN', 0, 0, -5, format('Reputation penalty for breaking contract with %s', v_party_b.name), true, p_contract_id, p_game_id);
    INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, contract_id, game_id)
    VALUES (v_party_b.id, v_party_b.name, v_current_round, 'CONTRACT_BROKEN', 0, 0, -5, format('Reputation penalty for breaking contract with %s', v_party_a.name), true, p_contract_id, p_game_id);
  END IF;

  INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, contract_id, game_id)
  VALUES (NULL, NULL, v_current_round, CASE WHEN p_is_broken THEN 'CONTRACT_BROKEN' ELSE 'CONTRACT_ENDED' END, 0, 0, 0, COALESCE(p_reason, 'Contract ended'), true, p_contract_id, p_game_id);

  RETURN QUERY SELECT true, format('Contract %s successfully', CASE WHEN p_is_broken THEN 'broken' ELSE 'ended' END)::TEXT;
END; $$ LANGUAGE plpgsql;

-- 8) Manual adjustment (scoped)
CREATE OR REPLACE FUNCTION manual_adjustment(
  p_game_id UUID,
  p_player_id UUID,
  p_ev_change INTEGER DEFAULT 0,
  p_rep_change INTEGER DEFAULT 0,
  p_reason TEXT DEFAULT 'Manual adjustment'
) RETURNS TABLE (success BOOLEAN, message TEXT, new_ev INTEGER, new_rep INTEGER) AS $$
DECLARE v_player RECORD; v_current_round INTEGER; BEGIN
  SELECT current_round INTO v_current_round FROM game_state WHERE game_id = p_game_id ORDER BY updated_at DESC LIMIT 1;
  SELECT * INTO v_player FROM players WHERE id = p_player_id AND game_id = p_game_id;
  IF v_player IS NULL THEN RETURN QUERY SELECT false, 'Player not found'::TEXT, NULL::INTEGER, NULL::INTEGER; RETURN; END IF;
  UPDATE players SET ev = ev + p_ev_change, rep = rep + p_rep_change, updated_at = NOW() WHERE id = p_player_id AND game_id = p_game_id;
  INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, game_id)
  VALUES (p_player_id, v_player.name, v_current_round, 'MANUAL_ADJUSTMENT', p_ev_change, p_ev_change, p_rep_change, p_reason, true, p_game_id);
  RETURN QUERY SELECT true, 'Adjustment applied successfully'::TEXT, v_player.ev + p_ev_change, v_player.rep + p_rep_change;
END; $$ LANGUAGE plpgsql;

-- 9) Round end & advance (scoped)
CREATE OR REPLACE FUNCTION process_round_end(p_game_id UUID)
RETURNS TABLE (success BOOLEAN, message TEXT, summary JSONB) AS $$
DECLARE v_current_round INTEGER; v_total_maintenance INTEGER := 0; v_total_yields INTEGER := 0; v_total_contract_payments INTEGER := 0; v_contracts_expired INTEGER := 0; v_rec RECORD; BEGIN
  SELECT current_round INTO v_current_round FROM game_state WHERE game_id = p_game_id ORDER BY updated_at DESC LIMIT 1;

  FOR v_rec IN
    SELECT pi.player_id, p.name AS player_name, SUM(idf.maintenance_cost) AS total_maintenance
    FROM player_infrastructure pi
    JOIN infrastructure_definitions idf ON idf.id = pi.infrastructure_id
    JOIN players p ON p.id = pi.player_id
    WHERE pi.is_active = true AND pi.is_starter = false AND idf.maintenance_cost > 0 AND pi.game_id = p_game_id
    GROUP BY pi.player_id, p.name
  LOOP
    UPDATE players SET ev = ev - v_rec.total_maintenance WHERE id = v_rec.player_id AND game_id = p_game_id;
    INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, game_id)
    VALUES (v_rec.player_id, v_rec.player_name, v_current_round, 'MAINTENANCE', v_rec.total_maintenance, -v_rec.total_maintenance, 0, format('Round %s Maintenance', v_current_round), true, p_game_id);
    v_total_maintenance := v_total_maintenance + v_rec.total_maintenance;
  END LOOP;

  FOR v_rec IN
    SELECT pi.player_id, p.name AS player_name, idf.type, idf.yield
    FROM player_infrastructure pi
    JOIN infrastructure_definitions idf ON idf.id = pi.infrastructure_id
    JOIN players p ON p.id = pi.player_id
    WHERE pi.is_active = true AND idf.yield IS NOT NULL AND idf.yield > 0 AND pi.game_id = p_game_id
  LOOP
    UPDATE players SET ev = ev + v_rec.yield WHERE id = v_rec.player_id AND game_id = p_game_id;
    INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, game_id)
    VALUES (v_rec.player_id, v_rec.player_name, v_current_round, 'YIELD', v_rec.yield, v_rec.yield, 0, format('Yield from %s', v_rec.type), true, p_game_id);
    v_total_yields := v_total_yields + v_rec.yield;
  END LOOP;

  FOR v_rec IN
    SELECT c.id AS contract_id, c.party_a_id, c.party_b_id, pa.name AS party_a_name, pb.name AS party_b_name, c.ev_from_a_to_b, c.ev_from_b_to_a
    FROM contracts c
    JOIN players pa ON pa.id = c.party_a_id
    JOIN players pb ON pb.id = c.party_b_id
    WHERE c.status = 'active' AND c.ev_is_per_round = true AND (c.ev_from_a_to_b > 0 OR c.ev_from_b_to_a > 0) AND c.game_id = p_game_id
  LOOP
    IF v_rec.ev_from_a_to_b > 0 THEN
      UPDATE players SET ev = ev - v_rec.ev_from_a_to_b WHERE id = v_rec.party_a_id AND game_id = p_game_id;
      UPDATE players SET ev = ev + v_rec.ev_from_a_to_b WHERE id = v_rec.party_b_id AND game_id = p_game_id;
      INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, contract_id, game_id)
      VALUES (v_rec.party_a_id, v_rec.party_a_name, v_current_round, 'CONTRACT_PAYMENT', v_rec.ev_from_a_to_b, -v_rec.ev_from_a_to_b, 0, format('Round %s contract payment: %s → %s', v_current_round, v_rec.party_a_name, v_rec.party_b_name), true, v_rec.contract_id, p_game_id);
      INSERT INTO ledger_entries (...)
      SELECT v_rec.party_b_id, v_rec.party_b_name, v_current_round, 'CONTRACT_PAYMENT', v_rec.ev_from_a_to_b, v_rec.ev_from_a_to_b, 0, format('Round %s contract payment: %s → %s', v_current_round, v_rec.party_a_name, v_rec.party_b_name), true, v_rec.contract_id, p_game_id;
      v_total_contract_payments := v_total_contract_payments + v_rec.ev_from_a_to_b;
    END IF;
    IF v_rec.ev_from_b_to_a > 0 THEN
      UPDATE players SET ev = ev - v_rec.ev_from_b_to_a WHERE id = v_rec.party_b_id AND game_id = p_game_id;
      UPDATE players SET ev = ev + v_rec.ev_from_b_to_a WHERE id = v_rec.party_a_id AND game_id = p_game_id;
      INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, contract_id, game_id)
      VALUES (v_rec.party_b_id, v_rec.party_b_name, v_current_round, 'CONTRACT_PAYMENT', v_rec.ev_from_b_to_a, -v_rec.ev_from_b_to_a, 0, format('Round %s contract payment: %s → %s', v_current_round, v_rec.party_b_name, v_rec.party_a_name), true, v_rec.contract_id, p_game_id);
      INSERT INTO ledger_entries (...)
      SELECT v_rec.party_a_id, v_rec.party_a_name, v_current_round, 'CONTRACT_PAYMENT', v_rec.ev_from_b_to_a, v_rec.ev_from_b_to_a, 0, format('Round %s contract payment: %s → %s', v_current_round, v_rec.party_b_name, v_rec.party_a_name), true, v_rec.contract_id, p_game_id;
      v_total_contract_payments := v_total_contract_payments + v_rec.ev_from_b_to_a;
    END IF;
  END LOOP;

  UPDATE contracts SET rounds_remaining = rounds_remaining - 1 WHERE status = 'active' AND rounds_remaining IS NOT NULL AND game_id = p_game_id;

  FOR v_rec IN
    SELECT c.id AS contract_id, c.party_a_id, c.party_b_id, pa.name AS party_a_name, pb.name AS party_b_name
    FROM contracts c
    JOIN players pa ON pa.id = c.party_a_id
    JOIN players pb ON pb.id = c.party_b_id
    WHERE c.status = 'active' AND c.rounds_remaining IS NOT NULL AND c.rounds_remaining <= 0 AND c.game_id = p_game_id
  LOOP
    UPDATE contracts SET status = 'ended', ended_in_round = v_current_round, reason_for_ending = 'Duration expired' WHERE id = v_rec.contract_id AND game_id = p_game_id;
    INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, contract_id, game_id)
    VALUES (v_rec.party_a_id, v_rec.party_a_name, v_current_round, 'CONTRACT_ENDED', 0, 0, 0, format('Contract with %s expired', v_rec.party_b_name), true, v_rec.contract_id, p_game_id);
    INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, contract_id, game_id)
    VALUES (v_rec.party_b_id, v_rec.party_b_name, v_current_round, 'CONTRACT_ENDED', 0, 0, 0, format('Contract with %s expired', v_rec.party_a_name), true, v_rec.contract_id, p_game_id);
    v_contracts_expired := v_contracts_expired + 1;
  END LOOP;

  RETURN QUERY SELECT true, 'Round end processing completed'::TEXT, jsonb_build_object('round', v_current_round, 'total_maintenance', v_total_maintenance, 'total_yields', v_total_yields, 'total_contract_payments', v_total_contract_payments, 'contracts_expired', v_contracts_expired);
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION advance_round(p_game_id UUID, current_version INTEGER)
RETURNS TABLE (success BOOLEAN, new_round INTEGER, new_phase TEXT, new_version INTEGER, message TEXT) AS $$
DECLARE v_current_round INTEGER; v_current_phase TEXT; v_stored_version INTEGER; v_new_round INTEGER; v_new_phase TEXT := 'Governance'; BEGIN
  SELECT current_round, current_phase, version INTO v_current_round, v_current_phase, v_stored_version FROM game_state WHERE game_id = p_game_id ORDER BY updated_at DESC LIMIT 1 FOR UPDATE;
  IF v_stored_version != current_version THEN RETURN QUERY SELECT false, v_current_round, v_current_phase, v_stored_version, 'Version mismatch - another update occurred'::TEXT; RETURN; END IF;
  IF v_current_phase != 'Operations' THEN RETURN QUERY SELECT false, v_current_round, v_current_phase, v_stored_version, 'Advance Round is only allowed from Operations phase'::TEXT; RETURN; END IF;
  PERFORM * FROM process_round_end(p_game_id);
  UPDATE ledger_entries SET processed = true WHERE round = v_current_round AND game_id = p_game_id;
  v_new_round := v_current_round + 1;
  UPDATE game_state SET current_round = v_new_round, current_phase = v_new_phase, version = version + 1, updated_at = NOW() WHERE game_id = p_game_id;
  RETURN QUERY SELECT true, v_new_round, v_new_phase, v_stored_version + 1, 'Advanced to next round Governance'::TEXT;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION advance_phase(p_game_id UUID, current_version INTEGER)
RETURNS TABLE (success BOOLEAN, new_round INTEGER, new_phase TEXT, new_version INTEGER, error_message TEXT) AS $$
DECLARE v_current_round INTEGER; v_current_phase TEXT; v_stored_version INTEGER; v_new_round INTEGER; v_new_phase TEXT; BEGIN
  SELECT current_round, current_phase, version INTO v_current_round, v_current_phase, v_stored_version FROM game_state WHERE game_id = p_game_id ORDER BY updated_at DESC LIMIT 1 FOR UPDATE;
  IF v_stored_version != current_version THEN RETURN QUERY SELECT false, v_current_round, v_current_phase, v_stored_version, 'Version mismatch - another update occurred'::TEXT; RETURN; END IF;
  IF v_current_phase = 'Governance' THEN v_new_round := v_current_round; v_new_phase := 'Operations'; ELSE v_new_round := v_current_round + 1; v_new_phase := 'Governance'; END IF;
  UPDATE game_state SET current_round = v_new_round, current_phase = v_new_phase, version = version + 1, updated_at = NOW() WHERE game_id = p_game_id;
  RETURN QUERY SELECT true, v_new_round, v_new_phase, v_stored_version + 1, NULL::TEXT;
END; $$ LANGUAGE plpgsql;
