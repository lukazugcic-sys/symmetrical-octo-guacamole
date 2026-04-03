import { Dimensions, Platform } from 'react-native';
import {
  Zap, Shield, Gem, TreePine, Mountain, Pickaxe, Skull, Coins, Star,
} from 'lucide-react-native';
import { randomInt } from '../utils/helpers';
import { validateGameContent } from '../domain/content/validateContent';

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
  tamnica:         '#7C3AED',
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
export const SHIELD_GRANT_MIN_BET        = 10;
export const MAX_GAMBLE_ROUNDS           = 5;

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
export const MAX_AD_VIEWS_DNEVNO = 5;

const _contentValidation = validateGameContent({
  BAZA_MISIJA,
  DOSTIGNUCA,
});

if (!_contentValidation.ok) {
  console.warn('[ContentValidation] Invalid content tables:', _contentValidation.errors.join(', '));
}
