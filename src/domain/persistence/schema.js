export const SAVE_SCHEMA_VERSION = 32;

export const SAVE_KEYS = {
  game: `@save_game_eco_v${SAVE_SCHEMA_VERSION}`,
  legacyV31: '@save_game_eco_v31',
  legacyV30: '@save_game_eco_v30',
  achievements: '@save_dostignuca_v1',
  daily: '@save_dnevna_v1',
};

export const createSaveEnvelope = (data) => ({
  schemaVersion: SAVE_SCHEMA_VERSION,
  savedAt: Date.now(),
  data,
});

export const unwrapSaveEnvelope = (payload) => {
  if (!payload || typeof payload !== 'object') return { schemaVersion: 0, data: null };
  if ('schemaVersion' in payload && 'data' in payload) {
    return {
      schemaVersion: Number.isFinite(payload.schemaVersion) ? payload.schemaVersion : 0,
      data: payload.data ?? null,
    };
  }
  return { schemaVersion: 0, data: payload };
};
