-- Lunar Policy Gaming Platform - Initial Schema
-- Version 0.1

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- GAME STATE
-- ============================================================================
-- Single-row table tracking current game state with optimistic locking
CREATE TABLE game_state (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  current_round INTEGER NOT NULL DEFAULT 1,
  current_phase TEXT NOT NULL DEFAULT 'Governance' CHECK (current_phase IN ('Governance', 'Operations')),
  version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Initialize with default state
INSERT INTO game_state (id, current_round, current_phase, version)
VALUES (1, 1, 'Governance', 0);

-- ============================================================================
-- PLAYERS
-- ============================================================================
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  specialization TEXT NOT NULL CHECK (
    specialization IN ('Resource Extractor', 'Infrastructure Provider', 'Operations Manager')
  ),
  ev INTEGER NOT NULL DEFAULT 50 CHECK (ev >= 0),
  rep INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_players_ev ON players(ev DESC);
CREATE INDEX idx_players_rep ON players(rep DESC);

-- ============================================================================
-- INFRASTRUCTURE DEFINITIONS
-- ============================================================================
CREATE TABLE infrastructure_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL UNIQUE,
  cost INTEGER NOT NULL CHECK (cost >= 0),
  maintenance_cost INTEGER NOT NULL CHECK (maintenance_cost >= 0),
  capacity INTEGER CHECK (capacity IS NULL OR capacity > 0),
  yield INTEGER CHECK (yield IS NULL OR yield >= 0),
  power_requirement INTEGER CHECK (power_requirement IS NULL OR power_requirement >= 0),
  crew_requirement INTEGER CHECK (crew_requirement IS NULL OR crew_requirement >= 0),
  can_be_operated_by TEXT[] NOT NULL,
  is_starter BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PLAYER INFRASTRUCTURE
-- ============================================================================
CREATE TABLE player_infrastructure (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  infrastructure_id UUID NOT NULL REFERENCES infrastructure_definitions(id) ON DELETE CASCADE,
  is_powered BOOLEAN NOT NULL DEFAULT false,
  is_crewed BOOLEAN NOT NULL DEFAULT false,
  is_starter BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_player_infrastructure_player ON player_infrastructure(player_id);
CREATE INDEX idx_player_infrastructure_type ON player_infrastructure(infrastructure_id);

-- ============================================================================
-- LEDGER ENTRIES
-- ============================================================================
CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (
    transaction_type IN (
      'EV_GAIN', 'EV_LOSS', 'REP_GAIN', 'REP_LOSS',
      'BUILD_INFRASTRUCTURE', 'MAINTENANCE', 'YIELD',
      'MANUAL_ADJUSTMENT', 'GAME_START', 'COMMONS_MAINTENANCE'
    )
  ),
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ledger_player ON ledger_entries(player_id);
CREATE INDEX idx_ledger_round ON ledger_entries(round);
CREATE INDEX idx_ledger_type ON ledger_entries(transaction_type);
CREATE INDEX idx_ledger_created ON ledger_entries(created_at DESC);

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_game_state_updated_at BEFORE UPDATE ON game_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE game_state IS 'Single-row table tracking current round and phase with optimistic locking';
COMMENT ON TABLE players IS 'Player information including EV and REP scores';
COMMENT ON TABLE infrastructure_definitions IS 'Master list of all infrastructure types and their properties';
COMMENT ON TABLE player_infrastructure IS 'Junction table tracking which infrastructure each player owns';
COMMENT ON TABLE ledger_entries IS 'Audit log of all transactions for research purposes';
