import tipsData from "@/data/tips.json";
import type { GamePhase } from "@/lib/database.types";
import type { Tip, TipsByPhase } from "@/types/tips";

// Basic runtime validation (lightweight, no external deps)
function isTip(obj: unknown): obj is Tip {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    (o.phase === "Setup" ||
      o.phase === "Governance" ||
      o.phase === "Operations") &&
    typeof o.icon === "string" &&
    typeof o.text === "string"
  );
}

const raw = Array.isArray(tipsData) ? (tipsData as unknown[]) : [];
const tipsArray: Tip[] = raw.filter(isTip);

const tipsByPhase: TipsByPhase = {
  Setup: [],
  Governance: [],
  Operations: [],
};
for (const tip of tipsArray) {
  tipsByPhase[tip.phase].push(tip);
}

export function getTipsForPhase(phase: GamePhase): Tip[] {
  return tipsByPhase[phase] ?? [];
}
