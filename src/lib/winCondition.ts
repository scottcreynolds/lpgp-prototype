import type { VictoryType } from "../config/gameSettings";
import { gameSettings } from "../config/gameSettings";
import type { DashboardPlayer } from "./database.types";

export interface WinEvaluationResult {
  winners: DashboardPlayer[];
  victoryType: VictoryType | null;
  ended: boolean; // whether a win condition was met/forced
  thresholdMet: boolean; // true if automatic threshold achieved
}

interface EvalOptions {
  force?: boolean; // manual end triggers ranking even if threshold not met
  evThreshold?: number;
  repThreshold?: number;
}

/**
 * Evaluates winners according to AND threshold logic and tie handling.
 * Automatic path: any players meeting EV >= evThreshold AND REP >= repThreshold (ignoring dimensions with threshold 0).
 * Tie path: if multiple threshold-met players, use EV+REP to select winner(s); if still tied announce cooperative.
 * Force path: if force=true and no threshold-met players, rank all by EV+REP; cooperative if top EV+REP tied.
 */
export function evaluateWinners(
  players: DashboardPlayer[],
  opts: EvalOptions = {}
): WinEvaluationResult {
  const evTh = opts.evThreshold ?? gameSettings.win.evThreshold;
  const repTh = opts.repThreshold ?? gameSettings.win.repThreshold;
  const force = opts.force ?? false;

  const meetsThreshold = (p: DashboardPlayer) => {
    const evOk = p.ev >= evTh;
    const repOk = repTh === 0 ? true : p.rep >= repTh;
    return evOk && repOk;
  };

  const thresholdWinners = players.filter(meetsThreshold);
  if (thresholdWinners.length === 0 && !force) {
    return {
      winners: [],
      victoryType: null,
      ended: false,
      thresholdMet: false,
    };
  }

  // If we have threshold winners, resolve ties among them; otherwise forced ranking of all players.
  const candidatePool =
    thresholdWinners.length > 0 ? thresholdWinners : players.slice();
  const thresholdMet = thresholdWinners.length > 0;

  // Sort by EV desc then REP desc for deterministic ordering
  candidatePool.sort((a, b) => {
    if (b.ev !== a.ev) return b.ev - a.ev;
    if (b.rep !== a.rep) return b.rep - a.rep;
    return a.name.localeCompare(b.name);
  });

  // If >1 and tieMode uses EV+REP tiebreaker
  const top = candidatePool[0];
  const topScore = top.ev + top.rep;
  const tiedOnScore = candidatePool.filter((p) => p.ev + p.rep === topScore);

  if (tiedOnScore.length === 1) {
    return {
      winners: [top],
      victoryType: thresholdMet ? "single" : "tiebreaker",
      ended: true,
      thresholdMet,
    };
  }

  // Cooperative victory if multiple tied on EV+REP
  return {
    winners: tiedOnScore,
    victoryType: "cooperative",
    ended: true,
    thresholdMet,
  };
}
