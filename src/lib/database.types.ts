export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Specialization =
  | 'Resource Extractor'
  | 'Infrastructure Provider'
  | 'Operations Manager';

export type GamePhase = 'Governance' | 'Operations';

export type TransactionType =
  | 'EV_GAIN'
  | 'EV_LOSS'
  | 'REP_GAIN'
  | 'REP_LOSS'
  | 'BUILD_INFRASTRUCTURE'
  | 'MAINTENANCE'
  | 'YIELD'
  | 'MANUAL_ADJUSTMENT'
  | 'GAME_START'
  | 'COMMONS_MAINTENANCE';

export interface Database {
  public: {
    Tables: {
      game_state: {
        Row: {
          id: number;
          current_round: number;
          current_phase: GamePhase;
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          current_round?: number;
          current_phase?: GamePhase;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          current_round?: number;
          current_phase?: GamePhase;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      players: {
        Row: {
          id: string;
          name: string;
          specialization: Specialization;
          ev: number;
          rep: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          specialization: Specialization;
          ev?: number;
          rep?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          specialization?: Specialization;
          ev?: number;
          rep?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      infrastructure_definitions: {
        Row: {
          id: string;
          type: string;
          cost: number;
          maintenance_cost: number;
          capacity: number | null;
          yield: number | null;
          power_requirement: number | null;
          crew_requirement: number | null;
          can_be_operated_by: Specialization[];
          is_starter: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: string;
          cost: number;
          maintenance_cost: number;
          capacity?: number | null;
          yield?: number | null;
          power_requirement?: number | null;
          crew_requirement?: number | null;
          can_be_operated_by: Specialization[];
          is_starter?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: string;
          cost?: number;
          maintenance_cost?: number;
          capacity?: number | null;
          yield?: number | null;
          power_requirement?: number | null;
          crew_requirement?: number | null;
          can_be_operated_by?: Specialization[];
          is_starter?: boolean;
          created_at?: string;
        };
      };
      player_infrastructure: {
        Row: {
          id: string;
          player_id: string;
          infrastructure_id: string;
          is_powered: boolean;
          is_crewed: boolean;
          is_starter: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          infrastructure_id: string;
          is_powered?: boolean;
          is_crewed?: boolean;
          is_starter?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          player_id?: string;
          infrastructure_id?: string;
          is_powered?: boolean;
          is_crewed?: boolean;
          is_starter?: boolean;
          created_at?: string;
        };
      };
      ledger_entries: {
        Row: {
          id: string;
          player_id: string | null;
          round: number;
          transaction_type: TransactionType;
          amount: number;
          reason: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          player_id?: string | null;
          round: number;
          transaction_type: TransactionType;
          amount: number;
          reason: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          player_id?: string | null;
          round?: number;
          transaction_type?: TransactionType;
          amount?: number;
          reason?: string;
          metadata?: Json | null;
          created_at?: string;
        };
      };
    };
    Functions: {
      advance_phase: {
        Args: { current_version: number };
        Returns: {
          success: boolean;
          new_round: number;
          new_phase: GamePhase;
          new_version: number;
          error_message: string | null;
        }[];
      };
      reset_game: {
        Args: Record<string, never>;
        Returns: {
          success: boolean;
          message: string;
          player_count: number;
        }[];
      };
      get_dashboard_summary: {
        Args: Record<string, never>;
        Returns: Json;
      };
    };
  };
}

// Derived types for easier use
export type GameState = Database['public']['Tables']['game_state']['Row'];
export type Player = Database['public']['Tables']['players']['Row'];
export type InfrastructureDefinition =
  Database['public']['Tables']['infrastructure_definitions']['Row'];
export type PlayerInfrastructure =
  Database['public']['Tables']['player_infrastructure']['Row'];
export type LedgerEntry = Database['public']['Tables']['ledger_entries']['Row'];

// Dashboard summary types
export interface PlayerInfrastructureItem {
  type: string;
  cost: number;
  maintenance_cost: number;
  capacity: number | null;
  yield: number | null;
  power_requirement: number | null;
  crew_requirement: number | null;
  is_powered: boolean;
  is_crewed: boolean;
  is_starter: boolean;
}

export interface PlayerTotals {
  total_power_capacity: number;
  total_power_used: number;
  total_crew_capacity: number;
  total_crew_used: number;
  total_maintenance_cost: number;
  total_yield: number;
  infrastructure_count: number;
}

export interface DashboardPlayer extends Player {
  infrastructure: PlayerInfrastructureItem[];
  totals: PlayerTotals;
}

export interface DashboardSummary {
  game_state: {
    round: number;
    phase: GamePhase;
    version: number;
  };
  players: DashboardPlayer[];
}
