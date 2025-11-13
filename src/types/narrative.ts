import type { GamePhase } from "@/lib/database.types";

/**
 * Represents a narrative element that can be displayed during gameplay.
 * Narratives are triggered based on the current game phase and optionally a specific round.
 */
export interface NarrativeContent {
  /** Unique identifier for this narrative */
  id: string;

  /** The game phase during which this narrative should be displayed */
  phase: GamePhase;

  /** Optional: Specific round number when this narrative should appear (omit for phase-only matching) */
  round?: number;

  /** The title/heading of the narrative */
  title: string;

  /** The narrative text content (supports \n line breaks) */
  text: string;

  /** Optional: Path to an image asset to display with the narrative */
  image?: string;
}
