import { createSaveEnvelope, unwrapSaveEnvelope } from './schema';

export const createRuntimeSaveSnapshot = (s) => ({
  igracRazina: s.igracRazina,
  prestigeRazina: s.prestigeRazina,
  xp: s.xp,
  energija: s.energija,
  zlato: s.zlato,
  dijamanti: s.dijamanti,
  resursi: s.resursi,
  gradevine: s.gradevine,
  ostecenja: s.ostecenja,
  razine: s.razine,
  stitovi: s.stitovi,
  misije: s.misije,
  tecaj: s.tecaj,
  trend: s.trend,
  luckySpinCounter: s.luckySpinCounter,
  winStreak: s.winStreak,
  aktivniSkin: s.aktivniSkin,
  spinBoostPreostalo: s.spinBoostPreostalo,
  stitRegenSekundi: s.stitRegenSekundi,
  raidPovijest: (s.raidPovijest ?? []).slice(0, 20),
  klanPopustAktivan: s.klanPopustAktivan,
  prestigeMilestones: s.prestigeMilestones,
  zadnjiVideniEventId: s.zadnjiVideniEventId,
  klan: s.klan,
  sezona: s.sezona,
  adsPogledanoDanas: s.adsPogledanoDanas,
  adsDatum: s.adsDatum,
  zadnjiOnlineMs: s.zadnjiOnlineMs,
  clanRat: s.clanRat,
  revengeTarget: s.revengeTarget,
  junaci: s.junaci,
  aktivniJunaci: s.aktivniJunaci,
  kovanice: s.kovanice,
  turnir: s.turnir,
  sandukDatum: s.sandukDatum,
  tamnica: s.tamnica,
});

export const serializeGameSave = (runtimeState) =>
  JSON.stringify(createSaveEnvelope(createRuntimeSaveSnapshot(runtimeState)));

export const deserializeGameSave = (serialized) => {
  try {
    const parsed = JSON.parse(serialized);
    const { schemaVersion, data } = unwrapSaveEnvelope(parsed);
    return {
      schemaVersion,
      data,
      savedAt: Number.isFinite(parsed?.savedAt) ? parsed.savedAt : 0,
      corrupted: !data,
    };
  } catch {
    return { schemaVersion: 0, data: null, savedAt: 0, corrupted: true };
  }
};

export const mergeByRecency = ({ localSavedAt, cloudSavedAt, localData, cloudData }) => {
  const l = Number.isFinite(localSavedAt) ? localSavedAt : 0;
  const c = Number.isFinite(cloudSavedAt) ? cloudSavedAt : 0;
  if (c > l) return { source: 'cloud', data: cloudData };
  return { source: 'local', data: localData };
};
