import type { GamePhase } from "@/lib/database.types";

export interface Tip {
  id: string;
  phase: GamePhase;
  icon: string; // mapped in UI
  text: string;
}

export type TipsByPhase = Record<GamePhase, Tip[]>;
