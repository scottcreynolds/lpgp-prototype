export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Specialization =
  | "Resource Extractor"
  | "Infrastructure Provider"
  | "Operations Manager";

export type GamePhase = "Setup" | "Governance" | "Operations";

export type TransactionType =
  | "EV_GAIN"
  | "EV_LOSS"
  | "REP_GAIN"
  | "REP_LOSS"
  | "BUILD_INFRASTRUCTURE"
  | "MAINTENANCE"
  | "YIELD"
  | "MANUAL_ADJUSTMENT"
  | "GAME_START"
  | "COMMONS_MAINTENANCE"
  | "CONTRACT_CREATED"
  | "CONTRACT_PAYMENT"
  | "CONTRACT_ENDED"
  | "CONTRACT_BROKEN"
  | "INFRASTRUCTURE_ACTIVATED"
  | "INFRASTRUCTURE_DEACTIVATED"
  | "GAME_ENDED";

export type ContractStatus = "active" | "ended" | "broken";

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
          game_id: string;
          ended?: boolean; // nullable for backward compatibility
          ended_at?: string | null;
          winner_player_ids?: string[] | null;
          victory_type?: string | null; // 'single' | 'tiebreaker' | 'cooperative'
          win_ev_threshold?: number | null;
          win_rep_threshold?: number | null;
        };
        Insert: {
          id?: number;
          current_round?: number;
          current_phase?: GamePhase;
          version?: number;
          created_at?: string;
          updated_at?: string;
          game_id?: string;
          ended?: boolean;
          ended_at?: string | null;
          winner_player_ids?: string[] | null;
          victory_type?: string | null;
          win_ev_threshold?: number | null;
          win_rep_threshold?: number | null;
        };
        Update: {
          id?: number;
          current_round?: number;
          current_phase?: GamePhase;
          version?: number;
          created_at?: string;
          updated_at?: string;
          game_id?: string;
          ended?: boolean;
          ended_at?: string | null;
          winner_player_ids?: string[] | null;
          victory_type?: string | null;
          win_ev_threshold?: number | null;
          win_rep_threshold?: number | null;
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
          game_id: string;
        };
        Insert: {
          id?: string;
          name: string;
          specialization: Specialization;
          ev?: number;
          rep?: number;
          created_at?: string;
          updated_at?: string;
          game_id?: string;
        };
        Update: {
          id?: string;
          name?: string;
          specialization?: Specialization;
          ev?: number;
          rep?: number;
          created_at?: string;
          updated_at?: string;
          game_id?: string;
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
          player_buildable: boolean;
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
          player_buildable?: boolean;
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
          player_buildable?: boolean;
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
          location: string | null;
          is_active: boolean;
          created_at: string;
          game_id: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          infrastructure_id: string;
          is_powered?: boolean;
          is_crewed?: boolean;
          is_starter?: boolean;
          location?: string | null;
          is_active?: boolean;
          created_at?: string;
          game_id?: string;
        };
        Update: {
          id?: string;
          player_id?: string;
          infrastructure_id?: string;
          is_powered?: boolean;
          is_crewed?: boolean;
          is_starter?: boolean;
          location?: string | null;
          is_active?: boolean;
          created_at?: string;
          game_id?: string;
        };
      };
      ledger_entries: {
        Row: {
          id: string;
          player_id: string | null;
          player_name: string | null;
          round: number;
          transaction_type: TransactionType;
          amount: number;
          ev_change: number;
          rep_change: number;
          reason: string;
          processed: boolean;
          infrastructure_id: string | null;
          contract_id: string | null;
          metadata: Json | null;
          created_at: string;
          game_id: string;
        };
        Insert: {
          id?: string;
          player_id?: string | null;
          player_name?: string | null;
          round: number;
          transaction_type: TransactionType;
          amount: number;
          ev_change?: number;
          rep_change?: number;
          reason: string;
          processed?: boolean;
          infrastructure_id?: string | null;
          contract_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
          game_id?: string;
        };
        Update: {
          id?: string;
          player_id?: string | null;
          player_name?: string | null;
          round?: number;
          transaction_type?: TransactionType;
          amount?: number;
          ev_change?: number;
          rep_change?: number;
          reason?: string;
          processed?: boolean;
          infrastructure_id?: string | null;
          contract_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
          game_id?: string;
        };
      };
      contracts: {
        Row: {
          id: string;
          party_a_id: string;
          party_b_id: string;
          ev_from_a_to_b: number;
          ev_from_b_to_a: number;
          ev_is_per_round: boolean;
          power_from_a_to_b: number;
          power_from_b_to_a: number;
          crew_from_a_to_b: number;
          crew_from_b_to_a: number;
          duration_rounds: number | null;
          rounds_remaining: number | null;
          status: ContractStatus;
          created_in_round: number;
          ended_in_round: number | null;
          reason_for_ending: string | null;
          created_at: string;
          updated_at: string;
          game_id: string;
        };
        Insert: {
          id?: string;
          party_a_id: string;
          party_b_id: string;
          ev_from_a_to_b?: number;
          ev_from_b_to_a?: number;
          ev_is_per_round?: boolean;
          power_from_a_to_b?: number;
          power_from_b_to_a?: number;
          crew_from_a_to_b?: number;
          crew_from_b_to_a?: number;
          duration_rounds?: number | null;
          rounds_remaining?: number | null;
          status?: ContractStatus;
          created_in_round: number;
          ended_in_round?: number | null;
          reason_for_ending?: string | null;
          created_at?: string;
          updated_at?: string;
          game_id?: string;
        };
        Update: {
          id?: string;
          party_a_id?: string;
          party_b_id?: string;
          ev_from_a_to_b?: number;
          ev_from_b_to_a?: number;
          ev_is_per_round?: boolean;
          power_from_a_to_b?: number;
          power_from_b_to_a?: number;
          crew_from_a_to_b?: number;
          crew_from_b_to_a?: number;
          duration_rounds?: number | null;
          rounds_remaining?: number | null;
          status?: ContractStatus;
          created_in_round?: number;
          ended_in_round?: number | null;
          reason_for_ending?: string | null;
          created_at?: string;
          updated_at?: string;
          game_id?: string;
        };
      };
    };
    Functions: {
      advance_round: {
        Args: { p_game_id: string; current_version: number };
        Returns: {
          success: boolean;
          new_round: number;
          new_phase: GamePhase;
          new_version: number;
          message: string | null;
        }[];
      };
      advance_phase: {
        Args: { p_game_id: string; current_version: number };
        Returns: {
          success: boolean;
          new_round: number;
          new_phase: GamePhase;
          new_version: number;
          error_message: string | null;
        }[];
      };
      reset_game: {
        Args: { p_game_id: string };
        Returns: {
          success: boolean;
          message: string;
          player_count: number;
        }[];
      };
      get_dashboard_summary: {
        Args: { p_game_id: string };
        Returns: Json;
      };
      build_infrastructure: {
        Args: {
          p_game_id: string;
          p_builder_id: string;
          p_owner_id: string;
          p_infrastructure_type: string;
          p_location: string;
        };
        Returns: {
          success: boolean;
          message: string;
          infrastructure_id: string | null;
          new_ev: number | null;
        }[];
      };
      toggle_infrastructure_status: {
        Args: {
          p_game_id: string;
          p_infrastructure_id: string;
          p_target_status: boolean;
        };
        Returns: {
          success: boolean;
          message: string;
          is_active: boolean;
        }[];
      };
      get_available_power: {
        Args: { p_player_id: string };
        Returns: number;
      };
      get_available_crew: {
        Args: { p_player_id: string };
        Returns: number;
      };
      create_contract: {
        Args: {
          p_game_id: string;
          p_party_a_id: string;
          p_party_b_id: string;
          p_ev_from_a_to_b?: number;
          p_ev_from_b_to_a?: number;
          p_ev_is_per_round?: boolean;
          p_power_from_a_to_b?: number;
          p_power_from_b_to_a?: number;
          p_crew_from_a_to_b?: number;
          p_crew_from_b_to_a?: number;
          p_duration_rounds?: number | null;
        };
        Returns: {
          success: boolean;
          message: string;
          contract_id: string | null;
        }[];
      };
      end_contract: {
        Args: {
          p_game_id: string;
          p_contract_id: string;
          p_is_broken?: boolean;
          p_reason?: string | null;
        };
        Returns: {
          success: boolean;
          message: string;
        }[];
      };
      manual_adjustment: {
        Args: {
          p_game_id: string;
          p_player_id: string;
          p_ev_change?: number;
          p_rep_change?: number;
          p_reason?: string;
        };
        Returns: {
          success: boolean;
          message: string;
          new_ev: number | null;
          new_rep: number | null;
        }[];
      };
      process_round_end: {
        Args: { p_game_id: string };
        Returns: {
          success: boolean;
          message: string;
          summary: Json;
        }[];
      };
      ensure_game: {
        Args: { p_game_id: string };
        Returns: void;
      };
      evaluate_end_game: {
        Args: {
          p_game_id: string;
          p_force?: boolean;
          p_ev_threshold?: number;
          p_rep_threshold?: number;
        };
        Returns: {
          success: boolean;
          ended: boolean;
          victory_type: string | null;
          winner_player_ids: string[] | null;
          threshold_met: boolean;
        }[];
      };
      list_games: {
        Args: Record<string, never>;
        Returns: {
          game_id: string;
          round: number;
          phase: string;
          updated_at: string;
          player_names: string[];
          player_count: number;
        }[];
      };
      delete_game: {
        Args: { p_game_id: string };
        Returns: {
          success: boolean;
          message: string;
        }[];
      };
    };
  };
}

// Derived types for easier use
export type GameState = Database["public"]["Tables"]["game_state"]["Row"];
export type Player = Database["public"]["Tables"]["players"]["Row"];
export type InfrastructureDefinition =
  Database["public"]["Tables"]["infrastructure_definitions"]["Row"];
export type PlayerInfrastructure =
  Database["public"]["Tables"]["player_infrastructure"]["Row"];
export type LedgerEntry =
  Database["public"]["Tables"]["ledger_entries"]["Row"] & {
    players?: { name: string } | null;
  };
export type Contract = Database["public"]["Tables"]["contracts"]["Row"];

// Admin listing types
export interface GameListItem {
  game_id: string;
  round: number;
  phase: string;
  updated_at: string;
  player_names: string[];
  player_count: number;
}

// Dashboard summary types
export interface PlayerInfrastructureItem {
  id: string;
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
  location: string | null;
  is_active: boolean;
}

export interface PlayerTotals {
  total_power_capacity: number;
  total_power_used: number;
  total_crew_capacity: number;
  total_crew_used: number;
  total_maintenance_cost: number;
  total_yield: number;
  infrastructure_count: number;
  available_power: number;
  available_crew: number;
  net_power_capacity: number;
  net_crew_capacity: number;
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
