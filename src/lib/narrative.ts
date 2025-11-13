import narrativeData from "@/data/narrative.json";
import type { GamePhase } from "@/lib/database.types";
import type { NarrativeContent } from "@/types/narrative";

/**
 * Type guard to validate that an unknown object matches the NarrativeContent interface.
 */
function isNarrativeContent(obj: unknown): obj is NarrativeContent {
  if (typeof obj !== "object" || obj === null) return false;
  const n = obj as Record<string, unknown>;

  return (
    typeof n.id === "string" &&
    typeof n.phase === "string" &&
    typeof n.title === "string" &&
    typeof n.text === "string" &&
    (n.round === undefined || typeof n.round === "number") &&
    (n.image === undefined || typeof n.image === "string")
  );
}

/**
 * Validates and returns all narrative content from the data file.
 */
function getAllNarratives(): NarrativeContent[] {
  if (!Array.isArray(narrativeData)) {
    console.warn("narrative.json is not an array");
    return [];
  }

  return narrativeData.filter((item) => {
    if (!isNarrativeContent(item)) {
      console.warn("Invalid narrative content item:", item);
      return false;
    }
    return true;
  }) as NarrativeContent[];
}

/**
 * Gets the appropriate narrative content for a given phase and round.
 *
 * Prioritizes exact phase+round matches over phase-only matches.
 * Setup phase (round 0) uses phase matching only.
 *
 * @param phase - The current game phase
 * @param round - The current round number (0 for Setup)
 * @returns The matching narrative content, or null if none found
 */
export function getNarrativeForPhase(
  phase: GamePhase,
  round: number
): NarrativeContent | null {
  const narratives = getAllNarratives();

  // First, try to find an exact phase + round match
  const exactMatch = narratives.find(
    (n) => n.phase === phase && n.round === round
  );
  if (exactMatch) return exactMatch;

  // Fall back to phase-only match (no round specified)
  const phaseMatch = narratives.find(
    (n) => n.phase === phase && n.round === undefined
  );
  if (phaseMatch) return phaseMatch;

  return null;
}
