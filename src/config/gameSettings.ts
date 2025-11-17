// Central game configuration for win conditions and related behavior
// Threshold semantics: player must meet ALL non-zero thresholds (AND logic).
// A zero threshold means that dimension is ignored.
export const gameSettings = {
  win: {
    evThreshold: 250, // Economic Value required
    repThreshold: 0, // Reputation required (0 = ignore REP)
    combinedThreshold: 250, // Combined EV + REP required
    autoWinEnabled: true,
  },
  // tieMode governs automatic threshold ties. "tiebreaker-ev-plus-rep" uses EV+REP first, then cooperative if still tied.
  tieMode: "tiebreaker-ev-plus-rep" as const,

  // Contract reputation adjustments throughout lifecycle
  // Set any value to 0 to disable that adjustment (no ledger entry created)
  contracts: {
    /** REP bonus awarded to both parties when a new contract is created */
    repBonusOnCreate: 2,
    /** REP bonus awarded to both parties at the end of each round the contract is active */
    repBonusPerRound: 2,
    /** REP bonus awarded to both parties when contract ends successfully (mutual or natural expiry) */
    repBonusOnCompletion: 5,
    /** REP penalty applied to the player who breaks a contract */
    repPenaltyBreaker: 10,
    /** REP penalty applied to the other party when a contract is broken (typically 0) */
    repPenaltyVictim: 0,
  },
};

export type VictoryType = "single" | "tiebreaker" | "cooperative";
