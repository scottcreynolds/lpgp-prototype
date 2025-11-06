-- Lunar Policy Gaming Platform - Update Dashboard Summary
-- Version 0.2
-- Updates get_dashboard_summary to include new infrastructure fields and capacity calculations

-- ============================================================================
-- UPDATE GET DASHBOARD SUMMARY
-- ============================================================================
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
            WHERE pi.player_id = p.id
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

COMMENT ON FUNCTION get_dashboard_summary IS 'Returns complete dashboard data including game state, player summaries, and calculated capacities';
