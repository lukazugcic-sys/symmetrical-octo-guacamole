import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initDB, dbGet, dbSet } from '../db/database';
import {
  BAZA_TECAJ, ZGRADE, LUCKY_SPIN_INTERVAL, DNEVNE_NAGRADE,
  generirajMisiju, generirajUnikatneMisije, DOSTIGNUCA, generirajKlanZadatke,
  STIT_REGEN_INTERVAL_SEK, CIJENA_DVOSTRUKI_BOOST, TRAJANJE_DVOSTRUKI_BOOST,
  BATTLE_PASS_NAGRADE, BATTLE_PASS_MAX_RAZINA, BATTLE_PASS_TIER_XP, BATTLE_PASS_PREMIUM_CIJENA,
  BATTLE_PASS_SEASON_THEME, OFFLINE_MAX_SEK, MAX_AD_VIEWS_DNEVNO,
} from '../config/constants';
import { dohvatiAktivniDogadaj } from '../config/sezonalniDogadaji';
import {
  izracunajMaxEnergiju, izracunajMaxStitova, izracunajPasivniMnozitelj,
  izracunajPotrebniXp,
} from '../utils/economy';
import { randomFloat, randomInt } from '../utils/helpers';
import { spremiCloud }      from '../firebase/cloudSave';
import { azurirajLjestvicu } from '../firebase/leaderboard';
import { dodajBodoveClanRatu } from '../firebase/clanMultiplayer';

// Dozvoljeno ime klana: 2-50 znakova, Unicode slova/brojevi, razmak, "_" i "-".
const CLAN_NAME_REGEX = /^[\p{L}\p{N}\s_-]{2,50}$/u;
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
const RAID_ID_UPPER_BOUND = 1000000000;

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

const PRAZNI_KLAN = {
  naziv:         null,
  razina:        0,
  xp:            0,
  zadaci:        [],
  zadnjiRefresh: null,
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
  gradevine:        { pilana: 1, kamenolom: 0, rudnik: 0 },
  ostecenja:        { pilana: false, kamenolom: false, rudnik: false },
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
};

export const useGameStore = create((set, get) => ({
  ...pocetnoStanje,

  // ─── UI poruka ─────────────────────────────────────────────────────────────
  setPoruka: (poruka) => set({ poruka }),

  // ─── Level up overlay ───────────────────────────────────────────────────────
  clearLevelUp: () => set({ levelUpData: null }),

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
      let p = await migriraiAkoTreba('@save_game_eco_v31');
      let sourceKey = '@save_game_eco_v31';
      if (!p) {
        p = await migriraiAkoTreba('@save_game_eco_v30');
        sourceKey = '@save_game_eco_v30';
      }
      if (p) {
        const d = JSON.parse(p);
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
        set({
          ...(d.igracRazina                                          ? { igracRazina: d.igracRazina }                           : {}),
          ...(d.prestigeRazina                                       ? { prestigeRazina: d.prestigeRazina }                     : {}),
          ...(d.xp                                                   ? { xp: d.xp }                                             : {}),
          ...(d.energija !== undefined && !isNaN(d.energija)         ? { energija: d.energija }                                 : {}),
          ...(d.zlato !== undefined    && !isNaN(d.zlato)            ? { zlato: d.zlato }                                       : {}),
          ...(d.dijamanti !== undefined && !isNaN(d.dijamanti)       ? { dijamanti: d.dijamanti }                               : {}),
          ...(d.resursi                                              ? { resursi: { ...get().resursi, ...d.resursi } }           : {}),
          ...(d.gradevine                                            ? { gradevine: { ...get().gradevine, ...d.gradevine } }     : {}),
          ...(d.ostecenja                                            ? { ostecenja: { ...get().ostecenja, ...d.ostecenja } }     : {}),
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
          ...(Array.isArray(d.raidPovijest)                          ? { raidPovijest: d.raidPovijest.slice(0, 20) }            : {}),
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
        });
        if (sourceKey === '@save_game_eco_v30') {
          const migratedPayload = {
            ...d,
            sezona: sezonaZaSet,
            adsPogledanoDanas: d.adsPogledanoDanas ?? 0,
            adsDatum: d.adsDatum ?? new Date().toDateString(),
            zadnjiOnlineMs: d.zadnjiOnlineMs ?? Date.now(),
            clanRat: d.clanRat ?? get().clanRat,
            revengeTarget: d.revengeTarget ?? null,
          };
          await dbSet('@save_game_eco_v31', JSON.stringify(migratedPayload));
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
    const payload = {
      igracRazina: s.igracRazina, prestigeRazina: s.prestigeRazina, xp: s.xp,
      energija: s.energija, zlato: s.zlato, dijamanti: s.dijamanti,
      resursi: s.resursi, gradevine: s.gradevine, ostecenja: s.ostecenja,
      razine: s.razine, stitovi: s.stitovi, misije: s.misije,
      tecaj: s.tecaj, trend: s.trend,
      luckySpinCounter: s.luckySpinCounter, winStreak: s.winStreak,
      aktivniSkin: s.aktivniSkin,
      spinBoostPreostalo: s.spinBoostPreostalo,
      stitRegenSekundi: s.stitRegenSekundi,
      raidPovijest: s.raidPovijest.slice(0, 20),
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
    };
    set({ cloudSaveStatus: s.uid ? 'saving' : 'idle', zadnjiCloudPayload: payload });
    try {
      await dbSet('@save_game_eco_v31', JSON.stringify(payload));
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
      }));
    } catch (e) { console.error('Failed to save achievements:', e); }
  },

  // ─── Tajmeri (poziva se iz useVillage / useMarket hookova) ─────────────────
  timerTick: () => {
    get().provjeriSezonu();
    get().resetirajAdsAkoNoviDan();
    const s = get();
    const maxEnergija    = izracunajMaxEnergiju(s.razine.baterija || 0);
    const maxStitova     = izracunajMaxStitova(s.razine.oklop || 0);
    const pasivniMnozitelj = izracunajPasivniMnozitelj(s.igracRazina, s.prestigeRazina);

    set((state) => ({
      energija: state.energija < maxEnergija ? state.energija + 1 : state.energija,
      resursi: {
        drvo:    state.resursi.drvo    + (!state.ostecenja.pilana    ? (state.gradevine.pilana    * ZGRADE[0].bazaProizvodnja * pasivniMnozitelj) : 0),
        kamen:   state.resursi.kamen   + (!state.ostecenja.kamenolom ? (state.gradevine.kamenolom * ZGRADE[1].bazaProizvodnja * pasivniMnozitelj) : 0),
        zeljezo: state.resursi.zeljezo + (!state.ostecenja.rudnik    ? (state.gradevine.rudnik    * ZGRADE[2].bazaProizvodnja * pasivniMnozitelj) : 0),
      },
      stitovi: (state.stitovi < maxStitova && state.stitRegenSekundi <= 1)
        ? state.stitovi + 1
        : state.stitovi,
      stitRegenSekundi: state.stitovi >= maxStitova
        ? STIT_REGEN_INTERVAL_SEK
        : (state.stitRegenSekundi <= 1 ? STIT_REGEN_INTERVAL_SEK : state.stitRegenSekundi - 1),
    }));
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
      const maxEnergija = izracunajMaxEnergiju(s.razine.baterija || 0);
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
    set({ poruka: 'MISIJA ZAVRŠENA! NAGRADA PREUZETA.' });
  },

  // ─── Selo (zgrade i prestige) ──────────────────────────────────────────────
  nadogradiZgradu: (zgrada) => {
    const s = get();
    const lv = s.gradevine[zgrada.id] || 0;
    if (lv >= zgrada.maxLv) return;
    const c = zgrada.cijena(lv + 1);

    if (
      s.zlato       < c.zlato        ||
      s.resursi.drvo    < (c.drvo    || 0) ||
      s.resursi.kamen   < (c.kamen   || 0) ||
      s.resursi.zeljezo < (c.zeljezo || 0)
    ) {
      set({ poruka: 'FALE RESURSI ZA NADOGRADNJU' });
      return;
    }

    set((state) => ({
      zlato: state.zlato - c.zlato,
      resursi: {
        drvo:    state.resursi.drvo    - (c.drvo    || 0),
        kamen:   state.resursi.kamen   - (c.kamen   || 0),
        zeljezo: state.resursi.zeljezo - (c.zeljezo || 0),
      },
      gradevine: { ...state.gradevine, [zgrada.id]: lv + 1 },
      poruka: `${zgrada.naziv.toUpperCase()} NADOGRAĐEN!`,
    }));
    get().azurirajMisiju('zgrada');
    get().azurirajKlanZadatak('zgrada');
    get().provjeriDostignuca(undefined, undefined, lv + 1, undefined);
  },

  popraviZgradu: (zgrada) => {
    const s = get();
    const lv             = s.gradevine[zgrada.id];
    const cPopravakZlato = lv * 50;
    const cPopravakDrvo  = lv * 20;

    if (s.zlato < cPopravakZlato || s.resursi.drvo < cPopravakDrvo) {
      set({ poruka: 'NEMAŠ DOVOLJNO RESURSA ZA POPRAVAK' });
      return;
    }

    set((state) => ({
      zlato:    state.zlato - cPopravakZlato,
      resursi:  { ...state.resursi, drvo: state.resursi.drvo - cPopravakDrvo },
      ostecenja: { ...state.ostecenja, [zgrada.id]: false },
      poruka:   `${zgrada.naziv.toUpperCase()} USPJEŠNO POPRAVLJEN!`,
    }));
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
    set({
      prestigeRazina: noviPrestige,
      igracRazina:    1,
      xp:             0,
      gradevine:      { pilana: 0, kamenolom: 0, rudnik: 0 },
      ostecenja:      { pilana: false, kamenolom: false, rudnik: false },
      resursi:        { drvo: 0, kamen: 0, zeljezo: 0 },
      zlato:          50,
      energija:       bonusState.energija ?? 10,
      winStreak:      0,
      luckySpinCounter: LUCKY_SPIN_INTERVAL,
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
    const cistiNaziv = naziv.trim();
    if (!CLAN_NAME_REGEX.test(cistiNaziv)) {
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
    if (s.zlato < cijena) {
      set({ poruka: 'NEDOVOLJNO ZLATA ZA ENERGIJU' });
      return;
    }
    set((state) => ({
      zlato: state.zlato - cijena,
      energija: state.energija + 100,
      poruka: 'KUPLJENO +100 ENERGIJE',
    }));
  },

  oznaciEventVidjen: (eventId) => set({ zadnjiVideniEventId: eventId }),

  // ─── Backend / Auth ────────────────────────────────────────────────────────

  /** Postavi Firebase UID (poziva se iz useAuth hooka). */
  postaviUid: (uid) => set({ uid }),

  /** Postavi prikazno ime igrača (za ljestvicu). */
  postaviIme: (imeIgraca) => set({ imeIgraca }),

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
    const bonus = {
      drvo: Math.floor((!s.ostecenja.pilana ? (s.gradevine.pilana * ZGRADE[0].bazaProizvodnja * pasivniMnozitelj * sek) : 0)),
      kamen: Math.floor((!s.ostecenja.kamenolom ? (s.gradevine.kamenolom * ZGRADE[1].bazaProizvodnja * pasivniMnozitelj * sek) : 0)),
      zeljezo: Math.floor((!s.ostecenja.rudnik ? (s.gradevine.rudnik * ZGRADE[2].bazaProizvodnja * pasivniMnozitelj * sek) : 0)),
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
      set((state) => ({ energija: state.energija + 30, poruka: '📺 +30 ENERGIJE' }));
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
}));
