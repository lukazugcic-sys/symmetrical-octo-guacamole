import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initDB, dbGet, dbSet } from '../db/database';
import {
  BAZA_TECAJ, ZGRADE, LUCKY_SPIN_INTERVAL, DNEVNE_NAGRADE,
  generirajMisiju, generirajUnikatneMisije, DOSTIGNUCA,
  STIT_REGEN_INTERVAL_SEK, CIJENA_DVOSTRUKI_BOOST, TRAJANJE_DVOSTRUKI_BOOST,
  OFFLINE_MAX_SEK, MAX_AD_VIEWS_DNEVNO,
} from '../config/constants';
import { SAVE_KEYS } from '../domain/persistence/schema';
import {
  createRuntimeSaveSnapshot,
  deserializeGameSave,
  serializeGameSave,
} from '../domain/persistence/savePayload';
import {
  izracunajMaxEnergiju, izracunajMaxStitova, izracunajPasivniMnozitelj,
  izracunajPotrebniXp,
} from '../utils/economy';
import { randomFloat, randomInt } from '../utils/helpers';

const pocetnoStanje = {
  ucitavam:            true,
  igracRazina:         1,
  prestigeRazina:      0,
  xp:                  0,
  energija:            10,
  zlato:               50,
  dijamanti:           5,
  resursi:             { drvo: 0, kamen: 0, zeljezo: 0 },
  stitovi:             1,
  gradevine:           { pilana: 1, kamenolom: 0, rudnik: 0 },
  ostecenja:           { pilana: false, kamenolom: false, rudnik: false },
  razine:              { sreca: 0, pojacalo: 0, baterija: 0, oklop: 0 },
  misije:              generirajUnikatneMisije(3),
  ukupnoVrtnji:        0,
  ukupnoZlata:         0,
  dostignucaDone:      {},
  dnevniStreak:        0,
  prikazDnevneNagrade: false,
  dnevnaNagrada:       null,
  tecaj:               BAZA_TECAJ,
  trend:               { drvo: 0, kamen: 0, zeljezo: 0, dijamant: 0 },
  luckySpinCounter:    LUCKY_SPIN_INTERVAL,
  winStreak:           0,
  poruka:              'SPREMAN ZA VRTNJU',
  levelUpData:         null,
  aktivniSkin:         'default',
  spinBoostPreostalo:  0,
  stitRegenSekundi:    STIT_REGEN_INTERVAL_SEK,
  prestigeMilestones:  {},
  offlineBonus:        null,
  zadnjiOnlineMs:      Date.now(),
  adsPogledanoDanas:   0,
  adsDatum:            new Date().toDateString(),
};

export const useGameStore = create((set, get) => ({
  ...pocetnoStanje,

  setPoruka: (poruka) => set({ poruka }),
  clearLevelUp: () => set({ levelUpData: null }),

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
      await initDB();
      const migriraiAkoTreba = get()._migriraiAkoTreba;

      let p = await migriraiAkoTreba(SAVE_KEYS.game);
      let loadedFromLegacy = false;
      if (!p) {
        p = await migriraiAkoTreba(SAVE_KEYS.legacyV31);
        loadedFromLegacy = !!p;
      }
      if (!p) {
        p = await migriraiAkoTreba(SAVE_KEYS.legacyV30);
        loadedFromLegacy = !!p;
      }

      if (p) {
        const loaded = deserializeGameSave(p);
        const d = loaded.data || {};
        const nextState = {
          ...(d.igracRazina                                           ? { igracRazina: d.igracRazina }                           : {}),
          ...(d.prestigeRazina                                        ? { prestigeRazina: d.prestigeRazina }                    : {}),
          ...(d.xp                                                    ? { xp: d.xp }                                            : {}),
          ...(d.energija !== undefined && !isNaN(d.energija)          ? { energija: d.energija }                                : {}),
          ...(d.zlato !== undefined    && !isNaN(d.zlato)             ? { zlato: d.zlato }                                      : {}),
          ...(d.dijamanti !== undefined && !isNaN(d.dijamanti)        ? { dijamanti: d.dijamanti }                              : {}),
          ...(d.resursi                                               ? { resursi: { ...get().resursi, ...d.resursi } }          : {}),
          ...(d.gradevine                                             ? { gradevine: { ...get().gradevine, ...d.gradevine } }    : {}),
          ...(d.ostecenja                                             ? { ostecenja: { ...get().ostecenja, ...d.ostecenja } }    : {}),
          ...(d.razine                                                ? { razine: { ...get().razine, ...d.razine } }             : {}),
          ...(d.stitovi !== undefined                                 ? { stitovi: d.stitovi }                                  : {}),
          ...(d.misije && d.misije.length > 0                         ? { misije: d.misije }                                    : {}),
          ...(d.tecaj                                                 ? { tecaj: d.tecaj }                                      : {}),
          ...(d.trend                                                 ? { trend: d.trend }                                      : {}),
          ...(d.luckySpinCounter !== undefined                        ? { luckySpinCounter: d.luckySpinCounter }                : {}),
          ...(d.winStreak !== undefined                               ? { winStreak: d.winStreak }                              : {}),
          ...(d.aktivniSkin                                           ? { aktivniSkin: d.aktivniSkin }                          : {}),
          ...(d.spinBoostPreostalo !== undefined                      ? { spinBoostPreostalo: d.spinBoostPreostalo }            : {}),
          ...(d.stitRegenSekundi !== undefined                        ? { stitRegenSekundi: d.stitRegenSekundi }                : {}),
          ...(d.prestigeMilestones                                    ? { prestigeMilestones: d.prestigeMilestones }            : {}),
          ...(d.adsPogledanoDanas !== undefined                       ? { adsPogledanoDanas: d.adsPogledanoDanas }             : {}),
          ...(d.adsDatum !== undefined                                ? { adsDatum: d.adsDatum }                               : {}),
          ...(d.zadnjiOnlineMs !== undefined                          ? { zadnjiOnlineMs: d.zadnjiOnlineMs }                   : {}),
        };
        set(nextState);

        if (loadedFromLegacy) {
          const migratedSnapshot = createRuntimeSaveSnapshot(get());
          await dbSet(SAVE_KEYS.game, serializeGameSave(migratedSnapshot));
        }
      }

      // Dostignuća
      const pa = await migriraiAkoTreba('@save_dostignuca_v1');
      if (pa) {
        const da = JSON.parse(pa);
        set({
          ...(da.dostignucaDone ? { dostignucaDone: da.dostignucaDone } : {}),
          ...(da.ukupnoVrtnji   ? { ukupnoVrtnji: da.ukupnoVrtnji }     : {}),
          ...(da.ukupnoZlata    ? { ukupnoZlata: da.ukupnoZlata }       : {}),
        });
      }

      // Dnevna nagrada
      const pd = await migriraiAkoTreba('@save_dnevna_v1');
      const danas = new Date().toDateString();
      if (pd) {
        const dd = JSON.parse(pd);
        const streak = dd.streak || 0;
        const zadnja = dd.zadnjaDnevna || '';
        if (zadnja !== danas) {
          const jucer = new Date();
          jucer.setDate(jucer.getDate() - 1);
          const noviStreak = zadnja === jucer.toDateString() ? streak + 1 : 1;
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
    try {
      await dbSet(SAVE_KEYS.game, serializeGameSave(payload));
    } catch (e) { console.error('Failed to save game state:', e); }
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

  timerTick: () => {
    get().resetirajAdsAkoNoviDan();
    const s = get();
    const maxEnergija      = izracunajMaxEnergiju(s.razine.baterija || 0);
    const maxStitova       = izracunajMaxStitova(s.razine.oklop || 0);
    const pasivniMnozitelj = izracunajPasivniMnozitelj(s.igracRazina, s.prestigeRazina);

    set((state) => ({
      energija: state.energija < maxEnergija
        ? Math.min(maxEnergija, state.energija + 1)
        : state.energija,
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
      if (d.tip === 'spin'        && novaVrtnja     !== undefined && novaVrtnja     >= d.cilj) ispunjeno = true;
      if (d.tip === 'ukupnoZlato' && novoZlato      !== undefined && novoZlato     >= d.cilj) ispunjeno = true;
      if (d.tip === 'gradnja'     && novaTipGradnje !== undefined && novaTipGradnje >= d.cilj) ispunjeno = true;
      if (d.tip === 'prestige'    && noviPrestige   !== undefined && noviPrestige   >= d.cilj) ispunjeno = true;
      if (d.tip === 'razina'      && s.igracRazina  !== undefined && s.igracRazina  >= d.cilj) ispunjeno = true;
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
    set({ poruka: 'MISIJA ZAVRŠENA! NAGRADA PREUZETA.' });
  },

  nadogradiZgradu: (zgrada) => {
    const s = get();
    const lv = s.gradevine[zgrada.id] || 0;
    if (lv >= zgrada.maxLv) return;
    const c = zgrada.cijena(lv + 1);

    if (
      s.zlato           < c.zlato        ||
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
      poruka: `PRESTIGE USPJEŠAN! NOVI MNOŽITELJ x${(1 + (noviPrestige * 0.35)).toFixed(2)}${bonusPoruka}`,
    });
    get().provjeriDostignuca(undefined, undefined, undefined, noviPrestige);
  },

  kupiAlat: (alat) => {
    const s = get();
    const mult = Math.pow(1.4, s.razine[alat.id] || 0);
    const zl   = Math.floor(alat.cZlato   * mult);
    const ka   = Math.floor(alat.cKamen   * mult);
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
  },

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

  kupiSkin: (skin) => {
    const s = get();
    if (s.aktivniSkin === skin.id) return;
    if (skin.cijenaDijamanti > 0 && s.dijamanti < skin.cijenaDijamanti) {
      set({ poruka: 'NEDOVOLJNO DIJAMANATA' });
      return;
    }
    set({
      dijamanti:   skin.cijenaDijamanti > 0 ? s.dijamanti - skin.cijenaDijamanti : s.dijamanti,
      aktivniSkin: skin.id,
      poruka:      `${skin.emodzi} SKIN "${skin.naziv.toUpperCase()}" AKTIVIRAN`,
    });
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

  postaviOfflineBonus: (offlineBonus) => set({ offlineBonus }),
  clearOfflineBonus: () => set({ offlineBonus: null }),

  primijeniOfflineNapredak: (elapsedSec) => {
    const s = get();
    const sek = Math.max(0, Math.min(OFFLINE_MAX_SEK, Math.floor(elapsedSec || 0)));
    if (sek <= 0) return;
    const pasivniMnozitelj = izracunajPasivniMnozitelj(s.igracRazina, s.prestigeRazina);
    const bonus = {
      drvo:    Math.floor((!s.ostecenja.pilana    ? (s.gradevine.pilana    * ZGRADE[0].bazaProizvodnja * pasivniMnozitelj * sek) : 0)),
      kamen:   Math.floor((!s.ostecenja.kamenolom ? (s.gradevine.kamenolom * ZGRADE[1].bazaProizvodnja * pasivniMnozitelj * sek) : 0)),
      zeljezo: Math.floor((!s.ostecenja.rudnik    ? (s.gradevine.rudnik    * ZGRADE[2].bazaProizvodnja * pasivniMnozitelj * sek) : 0)),
    };
    if (bonus.drvo <= 0 && bonus.kamen <= 0 && bonus.zeljezo <= 0) return;
    set((state) => ({
      resursi: {
        drvo:    state.resursi.drvo    + bonus.drvo,
        kamen:   state.resursi.kamen   + bonus.kamen,
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
        zlato:     state.zlato     + Math.floor(dobitak.zlato     ?? 0),
        dijamanti: state.dijamanti + Math.floor(dobitak.dijamanti ?? 0),
        energija:  state.energija  + Math.floor(dobitak.energija  ?? 0),
        resursi: {
          drvo:    state.resursi.drvo    + Math.floor(dobitak.drvo    ?? 0),
          kamen:   state.resursi.kamen   + Math.floor(dobitak.kamen   ?? 0),
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
}));
