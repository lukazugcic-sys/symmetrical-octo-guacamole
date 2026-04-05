import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initDB, dbGet, dbSet } from '../db/database';
import {
  BAZA_TECAJ, ZGRADE, LUCKY_SPIN_INTERVAL, DNEVNE_NAGRADE,
  generirajMisiju, generirajUnikatneMisije, DOSTIGNUCA, generirajKlanZadatke,
  STIT_REGEN_INTERVAL_SEK, CIJENA_DVOSTRUKI_BOOST, TRAJANJE_DVOSTRUKI_BOOST,
  BATTLE_PASS_NAGRADE, BATTLE_PASS_MAX_RAZINA, BATTLE_PASS_TIER_XP, BATTLE_PASS_PREMIUM_CIJENA,
  BATTLE_PASS_SEASON_THEME, OFFLINE_MAX_SEK, MAX_AD_VIEWS_DNEVNO,
  JUNACI, HERO_DROP_TEZINE, HERO_FRAGMENTI_ZA_OTKLJ, HERO_FRAGMENTI_ZA_RAZINU,
  HERO_MAX_RAZINA, HERO_SUMMON_KOST, HERO_MAX_AKTIVNIH,
  RECEPTI, TURNIR_RAZINE, SANDUK_TIPOVI,
  TAMNICA_NEPRIJATELJI, TAMNICA_BOSSOVI, TAMNICA_KOST_ENERGIJE, TAMNICA_IGRAC_MAX_HP, TAMNICA_SHOP,
  TAMNICA_NAPAD_BAZA, TAMNICA_RANDOM_RASPON,
  VILLAGE_INCIDENT_CHANCE, VILLAGE_INCIDENT_COOLDOWN_MS,
  VILLAGE_PRESSURE_PHASES, VILLAGE_PRESSURE_SEQUENCE,
} from '../config/constants';
import { dohvatiAktivniDogadaj } from '../config/sezonalniDogadaji';
import { setupDungeonFloor } from '../domain/game/dungeon';
import { canClaimTournamentReward } from '../domain/game/tournament';
import { sanitizeClanName, sanitizePlayerName } from '../domain/validation/input';
import { SAVE_KEYS } from '../domain/persistence/schema';
import {
  createRuntimeSaveSnapshot,
  deserializeGameSave,
  mergeByRecency,
  RAID_HISTORY_LIMIT,
  serializeGameSave,
} from '../domain/persistence/savePayload';
import {
  izracunajMaxEnergiju, izracunajMaxStitova, izracunajPasivniMnozitelj,
  izracunajPotrebniXp, izracunajHeroBonus,
} from '../utils/economy';
import { randomFloat, randomInt } from '../utils/helpers';
import {
  createLegacyBuildingStateFromRooms,
  createLegacyVillageRooms,
  getHeroDefinition,
  getVillageIncidentResponse,
  getVillageIncidentRoom,
  getVillageProduction,
  getVillageRepairCost,
  getVillageRepairDurationMs,
  getVillageRoomDefinition,
  getVillageRoomUnlockStatus,
  getVillageSupportStats,
  normalizeVillageRooms,
} from '../utils/village';
import { spremiCloud, ucitajCloud }      from '../firebase/cloudSave';
import { azurirajLjestvicu } from '../firebase/leaderboard';
import { dodajBodoveClanRatu } from '../firebase/clanMultiplayer';

let cloudSaveTimeout = null;
const xpZaKlanRazinu = (razina = 1) => Math.max(1000, razina * 1000);
const BP_XP_DOGADAJI = {
  misija: 50,
  raid: 10,
  streak: 25,
  prestige: 500,
  spin: 1,
};
const TRAJANJE_SEZONE_MS = 30 * 24 * 60 * 60 * 1000;
const TRAJANJE_TJEDNA_MS = 7 * 24 * 60 * 60 * 1000;
const RAID_ID_UPPER_BOUND = 1000000000;

const tjedanBroj = (datum = new Date()) =>
  Math.floor(datum.getTime() / TRAJANJE_TJEDNA_MS);

const noviTurnir = (datum = new Date()) => ({
  tjedniBroj: tjedanBroj(datum),
  bodovi: 0,
  nagradePreuzete: {},
});

const pocetnoTamnicaStanje = {
  aktivna:      false,
  sprat:        0,
  maxSprat:     0,
  neprijHp:     0,
  neprijMaxHp:  0,
  neprijTipId:  null,
  neprijBoss:   false,
  igracHp:      TAMNICA_IGRAC_MAX_HP,
  igracMaxHp:   TAMNICA_IGRAC_MAX_HP,
  tokenovi:     0,
  snagaRazina:  0,
  obranaRazina: 0,
  vampirRazina: 0,
  zadnjiIshod:  null,
};

const odrediThemeSezone = (datum = new Date()) => {
  const aktivniDogadaj = dohvatiAktivniDogadaj(datum);
  const key = aktivniDogadaj?.id ?? 'default';
  return BATTLE_PASS_SEASON_THEME[key] ?? BATTLE_PASS_SEASON_THEME.default;
};

const pocetakSezoneMs = (datum = new Date()) =>
  Math.floor(datum.getTime() / TRAJANJE_SEZONE_MS) * TRAJANJE_SEZONE_MS;

const brojSezone = (datum = new Date()) =>
  Math.floor(datum.getTime() / TRAJANJE_SEZONE_MS);

const novaSezona = (datum = new Date()) => {
  const startMs = pocetakSezoneMs(datum);
  const endMs = startMs + TRAJANJE_SEZONE_MS;
  return {
    sezonaBroj: brojSezone(datum),
    sezonaBP_XP: 0,
    sezonaBP_razina: 0,
    sezonaPremium: false,
    sezonaStartMs: startMs,
    sezonaEndMs: endMs,
    sezonaTheme: odrediThemeSezone(datum),
    bpClaimedFree: {},
    bpClaimedPremium: {},
  };
};

const zakaziCloudSpremanje = (uid, payload) => {
  if (!uid) return;
  if (cloudSaveTimeout) clearTimeout(cloudSaveTimeout);
  useGameStore.setState({ cloudSaveStatus: 'saving' });
  cloudSaveTimeout = setTimeout(() => {
    spremiCloud(uid, payload)
      .then(() => {
        useGameStore.setState({ cloudSaveStatus: 'saved' });
        // Auto-hide "saved" status after 3s
        setTimeout(() => {
          const current = useGameStore.getState().cloudSaveStatus;
          if (current === 'saved') useGameStore.setState({ cloudSaveStatus: 'idle' });
        }, 3000);
      })
      .catch(() => useGameStore.setState({ cloudSaveStatus: 'error' }));
  }, 3000);
};

const isValidCloudState = (state) =>
  !!(state && typeof state === 'object' && !Array.isArray(state));

const getCloudSavedAt = (state) => {
  if (!isValidCloudState(state)) return 0;
  if (Number.isFinite(state.savedAt)) return state.savedAt;
  const timestampMs = state.azurirano?.toMillis?.();
  return Number.isFinite(timestampMs) ? timestampMs : 0;
};

// Bira nasumičnog junaka prema težinskom poolu (HERO_DROP_TEZINE)
const selectRandomHeroByWeight = () => {
  const pool = [];
  JUNACI.forEach((hero) => {
    const w = HERO_DROP_TEZINE[hero.raritet] ?? 10;
    for (let i = 0; i < w; i++) pool.push(hero.id);
  });
  if (!pool.length) return null;
  return pool[randomInt(pool.length)];
};

const PRAZNI_KLAN = {
  naziv:         null,
  razina:        0,
  xp:            0,
  zadaci:        [],
  zadnjiRefresh: null,
};

const POCETNE_GRADEVINE = { pilana: 1, kamenolom: 0, rudnik: 0 };
const POCETNA_OSTECENJA = { pilana: false, kamenolom: false, rudnik: false };
const POCETNA_VILLAGE_PRESSURE_PHASE = 'calm';

const getVillagePressurePhaseMeta = (phaseId) =>
  VILLAGE_PRESSURE_PHASES[phaseId] ?? VILLAGE_PRESSURE_PHASES[POCETNA_VILLAGE_PRESSURE_PHASE];

const getVillagePressurePhaseDurationMs = (phaseId) => {
  const meta = getVillagePressurePhaseMeta(phaseId);
  const min = Math.max(20000, meta.durationMinMs ?? 60000);
  const max = Math.max(min, meta.durationMaxMs ?? min);
  return min + randomInt((max - min) + 1);
};

const createVillagePressureDirector = (phase = POCETNA_VILLAGE_PRESSURE_PHASE, now = Date.now(), cycle = 0) => ({
  phase,
  phaseStartedAt: now,
  phaseEndsAt: now + getVillagePressurePhaseDurationMs(phase),
  cycle,
});

const normalizeVillagePressureDirector = (director) => {
  const phase = director?.phase && VILLAGE_PRESSURE_PHASES[director.phase]
    ? director.phase
    : POCETNA_VILLAGE_PRESSURE_PHASE;
  const phaseStartedAt = Number.isFinite(director?.phaseStartedAt) ? director.phaseStartedAt : Date.now();
  const phaseEndsAt = Number.isFinite(director?.phaseEndsAt) && director.phaseEndsAt > phaseStartedAt
    ? director.phaseEndsAt
    : phaseStartedAt + getVillagePressurePhaseDurationMs(phase);
  const cycle = Math.max(0, Number(director?.cycle) || 0);

  return {
    phase,
    phaseStartedAt,
    phaseEndsAt,
    cycle,
  };
};

const getNextVillagePressureDirector = (director, now = Date.now()) => {
  const currentPhase = director?.phase && VILLAGE_PRESSURE_PHASES[director.phase]
    ? director.phase
    : POCETNA_VILLAGE_PRESSURE_PHASE;
  const currentIndex = Math.max(0, VILLAGE_PRESSURE_SEQUENCE.indexOf(currentPhase));
  const nextPhase = VILLAGE_PRESSURE_SEQUENCE[(currentIndex + 1) % VILLAGE_PRESSURE_SEQUENCE.length] ?? POCETNA_VILLAGE_PRESSURE_PHASE;
  const nextCycle = nextPhase === POCETNA_VILLAGE_PRESSURE_PHASE
    ? (Math.max(0, Number(director?.cycle) || 0) + 1)
    : Math.max(0, Number(director?.cycle) || 0);
  return createVillagePressureDirector(nextPhase, now, nextCycle);
};

const pocetnoStanje = {
  ucitavam:         true,
  uid:              null,       // Firebase UID (postavlja useAuth)
  imeIgraca:        'Igrač',   // prikazno ime za ljestvicu
  igracRazina:      1,
  prestigeRazina:   0,
  xp:               0,
  energija:         10,
  zlato:            50,
  dijamanti:        5,
  resursi:          { drvo: 0, kamen: 0, zeljezo: 0 },
  stitovi:          1,
  gradevine:        { ...POCETNE_GRADEVINE },
  ostecenja:        { ...POCETNA_OSTECENJA },
  villageRooms:     createLegacyVillageRooms(POCETNE_GRADEVINE, POCETNA_OSTECENJA),
  razine:           { sreca: 0, pojacalo: 0, baterija: 0, oklop: 0 },
  misije:           generirajUnikatneMisije(3),
  ukupnoVrtnji:     0,
  ukupnoZlata:      0,
  ukupnoRaidova:    0,
  dostignucaDone:   {},
  dnevniStreak:     0,
  prikazDnevneNagrade: false,
  dnevnaNagrada:    null,
  tecaj:            BAZA_TECAJ,
  trend:            { drvo: 0, kamen: 0, zeljezo: 0, dijamant: 0 },
  luckySpinCounter: LUCKY_SPIN_INTERVAL,
  winStreak:        0,
  poruka:           'SPREMAN ZA VRTNJU',
  levelUpData:      null, // { razina: N } — pokreće LevelUpToast
  villageUnlockData: null, // { roomId, roomType }
  villageUnlockQueue: [],
  villageUnlockSeen: [],
  aktivniSkin:      'default', // ID aktivnog skina zgrada
  spinBoostPreostalo: 0, // gold sink: sljedećih N spinova daju 2x dobitak
  stitRegenSekundi: STIT_REGEN_INTERVAL_SEK,
  raidPovijest:     [],
  cloudSaveStatus:  'idle', // idle | saving | saved | error
  zadnjiCloudPayload: null,
  klanPopustAktivan: false,
  prestigeMilestones: {},
  zadnjiVideniEventId: null,
  klan:             { ...PRAZNI_KLAN }, // Klan / Ceh igrača
  sezona:           novaSezona(),
  offlineBonus:     null,
  zadnjiOnlineMs:   Date.now(),
  adsPogledanoDanas: 0,
  adsDatum:         new Date().toDateString(),
  clanRat: {
    aktivan: false,
    warId: null,
    klanA: null,
    klanB: null,
    bodovi: { A: 0, B: 0 },
    pocelo: null,
    zavrsilo: null,
    status: 'idle',
    nagrada: null,
  },
  revengeTarget: null,
  zadnjiVillageIncidentMs: 0,
  villagePressureDirector: createVillagePressureDirector(),
  junaci:        {}, // map: heroId → { fragmenti: number, razina: number }
  aktivniJunaci: [], // max HERO_MAX_AKTIVNIH active hero IDs
  kovanice:      {}, // map: receptId → { expiresAt: ms } — active crafted item bonuses
  turnir:        noviTurnir(), // weekly tournament state
  sandukDatum:   '', // date string when free chest was last opened
  tamnica:       { ...pocetnoTamnicaStanje }, // dungeon system
};

export const useGameStore = create((set, get) => ({
  ...pocetnoStanje,

  // ─── UI poruka ─────────────────────────────────────────────────────────────
  setPoruka: (poruka) => set({ poruka }),

  // ─── Level up overlay ───────────────────────────────────────────────────────
  clearLevelUp: () => set({ levelUpData: null }),

  // ─── Village unlock overlay ────────────────────────────────────────────────
  showVillageUnlock: (roomId, roomType) => set((state) => {
    if (!roomId || state.villageUnlockSeen.includes(roomId)) return {};
    if (state.villageUnlockData?.roomId === roomId || state.villageUnlockQueue.some((item) => item.roomId === roomId)) return {};

    const nextUnlock = { roomId, roomType };
    if (state.villageUnlockData) {
      return {
        villageUnlockQueue: [...state.villageUnlockQueue, nextUnlock],
        villageUnlockSeen: [...state.villageUnlockSeen, roomId],
      };
    }

    return {
      villageUnlockData: nextUnlock,
      villageUnlockSeen: [...state.villageUnlockSeen, roomId],
    };
  }),
  clearVillageUnlock: () => set((state) => {
    if (state.villageUnlockQueue.length === 0) {
      return { villageUnlockData: null };
    }

    const [nextUnlock, ...restQueue] = state.villageUnlockQueue;
    return {
      villageUnlockData: nextUnlock,
      villageUnlockQueue: restQueue,
    };
  }),

  // ─── Perzistencija ─────────────────────────────────────────────────────────

  /**
   * Pomoćna funkcija: ako SQLite nema zapis za 'key', pokušaj prenijeti podatak
   * iz AsyncStorage-a i odmah ga upiši u SQLite (jednokratna migracija).
   * Nakon prijenosa, AsyncStorage ključ se briše.
   * @returns {Promise<string|null>} JSON string ili null
   */
  _migriraiAkoTreba: async (key) => {
    const inDb = await dbGet(key);
    if (inDb !== null) return inDb;

    try {
      const legacy = await AsyncStorage.getItem(key);
      if (legacy) {
        await dbSet(key, legacy);
        await AsyncStorage.removeItem(key);
        return legacy;
      }
    } catch (e) {
      console.warn('Legacy migration from AsyncStorage failed:', e);
    }
    return null;
  },

  ucitaj: async () => {
    try {
      // Inicijaliziraj SQLite bazu i shemu
      await initDB();

      const migriraiAkoTreba = get()._migriraiAkoTreba;

      // ─── Glavno stanje igre ───────────────────────────────────────────────
      let p = await migriraiAkoTreba(SAVE_KEYS.game);
      let sourceKey = SAVE_KEYS.game;
      if (!p) {
        p = await migriraiAkoTreba(SAVE_KEYS.legacyV31);
        sourceKey = SAVE_KEYS.legacyV31;
      }
      if (!p) {
        p = await migriraiAkoTreba(SAVE_KEYS.legacyV30);
        sourceKey = SAVE_KEYS.legacyV30;
      }
      const loaded = p
        ? deserializeGameSave(p)
        : { schemaVersion: 0, data: null, savedAt: 0, corrupted: false };
      let d = loaded.data || {};
      let odabraniIzvor = p ? 'local' : 'default';

      if (get().uid) {
        try {
          const cloudState = await ucitajCloud(get().uid);
          if (isValidCloudState(cloudState)) {
            const cloudData = cloudState.data ?? cloudState;
            if (!p) {
              d = cloudData || d;
              odabraniIzvor = 'cloud';
            } else {
              const merge = mergeByRecency({
                localSavedAt: loaded.savedAt,
                cloudSavedAt: getCloudSavedAt(cloudState),
                localData: d,
                cloudData: cloudData ?? d,
              });
              d = merge.data || d;
              odabraniIzvor = merge.source;
            }
          }
        } catch {
          // fallback na lokalno/sigurno zadano
        }
      }

      if (p || odabraniIzvor === 'cloud') {
        const novaSezonaBroj = brojSezone(new Date());
        const spremljenaSezona = d.sezona || null;
        const sezonaZaSet =
          spremljenaSezona && spremljenaSezona.sezonaBroj === novaSezonaBroj
            ? {
              ...novaSezona(),
              ...spremljenaSezona,
              bpClaimedFree: spremljenaSezona.bpClaimedFree ?? {},
              bpClaimedPremium: spremljenaSezona.bpClaimedPremium ?? {},
            }
            : novaSezona();
        const normalizedVillageRooms = normalizeVillageRooms(
          d.villageRooms,
          d.gradevine ?? get().gradevine,
          d.ostecenja ?? get().ostecenja,
        );
        const legacyVillageState = createLegacyBuildingStateFromRooms(normalizedVillageRooms);
        set({
          ...(d.imeIgraca ? { imeIgraca: sanitizePlayerName(d.imeIgraca) || get().imeIgraca } : {}),
          ...(d.igracRazina                                          ? { igracRazina: d.igracRazina }                           : {}),
          ...(d.prestigeRazina                                       ? { prestigeRazina: d.prestigeRazina }                     : {}),
          ...(d.xp                                                   ? { xp: d.xp }                                             : {}),
          ...(d.energija !== undefined && !isNaN(d.energija)         ? { energija: d.energija }                                 : {}),
          ...(d.zlato !== undefined    && !isNaN(d.zlato)            ? { zlato: d.zlato }                                       : {}),
          ...(d.dijamanti !== undefined && !isNaN(d.dijamanti)       ? { dijamanti: d.dijamanti }                               : {}),
          ...(d.resursi                                              ? { resursi: { ...get().resursi, ...d.resursi } }           : {}),
          gradevine: legacyVillageState.gradevine,
          ostecenja: legacyVillageState.ostecenja,
          villageRooms: normalizedVillageRooms,
          ...(d.razine                                               ? { razine: { ...get().razine, ...d.razine } }             : {}),
          ...(d.stitovi !== undefined                                ? { stitovi: d.stitovi }                                   : {}),
          ...(d.misije && d.misije.length > 0                        ? { misije: d.misije }                                     : {}),
          ...(d.tecaj                                                ? { tecaj: d.tecaj }                                       : {}),
          ...(d.trend                                                ? { trend: d.trend }                                       : {}),
          ...(d.luckySpinCounter !== undefined                       ? { luckySpinCounter: d.luckySpinCounter }                 : {}),
          ...(d.winStreak !== undefined                              ? { winStreak: d.winStreak }                               : {}),
          ...(d.aktivniSkin                                          ? { aktivniSkin: d.aktivniSkin }                           : {}),
          ...(d.spinBoostPreostalo !== undefined                     ? { spinBoostPreostalo: d.spinBoostPreostalo }             : {}),
          ...(d.stitRegenSekundi !== undefined                       ? { stitRegenSekundi: d.stitRegenSekundi }                 : {}),
          ...(Array.isArray(d.raidPovijest)                          ? { raidPovijest: d.raidPovijest.slice(0, RAID_HISTORY_LIMIT) }            : {}),
          ...(d.klanPopustAktivan !== undefined                      ? { klanPopustAktivan: d.klanPopustAktivan }               : {}),
          ...(d.prestigeMilestones                                   ? { prestigeMilestones: d.prestigeMilestones }             : {}),
          ...(d.zadnjiVideniEventId !== undefined                    ? { zadnjiVideniEventId: d.zadnjiVideniEventId }           : {}),
          ...(d.klan                                                 ? { klan: { ...PRAZNI_KLAN, ...d.klan } }                  : {}),
          sezona: sezonaZaSet,
          ...(d.adsPogledanoDanas !== undefined ? { adsPogledanoDanas: d.adsPogledanoDanas } : {}),
          ...(d.adsDatum !== undefined ? { adsDatum: d.adsDatum } : {}),
          ...(d.zadnjiOnlineMs !== undefined ? { zadnjiOnlineMs: d.zadnjiOnlineMs } : {}),
          ...(d.clanRat ? { clanRat: { ...get().clanRat, ...d.clanRat } } : {}),
          ...(d.revengeTarget ? { revengeTarget: d.revengeTarget } : {}),
          ...(d.junaci && typeof d.junaci === 'object' ? { junaci: d.junaci } : {}),
          ...(Array.isArray(d.aktivniJunaci) ? { aktivniJunaci: d.aktivniJunaci } : {}),
          ...(d.villagePressureDirector ? { villagePressureDirector: normalizeVillagePressureDirector(d.villagePressureDirector) } : {}),
          ...(Array.isArray(d.villageUnlockSeen) ? { villageUnlockSeen: d.villageUnlockSeen } : {}),
          ...(d.kovanice && typeof d.kovanice === 'object' ? { kovanice: d.kovanice } : {}),
          ...(d.turnir && typeof d.turnir === 'object' ? { turnir: { ...noviTurnir(), ...d.turnir } } : {}),
          ...(d.sandukDatum !== undefined ? { sandukDatum: d.sandukDatum } : {}),
          ...(d.tamnica && typeof d.tamnica === 'object' ? {
            tamnica: {
              ...pocetnoTamnicaStanje,
              maxSprat:     d.tamnica.maxSprat     ?? 0,
              tokenovi:     d.tamnica.tokenovi     ?? 0,
              snagaRazina:  d.tamnica.snagaRazina  ?? 0,
              obranaRazina: d.tamnica.obranaRazina ?? 0,
              vampirRazina: d.tamnica.vampirRazina ?? 0,
              // Don't restore an active run — always start fresh
            },
          } : {}),
        });
        if (
          sourceKey === SAVE_KEYS.legacyV30
          || sourceKey === SAVE_KEYS.legacyV31
          || odabraniIzvor === 'cloud'
        ) {
          const migratedPayload = createRuntimeSaveSnapshot(get());
          await dbSet(SAVE_KEYS.game, serializeGameSave(migratedPayload));
        } else if (sourceKey === SAVE_KEYS.game && loaded.corrupted) {
          set({ poruka: 'OTKRIVENA OŠTEĆENA POHRANA — UČITANI SU SIGURNOSNI PODACI' });
        }
      }

      // ─── Dostignuća ───────────────────────────────────────────────────────
      const pa = await migriraiAkoTreba('@save_dostignuca_v1');
      if (pa) {
        const da = JSON.parse(pa);
        set({
          ...(da.dostignucaDone ? { dostignucaDone: da.dostignucaDone } : {}),
          ...(da.ukupnoVrtnji   ? { ukupnoVrtnji: da.ukupnoVrtnji }     : {}),
          ...(da.ukupnoZlata    ? { ukupnoZlata: da.ukupnoZlata }       : {}),
          ...(da.ukupnoRaidova  ? { ukupnoRaidova: da.ukupnoRaidova }   : {}),
        });
      }

      // ─── Dnevna nagrada ───────────────────────────────────────────────────
      const pd = await migriraiAkoTreba('@save_dnevna_v1');
      const danas = new Date().toDateString();
      if (pd) {
        const dd = JSON.parse(pd);
        const streak = dd.streak || 0;
        const zadnja = dd.zadnjaDnevna || '';
        if (zadnja !== danas) {
          const jucer = new Date();
          jucer.setDate(jucer.getDate() - 1);
          const noviStreak = zadnja === jucer.toDateString()
            ? streak + 1
            : 1;
          const danIndex = (noviStreak - 1) % DNEVNE_NAGRADE.length;
          set({
            dnevniStreak: noviStreak,
            dnevnaNagrada: { ...DNEVNE_NAGRADE[danIndex], streak: noviStreak },
            prikazDnevneNagrade: true,
          });
        } else {
          set({ dnevniStreak: streak });
        }
      } else {
        set({
          dnevniStreak: 1,
          dnevnaNagrada: { ...DNEVNE_NAGRADE[0], streak: 1 },
          prikazDnevneNagrade: true,
        });
      }
    } catch (e) {
      console.error('Failed to load game state:', e);
    } finally {
      set({ ucitavam: false });
    }
  },

  spremi: async () => {
    const s = get();
    const payload = createRuntimeSaveSnapshot(s);
    set({ cloudSaveStatus: s.uid ? 'saving' : 'idle', zadnjiCloudPayload: payload });
    try {
      await dbSet(SAVE_KEYS.game, serializeGameSave(payload));
    } catch (e) { console.error('Failed to save game state:', e); }
    // Sinkroniziraj u Firestore (ne blokira — tiha greška ako nema mreže)
    if (s.uid) {
      zakaziCloudSpremanje(s.uid, { ...payload, imeIgraca: s.imeIgraca });
      azurirajLjestvicu(s.uid, {
        imeIgraca:      s.imeIgraca,
        igracRazina:    s.igracRazina,
        prestigeRazina: s.prestigeRazina,
        ukupnoZlata:    s.ukupnoZlata,
        ukupnoVrtnji:   s.ukupnoVrtnji,
        klan:           s.klan,
      });
    }
  },

  retryCloudSave: async () => {
    const s = get();
    if (!s.uid || !s.zadnjiCloudPayload) return;
    set({ cloudSaveStatus: 'saving' });
    try {
      await spremiCloud(s.uid, { ...s.zadnjiCloudPayload, imeIgraca: s.imeIgraca });
      set({ cloudSaveStatus: 'saved' });
    } catch (_) {
      set({ cloudSaveStatus: 'error' });
    }
  },

  spremiDostignuca: async () => {
    const s = get();
    try {
      await dbSet('@save_dostignuca_v1', JSON.stringify({
        dostignucaDone: s.dostignucaDone,
        ukupnoVrtnji:   s.ukupnoVrtnji,
        ukupnoZlata:    s.ukupnoZlata,
        ukupnoRaidova:  s.ukupnoRaidova,
      }));
    } catch (e) { console.error('Failed to save achievements:', e); }
  },

  // ─── Tajmeri (poziva se iz useVillage / useMarket hookova) ─────────────────
  timerTick: () => {
    get().azurirajVillagePopravke();
    get().provjeriSezonu();
    get().provjeriTurnir();
    get().resetirajAdsAkoNoviDan();
    get().azurirajVillagePressureDirector();
    const s = get();
    const villageSupportStats = getVillageSupportStats(s);
    const maxEnergija    = izracunajMaxEnergiju(s.razine.baterija || 0) + Math.round(villageSupportStats.maxEnergyFlat || 0);
    const heroMaxStit    = Math.floor(izracunajHeroBonus(s.junaci, s.aktivniJunaci, 'stit'));
    const maxStitova     = izracunajMaxStitova(s.razine.oklop || 0) + heroMaxStit;
    const pasivniMnozitelj = izracunajPasivniMnozitelj(s.igracRazina, s.prestigeRazina);
    const heroPasivno    = 1 + (izracunajHeroBonus(s.junaci, s.aktivniJunaci, 'pasivno') / 100);
    const heroEnergija   = izracunajHeroBonus(s.junaci, s.aktivniJunaci, 'energija');
    const ukupniPasivni  = pasivniMnozitelj * heroPasivno;
    const proizvodnjaSela = getVillageProduction(s, ukupniPasivni);
    const sada           = Date.now();

    set((state) => {
      // Ukloni istekle crafted bonuse
      const novaKovanice = {};
      Object.entries(state.kovanice).forEach(([id, v]) => {
        if (v.expiresAt && v.expiresAt > sada) novaKovanice[id] = v;
      });
      return {
        energija: state.energija < maxEnergija
          ? Math.min(maxEnergija, state.energija + 1 + heroEnergija)
          : state.energija,
        resursi: {
          drvo: state.resursi.drvo + proizvodnjaSela.drvo,
          kamen: state.resursi.kamen + proizvodnjaSela.kamen,
          zeljezo: state.resursi.zeljezo + proizvodnjaSela.zeljezo,
        },
        stitovi: (state.stitovi < maxStitova && state.stitRegenSekundi <= 1)
          ? state.stitovi + 1
          : state.stitovi,
        stitRegenSekundi: state.stitovi >= maxStitova
          ? STIT_REGEN_INTERVAL_SEK
          : (state.stitRegenSekundi <= 1 ? STIT_REGEN_INTERVAL_SEK : state.stitRegenSekundi - 1),
        kovanice: novaKovanice,
      };
    });
    get().pokreniVillageIncident();
  },

  azurirajVillagePressureDirector: () => {
    const currentDirector = normalizeVillagePressureDirector(get().villagePressureDirector);
    const sada = Date.now();
    if (currentDirector.phaseEndsAt > sada) return false;

    const nextDirector = getNextVillagePressureDirector(currentDirector, sada);
    set({ villagePressureDirector: nextDirector });
    return true;
  },

  azurirajVillagePopravke: () => {
    const s = get();
    const sada = Date.now();
    const rooms = normalizeVillageRooms(s.villageRooms, s.gradevine, s.ostecenja);
    let zavrsenPopravak = false;

    const villageRooms = rooms.map((room) => {
      if (room.status === 'repairing' && room.repairEndsAt && room.repairEndsAt <= sada) {
        zavrsenPopravak = true;
        return {
          ...room,
          status: 'active',
          health: 100,
          incidentType: null,
          incidentStartedAt: null,
          repairEndsAt: null,
        };
      }
      return room;
    });

    if (!zavrsenPopravak) return false;
    const legacyVillageState = createLegacyBuildingStateFromRooms(villageRooms);

    set({
      villageRooms,
      gradevine: legacyVillageState.gradevine,
      ostecenja: legacyVillageState.ostecenja,
      poruka: 'SOBA JE PONOVO SPREMNA ZA RAD',
    });
    return true;
  },

  pokreniVillageIncident: (force = false) => {
    const s = get();
    const sada = Date.now();

    if (!force && (sada - s.zadnjiVillageIncidentMs) < VILLAGE_INCIDENT_COOLDOWN_MS) return false;

    const rooms = normalizeVillageRooms(s.villageRooms, s.gradevine, s.ostecenja);
    if (getVillageIncidentRoom(rooms)) return false;

    const kandidati = rooms.filter((room) => room.type && room.level > 0 && room.status === 'active');
    if (!kandidati.length) return false;

    const supportStats = getVillageSupportStats(s);
    const pressurePhase = getVillagePressurePhaseMeta(s.villagePressureDirector?.phase);
    const adjustedIncidentChance =
      VILLAGE_INCIDENT_CHANCE
      * (pressurePhase.incidentChanceMultiplier ?? 1)
      * Math.max(0.28, 1 - ((supportStats.incidentRiskPct ?? 0) / 100));

    if (!force && randomFloat() > adjustedIncidentChance) {
      set({ zadnjiVillageIncidentMs: sada });
      return false;
    }

    const target = kandidati[randomInt(kandidati.length)];
    const roomDefinition = getVillageRoomDefinition(target);
    const incidentPool = roomDefinition?.incidentPool?.length ? roomDefinition.incidentPool : ['kvar'];
    const incidentType = incidentPool[randomInt(incidentPool.length)];
    const villageRooms = rooms.map((room) => (
      room.id === target.id
        ? {
          ...room,
          status: 'damaged',
          health: 0,
          incidentType,
          incidentStartedAt: sada,
          repairEndsAt: null,
        }
        : room
    ));
    const legacyVillageState = createLegacyBuildingStateFromRooms(villageRooms);

    set({
      villageRooms,
      gradevine: legacyVillageState.gradevine,
      ostecenja: legacyVillageState.ostecenja,
      zadnjiVillageIncidentMs: sada,
      poruka: `SELU TREBA PAŽNJA: ${roomDefinition?.naziv?.toUpperCase() ?? 'SOBA'} JE IZVAN POGONA`,
    });
    return true;
  },

  timerMarket: () => {
    set((state) => {
      const noviTecaj = { ...state.tecaj };
      const noviTrend = {};
      ['drvo', 'kamen', 'zeljezo', 'dijamant'].forEach((res) => {
        const promjena = 0.7 + (randomFloat() * 0.6);
        const novaKupi   = Math.max(1, Math.floor(BAZA_TECAJ[res].kupi   * promjena));
        const novaProdaj = Math.max(1, Math.floor(BAZA_TECAJ[res].prodaj * promjena));
        noviTrend[res]  = novaKupi > state.tecaj[res].kupi ? 1 : (novaKupi < state.tecaj[res].kupi ? -1 : 0);
        noviTecaj[res]  = { kupi: novaKupi, prodaj: novaProdaj };
      });
      return { tecaj: noviTecaj, trend: noviTrend };
    });
  },

  // ─── XP i level ────────────────────────────────────────────────────────────
  provjeriLevelUp: () => {
    const s = get();
    let currentXp = s.xp;
    let currentRazina = s.igracRazina;
    let potrebanXp = izracunajPotrebniXp(currentRazina);

    while (currentXp >= potrebanXp) {
      currentXp -= potrebanXp;
      currentRazina += 1;
      potrebanXp = izracunajPotrebniXp(currentRazina);
    }

    if (currentRazina > s.igracRazina) {
      const levelsGained = currentRazina - s.igracRazina;
      const maxEnergija = izracunajMaxEnergiju(s.razine.baterija || 0) + Math.round(getVillageSupportStats(s).maxEnergyFlat || 0);
      set({
        xp:          currentXp,
        igracRazina: currentRazina,
        dijamanti:   s.dijamanti + (5 * levelsGained),
        energija:    maxEnergija,
        poruka:      levelsGained > 1
          ? `LEVEL UP! +${levelsGained} RAZINA → ${currentRazina}`
          : `LEVEL UP! RAZINA ${currentRazina}`,
        levelUpData: { razina: currentRazina },
      });
      get().provjeriDostignuca(undefined, undefined, undefined, undefined);
    }
  },

  dodajXp: (iznos) => {
    set((state) => ({ xp: state.xp + iznos }));
    get().provjeriLevelUp();
  },

  // ─── Nagrade i misije ──────────────────────────────────────────────────────
  primiNagradu: (nagrada) => {
    set((state) => ({
      ...(nagrada.zlato      ? { zlato:     state.zlato      + nagrada.zlato      } : {}),
      ...(nagrada.dijamanti  ? { dijamanti: state.dijamanti  + nagrada.dijamanti  } : {}),
      ...(nagrada.energija   ? { energija:  state.energija   + nagrada.energija   } : {}),
      ...((nagrada.drvo || nagrada.kamen || nagrada.zeljezo) ? {
        resursi: {
          drvo:    state.resursi.drvo    + (nagrada.drvo    || 0),
          kamen:   state.resursi.kamen   + (nagrada.kamen   || 0),
          zeljezo: state.resursi.zeljezo + (nagrada.zeljezo || 0),
        },
      } : {}),
    }));
  },

  provjeriDostignuca: (novaVrtnja, novoZlato, novaTipGradnje, noviPrestige) => {
    const s = get();
    const novaDostignuca = { ...s.dostignucaDone };
    const nagrade = [];
    let novaPoruka = null;

    DOSTIGNUCA.forEach((d) => {
      if (novaDostignuca[d.id]) return;
      let ispunjeno = false;
      if (d.tip === 'spin'        && novaVrtnja      !== undefined && novaVrtnja      >= d.cilj) ispunjeno = true;
      if (d.tip === 'ukupnoZlato' && novoZlato       !== undefined && novoZlato       >= d.cilj) ispunjeno = true;
      if (d.tip === 'gradnja'     && novaTipGradnje  !== undefined && novaTipGradnje  >= d.cilj) ispunjeno = true;
      if (d.tip === 'prestige'    && noviPrestige    !== undefined && noviPrestige    >= d.cilj) ispunjeno = true;
      if (d.tip === 'raid'        && s.ukupnoRaidova !== undefined && s.ukupnoRaidova >= d.cilj) ispunjeno = true;
      if (d.tip === 'klan'        && s.klan?.naziv                              && d.cilj <= 1) ispunjeno = true;
      if (d.tip === 'razina'      && s.igracRazina   !== undefined && s.igracRazina   >= d.cilj) ispunjeno = true;
      if (ispunjeno) {
        novaDostignuca[d.id] = true;
        nagrade.push(d.nagrada);
        novaPoruka = `🏆 DOSTIGNUĆE: ${d.naziv.toUpperCase()}!`;
      }
    });

    if (nagrade.length > 0 || novaPoruka) {
      set({ dostignucaDone: novaDostignuca, ...(novaPoruka ? { poruka: novaPoruka } : {}) });
      nagrade.forEach((n) => get().primiNagradu(n));
    }
  },

  preuzmiDnevniBonus: async () => {
    const s = get();
    if (!s.dnevnaNagrada) return;
    get().primiNagradu(s.dnevnaNagrada.nagrada);
    const danas = new Date().toDateString();
    try {
      await dbSet('@save_dnevna_v1', JSON.stringify({ streak: s.dnevniStreak, zadnjaDnevna: danas }));
    } catch (e) {
      console.warn('Failed to persist daily bonus state:', e);
    }
    set({ prikazDnevneNagrade: false, poruka: `DNEVNA NAGRADA DAN ${s.dnevniStreak} PREUZETA!` });
  },

  azurirajMisiju: (tip, kolicina = 1) => {
    set((state) => ({
      misije: state.misije.map((m) => {
        if (m.tip === tip && !m.zavrseno && m.trenutno < m.cilj) {
          return { ...m, trenutno: Math.min(m.cilj, m.trenutno + kolicina) };
        }
        return m;
      }),
    }));
  },

  preuzmiNagraduMisije: (id, nagrada) => {
    set((state) => {
      const postojeceTipovi = state.misije.filter((m) => m.id !== id).map((m) => m.tip);
      return {
        misije: state.misije.map((m) => (m.id === id ? generirajMisiju(postojeceTipovi) : m)),
      };
    });
    get().primiNagradu(nagrada);
    get().dodajSezonaXp('misija');
    get().evidentirajClanRatBodove('misija', 1);
    get().dodajTurnirBodove(50);
    set({ poruka: 'MISIJA ZAVRŠENA! NAGRADA PREUZETA.' });
  },

  // ─── Turnir ────────────────────────────────────────────────────────────────
  provjeriTurnir: () => {
    const s = get();
    const trenutniTjedan = tjedanBroj();
    if (s.turnir?.tjedniBroj !== trenutniTjedan) {
      set({ turnir: noviTurnir(), poruka: '🏆 NOVI TURNIR POČEO! Bodi se za nagrade!' });
    }
  },

  dodajTurnirBodove: (kolicina) => {
    set((state) => ({
      turnir: {
        ...state.turnir,
        bodovi: (state.turnir?.bodovi ?? 0) + kolicina,
      },
    }));
  },

  preuzimiTurnirNagradu: (razina) => {
    const s = get();
    const result = canClaimTournamentReward(s.turnir, razina);
    if (!result.ok) {
      if (result.reason === 'insufficient_points') set({ poruka: 'NEMAŠ DOVOLJNO TURNIRSKIH BODOVA' });
      else if (result.reason === 'already_claimed') set({ poruka: 'NAGRADA VEĆ PREUZETA ZA OVAJ TJEDAN' });
      else if (result.reason === 'missing_rank') set({ poruka: 'NEPOZNATA TURNIRSKA NAGRADA' });
      return;
    }
    get().primiNagradu(result.reward);
    set((state) => ({
      turnir: {
        ...state.turnir,
        nagradePreuzete: { ...(state.turnir?.nagradePreuzete ?? {}), [razina]: true },
      },
      poruka: `${result.rank.emodzi} TURNIRSKA NAGRADA PREUZETA: ${result.rank.naziv.toUpperCase()}!`,
    }));
  },

  // ─── Tamnica (Dungeon) ─────────────────────────────────────────────────────

  /**
   * Pokreni novu dungeon turu. Oduzme energiju, postavi neprijatelja na spratu 1.
   */
  zapocniTamnicu: () => {
    const s = get();
    if (s.tamnica?.aktivna) return;
    if (s.energija < TAMNICA_KOST_ENERGIJE) {
      set({ poruka: `TREBA ${TAMNICA_KOST_ENERGIJE} ⚡ ZA ULAZAK U TAMNICU` });
      return;
    }
    const t = s.tamnica ?? pocetnoTamnicaStanje;
    const sprat = 1;
    const { hp, nep, bossData, isBoss, igracMaxHp } = setupDungeonFloor(sprat, t.snagaRazina, t.obranaRazina);
    set((state) => ({
      energija: state.energija - TAMNICA_KOST_ENERGIJE,
      tamnica: {
        ...state.tamnica,
        aktivna:     true,
        sprat,
        neprijHp:    hp,
        neprijMaxHp: hp,
        neprijTipId: nep.id,
        neprijBoss:  isBoss,
        igracHp:     igracMaxHp,
        igracMaxHp,
        zadnjiIshod: null,
      },
      poruka: `🗝️ UŠAO U TAMNICU — SPRAT ${sprat}`,
    }));
  },

  /**
   * Udari neprijatelja. Neprijatelj uzvrati. Ako neprijatelj padne — prijeđi na
   * sljedeći sprat. Ako igrač padne — kraj runde.
   */
  napadniUTamnici: () => {
    const s = get();
    if (!s.tamnica?.aktivna) return;
    const t = s.tamnica;
    const tierIndex = Math.min(Math.floor((t.sprat - 1) / 3), TAMNICA_NEPRIJATELJI.length - 1);
    const nep = TAMNICA_NEPRIJATELJI[tierIndex];
    const scaleMult = 1 + (t.sprat - 1) * 0.15;

    // Napad igrača
    const bazaNapad = TAMNICA_NAPAD_BAZA + (t.snagaRazina * TAMNICA_SHOP[0].bonusPoRazini);
    const igracSteta = bazaNapad + randomInt(TAMNICA_RANDOM_RASPON);

    // Napad neprijatelja
    let neprijMin = Math.ceil(nep.napadMin * scaleMult);
    let neprijMax = Math.ceil(nep.napadMax * scaleMult);
    if (t.neprijBoss) {
      const defined = TAMNICA_BOSSOVI.find((b) => b.sprat === t.sprat);
      const last = TAMNICA_BOSSOVI[TAMNICA_BOSSOVI.length - 1];
      const nm = defined?.napadMnozac ?? (last.napadMnozac + (t.sprat - last.sprat) * 0.05);
      neprijMin = Math.ceil(neprijMin * nm);
      neprijMax = Math.ceil(neprijMax * nm);
    }
    const neprijSteta = neprijMin + randomInt(Math.max(1, neprijMax - neprijMin + 1));

    // Lifesteal
    const lifestealPct = t.vampirRazina * TAMNICA_SHOP[2].bonusPoRazini;
    const lifesteal = Math.floor(igracSteta * lifestealPct / 100);

    const noviNeprijHp = Math.max(0, t.neprijHp - igracSteta);
    const noviIgracHp  = Math.min(t.igracMaxHp, Math.max(0, t.igracHp - neprijSteta + lifesteal));

    if (noviNeprijHp <= 0) {
      // Neprijatelj poražen — nagrade i sljedeći sprat
      const spratMult = 1 + (t.sprat - 1) * 0.2;
      const nagradeZlato = Math.floor(nep.nagrada.zlato * spratMult);
      let nagradeTokenovi = nep.nagrada.tokenovi;
      let nagradenDijamanti = 0;
      let bossBonus = null;

      if (t.neprijBoss) {
        const defined = TAMNICA_BOSSOVI.find((b) => b.sprat === t.sprat);
        const last = TAMNICA_BOSSOVI[TAMNICA_BOSSOVI.length - 1];
        const bd = defined ?? {
          ...last,
          bonus: {
            zlato:     Math.floor(last.bonus.zlato     * (1 + (t.sprat - last.sprat) * 0.15)),
            dijamanti: Math.floor(last.bonus.dijamanti * (1 + (t.sprat - last.sprat) * 0.1)),
            tokenovi:  Math.floor(last.bonus.tokenovi  * (1 + (t.sprat - last.sprat) * 0.1)),
          },
        };
        nagradeTokenovi += bd.bonus.tokenovi;
        nagradenDijamanti = bd.bonus.dijamanti;
        bossBonus = bd.bonus;
      }

      const noviSprat  = t.sprat + 1;
      const noviMaxSprat = Math.max(t.maxSprat, t.sprat);
      const { hp: sljedeciHp, nep: sljedeciNep, isBoss: sljedeciBoss } =
        setupDungeonFloor(noviSprat, t.snagaRazina, t.obranaRazina);

      set((state) => ({
        zlato:     state.zlato     + nagradeZlato + (bossBonus?.zlato ?? 0),
        dijamanti: state.dijamanti + nagradenDijamanti,
        ukupnoZlata: state.ukupnoZlata + nagradeZlato + (bossBonus?.zlato ?? 0),
        tamnica: {
          ...state.tamnica,
          sprat:       noviSprat,
          maxSprat:    noviMaxSprat,
          neprijHp:    sljedeciHp,
          neprijMaxHp: sljedeciHp,
          neprijTipId: sljedeciNep.id,
          neprijBoss:  sljedeciBoss,
          igracHp:     noviIgracHp,
          tokenovi:    state.tamnica.tokenovi + nagradeTokenovi,
          zadnjiIshod: { tip: 'pobjeda', igracSteta, neprijSteta, nagradeZlato: nagradeZlato + (bossBonus?.zlato ?? 0), nagradeTokenovi, bossBonus },
        },
        poruka: t.neprijBoss
          ? `💀 BOSS POBIJEĐEN! +${(nagradeZlato + (bossBonus?.zlato ?? 0)).toLocaleString()} 🪙 +${nagradenDijamanti} 💎`
          : `✅ SPRAT ${t.sprat} PROČIŠĆEN! +${nagradeZlato} 🪙`,
      }));
      get().dodajXp(t.sprat * 5);
      get().azurirajMisiju('tamnica');

    } else if (noviIgracHp <= 0) {
      // Igrač poginuo — kraj runde
      const noviMaxSprat = Math.max(t.maxSprat, t.sprat - 1);
      set((state) => ({
        tamnica: {
          ...state.tamnica,
          aktivna:     false,
          sprat:       0,
          maxSprat:    noviMaxSprat,
          neprijHp:    0,
          igracHp:     0,
          zadnjiIshod: { tip: 'smrt', dostigniSprat: t.sprat },
        },
        poruka: `💀 POGINUO SI NA SPRATU ${t.sprat} TAMNICE`,
      }));
    } else {
      // Borba u toku
      set((state) => ({
        tamnica: {
          ...state.tamnica,
          neprijHp: noviNeprijHp,
          igracHp:  noviIgracHp,
          zadnjiIshod: { tip: 'borba', igracSteta, neprijSteta },
        },
      }));
    }
  },

  /**
   * Pobijegni iz tamnice. Zadržavaš tokenove i napredak maxSprat.
   */
  pobijegniIzTamnice: () => {
    const s = get();
    if (!s.tamnica?.aktivna) return;
    const t = s.tamnica;
    const noviMaxSprat = Math.max(t.maxSprat, t.sprat - 1);
    set((state) => ({
      tamnica: {
        ...state.tamnica,
        aktivna:     false,
        sprat:       0,
        maxSprat:    noviMaxSprat,
        neprijHp:    0,
        igracHp:     0,
        zadnjiIshod: { tip: 'bijeg', dostigniSprat: t.sprat },
      },
      poruka: `🏃 POBJEGAO SA SPRATA ${t.sprat} TAMNICE`,
    }));
  },

  /**
   * Kupi trajnu nadogradnju u tamničarskoj oružarni.
   */
  kupiTamnicuNadogradnju: (nadId) => {
    const s = get();
    const def = TAMNICA_SHOP.find((n) => n.id === nadId);
    if (!def) return;
    const kljucRazine = `${nadId}Razina`;
    const trenutnaRazina = s.tamnica?.[kljucRazine] ?? 0;
    if (trenutnaRazina >= def.maxRazina) {
      set({ poruka: `${def.naziv.toUpperCase()} JE NA MAKSIMALNOJ RAZINI` });
      return;
    }
    const kost = def.kost * (trenutnaRazina + 1);
    if ((s.tamnica?.tokenovi ?? 0) < kost) {
      set({ poruka: `TREBA ${kost} 🔑 TOKENA ZA NADOGRADNJU` });
      return;
    }
    set((state) => ({
      tamnica: {
        ...state.tamnica,
        tokenovi:        (state.tamnica.tokenovi ?? 0) - kost,
        [kljucRazine]:   trenutnaRazina + 1,
      },
      poruka: `${def.emodzi} ${def.naziv.toUpperCase()} NADOGRAĐEN NA RAZINU ${trenutnaRazina + 1}!`,
    }));
  },

  // ─── Kovačnica (Crafting) ──────────────────────────────────────────────────
  izradiPredmet: (receptId) => {
    const s = get();
    const recept = RECEPTI.find((r) => r.id === receptId);
    if (!recept) return;

    // Provjeri ima li dovoljno resursa
    if (
      (recept.cijena.drvo    > 0 && s.resursi.drvo    < recept.cijena.drvo)    ||
      (recept.cijena.kamen   > 0 && s.resursi.kamen   < recept.cijena.kamen)   ||
      (recept.cijena.zeljezo > 0 && s.resursi.zeljezo < recept.cijena.zeljezo)
    ) {
      set({ poruka: 'FALE RESURSI ZA IZRADU' });
      return;
    }

    // Provjeri je li timed buff već aktivan
    if (recept.trajanjeSek > 0 && s.kovanice[receptId]?.expiresAt > Date.now()) {
      set({ poruka: `${recept.naziv.toUpperCase()} JE VEĆ AKTIVAN` });
      return;
    }

    // Oduzmi resurse
    set((state) => ({
      resursi: {
        drvo:    state.resursi.drvo    - (recept.cijena.drvo    || 0),
        kamen:   state.resursi.kamen   - (recept.cijena.kamen   || 0),
        zeljezo: state.resursi.zeljezo - (recept.cijena.zeljezo || 0),
      },
    }));

    // Primijeni efekt
    if (recept.tip === 'energija_instant') {
      const maxEnergija = izracunajMaxEnergiju(s.razine.baterija || 0) + Math.round(getVillageSupportStats(s).maxEnergyFlat || 0);
      set((state) => ({ energija: Math.min(maxEnergija, state.energija + recept.bonus) }));
      set({ poruka: `⚡ +${recept.bonus} ENERGIJE!` });
    } else if (recept.tip === 'stit_instant') {
      const heroMaxStit = Math.floor(izracunajHeroBonus(s.junaci, s.aktivniJunaci, 'stit'));
      const maxStitova  = izracunajMaxStitova(s.razine.oklop || 0) + heroMaxStit;
      set({ stitovi: maxStitova, stitRegenSekundi: STIT_REGEN_INTERVAL_SEK, poruka: '🛡️ ŠTITOVI OBNOVLJENI!' });
    } else if (recept.tip === 'hero_fragment') {
      const kolicina = randomInt(3) + 2;
      get().dodijeliHeroFragmente(null, kolicina);
      set({ poruka: `⚗️ HEROSKA ESENCIJA: +${kolicina} FRAGMENTA!` });
    } else if (recept.trajanjeSek > 0) {
      // Timed buff
      set((state) => ({
        kovanice: {
          ...state.kovanice,
          [receptId]: { expiresAt: Date.now() + recept.trajanjeSek * 1000 },
        },
        poruka: `${recept.emodzi} ${recept.naziv.toUpperCase()} AKTIVIRAN!`,
      }));
    }
  },

  // ─── Dnevni sanduk ─────────────────────────────────────────────────────────
  otvoriSanduk: (tipId) => {
    const s = get();
    const def = SANDUK_TIPOVI.find((t) => t.id === tipId);
    if (!def) return null;

    const danas = new Date().toDateString();

    // Provjeri besplatni sanduk
    if (def.besplatanJednom && s.sandukDatum === danas) {
      set({ poruka: 'BESPLATNI SANDUK JE VEĆ OTVOREN DANAS' });
      return null;
    }

    // Provjeri dijamante za premium sanduke
    if (!def.besplatanJednom && s.dijamanti < def.cijenaDijamanti) {
      set({ poruka: `TREBA ${def.cijenaDijamanti} 💎 ZA SANDUK` });
      return null;
    }

    // Oduzmi cijenu
    if (!def.besplatanJednom) {
      set((state) => ({ dijamanti: state.dijamanti - def.cijenaDijamanti }));
    }

    // Generiraj nagrade
    const nagradeIshod = {};
    def.nagrade.forEach((n) => {
      if (n.tip === 'hero_fragment') {
        const sansa = n.sansa ?? 0;
        if (sansa >= 1 || randomFloat() < sansa) {
          const kolicina = randomInt(n.max - n.min + 1) + n.min;
          if (kolicina > 0) {
            nagradeIshod.hero_fragment = (nagradeIshod.hero_fragment || 0) + kolicina;
          }
        }
      } else if (n.max > n.min) {
        nagradeIshod[n.tip] = randomInt(n.max - n.min + 1) + n.min;
      } else {
        nagradeIshod[n.tip] = n.min;
      }
    });

    // Primijeni nagrade
    if (nagradeIshod.zlato) {
      set((state) => ({ zlato: state.zlato + nagradeIshod.zlato, ukupnoZlata: state.ukupnoZlata + nagradeIshod.zlato }));
    }
    if (nagradeIshod.dijamanti) {
      set((state) => ({ dijamanti: state.dijamanti + nagradeIshod.dijamanti }));
    }
    if (nagradeIshod.energija) {
      const maxEnergija = izracunajMaxEnergiju(s.razine.baterija || 0) + Math.round(getVillageSupportStats(s).maxEnergyFlat || 0);
      set((state) => ({ energija: Math.min(maxEnergija, state.energija + nagradeIshod.energija) }));
    }
    if (nagradeIshod.drvo || nagradeIshod.kamen || nagradeIshod.zeljezo) {
      set((state) => ({
        resursi: {
          drvo:    state.resursi.drvo    + (nagradeIshod.drvo    || 0),
          kamen:   state.resursi.kamen   + (nagradeIshod.kamen   || 0),
          zeljezo: state.resursi.zeljezo + (nagradeIshod.zeljezo || 0),
        },
      }));
    }
    if (nagradeIshod.hero_fragment) {
      get().dodijeliHeroFragmente(null, nagradeIshod.hero_fragment);
    }

    // Označi besplatni sanduk
    if (def.besplatanJednom) {
      set({ sandukDatum: danas });
    }

    set({ poruka: `${def.emodzi} SANDUK OTVOREN!` });
    return nagradeIshod;
  },
  nadogradiSobu: (roomId) => {
    const s = get();
    const rooms = normalizeVillageRooms(s.villageRooms, s.gradevine, s.ostecenja);
    const targetRoom = rooms.find((room) => room.id === roomId);
    const roomDefinition = getVillageRoomDefinition(targetRoom);
    const unlockStatus = getVillageRoomUnlockStatus(targetRoom, s);

    if (!targetRoom || !roomDefinition) return false;
    if (!unlockStatus.unlocked) {
      set({ poruka: 'SOBA JOŠ NIJE OTKLJUČANA' });
      return false;
    }
    if (targetRoom.level >= roomDefinition.maxLv) return false;

    const c = roomDefinition.cijena((targetRoom.level || 0) + 1);
    if (
      s.zlato < (c.zlato || 0)
      || s.resursi.drvo < (c.drvo || 0)
      || s.resursi.kamen < (c.kamen || 0)
      || s.resursi.zeljezo < (c.zeljezo || 0)
    ) {
      set({ poruka: 'FALE RESURSI ZA NADOGRADNJU' });
      return false;
    }

    const villageRooms = rooms.map((room) => (
      room.id === roomId
        ? {
          ...room,
          level: (room.level || 0) + 1,
          status: 'active',
          health: 100,
          incidentType: null,
          incidentStartedAt: null,
          repairEndsAt: null,
        }
        : room
    ));
    const legacyVillageState = createLegacyBuildingStateFromRooms(villageRooms);

    set((state) => ({
      zlato: state.zlato - (c.zlato || 0),
      resursi: {
        drvo: state.resursi.drvo - (c.drvo || 0),
        kamen: state.resursi.kamen - (c.kamen || 0),
        zeljezo: state.resursi.zeljezo - (c.zeljezo || 0),
      },
      gradevine: legacyVillageState.gradevine,
      ostecenja: legacyVillageState.ostecenja,
      villageRooms,
      poruka: `${roomDefinition.naziv.toUpperCase()} NADOGRAĐENA!`,
    }));
    get().azurirajMisiju('zgrada');
    get().azurirajKlanZadatak('zgrada');
    get().provjeriDostignuca(undefined, undefined, (targetRoom.level || 0) + 1, undefined);
    return true;
  },

  pokreniPopravakSobe: (roomId) => {
    const s = get();
    const rooms = normalizeVillageRooms(s.villageRooms, s.gradevine, s.ostecenja);
    const targetRoom = rooms.find((room) => room.id === roomId);
    const roomDefinition = getVillageRoomDefinition(targetRoom);

    if (!targetRoom || !roomDefinition || targetRoom.status !== 'damaged') return false;

    const repairEndsAt = Date.now() + getVillageRepairDurationMs(targetRoom, s);
    const villageRooms = rooms.map((room) => (
      room.id === roomId
        ? { ...room, status: 'repairing', health: 35, repairEndsAt }
        : room
    ));
    const legacyVillageState = createLegacyBuildingStateFromRooms(villageRooms);

    set({
      villageRooms,
      gradevine: legacyVillageState.gradevine,
      ostecenja: legacyVillageState.ostecenja,
      poruka: `${roomDefinition.naziv.toUpperCase()} JE U POPRAVKU`,
    });
    return true;
  },

  hitniPopravakSobe: (roomId) => {
    const s = get();
    const rooms = normalizeVillageRooms(s.villageRooms, s.gradevine, s.ostecenja);
    const targetRoom = rooms.find((room) => room.id === roomId);
    const roomDefinition = getVillageRoomDefinition(targetRoom);

    if (!targetRoom || !roomDefinition || !['damaged', 'repairing'].includes(targetRoom.status)) return false;

    const cost = getVillageRepairCost(targetRoom, s);
    if (
      s.zlato < cost.zlato
      || s.energija < cost.energija
      || s.resursi.drvo < cost.drvo
      || s.resursi.kamen < cost.kamen
      || s.resursi.zeljezo < cost.zeljezo
    ) {
      set({ poruka: 'NEMAŠ DOVOLJNO RESURSA ZA HITAN POPRAVAK' });
      return false;
    }

    const villageRooms = rooms.map((room) => (
      room.id === roomId
        ? {
          ...room,
          status: 'active',
          health: 100,
          incidentType: null,
          incidentStartedAt: null,
          repairEndsAt: null,
        }
        : room
    ));
    const legacyVillageState = createLegacyBuildingStateFromRooms(villageRooms);

    set((state) => ({
      zlato: state.zlato - cost.zlato,
      energija: state.energija - cost.energija,
      resursi: {
        drvo: state.resursi.drvo - cost.drvo,
        kamen: state.resursi.kamen - cost.kamen,
        zeljezo: state.resursi.zeljezo - cost.zeljezo,
      },
      villageRooms,
      gradevine: legacyVillageState.gradevine,
      ostecenja: legacyVillageState.ostecenja,
      poruka: `${roomDefinition.naziv.toUpperCase()} JE HITNO STABILIZIRANA`,
    }));
    return true;
  },

  aktivirajIncidentOdgovor: (roomId) => {
    const s = get();
    const rooms = normalizeVillageRooms(s.villageRooms, s.gradevine, s.ostecenja);
    const targetRoom = rooms.find((room) => room.id === roomId);
    const roomDefinition = getVillageRoomDefinition(targetRoom);
    const response = getVillageIncidentResponse(targetRoom, s);

    if (!targetRoom || !roomDefinition || !['damaged', 'repairing'].includes(targetRoom.status) || !response) return false;
    if (!response.available) {
      set({ poruka: 'NEDOSTAJE PRAVA SOBA PODRŠKE ZA OVAJ MANEVAR' });
      return false;
    }

    if (
      s.zlato < (response.cost.zlato || 0)
      || s.energija < (response.cost.energija || 0)
      || s.stitovi < (response.cost.stitovi || 0)
      || s.resursi.drvo < (response.cost.drvo || 0)
      || s.resursi.kamen < (response.cost.kamen || 0)
      || s.resursi.zeljezo < (response.cost.zeljezo || 0)
    ) {
      set({ poruka: 'NEMAŠ RESURSE ZA SPECIJALNU INTERVENCIJU' });
      return false;
    }

    const sada = Date.now();
    const currentRemainingMs = targetRoom.status === 'repairing' && targetRoom.repairEndsAt
      ? Math.max(15000, targetRoom.repairEndsAt - sada)
      : getVillageRepairDurationMs(targetRoom, s);
    const responseDurationMs = response.durationMs > 0
      ? Math.min(currentRemainingMs, response.durationMs)
      : 0;
    const removedHeroId = response.clearAssignedHero ? targetRoom.assignedHeroId : null;

    const villageRooms = rooms.map((room) => {
      if (room.id !== roomId) return room;

      if (response.mode === 'secure') {
        return {
          ...room,
          status: 'active',
          health: 100,
          assignedHeroId: response.clearAssignedHero ? null : room.assignedHeroId,
          incidentType: null,
          incidentStartedAt: null,
          repairEndsAt: null,
        };
      }

      return {
        ...room,
        status: 'repairing',
        health: response.health ?? 50,
        assignedHeroId: response.clearAssignedHero ? null : room.assignedHeroId,
        repairEndsAt: sada + responseDurationMs,
      };
    });
    const legacyVillageState = createLegacyBuildingStateFromRooms(villageRooms);
    const reward = response.reward ?? {};
    const responseNotes = [];
    if (response.drainEnergyToZero) responseNotes.push('energetska rezerva ispražnjena');
    if (removedHeroId) responseNotes.push('posada povučena');
    if ((reward.zlato || reward.drvo || reward.kamen || reward.zeljezo || reward.energija || reward.stitovi)) {
      responseNotes.push('spašeni materijali vraćeni u skladište');
    }

    set((state) => ({
      zlato: state.zlato - (response.cost.zlato || 0) + (reward.zlato || 0),
      energija: response.drainEnergyToZero
        ? 0
        : (state.energija - (response.cost.energija || 0) + (reward.energija || 0)),
      stitovi: state.stitovi - (response.cost.stitovi || 0) + (reward.stitovi || 0),
      resursi: {
        drvo: state.resursi.drvo - (response.cost.drvo || 0) + (reward.drvo || 0),
        kamen: state.resursi.kamen - (response.cost.kamen || 0) + (reward.kamen || 0),
        zeljezo: state.resursi.zeljezo - (response.cost.zeljezo || 0) + (reward.zeljezo || 0),
      },
      villageRooms,
      gradevine: legacyVillageState.gradevine,
      ostecenja: legacyVillageState.ostecenja,
      poruka: response.mode === 'secure'
        ? `${roomDefinition.naziv.toUpperCase()} JE OBRANJENA I ODMAH VRAĆENA U RAD${responseNotes.length ? ` · ${responseNotes.join(' · ')}` : ''}`
        : `${response.label} AKTIVIRAN ZA ${roomDefinition.naziv.toUpperCase()}${responseNotes.length ? ` · ${responseNotes.join(' · ')}` : ''}`,
    }));
    return true;
  },

  nadogradiZgradu: (zgrada) => {
    const s = get();
    const rooms = normalizeVillageRooms(s.villageRooms, s.gradevine, s.ostecenja);
    const targetRoom = rooms.find((room) => room.type === zgrada.id);
    if (!targetRoom) return false;
    return get().nadogradiSobu(targetRoom.id);
  },

  popraviZgradu: (zgrada) => {
    const s = get();
    const rooms = normalizeVillageRooms(s.villageRooms, s.gradevine, s.ostecenja);
    const targetRoom = rooms.find((room) => room.type === zgrada.id);
    if (!targetRoom) return false;
    return get().hitniPopravakSobe(targetRoom.id);
  },

  izvrsiPrestige: () => {
    const s = get();
    const noviPrestige = s.prestigeRazina + 1;
    const milestone = { ...(s.prestigeMilestones || {}) };
    let bonusPoruka = '';
    let bonusState = {};
    if (noviPrestige >= 1 && !milestone['1']) {
      milestone['1'] = true;
      bonusState = { ...bonusState, dijamanti: s.dijamanti + 30, aktivniSkin: s.aktivniSkin === 'default' ? 'medieval' : s.aktivniSkin };
      bonusPoruka += ' | PRESTIGE I: +30💎 + Medieval skin';
    }
    if (noviPrestige >= 3 && !milestone['3']) {
      milestone['3'] = true;
      bonusState = { ...bonusState, klanPopustAktivan: true };
      bonusPoruka += ' | PRESTIGE III: 50% popust osnivanja klana';
    }
    if (noviPrestige >= 5 && !milestone['5']) {
      milestone['5'] = true;
      bonusState = { ...bonusState, energija: 35 };
      bonusPoruka += ' | PRESTIGE V: bonus energija';
    }
    const resetiraneGradevine = { pilana: 0, kamenolom: 0, rudnik: 0 };
    const resetiranaOstecenja = { pilana: false, kamenolom: false, rudnik: false };
    set({
      prestigeRazina: noviPrestige,
      igracRazina:    1,
      xp:             0,
      gradevine:      resetiraneGradevine,
      ostecenja:      resetiranaOstecenja,
      villageRooms:   createLegacyVillageRooms(resetiraneGradevine, resetiranaOstecenja),
      resursi:        { drvo: 0, kamen: 0, zeljezo: 0 },
      zlato:          50,
      energija:       bonusState.energija ?? 10,
      winStreak:      0,
      luckySpinCounter: LUCKY_SPIN_INTERVAL,
      zadnjiVillageIncidentMs: 0,
      prestigeMilestones: milestone,
      ...(bonusState.dijamanti !== undefined ? { dijamanti: bonusState.dijamanti } : {}),
      ...(bonusState.aktivniSkin ? { aktivniSkin: bonusState.aktivniSkin } : {}),
      ...(bonusState.klanPopustAktivan ? { klanPopustAktivan: bonusState.klanPopustAktivan } : {}),
      poruka:         `PRESTIGE USPJEŠAN! NOVI MNOŽITELJ x${(1 + (noviPrestige * 0.35)).toFixed(2)}${bonusPoruka}`,
    });
    get().provjeriDostignuca(undefined, undefined, undefined, noviPrestige);
    get().dodajSezonaXp('prestige');
  },

  // ─── Nadogradnje (oprema) ──────────────────────────────────────────────────
  kupiAlat: (alat) => {
    const s = get();
    const mult = Math.pow(1.4, s.razine[alat.id] || 0);
    const zl   = Math.floor(alat.cZlato  * mult);
    const ka   = Math.floor(alat.cKamen  * mult);
    const ze   = Math.floor(alat.cZeljezo * mult);

    if (s.zlato < zl || s.resursi.kamen < ka || s.resursi.zeljezo < ze) {
      set({ poruka: 'FALE RESURSI' });
      return;
    }

    const maxStitova = izracunajMaxStitova(s.razine.oklop || 0);
    set((state) => ({
      zlato:   state.zlato - zl,
      resursi: { ...state.resursi, kamen: state.resursi.kamen - ka, zeljezo: state.resursi.zeljezo - ze },
      razine:  { ...state.razine, [alat.id]: (state.razine[alat.id] || 0) + 1 },
      ...(alat.id === 'oklop' ? { stitovi: maxStitova + 1 } : {}),
      poruka: 'OPREMA POBOLJŠANA',
    }));
    get().azurirajMisiju('oprema');
    get().azurirajKlanZadatak('oprema');
  },

  // ─── Tržnica ──────────────────────────────────────────────────────────────
  trgovina: (akcija, resurs, iznos) => {
    const s = get();
    const cijenaPoKomadu = s.tecaj[resurs][akcija];
    const ukupnaCijena   = cijenaPoKomadu * (iznos === 1 ? 1 : 10);

    if (akcija === 'kupi') {
      if (s.zlato < ukupnaCijena) {
        set({ poruka: 'NEDOVOLJNO ZLATA' });
        return;
      }
      set((state) => {
        const updates = { zlato: state.zlato - ukupnaCijena, poruka: `KUPLJENO ${iznos} ${resurs.toUpperCase()}` };
        if (resurs === 'dijamant') {
          updates.dijamanti = (state.dijamanti || 0) + iznos;
        } else {
          updates.resursi = { ...state.resursi, [resurs]: (state.resursi[resurs] || 0) + iznos };
        }
        return updates;
      });
    } else {
      const trenutnaKolicina = resurs === 'dijamant' ? s.dijamanti : s.resursi[resurs];
      if (trenutnaKolicina < iznos) {
        set({ poruka: 'NEDOVOLJNO RESURSA' });
        return;
      }
      set((state) => {
        const updates = { zlato: (state.zlato || 0) + ukupnaCijena, poruka: `PRODANO ZA ${ukupnaCijena} 🪙` };
        if (resurs === 'dijamant') {
          updates.dijamanti = state.dijamanti - iznos;
        } else {
          updates.resursi = { ...state.resursi, [resurs]: state.resursi[resurs] - iznos };
        }
        return updates;
      });
      get().azurirajMisiju('zlato', ukupnaCijena);
    }
  },

  // ─── Kozmetika — skinovi zgrada ─────────────────────────────────────────────
  kupiSkin: (skin) => {
    const s = get();
    if (s.aktivniSkin === skin.id) return;
    if (skin.cijenaDijamanti > 0 && s.dijamanti < skin.cijenaDijamanti) {
      set({ poruka: 'NEDOVOLJNO DIJAMANATA' });
      return;
    }
    set({
      dijamanti:  skin.cijenaDijamanti > 0 ? s.dijamanti - skin.cijenaDijamanti : s.dijamanti,
      aktivniSkin: skin.id,
      poruka: `${skin.emodzi} SKIN "${skin.naziv.toUpperCase()}" AKTIVIRAN`,
    });
  },

  // ─── Klan — osnivanje i upravljanje ─────────────────────────────────────────
  osnujiKlan: (naziv) => {
    if (!naziv) return;
    const cistiNaziv = sanitizeClanName(naziv);
    if (!cistiNaziv) {
      set({ poruka: 'NEISPRAVNO IME KLANA (2-50 ZNAKOVA)' });
      return;
    }
    const cijenaOsnivanja = get().klanPopustAktivan ? 500 : 1000;
    if (get().zlato < cijenaOsnivanja) {
      set({ poruka: `NEDOVOLJNO ZLATA ZA OSNIVANJE KLANA (${cijenaOsnivanja})` });
      return;
    }
    set({
      zlato: get().zlato - cijenaOsnivanja,
      klan: {
        naziv:         cistiNaziv,
        razina:        1,
        xp:            0,
        zadaci:        generirajKlanZadatke(),
        zadnjiRefresh: new Date().toISOString(),
      },
      poruka: `⚔️ KLAN "${cistiNaziv.toUpperCase()}" OSNOVAN!`,
    });
    get().provjeriDostignuca(undefined, undefined, undefined, undefined);
  },

  doniraiUKlan: (iznosZlato) => {
    const s = get();
    if (!s.klan.naziv) return;
    if (s.zlato < iznosZlato) {
      set({ poruka: 'NEDOVOLJNO ZLATA ZA DONACIJU' });
      return;
    }
    const xpGain  = Math.floor(iznosZlato / 10);
    let noviXp = s.klan.xp + xpGain;
    let novaRazina = s.klan.razina;
    let treba = xpZaKlanRazinu(novaRazina);
    while (noviXp >= treba) {
      noviXp -= treba;
      novaRazina += 1;
      treba = xpZaKlanRazinu(novaRazina);
    }

    const noviZadaci = s.klan.zadaci.map((z) =>
      z.tip === 'donacija' && !z.zavrseno
        ? { ...z, trenutno: Math.min(z.cilj, z.trenutno + iznosZlato) }
        : z
    ).map((z) => (!z.zavrseno && z.trenutno >= z.cilj ? { ...z, zavrseno: true } : z));

    set((state) => ({
      zlato: state.zlato - iznosZlato,
      klan: {
        ...state.klan,
        xp:      noviXp,
        razina:  novaRazina,
        zadaci:  noviZadaci,
      },
      poruka: `💰 DONIRANO ${iznosZlato} ZLATA KLANU (+${xpGain} XP)`,
    }));
    get().azurirajMisiju('donacija', iznosZlato);
  },

  azurirajKlanZadatak: (tip, kolicina = 1) => {
    const s = get();
    if (!s.klan.naziv) return;
    const noviZadaci = s.klan.zadaci.map((z) => {
      if (z.tip === tip && !z.zavrseno) {
        const novoTrenutno = Math.min(z.cilj, z.trenutno + kolicina);
        return { ...z, trenutno: novoTrenutno, zavrseno: novoTrenutno >= z.cilj };
      }
      return z;
    });
    set((state) => ({ klan: { ...state.klan, zadaci: noviZadaci } }));
  },

  preuzmiKlanNagradu: (zadatakId) => {
    const s = get();
    const zadatak = s.klan.zadaci.find((z) => z.id === zadatakId);
    if (!zadatak || !zadatak.zavrseno || zadatak.preuzeto) return;

    const { dijamanti = 0, zlato = 0, energija = 0, drvo = 0, kamen = 0, zeljezo = 0 } = zadatak.nagrada;
    const noviZadaci = s.klan.zadaci.map((z) => z.id === zadatakId ? { ...z, preuzeto: true } : z);
    const xpGain  = 200;
    let noviXp = s.klan.xp + xpGain;
    let novaRazina = s.klan.razina;
    let treba = xpZaKlanRazinu(novaRazina);
    while (noviXp >= treba) {
      noviXp -= treba;
      novaRazina += 1;
      treba = xpZaKlanRazinu(novaRazina);
    }

    set((state) => ({
      dijamanti: state.dijamanti + dijamanti,
      zlato:     state.zlato     + zlato,
      energija:  state.energija  + energija,
      resursi: {
        drvo:    state.resursi.drvo    + drvo,
        kamen:   state.resursi.kamen   + kamen,
        zeljezo: state.resursi.zeljezo + zeljezo,
      },
      klan: {
        ...state.klan,
        xp:     noviXp,
        razina: novaRazina,
        zadaci: noviZadaci,
      },
      poruka: '⚔️ KLANSKI ZADATAK PREUZET!',
    }));
  },

  refreshKlanZadatke: () => {
    const s = get();
    if (!s.klan.naziv) return;
    const zadnjiRefresh = s.klan.zadnjiRefresh ? new Date(s.klan.zadnjiRefresh) : null;
    const tjedno = 7 * 24 * 60 * 60 * 1000;
    if (zadnjiRefresh && (Date.now() - zadnjiRefresh.getTime()) < tjedno) return;

    set((state) => ({
      klan: {
        ...state.klan,
        zadaci:        generirajKlanZadatke(),
        zadnjiRefresh: new Date().toISOString(),
      },
    }));
  },

  kupiDvostrukiBoost: () => {
    const s = get();
    if (s.zlato < CIJENA_DVOSTRUKI_BOOST) {
      set({ poruka: 'NEDOVOLJNO ZLATA ZA BOOST' });
      return;
    }
    set({
      zlato: s.zlato - CIJENA_DVOSTRUKI_BOOST,
      spinBoostPreostalo: s.spinBoostPreostalo + TRAJANJE_DVOSTRUKI_BOOST,
      poruka: `BOOST AKTIVAN! SLJEDEĆIH ${TRAJANJE_DVOSTRUKI_BOOST} SPINOVA JE 2x`,
    });
  },

  iskoristiBoostSpin: () => {
    const s = get();
    if ((s.spinBoostPreostalo ?? 0) <= 0) return false;
    set({ spinBoostPreostalo: s.spinBoostPreostalo - 1 });
    return true;
  },

  kupiEnergijuHitno: () => {
    const s = get();
    const cijena = 100;
    const maxEnergija = izracunajMaxEnergiju(s.razine.baterija || 0) + Math.round(getVillageSupportStats(s).maxEnergyFlat || 0);
    if (s.zlato < cijena) {
      set({ poruka: 'NEDOVOLJNO ZLATA ZA ENERGIJU' });
      return;
    }
    if (s.energija >= maxEnergija) {
      set({ poruka: 'ENERGIJA JE VEĆ NA MAKSIMUMU' });
      return;
    }
    set((state) => ({
      zlato: state.zlato - cijena,
      energija: Math.min(maxEnergija, state.energija + 100),
      poruka: 'KUPLJENO +100 ENERGIJE',
    }));
  },

  oznaciEventVidjen: (eventId) => set({ zadnjiVideniEventId: eventId }),

  // ─── Backend / Auth ────────────────────────────────────────────────────────

  /** Postavi Firebase UID (poziva se iz useAuth hooka). */
  postaviUid: (uid) => set({ uid }),

  /** Postavi prikazno ime igrača (za ljestvicu). */
  postaviIme: (imeIgraca) => {
    const clean = sanitizePlayerName(imeIgraca);
    if (!clean) return;
    set({ imeIgraca: clean });
  },

  /**
   * Dodaj resurse ukradene u raidu.
   * @param {{ drvo?: number, kamen?: number, zeljezo?: number }} ukradeno
   */
  primiResurse: (ukradeno, meta = {}) => set((state) => ({
    resursi: {
      drvo:    state.resursi.drvo    + (ukradeno.drvo    ?? 0),
      kamen:   state.resursi.kamen   + (ukradeno.kamen   ?? 0),
      zeljezo: state.resursi.zeljezo + (ukradeno.zeljezo ?? 0),
    },
    ukupnoRaidova: state.ukupnoRaidova + 1,
    raidPovijest: [
      {
        id: `out-${Date.now()}-${randomInt(RAID_ID_UPPER_BOUND)}`,
        tip: 'outgoing',
        metaUid: meta.uid ?? null,
        metaIme: meta.imeIgraca ?? 'Meta',
        vrijemeNapadaMs: Date.now(),
        ukradeno,
      },
      ...(state.raidPovijest ?? []).slice(0, 19),
    ],
    poruka: `⚔️ PLJAČKA: +${Math.floor(ukradeno.drvo ?? 0)}🌲 +${Math.floor(ukradeno.kamen ?? 0)}⛰️ +${Math.floor(ukradeno.zeljezo ?? 0)}⛏️`,
  })),

  dodajSezonaXp: (tip, kolicina = 1) => {
    const s = get();
    const add = (BP_XP_DOGADAJI[tip] ?? 0) * Math.max(1, kolicina);
    if (add <= 0) return;
    const xpTotal = Math.max(0, (s.sezona?.sezonaBP_XP ?? 0) + add);
    const razina = Math.min(BATTLE_PASS_MAX_RAZINA, Math.floor(xpTotal / BATTLE_PASS_TIER_XP));
    set((state) => ({
      sezona: {
        ...state.sezona,
        sezonaBP_XP: xpTotal,
        sezonaBP_razina: razina,
      },
    }));
  },

  provjeriSezonu: () => {
    const s = get();
    const currentSeason = brojSezone(new Date());
    if ((s.sezona?.sezonaBroj ?? 0) === currentSeason) return;
    set({ sezona: novaSezona() });
  },

  aktivirajPremiumSezona: () => {
    const s = get();
    if (s.sezona?.sezonaPremium) return true;
    if (s.dijamanti < BATTLE_PASS_PREMIUM_CIJENA) {
      set({ poruka: `TREBA ${BATTLE_PASS_PREMIUM_CIJENA} 💎 ZA PREMIUM PASS` });
      return false;
    }
    set((state) => ({
      dijamanti: state.dijamanti - BATTLE_PASS_PREMIUM_CIJENA,
      sezona: { ...state.sezona, sezonaPremium: true },
      poruka: '🎟️ PREMIUM BATTLE PASS AKTIVIRAN!',
    }));
    return true;
  },

  preuzmiBattlePassNagradu: (razina, premium = false) => {
    const s = get();
    const tier = BATTLE_PASS_NAGRADE.find((t) => t.razina === razina);
    if (!tier) return;
    if ((s.sezona?.sezonaBP_razina ?? 0) < razina) return;
    if (premium && !s.sezona?.sezonaPremium) return;
    const key = String(razina);
    const vecPreuzeto = premium ? s.sezona?.bpClaimedPremium?.[key] : s.sezona?.bpClaimedFree?.[key];
    if (vecPreuzeto) return;
    const nagrada = premium ? tier.premium : tier.free;
    get().primiNagradu(nagrada);
    set((state) => ({
      aktivniSkin: nagrada.skin || state.aktivniSkin,
      sezona: {
        ...state.sezona,
        bpClaimedFree: premium ? state.sezona.bpClaimedFree : { ...state.sezona.bpClaimedFree, [key]: true },
        bpClaimedPremium: premium ? { ...state.sezona.bpClaimedPremium, [key]: true } : state.sezona.bpClaimedPremium,
      },
      poruka: `🎁 BP NAGRADA RAZINA ${razina} PREUZETA`,
    }));
  },

  postaviOfflineBonus: (offlineBonus) => set({ offlineBonus }),
  clearOfflineBonus: () => set({ offlineBonus: null }),

  primijeniOfflineNapredak: (elapsedSec) => {
    const s = get();
    const sek = Math.max(0, Math.min(OFFLINE_MAX_SEK, Math.floor(elapsedSec || 0)));
    if (sek <= 0) return;
    const pasivniMnozitelj = izracunajPasivniMnozitelj(s.igracRazina, s.prestigeRazina);
    const heroPasivno = 1 + (izracunajHeroBonus(s.junaci, s.aktivniJunaci, 'pasivno') / 100);
    const produkcijaSela = getVillageProduction(s, pasivniMnozitelj * heroPasivno);
    const bonus = {
      drvo: Math.floor(produkcijaSela.drvo * sek),
      kamen: Math.floor(produkcijaSela.kamen * sek),
      zeljezo: Math.floor(produkcijaSela.zeljezo * sek),
    };
    if (bonus.drvo <= 0 && bonus.kamen <= 0 && bonus.zeljezo <= 0) return;
    set((state) => ({
      resursi: {
        drvo: state.resursi.drvo + bonus.drvo,
        kamen: state.resursi.kamen + bonus.kamen,
        zeljezo: state.resursi.zeljezo + bonus.zeljezo,
      },
      offlineBonus: { ...bonus, sekunde: sek },
      poruka: '🏠 OFFLINE PRODUKCIJA DODANA',
    }));
  },

  resetirajAdsAkoNoviDan: () => {
    const today = new Date().toDateString();
    if (get().adsDatum === today) return;
    set({ adsDatum: today, adsPogledanoDanas: 0 });
  },

  mozePogledatiOglas: () => {
    get().resetirajAdsAkoNoviDan();
    return get().adsPogledanoDanas < MAX_AD_VIEWS_DNEVNO;
  },

  evidentirajPogledanOglas: () => {
    get().resetirajAdsAkoNoviDan();
    if (get().adsPogledanoDanas >= MAX_AD_VIEWS_DNEVNO) return false;
    set((state) => ({ adsPogledanoDanas: state.adsPogledanoDanas + 1 }));
    return true;
  },

  primijeniAdNagradu: (tip, payload = {}) => {
    if (!get().evidentirajPogledanOglas()) {
      set({ poruka: `DNEVNI LIMIT OGLASA (${MAX_AD_VIEWS_DNEVNO}) ISKORIŠTEN` });
      return false;
    }
    if (tip === 'energija') {
      const maxEnergija = izracunajMaxEnergiju(get().razine.baterija || 0) + Math.round(getVillageSupportStats(get()).maxEnergyFlat || 0);
      set((state) => ({ energija: Math.min(maxEnergija, state.energija + 30), poruka: '📺 +30 ENERGIJE' }));
      return true;
    }
    if (tip === 'duplirajDobitak') {
      const dobitak = payload.dobitakNaCekanju;
      if (!dobitak) {
        set({ poruka: 'NEMA DOBITKA ZA DUPLANJE' });
        return false;
      }
      set((state) => ({
        zlato: state.zlato + Math.floor(dobitak.zlato ?? 0),
        dijamanti: state.dijamanti + Math.floor(dobitak.dijamanti ?? 0),
        energija: state.energija + Math.floor(dobitak.energija ?? 0),
        resursi: {
          drvo: state.resursi.drvo + Math.floor(dobitak.drvo ?? 0),
          kamen: state.resursi.kamen + Math.floor(dobitak.kamen ?? 0),
          zeljezo: state.resursi.zeljezo + Math.floor(dobitak.zeljezo ?? 0),
        },
        poruka: '📺 DOBITAK DUPLIRAN OGLASOM',
      }));
      return true;
    }
    if (tip === 'stit') {
      const maxStitova = izracunajMaxStitova(get().razine.oklop || 0);
      set({ stitovi: maxStitova, stitRegenSekundi: STIT_REGEN_INTERVAL_SEK, poruka: '📺 ŠTITOVI OBNOVLJENI' });
      return true;
    }
    return false;
  },

  postaviClanRat: (war) => set((state) => ({ clanRat: { ...state.clanRat, ...war } })),
  postaviRevengeTarget: (meta) => set({ revengeTarget: meta || null }),
  evidentirajClanRatBodove: (tip, kolicina = 1) => {
    const s = get();
    if (!s.clanRat?.aktivan) return;
    const base = tip === 'raid' ? 10 : tip === 'misija' ? 25 : 1;
    const add = Math.max(1, Math.floor(base * kolicina));
    if (s.clanRat?.warId) {
      dodajBodoveClanRatu(s.clanRat.warId, 'A', add).catch(() => {});
    }
    set((state) => ({
      clanRat: {
        ...state.clanRat,
        bodovi: {
          ...(state.clanRat?.bodovi ?? { A: 0, B: 0 }),
          A: (state.clanRat?.bodovi?.A ?? 0) + add,
        },
      },
    }));
  },
  zavrsiClanRat: (pobjeda = false) => set((state) => ({
    clanRat: { ...state.clanRat, aktivan: false, status: 'ended' },
    klan: pobjeda ? { ...state.klan, xp: state.klan.xp + 500 } : state.klan,
    poruka: pobjeda ? '⚔️ KLAN RAT POBIJEDEN! +500 XP' : state.poruka,
  })),

  // ─── Junaci (Hero Collection) ───────────────────────────────────────────────

  dodijeliHeroURoom: (roomId, heroId) => {
    const s = get();
    const heroState = s.junaci[heroId];
    const heroDefinition = getHeroDefinition(heroId);

    if (!heroState || heroState.razina <= 0 || !heroDefinition) {
      set({ poruka: 'JUNAK NIJE OTKRIVEN' });
      return false;
    }

    const rooms = normalizeVillageRooms(s.villageRooms, s.gradevine, s.ostecenja);
    const targetRoom = rooms.find((room) => room.id === roomId);

    if (!targetRoom || !targetRoom.type || targetRoom.level <= 0) {
      set({ poruka: 'SOBA JOŠ NIJE SPREMNA ZA POSADU' });
      return false;
    }
    if (targetRoom.status !== 'active') {
      set({ poruka: 'SOBA MORA BITI AKTIVNA PRIJE DODJELE JUNAKA' });
      return false;
    }

    if (targetRoom.assignedHeroId === heroId) {
      const villageRooms = rooms.map((room) => (
        room.id === roomId ? { ...room, assignedHeroId: null } : room
      ));
      set({ villageRooms, poruka: `${heroDefinition.naziv.toUpperCase()} JE POVUČEN IZ SOBE` });
      return true;
    }

    const roomDefinition = getVillageRoomDefinition(targetRoom);
    const villageRooms = rooms.map((room) => {
      if (room.assignedHeroId === heroId) return { ...room, assignedHeroId: null };
      if (room.id === roomId) return { ...room, assignedHeroId: heroId };
      return room;
    });

    set({
      villageRooms,
      poruka: `${heroDefinition.naziv.toUpperCase()} RADI U SOBI ${roomDefinition?.naziv?.toUpperCase() ?? 'SELO'}`,
    });
    return true;
  },

  ukloniHeroIzSobe: (roomId) => {
    const s = get();
    const rooms = normalizeVillageRooms(s.villageRooms, s.gradevine, s.ostecenja);
    const targetRoom = rooms.find((room) => room.id === roomId);
    if (!targetRoom?.assignedHeroId) return false;

    const heroDefinition = getHeroDefinition(targetRoom.assignedHeroId);
    const villageRooms = rooms.map((room) => (
      room.id === roomId ? { ...room, assignedHeroId: null } : room
    ));

    set({
      villageRooms,
      poruka: `${heroDefinition?.naziv?.toUpperCase() ?? 'JUNAK'} JE VRAĆEN U ODMOR`,
    });
    return true;
  },

  /**
   * Dodaj fragmente junaku. Ako heroId === null, odabere nasumičnog junaka.
   * Automatski povećava razinu junaka kada se skupe dovoljni fragmenti.
   */
  dodijeliHeroFragmente: (heroId, kolicina) => {
    const targetId = heroId || selectRandomHeroByWeight();
    if (!targetId) return;

    set((state) => {
      const current = state.junaci[targetId] || { fragmenti: 0, razina: 0 };
      if (current.razina >= HERO_MAX_RAZINA) return {};

      let noviFragmenti = current.fragmenti + kolicina;
      let novaRazina    = current.razina;
      let novaOtkrica   = null;

      while (novaRazina < HERO_MAX_RAZINA) {
        const potrebno = novaRazina === 0 ? HERO_FRAGMENTI_ZA_OTKLJ : HERO_FRAGMENTI_ZA_RAZINU;
        if (noviFragmenti >= potrebno) {
          noviFragmenti -= potrebno;
          novaRazina++;
          if (novaRazina === 1) {
            const def = JUNACI.find((h) => h.id === targetId);
            novaOtkrica = `🦸 JUNAK OTKRIVEN: ${def?.emodzi ?? ''} ${def?.naziv ?? targetId}!`;
          }
        } else {
          break;
        }
      }

      return {
        junaci: { ...state.junaci, [targetId]: { fragmenti: noviFragmenti, razina: novaRazina } },
        ...(novaOtkrica ? { poruka: novaOtkrica } : {}),
      };
    });
  },

  /**
   * Aktiviraj ili deaktiviraj junaka. Junaci moraju biti otkriven (razina >= 1).
   * Maksimalno HERO_MAX_AKTIVNIH aktivnih odjednom.
   */
  aktivirajHeroja: (heroId) => {
    const s = get();
    const heroState = s.junaci[heroId];
    if (!heroState || heroState.razina <= 0) {
      set({ poruka: 'JUNAK NIJE OTKRIVEN' });
      return;
    }
    if (s.aktivniJunaci.includes(heroId)) {
      set({ aktivniJunaci: s.aktivniJunaci.filter((id) => id !== heroId) });
    } else {
      if (s.aktivniJunaci.length >= HERO_MAX_AKTIVNIH) {
        set({ poruka: `MAKSIMALNO ${HERO_MAX_AKTIVNIH} AKTIVNA JUNAKA` });
        return;
      }
      set({ aktivniJunaci: [...s.aktivniJunaci, heroId] });
    }
  },

  /**
   * Potroši dijamante i dobij fragmente nasumičnog junaka.
   * Vraća true pri uspjehu, false pri neuspjehu.
   */
  prizivajHeroja: () => {
    const s = get();
    if (s.dijamanti < HERO_SUMMON_KOST) {
      set({ poruka: `TREBA ${HERO_SUMMON_KOST} 💎 ZA PRIZIVANJE` });
      return false;
    }
    const targetId  = selectRandomHeroByWeight();
    if (!targetId) return false;
    const fragmenti = randomInt(4) + 3; // 3–6 fragmenata
    set({ dijamanti: s.dijamanti - HERO_SUMMON_KOST });
    const def = JUNACI.find((h) => h.id === targetId);
    useGameStore.getState().dodijeliHeroFragmente(targetId, fragmenti);
    const updated = useGameStore.getState().junaci[targetId];
    if (!updated || updated.razina === 0) {
      set({ poruka: `✨ PRIZVAN: ${def?.emodzi ?? ''} ${fragmenti}× ${def?.naziv ?? targetId} FRAGMENTI!` });
    }
    return true;
  },
}));
