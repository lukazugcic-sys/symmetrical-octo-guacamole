import { Dimensions, Platform } from 'react-native';
import {
  Zap, Shield, Gem, TreePine, Mountain, Pickaxe, Skull, Coins, Star,
} from 'lucide-react-native';
import { randomInt } from '../utils/helpers';

// ─── Blago (simboli automata) ─────────────────────────────────────────────────
export const BLAGO = {
  'skull':   { Ikona: Skull,    boja: '#F43F5E', raritet: '#4C0519', tip: 'steta',    baza: 0  },
  'wood':    { Ikona: TreePine, boja: '#67E8F9', raritet: '#0C4A6E', tip: 'drvo',     baza: 4  },
  'stone':   { Ikona: Mountain, boja: '#94A3B8', raritet: '#1E293B', tip: 'kamen',    baza: 8  },
  'iron':    { Ikona: Pickaxe,  boja: '#CBD5E1', raritet: '#334155', tip: 'zeljezo',  baza: 12 },
  'gold':    { Ikona: Coins,    boja: '#FBBF24', raritet: '#451A03', tip: 'zlato',    baza: 25 },
  'energy':  { Ikona: Zap,      boja: '#A3E635', raritet: '#1A2E05', tip: 'energija', baza: 1  },
  'gem':     { Ikona: Gem,      boja: '#E879F9', raritet: '#4A044E', tip: 'dijamanti',baza: 1  },
  'shield':  { Ikona: Shield,   boja: '#3B82F6', raritet: '#1E3A5F', tip: 'stit',    baza: 0  },
  'wild':    { Ikona: Star,     boja: '#F8FAFC', raritet: '#334155', tip: 'wild',     baza: 0  },
};

export const SVO_BLAGO = Object.keys(BLAGO);

// ─── Paleta boja ──────────────────────────────────────────────────────────────
export const BOJE = {
  bg:              '#06060F',
  bgCard:          'rgba(16, 18, 30, 0.90)',
  border:          'rgba(255, 255, 255, 0.10)',
  textMain:        '#F1F5F9',
  textMuted:       '#64748B',
  zlato:           '#FBBF24',
  energija:        '#A3E635',
  stit:            '#22D3EE',
  dijamant:        '#E879F9',
  drvo:            '#67E8F9',
  kamen:           '#94A3B8',
  zeljezo:         '#CBD5E1',
  slotOkvirZlato:  '#13151F',
  slotRolaCrna:    '#060608',
  slotVatra:       '#F43F5E',
  navBg:           'rgba(8, 8, 14, 0.98)',
  nadogradnje:     '#A855F7',
  xp:              '#34D399',
  misije:          '#FB923C',
  prestige:        '#FCD34D',
  klan:            '#38BDF8',
  ljestvica:       '#FBBF24',
  kovacnica:       '#F97316',
  turnir:          '#EC4899',
};

// ─── Tečaj tržnice ────────────────────────────────────────────────────────────
export const BAZA_TECAJ = {
  drvo:    { kupi: 200,  prodaj: 80   },
  kamen:   { kupi: 400,  prodaj: 160  },
  zeljezo: { kupi: 800,  prodaj: 300  },
  dijamant:{ kupi: 5000, prodaj: 2500 },
};

// ─── Zgrade ───────────────────────────────────────────────────────────────────
export const ZGRADE = [
  {
    id: 'pilana', naziv: 'Pilana', maxLv: 10, ikona: TreePine, bazaBoja: BOJE.drvo,
    cijena: (lv) => ({
      zlato:   Math.floor(150 * Math.pow(1.6,  lv - 1)),
      drvo:    0,
      kamen:   Math.floor(25  * Math.pow(1.5,  lv - 1)),
      zeljezo: 0,
    }),
    bazaProizvodnja: 2,
  },
  {
    id: 'kamenolom', naziv: 'Kamenolom', maxLv: 10, ikona: Mountain, bazaBoja: BOJE.kamen,
    cijena: (lv) => ({
      zlato:   Math.floor(250 * Math.pow(1.65, lv - 1)),
      drvo:    Math.floor(100 * Math.pow(1.5,  lv - 1)),
      kamen:   0,
      zeljezo: Math.floor(20  * Math.pow(1.5,  lv - 1)),
    }),
    bazaProizvodnja: 1,
  },
  {
    id: 'rudnik', naziv: 'Željezara', maxLv: 10, ikona: Pickaxe, bazaBoja: BOJE.zeljezo,
    cijena: (lv) => ({
      zlato:   Math.floor(500 * Math.pow(1.7,  lv - 1)),
      drvo:    Math.floor(200 * Math.pow(1.5,  lv - 1)),
      kamen:   Math.floor(200 * Math.pow(1.5,  lv - 1)),
      zeljezo: Math.floor(50  * Math.pow(1.5,  lv - 1)),
    }),
    bazaProizvodnja: 1.0,
  },
];

// ─── Misije ───────────────────────────────────────────────────────────────────
export const BAZA_MISIJA = [
  { opis: 'Zavrti automat 20 puta',       tip: 'spin',      cilj: 20,    nagrada: { dijamanti: 2 } },
  { opis: 'Zavrti automat 50 puta',       tip: 'spin',      cilj: 50,    nagrada: { dijamanti: 5 } },
  { opis: 'Zavrti automat 100 puta',      tip: 'spin',      cilj: 100,   nagrada: { dijamanti: 12, zlato: 500 } },
  { opis: 'Prikupi 1000 zlata',           tip: 'zlato',     cilj: 1000,  nagrada: { energija: 30 } },
  { opis: 'Prikupi 2500 zlata',           tip: 'zlato',     cilj: 2500,  nagrada: { energija: 80 } },
  { opis: 'Prikupi 10000 zlata',          tip: 'zlato',     cilj: 10000, nagrada: { dijamanti: 10, energija: 120 } },
  { opis: 'Izgradi/Nadogradi zgradu',     tip: 'zgrada',    cilj: 1,     nagrada: { dijamanti: 3, zlato: 500 } },
  { opis: 'Kupi ili nadogradi opremu',    tip: 'oprema',    cilj: 1,     nagrada: { dijamanti: 3, energija: 50 } },
  { opis: 'Ostvari 5 dobitnih linija',    tip: 'dobitak',   cilj: 5,     nagrada: { drvo: 100, kamen: 100 } },
  { opis: 'Ostvari 15 dobitnih linija',   tip: 'dobitak',   cilj: 15,    nagrada: { dijamanti: 5, kamen: 300 } },
  { opis: 'Aktiviraj Lucky Spin',         tip: 'luckySpin', cilj: 1,     nagrada: { dijamanti: 4, energija: 40 } },
  { opis: 'Aktiviraj Lucky Spin 3 puta',  tip: 'luckySpin', cilj: 3,     nagrada: { dijamanti: 10, zlato: 1000 } },
  { opis: 'Ostvari niz od 3 dobitka',     tip: 'streak',    cilj: 3,     nagrada: { dijamanti: 6, energija: 60 } },
];

export const generirajMisiju = (excludeTipovi = []) => {
  const dostupne = BAZA_MISIJA.filter((m) => !excludeTipovi.includes(m.tip));
  const pool = dostupne.length ? dostupne : BAZA_MISIJA;
  const sablon = pool[randomInt(pool.length)];
  return { id: `${Date.now()}-${randomInt(1000000000)}`, ...sablon, trenutno: 0, zavrseno: false };
};

export const generirajUnikatneMisije = (broj = 3) => {
  const odabrane = [];
  const tipovi = new Set();
  while (odabrane.length < broj) {
    const misija = generirajMisiju([...tipovi]);
    odabrane.push(misija);
    tipovi.add(misija.tip);
    if (tipovi.size >= BAZA_MISIJA.length) break;
  }
  return odabrane;
};

// ─── Dostignuća ───────────────────────────────────────────────────────────────
export const DOSTIGNUCA = [
  { id: 'prvaSpin',  naziv: 'Početnik',        opis: 'Zavrti automat po prvi put',                  tip: 'spin',        cilj: 1,     nagrada: { zlato: 100 } },
  { id: 'spin10',    naziv: 'Spinner',          opis: 'Zavrti automat 10 puta',                      tip: 'spin',        cilj: 10,    nagrada: { dijamanti: 3 } },
  { id: 'spin100',   naziv: 'Veteran',          opis: 'Zavrti automat 100 puta',                     tip: 'spin',        cilj: 100,   nagrada: { dijamanti: 10, energija: 50 } },
  { id: 'spin500',   naziv: 'Majstor Automata', opis: 'Zavrti automat 500 puta',                     tip: 'spin',        cilj: 500,   nagrada: { dijamanti: 30 } },
  { id: 'zlato5000', naziv: 'Bogataš',          opis: 'Prikupi ukupno 5000 zlata iz dobitaka',       tip: 'ukupnoZlato', cilj: 5000,  nagrada: { energija: 80 } },
  { id: 'zlato50000',naziv: 'Tajkun',           opis: 'Prikupi ukupno 50000 zlata iz dobitaka',      tip: 'ukupnoZlato', cilj: 50000, nagrada: { dijamanti: 20 } },
  { id: 'prestige1', naziv: 'Obnova',           opis: 'Izvrši prestige po prvi put',                 tip: 'prestige',    cilj: 1,     nagrada: { dijamanti: 25 } },
  { id: 'gradnja5',  naziv: 'Graditelj',        opis: 'Nadogradi bilo koju zgradu na razinu 5',      tip: 'gradnja',     cilj: 5,     nagrada: { zlato: 500, kamen: 200 } },
  { id: 'raid10',    naziv: 'Pljačkaš',         opis: 'Uspješno izvrši 10 raidova',                   tip: 'raid',        cilj: 10,    nagrada: { dijamanti: 20, zlato: 1500 } },
  { id: 'klan1',     naziv: 'Član Klana',       opis: 'Osnuj ili pridruži se klanu',                  tip: 'klan',        cilj: 1,     nagrada: { dijamanti: 10 } },
  { id: 'spin1000',  naziv: 'Legenda Automata', opis: 'Zavrti automat 1000 puta',                     tip: 'spin',        cilj: 1000,  nagrada: { dijamanti: 60 } },
  { id: 'lv50',      naziv: 'Veteran',          opis: 'Dosegni razinu 50',                            tip: 'razina',      cilj: 50,    nagrada: { dijamanti: 35, energija: 200 } },
  { id: 'zlato100k', naziv: 'Magnat',           opis: 'Prikupi ukupno 100000 zlata iz dobitaka',      tip: 'ukupnoZlato', cilj: 100000, nagrada: { dijamanti: 50 } },
];

// ─── Dnevne nagrade ───────────────────────────────────────────────────────────
export const DNEVNE_NAGRADE = [
  { dan: 1, nagrada: { zlato: 150 } },
  { dan: 2, nagrada: { energija: 40 } },
  { dan: 3, nagrada: { dijamanti: 5 } },
  { dan: 4, nagrada: { zlato: 300, drvo: 150 } },
  { dan: 5, nagrada: { zeljezo: 100, kamen: 200 } },
  { dan: 6, nagrada: { dijamanti: 8, energija: 60 } },
  { dan: 7, nagrada: { dijamanti: 20, zlato: 1000, energija: 100 } },
];

// ─── Dimenzije i font ─────────────────────────────────────────────────────────
export const screenWidth  = Dimensions.get('window').width;
export const uiScale      = Math.min(1.15, Math.max(0.82, screenWidth / 390));
export const slotSize     = Math.floor((screenWidth - 72) / 5);
export const FONT_FAMILY  = Platform.select({ ios: 'Helvetica Neue', android: 'Roboto', default: 'System' });

// ─── Konstante igre ───────────────────────────────────────────────────────────
export const MS_PER_DAY                  = 24 * 60 * 60 * 1000;
export const LUCKY_SPIN_INTERVAL         = 25;
export const MAX_WIN_STREAK              = 5;
export const STREAK_BONUS_PER_WIN        = 0.15;
export const WILD_BOOST_CHANCE_PER_LEVEL = 0.04;
export const SHIELD_GRANT_MIN_BET        = 10; // Min bet for bonus shield grants
export const MAX_GAMBLE_ROUNDS           = 5;  // Max consecutive gamble attempts per win

// ─── Redoslijed ekrana (za navigaciju swipeom) ────────────────────────────────
export const POREDAK_EKRANA = ['automat', 'selo', 'misije', 'trgovina', 'nadogradnje', 'klan', 'ljestvica', 'junaci', 'kovacnica', 'turnir'];

// ─── Kozmetika — skinovi zgrada ───────────────────────────────────────────────
export const ZGRADE_SKINOVI = [
  { id: 'default',    naziv: 'Klasično',       emodzi: '🏚',  boja: '#64748B', cijenaDijamanti: 0   },
  { id: 'medieval',   naziv: 'Srednji Vijek',  emodzi: '🏰',  boja: '#B45309', cijenaDijamanti: 50  },
  { id: 'japanese',   naziv: 'Japansko',       emodzi: '⛩️',  boja: '#DC2626', cijenaDijamanti: 100 },
  { id: 'futuristic', naziv: 'Futurističko',   emodzi: '🚀',  boja: '#0EA5E9', cijenaDijamanti: 200 },
];

export const CIJENA_DVOSTRUKI_BOOST = 5000;
export const TRAJANJE_DVOSTRUKI_BOOST = 20;
export const STIT_REGEN_INTERVAL_SEK = 90;
export const OFFLINE_MAX_SEK = 8 * 60 * 60;
export const BATTLE_PASS_TIER_XP = 100;
export const BATTLE_PASS_MAX_RAZINA = 30;
export const BATTLE_PASS_PREMIUM_CIJENA = 200;
export const MAX_AD_VIEWS_DNEVNO = 5;

// ─── Klan — predlošci zadataka ────────────────────────────────────────────────
export const KLAN_ZADACI_SABLONI = [
  { opis: 'Ukupno zavrti automat 200 puta (klan)',  tip: 'spin',   cilj: 200,  nagrada: { dijamanti: 15, zlato: 800 } },
  { opis: 'Ukupno prikupi 5000 zlata (klan)',       tip: 'zlato',  cilj: 5000, nagrada: { dijamanti: 10, energija: 100 } },
  { opis: 'Izgradi ili nadogradi 5 zgrada (klan)',  tip: 'zgrada', cilj: 5,    nagrada: { dijamanti: 20, drvo: 500 } },
  { opis: 'Doniraj 1000 zlata klanu',               tip: 'donacija', cilj: 1000, nagrada: { dijamanti: 8, kamen: 300 } },
  { opis: 'Ostvari 50 dobitnih linija (klan)',      tip: 'dobitak', cilj: 50,   nagrada: { dijamanti: 12, energija: 80 } },
  { opis: 'Kupi ili nadogradi 3 komada opreme (klan)', tip: 'oprema', cilj: 3,  nagrada: { dijamanti: 10, zeljezo: 200 } },
];

export const generirajKlanZadatke = () =>
  KLAN_ZADACI_SABLONI.map((s, i) => ({
    id: i,
    ...s,
    trenutno: 0,
    zavrseno: false,
    preuzeto: false,
  }));

// ─── Junaci (Hero Collection System) ─────────────────────────────────────────
export const RARITET_BOJE = {
  obican:     '#64748B',
  rijetki:    '#22C55E',
  epski:      '#A855F7',
  legendarni: '#F59E0B',
};

export const RARITET_NAZIVI = {
  obican:     'Obični',
  rijetki:    'Rijetki',
  epski:      'Epski',
  legendarni: 'Legendarni',
};

export const HERO_FRAGMENTI_ZA_OTKLJ = 10;   // fragments needed to unlock (razina 0 → 1)
export const HERO_FRAGMENTI_ZA_RAZINU = 20;   // fragments per subsequent level-up
export const HERO_MAX_RAZINA          = 5;
export const HERO_SUMMON_KOST         = 20;   // diamonds per summon
export const HERO_DROP_SANSA          = 0.06; // 6% chance per spin to drop hero fragments
export const HERO_MAX_AKTIVNIH        = 2;    // max simultaneously active heroes

// Rarity weights for random drops (higher = more common)
export const HERO_DROP_TEZINE = {
  obican:     55,
  rijetki:    30,
  epski:      12,
  legendarni: 3,
};

/**
 * tipBonusa values and their effects:
 *  zlato    — bonus % on gold wins
 *  energija — flat bonus energy per timer tick
 *  pasivno  — bonus % on passive resource production
 *  stit     — bonus max shield slots
 *  luck     — bonus % win chance on slot
 *  xp       — bonus % XP from spins
 */
export const JUNACI = [
  // ─── Obični ──────────────────────────────────────────────────────────────
  { id: 'zlatko',   naziv: 'Zlatko',   emodzi: '🪙', raritet: 'obican',     tipBonusa: 'zlato',    opisBonusa: '+3% zlatnih dobitaka po razini',      bonusPoRazini: 3    },
  { id: 'iskra',    naziv: 'Iskra',    emodzi: '⚡', raritet: 'obican',     tipBonusa: 'energija', opisBonusa: '+0.2 energije/tik po razini',          bonusPoRazini: 0.2  },
  { id: 'drvar',    naziv: 'Drvar',    emodzi: '🌲', raritet: 'obican',     tipBonusa: 'pasivno',  opisBonusa: '+2% pasivne produkcije po razini',     bonusPoRazini: 2    },
  { id: 'ucenjak',  naziv: 'Učenjak',  emodzi: '📖', raritet: 'obican',     tipBonusa: 'xp',       opisBonusa: '+5% XP iz vrtnji po razini',           bonusPoRazini: 5    },
  // ─── Rijetki ─────────────────────────────────────────────────────────────
  { id: 'strazar',  naziv: 'Stražar',  emodzi: '🛡️', raritet: 'rijetki',   tipBonusa: 'stit',     opisBonusa: '+1 max štit po razini',                bonusPoRazini: 1    },
  { id: 'kockar',   naziv: 'Kockar',   emodzi: '🍀', raritet: 'rijetki',   tipBonusa: 'luck',     opisBonusa: '+1.5% šanse za dobitak po razini',     bonusPoRazini: 1.5  },
  { id: 'trgovic',  naziv: 'Trgovac',  emodzi: '💰', raritet: 'rijetki',   tipBonusa: 'zlato',    opisBonusa: '+6% zlatnih dobitaka po razini',       bonusPoRazini: 6    },
  // ─── Epski ───────────────────────────────────────────────────────────────
  { id: 'ratnik',   naziv: 'Ratnik',   emodzi: '⚔️', raritet: 'epski',     tipBonusa: 'zlato',    opisBonusa: '+10% zlatnih dobitaka po razini',      bonusPoRazini: 10   },
  { id: 'carobnjak',naziv: 'Čarobnjak',emodzi: '🧙', raritet: 'epski',     tipBonusa: 'luck',     opisBonusa: '+3% šanse za dobitak po razini',       bonusPoRazini: 3    },
  { id: 'arhitekt', naziv: 'Arhitekt', emodzi: '🏛️', raritet: 'epski',     tipBonusa: 'pasivno',  opisBonusa: '+8% pasivne produkcije po razini',     bonusPoRazini: 8    },
  // ─── Legendarni ──────────────────────────────────────────────────────────
  { id: 'kralj',    naziv: 'Kralj',    emodzi: '👑', raritet: 'legendarni', tipBonusa: 'zlato',    opisBonusa: '+20% zlatnih dobitaka po razini',      bonusPoRazini: 20   },
  { id: 'boginja',  naziv: 'Boginja',  emodzi: '⭐', raritet: 'legendarni', tipBonusa: 'luck',     opisBonusa: '+6% šanse za dobitak po razini',       bonusPoRazini: 6    },
];

export const BATTLE_PASS_SEASON_THEME = {
  halloween: { naziv: 'Noć Vještica', emodzi: '🎃', skin: 'medieval' },
  bozic: { naziv: 'Božićni Festival', emodzi: '🎄', skin: 'japanese' },
  nova_godina: { naziv: 'Nova Godina', emodzi: '🎆', skin: 'futuristic' },
  ljeto: { naziv: 'Ljetni Festival', emodzi: '☀️', skin: 'default' },
  default: { naziv: 'Klasična Sezona', emodzi: '🏁', skin: 'default' },
};

export const BATTLE_PASS_NAGRADE = Array.from({ length: BATTLE_PASS_MAX_RAZINA }, (_, idx) => {  const razina = idx + 1;
  const premiumSkinTier = razina % 10 === 0;
  return {
    razina,
    xpPotrebno: razina * BATTLE_PASS_TIER_XP,
    free: {
      zlato: razina * 250,
      energija: razina % 3 === 0 ? 20 : 0,
      drvo: razina % 2 === 0 ? razina * 20 : 0,
      kamen: razina % 2 === 1 ? razina * 20 : 0,
      zeljezo: razina % 5 === 0 ? razina * 15 : 0,
      dijamanti: razina % 7 === 0 ? 5 : 0,
    },
    premium: {
      zlato: razina * 500,
      energija: 30,
      dijamanti: 5 + Math.floor(razina / 2),
      drvo: razina * 25,
      kamen: razina * 25,
      zeljezo: razina * 20,
      skin: premiumSkinTier ? ZGRADE_SKINOVI[(Math.floor(razina / 10) % ZGRADE_SKINOVI.length)].id : null,
    },
  };
});

// ─── Kovačnica — recepti za izradu predmeta ───────────────────────────────────
export const RECEPTI = [
  {
    id: 'zlatni_amulet',
    naziv: 'Zlatni Amulet',
    emodzi: '📿',
    opis: '+15% zlatnih dobitaka',
    detalji: '1 sat',
    cijena: { drvo: 50, kamen: 30, zeljezo: 0 },
    tip: 'zlato',
    bonus: 15,
    trajanjeSek: 3600,
    boja: '#FBBF24',
  },
  {
    id: 'sretni_talisman',
    naziv: 'Sretni Talisman',
    emodzi: '🍀',
    opis: '+8% šanse za dobitak',
    detalji: '2 sata',
    cijena: { drvo: 0, kamen: 20, zeljezo: 30 },
    tip: 'luck',
    bonus: 8,
    trajanjeSek: 7200,
    boja: '#22C55E',
  },
  {
    id: 'knjiga_mudrosti',
    naziv: 'Knjiga Mudrosti',
    emodzi: '📚',
    opis: '+25% XP iz vrtnji',
    detalji: '1 sat',
    cijena: { drvo: 40, kamen: 0, zeljezo: 40 },
    tip: 'xp',
    bonus: 25,
    trajanjeSek: 3600,
    boja: '#34D399',
  },
  {
    id: 'energetski_kristal',
    naziv: 'Energetski Kristal',
    emodzi: '🔮',
    opis: '+15 energije odmah',
    detalji: 'Trenutno',
    cijena: { drvo: 0, kamen: 60, zeljezo: 20 },
    tip: 'energija_instant',
    bonus: 15,
    trajanjeSek: 0,
    boja: '#A3E635',
  },
  {
    id: 'stit_runa',
    naziv: 'Štit Runa',
    emodzi: '🛡️',
    opis: 'Obnovi sve štitove odmah',
    detalji: 'Trenutno',
    cijena: { drvo: 0, kamen: 50, zeljezo: 50 },
    tip: 'stit_instant',
    bonus: 0,
    trajanjeSek: 0,
    boja: '#22D3EE',
  },
  {
    id: 'heroska_esencija',
    naziv: 'Heroska Esencija',
    emodzi: '⚗️',
    opis: 'Nasumični hero fragmenti (2–4)',
    detalji: 'Trenutno',
    cijena: { drvo: 100, kamen: 100, zeljezo: 50 },
    tip: 'hero_fragment',
    bonus: 0,
    trajanjeSek: 0,
    boja: '#A855F7',
  },
];

// ─── Turnir — tjedne razine i nagrade ────────────────────────────────────────
export const TURNIR_RAZINE = [
  { id: 'bronza',   naziv: 'Bronza',   emodzi: '🥉', minBodova: 0,    nagrada: { zlato: 500 } },
  { id: 'srebro',   naziv: 'Srebro',   emodzi: '🥈', minBodova: 500,  nagrada: { dijamanti: 15, zlato: 1500 } },
  { id: 'zlato',    naziv: 'Zlato',    emodzi: '🥇', minBodova: 2000, nagrada: { dijamanti: 35, zlato: 3000 } },
  { id: 'dijamant', naziv: 'Dijamant', emodzi: '💎', minBodova: 5000, nagrada: { dijamanti: 100, zlato: 10000 } },
];

// ─── Sanduk — tipovi sa nagradama ─────────────────────────────────────────────
export const SANDUK_TIPOVI = [
  {
    id: 'besplatni',
    naziv: 'Dnevni Sanduk',
    emodzi: '📦',
    boja: '#94A3B8',
    cijenaDijamanti: 0,
    besplatanJednom: true,
    nagrade: [
      { tip: 'zlato',         min: 200,  max: 600  },
      { tip: 'energija',      min: 10,   max: 30   },
      { tip: 'drvo',          min: 30,   max: 100  },
      { tip: 'kamen',         min: 20,   max: 80   },
      { tip: 'hero_fragment', min: 0,    max: 2, sansa: 0.25 },
    ],
  },
  {
    id: 'srebrni',
    naziv: 'Srebrni Sanduk',
    emodzi: '🗝️',
    boja: '#CBD5E1',
    cijenaDijamanti: 50,
    besplatanJednom: false,
    nagrade: [
      { tip: 'zlato',         min: 1000, max: 2500  },
      { tip: 'energija',      min: 40,   max: 80    },
      { tip: 'drvo',          min: 100,  max: 300   },
      { tip: 'kamen',         min: 80,   max: 250   },
      { tip: 'zeljezo',       min: 40,   max: 120   },
      { tip: 'hero_fragment', min: 1,    max: 3, sansa: 1.0  },
    ],
  },
  {
    id: 'zlatni',
    naziv: 'Zlatni Sanduk',
    emodzi: '👑',
    boja: '#FBBF24',
    cijenaDijamanti: 200,
    besplatanJednom: false,
    nagrade: [
      { tip: 'zlato',         min: 5000, max: 10000 },
      { tip: 'dijamanti',     min: 10,   max: 30    },
      { tip: 'energija',      min: 80,   max: 150   },
      { tip: 'drvo',          min: 300,  max: 600   },
      { tip: 'kamen',         min: 250,  max: 500   },
      { tip: 'zeljezo',       min: 100,  max: 250   },
      { tip: 'hero_fragment', min: 3,    max: 6, sansa: 1.0  },
    ],
  },
];
