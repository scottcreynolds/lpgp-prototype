-- Lunar Policy Gaming Platform - Seed Data
-- Version 0.1

-- ============================================================================
-- INFRASTRUCTURE DEFINITIONS
-- ============================================================================

-- Habitats
INSERT INTO infrastructure_definitions (
  type, cost, maintenance_cost, capacity, yield,
  power_requirement, crew_requirement, can_be_operated_by, is_starter
) VALUES (
  'Habitat',
  15,
  10,
  25,
  NULL,
  10,
  5,
  ARRAY['Operations Manager', 'Infrastructure Provider'],
  false
);

-- Solar Arrays
INSERT INTO infrastructure_definitions (
  type, cost, maintenance_cost, capacity, yield,
  power_requirement, crew_requirement, can_be_operated_by, is_starter
) VALUES (
  'Solar Array',
  10,
  5,
  25,
  NULL,
  NULL,
  5,
  ARRAY['Infrastructure Provider', 'Resource Extractor'],
  false
);

-- H2O Extractors
INSERT INTO infrastructure_definitions (
  type, cost, maintenance_cost, capacity, yield,
  power_requirement, crew_requirement, can_be_operated_by, is_starter
) VALUES (
  'H2O Extractor',
  10,
  5,
  NULL,
  12,
  5,
  5,
  ARRAY['Resource Extractor', 'Infrastructure Provider'],
  false
);

-- Helium-3 Extractors
INSERT INTO infrastructure_definitions (
  type, cost, maintenance_cost, capacity, yield,
  power_requirement, crew_requirement, can_be_operated_by, is_starter
) VALUES (
  'Helium-3 Extractor',
  20,
  5,
  NULL,
  20,
  5,
  5,
  ARRAY['Resource Extractor'],
  false
);

-- ============================================================================
-- STARTER INFRASTRUCTURE (Zero cost, used for player starting equipment)
-- ============================================================================

-- Starter H2O Extractor
INSERT INTO infrastructure_definitions (
  type, cost, maintenance_cost, capacity, yield,
  power_requirement, crew_requirement, can_be_operated_by, is_starter
) VALUES (
  'Starter H2O Extractor',
  0,
  0,
  NULL,
  12,
  NULL,
  NULL,
  ARRAY['Resource Extractor'],
  true
);

-- Starter Solar Array
INSERT INTO infrastructure_definitions (
  type, cost, maintenance_cost, capacity, yield,
  power_requirement, crew_requirement, can_be_operated_by, is_starter
) VALUES (
  'Starter Solar Array',
  0,
  0,
  25,
  NULL,
  NULL,
  NULL,
  ARRAY['Infrastructure Provider'],
  true
);

-- Starter Habitat
INSERT INTO infrastructure_definitions (
  type, cost, maintenance_cost, capacity, yield,
  power_requirement, crew_requirement, can_be_operated_by, is_starter
) VALUES (
  'Starter Habitat',
  0,
  0,
  25,
  NULL,
  NULL,
  NULL,
  ARRAY['Operations Manager'],
  true
);

-- ============================================================================
-- COMMONS INFRASTRUCTURE
-- ============================================================================
-- Commons are shared infrastructure tracked separately
-- For now, we'll track these as metadata rather than player-owned infrastructure

INSERT INTO infrastructure_definitions (
  type, cost, maintenance_cost, capacity, yield,
  power_requirement, crew_requirement, can_be_operated_by, is_starter
) VALUES (
  'Commons - Communications Tower',
  0,
  0,
  NULL,
  NULL,
  NULL,
  NULL,
  ARRAY['Resource Extractor', 'Infrastructure Provider', 'Operations Manager'],
  false
);

INSERT INTO infrastructure_definitions (
  type, cost, maintenance_cost, capacity, yield,
  power_requirement, crew_requirement, can_be_operated_by, is_starter
) VALUES (
  'Commons - Launch Pad',
  0,
  0,
  NULL,
  NULL,
  NULL,
  NULL,
  ARRAY['Resource Extractor', 'Infrastructure Provider', 'Operations Manager'],
  false
);

INSERT INTO infrastructure_definitions (
  type, cost, maintenance_cost, capacity, yield,
  power_requirement, crew_requirement, can_be_operated_by, is_starter
) VALUES (
  'Commons - Solar Array',
  0,
  0,
  50,
  NULL,
  NULL,
  NULL,
  ARRAY['Resource Extractor', 'Infrastructure Provider', 'Operations Manager'],
  false
);

INSERT INTO infrastructure_definitions (
  type, cost, maintenance_cost, capacity, yield,
  power_requirement, crew_requirement, can_be_operated_by, is_starter
) VALUES (
  'Commons - Habitat',
  0,
  0,
  50,
  NULL,
  NULL,
  NULL,
  ARRAY['Resource Extractor', 'Infrastructure Provider', 'Operations Manager'],
  false
);
