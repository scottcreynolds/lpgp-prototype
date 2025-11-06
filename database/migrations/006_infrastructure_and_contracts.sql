-- Lunar Policy Gaming Platform - Infrastructure and Contracts
-- Version 0.2
-- Adds contracts, inventory management, and enhanced ledger tracking

-- ============================================================================
-- MODIFY PLAYER_INFRASTRUCTURE TABLE
-- ============================================================================
-- Add location and active status fields to player_infrastructure
ALTER TABLE player_infrastructure
ADD COLUMN location TEXT,
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT false;

-- Create index for active infrastructure lookups
CREATE INDEX idx_player_infrastructure_active ON player_infrastructure(player_id, is_active);

-- Update existing records to be active if they're powered and crewed
UPDATE player_infrastructure
SET is_active = (is_powered AND is_crewed);

COMMENT ON COLUMN player_infrastructure.location IS 'Board space where infrastructure is placed';
COMMENT ON COLUMN player_infrastructure.is_active IS 'Whether infrastructure is currently active (has sufficient power and crew)';

-- ============================================================================
-- CONTRACTS TABLE
-- ============================================================================
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  party_a_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  party_b_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,

  -- EV Exchange
  ev_from_a_to_b INTEGER DEFAULT 0,
  ev_from_b_to_a INTEGER DEFAULT 0,
  ev_is_per_round BOOLEAN NOT NULL DEFAULT false,

  -- Capacity Exchange
  power_from_a_to_b INTEGER DEFAULT 0,
  power_from_b_to_a INTEGER DEFAULT 0,
  crew_from_a_to_b INTEGER DEFAULT 0,
  crew_from_b_to_a INTEGER DEFAULT 0,

  -- Duration and Status
  duration_rounds INTEGER, -- NULL = open-ended
  rounds_remaining INTEGER, -- Decrements each round, NULL = open-ended
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'ended', 'broken')
  ),

  -- Metadata
  created_in_round INTEGER NOT NULL,
  ended_in_round INTEGER,
  reason_for_ending TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure parties are different
  CHECK (party_a_id != party_b_id)
);

CREATE INDEX idx_contracts_party_a ON contracts(party_a_id);
CREATE INDEX idx_contracts_party_b ON contracts(party_b_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_active ON contracts(party_a_id, party_b_id, status) WHERE status = 'active';

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE contracts IS 'Player-to-player contracts for exchanging EV and capacity';
COMMENT ON COLUMN contracts.ev_is_per_round IS 'If true, EV is exchanged each round; if false, one-time on contract creation';
COMMENT ON COLUMN contracts.duration_rounds IS 'Total duration in rounds; NULL for open-ended contracts';
COMMENT ON COLUMN contracts.rounds_remaining IS 'Rounds left until auto-expiry; NULL for open-ended contracts';

-- ============================================================================
-- MODIFY LEDGER_ENTRIES TABLE
-- ============================================================================
-- Add new fields to ledger_entries for better tracking
ALTER TABLE ledger_entries
ADD COLUMN player_name TEXT,
ADD COLUMN ev_change INTEGER DEFAULT 0,
ADD COLUMN rep_change INTEGER DEFAULT 0,
ADD COLUMN processed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN infrastructure_id UUID REFERENCES player_infrastructure(id) ON DELETE SET NULL,
ADD COLUMN contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL;

-- Update existing records to populate new fields
UPDATE ledger_entries le
SET player_name = p.name
FROM players p
WHERE le.player_id = p.id;

-- Map existing amount to ev_change based on transaction type
UPDATE ledger_entries
SET ev_change = CASE
  WHEN transaction_type IN ('EV_GAIN', 'YIELD', 'GAME_START') THEN amount
  WHEN transaction_type IN ('EV_LOSS', 'BUILD_INFRASTRUCTURE', 'MAINTENANCE', 'COMMONS_MAINTENANCE') THEN -amount
  ELSE 0
END,
rep_change = CASE
  WHEN transaction_type = 'REP_GAIN' THEN amount
  WHEN transaction_type = 'REP_LOSS' THEN -amount
  ELSE 0
END;

-- Mark all existing entries as processed
UPDATE ledger_entries
SET processed = true;

-- Add new transaction types
ALTER TABLE ledger_entries DROP CONSTRAINT ledger_entries_transaction_type_check;
ALTER TABLE ledger_entries ADD CONSTRAINT ledger_entries_transaction_type_check
CHECK (
  transaction_type IN (
    'EV_GAIN', 'EV_LOSS', 'REP_GAIN', 'REP_LOSS',
    'BUILD_INFRASTRUCTURE', 'MAINTENANCE', 'YIELD',
    'MANUAL_ADJUSTMENT', 'GAME_START', 'COMMONS_MAINTENANCE',
    'CONTRACT_CREATED', 'CONTRACT_PAYMENT', 'CONTRACT_ENDED', 'CONTRACT_BROKEN',
    'INFRASTRUCTURE_ACTIVATED', 'INFRASTRUCTURE_DEACTIVATED'
  )
);

-- Create index for unprocessed entries
CREATE INDEX idx_ledger_processed ON ledger_entries(processed, round) WHERE processed = false;

COMMENT ON COLUMN ledger_entries.player_name IS 'Denormalized player name for easier reporting';
COMMENT ON COLUMN ledger_entries.ev_change IS 'Change in EV (positive or negative)';
COMMENT ON COLUMN ledger_entries.rep_change IS 'Change in REP (positive or negative)';
COMMENT ON COLUMN ledger_entries.processed IS 'Whether this entry has been applied to player totals';
COMMENT ON COLUMN ledger_entries.infrastructure_id IS 'Reference to infrastructure if applicable';
COMMENT ON COLUMN ledger_entries.contract_id IS 'Reference to contract if applicable';

-- ============================================================================
-- UPDATE EV CONSTRAINT ON PLAYERS
-- ============================================================================
-- Remove the CHECK constraint that prevents negative EV
-- This allows negative balances for maintenance/contract payments
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_ev_check;

COMMENT ON COLUMN players.ev IS 'Economic Value - can go negative for automated payments';
