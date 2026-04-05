import { createSaveEnvelope, unwrapSaveEnvelope } from './schema';

export const RAID_HISTORY_LIMIT = 20;

export const createRuntimeSaveSnapshot = (s) => ({
  imeIgraca: s.imeIgraca,
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
  raidPovijest: Array.isArray(s.raidPovijest)
    ? s.raidPovijest.slice(0, RAID_HISTORY_LIMIT)
    : [],
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
  villageRooms: s.villageRooms,
  villagePressureDirector: s.villagePressureDirector,
  villageUnlockSeen: s.villageUnlockSeen,
  kovanice: s.kovanice,
  turnir: s.turnir,
  sandukDatum: s.sandukDatum,
  tamnica: s.tamnica,
});

export const serializeGameSave = (snapshot) =>
  JSON.stringify(createSaveEnvelope(snapshot));

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
  const localTimestamp = Number.isFinite(localSavedAt) ? localSavedAt : 0;
  const cloudTimestamp = Number.isFinite(cloudSavedAt) ? cloudSavedAt : 0;
  if (cloudTimestamp > localTimestamp) return { source: 'cloud', data: cloudData };
  return { source: 'local', data: localData };
};
