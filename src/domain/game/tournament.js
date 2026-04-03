import { TURNIR_RAZINE } from '../../config/constants';

export const resolveTournamentRank = (points = 0) => {
  for (let i = TURNIR_RAZINE.length - 1; i >= 0; i -= 1) {
    const rank = TURNIR_RAZINE[i];
    if (points >= rank.minBodova) return rank;
  }
  return TURNIR_RAZINE[0];
};

export const canClaimTournamentReward = (turnir, rankId) => {
  const def = TURNIR_RAZINE.find((r) => r.id === rankId);
  if (!def) return { ok: false, reason: 'missing_rank' };
  const bodovi = turnir?.bodovi ?? 0;
  if (bodovi < def.minBodova) return { ok: false, reason: 'insufficient_points' };
  if (turnir?.nagradePreuzete?.[rankId]) return { ok: false, reason: 'already_claimed' };
  return { ok: true, reward: def.nagrada, rank: def };
};
