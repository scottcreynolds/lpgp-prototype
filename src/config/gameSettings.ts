// Central game configuration for win conditions and related behavior
// Threshold semantics: player must meet ALL non-zero thresholds (AND logic).
// A zero threshold means that dimension is ignored.
export const gameSettings = {
  win: {
    evThreshold: 500, // Economic Value required
    repThreshold: 0, // Reputation required (0 = ignore REP)
    autoWinEnabled: true,
  },
  // tieMode governs automatic threshold ties. "tiebreaker-ev-plus-rep" uses EV+REP first, then cooperative if still tied.
  tieMode: "tiebreaker-ev-plus-rep" as const,
};

export type VictoryType = "single" | "tiebreaker" | "cooperative";
