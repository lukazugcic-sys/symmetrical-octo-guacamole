export const STABLE_BEHAVIOR_BASELINE = {
  spin: {
    energyConsumedUnlessFreeSpin: true,
    gambleRoundsMax: 5,
  },
  rewards: {
    claimPendingWinOnce: true,
    missionsAndachievementsUpdatedOnClaim: true,
  },
  progression: {
    missionReplaceOnClaim: true,
    tournamentWeeklyReset: true,
    dungeonTokenPersistenceAcrossRuns: true,
  },
  heroes: {
    maxActive: 2,
  },
};
