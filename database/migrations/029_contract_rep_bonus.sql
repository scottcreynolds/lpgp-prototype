-- 029_contract_rep_bonus.sql
-- Adds +1 REP bonus to each party when a contract is created.
-- Mirrors mock client behavior and extends create_contract (multi-game version)
-- without changing its return signature.
--
-- Implementation details:
-- * After inserting the contract (and processing one-time EV payments),
--   increment rep for both parties.
-- * Create two ledger entries with transaction_type 'REP_GAIN' capturing the
--   reputation increase (amount=1, rep_change=1) and referencing the contract.
-- * Preserve existing system 'CONTRACT_CREATED' ledger entry for auditing.
--
-- Safe to run multiple times: function is CREATE OR REPLACE; REP bonus will
-- only be applied once per contract because it happens inside creation logic.

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

  -- Reputation bonus for entering into a contract (+1 each party)
  UPDATE players SET rep = rep + 1 WHERE id = p_party_a_id AND game_id = p_game_id;
  UPDATE players SET rep = rep + 1 WHERE id = p_party_b_id AND game_id = p_game_id;
  INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, contract_id, game_id)
  VALUES (p_party_a_id, v_party_a_name, v_current_round, 'REP_GAIN', 1, 0, 1, format('Reputation bonus for new contract with %s', v_party_b_name), true, v_new_contract_id, p_game_id);
  INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, contract_id, game_id)
  VALUES (p_party_b_id, v_party_b_name, v_current_round, 'REP_GAIN', 1, 0, 1, format('Reputation bonus for new contract with %s', v_party_a_name), true, v_new_contract_id, p_game_id);

  -- System-level creation entry (kept for audit trail)
  INSERT INTO ledger_entries (player_id, player_name, round, transaction_type, amount, ev_change, rep_change, reason, processed, contract_id, game_id)
  VALUES (NULL, NULL, v_current_round, 'CONTRACT_CREATED', 0, 0, 0, format('Contract created between %s and %s', v_party_a_name, v_party_b_name), true, v_new_contract_id, p_game_id);

  RETURN QUERY SELECT true, 'Contract created successfully'::TEXT, v_new_contract_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_contract(uuid, uuid, uuid, integer, integer, boolean, integer, integer, integer, integer, integer) IS 'Creates a contract between two players; awards +1 REP to each on creation.';

COMMIT;
