import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initDB, dbGet, dbSet } from '../db/database';
import {
  BAZA_TECAJ, ZGRADE, LUCKY_SPIN_INTERVAL, MS_PER_DAY, DNEVNE_NAGRADE,
  generirajMisiju, DOSTIGNUCA, generirajKlanZadatke,
} from '../config/constants';
import {
  izracunajMaxEnergiju, izracunajMaxStitova, izracunajPasivniMnozitelj,
  izracunajPotrebniXp,
} from '../utils/economy';

const PRAZNI_KLAN = {
  naziv:         null,
  razina:        0,
  xp:            0,
  zadaci:        [],
  zadnjiRefresh: null,
};

const pocetnoStanje = {
  ucitavam:         true,
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
  misije:           [generirajMisiju(), generirajMisiju(), generirajMisiju()],
  ukupnoVrtnji:     0,
  ukupnoZlata:      0,
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
  klan:             { ...PRAZNI_KLAN }, // Klan / Ceh igrača
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
    } catch (_) {}
    return null;
  },

  ucitaj: async () => {
    try {
      // Inicijaliziraj SQLite bazu i shemu
      await initDB();

      const migriraiAkoTreba = get()._migriraiAkoTreba;

      // ─── Glavno stanje igre ───────────────────────────────────────────────
      const p = await migriraiAkoTreba('@save_game_eco_v30');
      if (p) {
        const d = JSON.parse(p);
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
          ...(d.klan                                                 ? { klan: { ...PRAZNI_KLAN, ...d.klan } }                  : {}),
        });
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
          const noviStreak = zadnja === new Date(Date.now() - MS_PER_DAY).toDateString()
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
    try {
      await dbSet('@save_game_eco_v30', JSON.stringify({
        igracRazina: s.igracRazina, prestigeRazina: s.prestigeRazina, xp: s.xp,
        energija: s.energija, zlato: s.zlato, dijamanti: s.dijamanti,
        resursi: s.resursi, gradevine: s.gradevine, ostecenja: s.ostecenja,
        razine: s.razine, stitovi: s.stitovi, misije: s.misije,
        tecaj: s.tecaj, trend: s.trend,
        luckySpinCounter: s.luckySpinCounter, winStreak: s.winStreak,
        aktivniSkin: s.aktivniSkin,
        klan: s.klan,
      }));
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

  // ─── Tajmeri (poziva se iz useVillage / useMarket hookova) ─────────────────
  timerTick: () => {
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
      stitovi: (state.stitovi < maxStitova && Math.random() < 0.10)
        ? state.stitovi + 1
        : state.stitovi,
    }));
  },

  timerMarket: () => {
    set((state) => {
      const noviTecaj = { ...state.tecaj };
      const noviTrend = {};
      ['drvo', 'kamen', 'zeljezo', 'dijamant'].forEach((res) => {
        const promjena = 0.7 + (Math.random() * 0.6);
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
    const potrebanXp = izracunajPotrebniXp(s.igracRazina);
    if (s.xp >= potrebanXp) {
      const novaRazina = s.igracRazina + 1;
      const maxEnergija = izracunajMaxEnergiju(s.razine.baterija || 0);
      set({
        xp:          s.xp - potrebanXp,
        igracRazina: novaRazina,
        dijamanti:   s.dijamanti + 5,
        energija:    maxEnergija,
        poruka:      `LEVEL UP! RAZINA ${novaRazina}`,
        levelUpData: { razina: novaRazina },
      });
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
    } catch (e) {}
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
    set((state) => ({
      misije: state.misije.map((m) => (m.id === id ? generirajMisiju() : m)),
    }));
    get().primiNagradu(nagrada);
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
    set({
      prestigeRazina: noviPrestige,
      igracRazina:    1,
      xp:             0,
      gradevine:      { pilana: 0, kamenolom: 0, rudnik: 0 },
      ostecenja:      { pilana: false, kamenolom: false, rudnik: false },
      resursi:        { drvo: 0, kamen: 0, zeljezo: 0 },
      zlato:          50,
      energija:       10,
      winStreak:      0,
      luckySpinCounter: LUCKY_SPIN_INTERVAL,
      poruka:         `PRESTIGE USPJEŠAN! NOVI MNOŽITELJ x${1 + (noviPrestige * 0.5)}`,
    });
    get().provjeriDostignuca(undefined, undefined, undefined, noviPrestige);
  },

  // ─── Nadogradnje (oprema) ──────────────────────────────────────────────────
  kupiAlat: (alat) => {
    const s = get();
    const mult = Math.pow(1.6, s.razine[alat.id] || 0);
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
    if (!naziv || naziv.trim().length < 2) return;
    set({
      klan: {
        naziv:         naziv.trim(),
        razina:        1,
        xp:            0,
        zadaci:        generirajKlanZadatke(),
        zadnjiRefresh: new Date().toISOString(),
      },
      poruka: `⚔️ KLAN "${naziv.trim().toUpperCase()}" OSNOVAN!`,
    });
  },

  doniraiUKlan: (iznosZlato) => {
    const s = get();
    if (!s.klan.naziv) return;
    if (s.zlato < iznosZlato) {
      set({ poruka: 'NEDOVOLJNO ZLATA ZA DONACIJU' });
      return;
    }
    const xpGain  = Math.floor(iznosZlato / 10);
    const noviXp  = s.klan.xp + xpGain;
    const xpZaRazinu = s.klan.razina * 1000;
    const novaRazina = noviXp >= xpZaRazinu ? s.klan.razina + 1 : s.klan.razina;

    const noviZadaci = s.klan.zadaci.map((z) =>
      z.tip === 'donacija' && !z.zavrseno
        ? { ...z, trenutno: Math.min(z.cilj, z.trenutno + iznosZlato) }
        : z
    ).map((z) => (!z.zavrseno && z.trenutno >= z.cilj ? { ...z, zavrseno: true } : z));

    set((state) => ({
      zlato: state.zlato - iznosZlato,
      klan: {
        ...state.klan,
        xp:      noviXp >= xpZaRazinu ? 0 : noviXp,
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
    const noviXp  = s.klan.xp + xpGain;
    const xpZaRazinu = s.klan.razina * 1000;
    const novaRazina = noviXp >= xpZaRazinu ? s.klan.razina + 1 : s.klan.razina;

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
        xp:     noviXp >= xpZaRazinu ? 0 : noviXp,
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
}));
