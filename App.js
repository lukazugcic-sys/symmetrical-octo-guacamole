import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TouchableOpacity, ScrollView, StyleSheet, 
  Animated, SafeAreaView, Platform, Dimensions, ActivityIndicator, StatusBar, Easing, PanResponder
} from 'react-native';
import { 
  Zap, Shield, Building2, Trophy, ShoppingCart, Sliders, Gem, TreePine, Mountain, 
  Pickaxe, Skull, Coins, Clover, Star, TrendingUp, Sparkles, Flame, AlertTriangle, Target, Check, Crown, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- KONFIGURACIJA I EKONOMIJA ---
const BLAGO = {
  'skull':   { Ikona: Skull, boja: '#FF2A55', raritet: '#550000', tip: 'steta', baza: 0 },
  'wood':    { Ikona: TreePine, boja: '#00F0FF', raritet: '#003344', tip: 'drvo', baza: 4 },    
  'stone':   { Ikona: Mountain, boja: '#B4C6F0', raritet: '#2A3040', tip: 'kamen', baza: 8 },   
  'iron':    { Ikona: Pickaxe, boja: '#F0F0FF', raritet: '#404552', tip: 'zeljezo', baza: 12 },  
  'gold':    { Ikona: Coins, boja: '#FFD700', raritet: '#554400', tip: 'zlato', baza: 25 },    
  'energy':  { Ikona: Zap, boja: '#CCFF00', raritet: '#334400', tip: 'energija', baza: 1 },     
  'gem':     { Ikona: Gem, boja: '#FF00AA', raritet: '#550033', tip: 'dijamanti', baza: 1 },    
  'shield':  { Ikona: Shield, boja: '#0088FF', raritet: '#002255', tip: 'stit', baza: 0 }, 
  'wild':    { Ikona: Star, boja: '#FFFFFF', raritet: '#444444', tip: 'wild', baza: 0 },    
};
const SVO_BLAGO = Object.keys(BLAGO);

const BOJE = {
  bg: '#020205',         
  bgCard: 'rgba(15, 16, 25, 0.85)',     
  border: 'rgba(255, 255, 255, 0.08)',     
  textMain: '#FFFFFF',   
  textMuted: '#6B7280',  
  zlato: '#FFD700',      
  energija: '#CCFF00',   
  stit: '#00D4FF',       
  dijamant: '#FF00AA',   
  drvo: '#00F0FF',       
  kamen: '#B4C6F0',      
  zeljezo: '#E2E8F0',    
  slotOkvirZlato: '#11131C', 
  slotRolaCrna: '#040408',
  slotVatra: '#FF3300',   
  navBg: 'rgba(5, 6, 10, 0.98)',
  nadogradnje: '#9D4EDD',
  xp: '#00FFAA',
  misije: '#FF8800',
  prestige: '#FFB800'
};

const BAZA_TECAJ = {    
    drvo: { kupi: 200, prodaj: 80 },   
    kamen: { kupi: 400, prodaj: 160 },   
    zeljezo: { kupi: 800, prodaj: 300 },   
    dijamant: { kupi: 5000, prodaj: 2500 }  
};

const ZGRADE = [
  { id: 'pilana', naziv: 'Pilana', maxLv: 10, ikona: TreePine, bazaBoja: BOJE.drvo,
    cijena: (lv) => ({ 
        zlato: Math.floor(150 * Math.pow(1.6, lv-1)), 
        drvo: 0, 
        kamen: Math.floor(25 * Math.pow(1.5, lv-1)),
        zeljezo: 0 
    }),
    bazaProizvodnja: 2 },
  { id: 'kamenolom', naziv: 'Rudnik', maxLv: 10, ikona: Mountain, bazaBoja: BOJE.kamen,
    cijena: (lv) => ({ 
        zlato: Math.floor(250 * Math.pow(1.65, lv-1)), 
        drvo: Math.floor(100 * Math.pow(1.5, lv-1)), 
        kamen: 0,
        zeljezo: Math.floor(20 * Math.pow(1.5, lv-1)) 
    }),
    bazaProizvodnja: 1 },
  { id: 'rudnik', naziv: 'Željezara', maxLv: 10, ikona: Pickaxe, bazaBoja: BOJE.zeljezo,
    cijena: (lv) => ({ 
        zlato: Math.floor(500 * Math.pow(1.7, lv-1)), 
        drvo: Math.floor(200 * Math.pow(1.5, lv-1)), 
        kamen: Math.floor(200 * Math.pow(1.5, lv-1)),
        zeljezo: Math.floor(50 * Math.pow(1.5, lv-1)) 
    }),
    bazaProizvodnja: 0.5 }
];

const BAZA_MISIJA = [
    { opis: 'Zavrti automat 20 puta', tip: 'spin', cilj: 20, nagrada: { dijamanti: 2 } },
    { opis: 'Zavrti automat 50 puta', tip: 'spin', cilj: 50, nagrada: { dijamanti: 5 } },
    { opis: 'Zavrti automat 100 puta', tip: 'spin', cilj: 100, nagrada: { dijamanti: 12, zlato: 500 } },
    { opis: 'Prikupi 1000 zlata', tip: 'zlato', cilj: 1000, nagrada: { energija: 30 } },
    { opis: 'Prikupi 2500 zlata', tip: 'zlato', cilj: 2500, nagrada: { energija: 80 } },
    { opis: 'Prikupi 10000 zlata', tip: 'zlato', cilj: 10000, nagrada: { dijamanti: 10, energija: 120 } },
    { opis: 'Izgradi/Nadogradi zgradu', tip: 'zgrada', cilj: 1, nagrada: { dijamanti: 3, zlato: 500 } },
    { opis: 'Kupi ili nadogradi opremu', tip: 'oprema', cilj: 1, nagrada: { dijamanti: 3, energija: 50 } },
    { opis: 'Ostvari 5 dobitnih linija', tip: 'dobitak', cilj: 5, nagrada: { drvo: 100, kamen: 100 } },
    { opis: 'Ostvari 15 dobitnih linija', tip: 'dobitak', cilj: 15, nagrada: { dijamanti: 5, kamen: 300 } },
    { opis: 'Aktiviraj Lucky Spin', tip: 'luckySpin', cilj: 1, nagrada: { dijamanti: 4, energija: 40 } },
    { opis: 'Aktiviraj Lucky Spin 3 puta', tip: 'luckySpin', cilj: 3, nagrada: { dijamanti: 10, zlato: 1000 } },
    { opis: 'Ostvari niz od 3 dobitka', tip: 'streak', cilj: 3, nagrada: { dijamanti: 6, energija: 60 } },
];

const generirajMisiju = () => {
    const sablon = BAZA_MISIJA[Math.floor(Math.random() * BAZA_MISIJA.length)];
    return { id: Date.now() + Math.random(), ...sablon, trenutno: 0, zavrseno: false };
};

const DOSTIGNUCA = [
    { id: 'prvaSpin', naziv: 'Početnik', opis: 'Zavrti automat po prvi put', tip: 'spin', cilj: 1, nagrada: { zlato: 100 } },
    { id: 'spin10', naziv: 'Spinner', opis: 'Zavrti automat 10 puta', tip: 'spin', cilj: 10, nagrada: { dijamanti: 3 } },
    { id: 'spin100', naziv: 'Veteran', opis: 'Zavrti automat 100 puta', tip: 'spin', cilj: 100, nagrada: { dijamanti: 10, energija: 50 } },
    { id: 'spin500', naziv: 'Majstor Automata', opis: 'Zavrti automat 500 puta', tip: 'spin', cilj: 500, nagrada: { dijamanti: 30 } },
    { id: 'zlato5000', naziv: 'Bogataš', opis: 'Prikupi ukupno 5000 zlata iz dobitaka', tip: 'ukupnoZlato', cilj: 5000, nagrada: { energija: 80 } },
    { id: 'zlato50000', naziv: 'Tajkun', opis: 'Prikupi ukupno 50000 zlata iz dobitaka', tip: 'ukupnoZlato', cilj: 50000, nagrada: { dijamanti: 20 } },
    { id: 'prestige1', naziv: 'Obnova', opis: 'Izvrši prestige po prvi put', tip: 'prestige', cilj: 1, nagrada: { dijamanti: 25 } },
    { id: 'gradnja5', naziv: 'Graditelj', opis: 'Nadogradi bilo koju zgradu na razinu 5', tip: 'gradnja', cilj: 5, nagrada: { zlato: 500, kamen: 200 } },
];

const DNEVNE_NAGRADE = [
    { dan: 1, nagrada: { zlato: 150 } },
    { dan: 2, nagrada: { energija: 40 } },
    { dan: 3, nagrada: { dijamanti: 5 } },
    { dan: 4, nagrada: { zlato: 300, drvo: 150 } },
    { dan: 5, nagrada: { zeljezo: 100, kamen: 200 } },
    { dan: 6, nagrada: { dijamanti: 8, energija: 60 } },
    { dan: 7, nagrada: { dijamanti: 20, zlato: 1000, energija: 100 } },
];

const screenWidth = Dimensions.get('window').width;
const uiScale = Math.min(1.15, Math.max(0.82, screenWidth / 390));
const slotSize = Math.floor((screenWidth - 72) / 5);

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const LUCKY_SPIN_INTERVAL = 25;
const MAX_WIN_STREAK = 5;
const STREAK_BONUS_PER_WIN = 0.15;
const WILD_BOOST_CHANCE_PER_LEVEL = 0.04;
const delay = ms => new Promise(res => setTimeout(res, ms));

const POREDAK_EKRANA = ['automat', 'selo', 'misije', 'trgovina', 'nadogradnje'];

const IconBadge = ({ Ikona, boja, velicina = 24 }) => (
  <View style={[styles.iconBadge, { backgroundColor: boja + '15', borderColor: boja + '50', borderWidth: 1 }]}>
    <Ikona size={velicina} color={boja} strokeWidth={2} />
  </View>
);

const PrikazCijene = ({ Ikona, boja, iznos, trenutno }) => {
  if (iznos <= 0) return null;
  const nedostaje = trenutno < iznos;
  return (
    <View style={[styles.costPill, nedostaje && styles.costPillMissing]}>
      <Ikona size={12} color={nedostaje ? BOJE.slotVatra : boja} strokeWidth={2.5} />
      <Text style={[styles.costTxt, nedostaje && styles.costMissing]}>{iznos}</Text>
    </View>
  );
};

export default function App() {
  const [ucitavam, setUcitavam] = useState(true);
  const [pogled, setPogled] = useState('automat'); 
  
  const [igracRazina, setIgracRazina] = useState(1);
  const [prestigeRazina, setPrestigeRazina] = useState(0); 
  const [xp, setXp] = useState(0);

  const [energija, setEnergija] = useState(10); 
  const [zlato, setZlato] = useState(50); 
  const [dijamanti, setDijamanti] = useState(5);
  const [resursi, setResursi] = useState({ drvo: 0, kamen: 0, zeljezo: 0 });
  const [stitovi, setStitovi] = useState(1);
  
  const [gradevine, setGradevine] = useState({ pilana: 1, kamenolom: 0, rudnik: 0 });
  const [ostecenja, setOstecenja] = useState({ pilana: false, kamenolom: false, rudnik: false });
  const [razine, setRazine] = useState({ sreca: 0, pojacalo: 0, baterija: 0, oklop: 0 });
  const [misije, setMisije] = useState([generirajMisiju(), generirajMisiju(), generirajMisiju()]);

  const [ukupnoVrtnji, setUkupnoVrtnji] = useState(0);
  const [ukupnoZlata, setUkupnoZlata] = useState(0);
  const [dostignucaDone, setDostignucaDone] = useState({});
  const [dnevniStreak, setDnevniStreak] = useState(0);
  const [prikazDnevneNagrade, setPrikazDnevneNagrade] = useState(false);
  const [dnevnaNagrada, setDnevnaNagrada] = useState(null);
  const [prikazDostignuca, setPrikazDostignuca] = useState(false);

  const [tecaj, setTecaj] = useState(BAZA_TECAJ);
  const [trend, setTrend] = useState({ drvo: 0, kamen: 0, zeljezo: 0, dijamant: 0 });

  const [simboli, setSimboli] = useState(Array(15).fill('gold'));
  const [vrti, setVrti] = useState(false);
  const [ulog, setUlog] = useState(1);
  const [dobitnaPolja, setDobitnaPolja] = useState([]);
  const [poruka, setPoruka] = useState('SPREMAN ZA VRTNJU');
  const [dobitakNaCekanju, setDobitakNaCekanju] = useState(null); 

  const [luckySpinCounter, setLuckySpinCounter] = useState(LUCKY_SPIN_INTERVAL);
  const [winStreak, setWinStreak] = useState(0);
  const [turboRezim, setTurboRezim] = useState(false);
  
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current; 
  const [flashBoja, setFlashBoja] = useState('rgba(0,0,0,0)');

  const stupciAnims = useRef([...Array(5)].map(() => new Animated.Value(0))).current; 
  const stupciBlurs = useRef([...Array(5)].map(() => new Animated.Value(1))).current; 
  const winScaleAnims = useRef([...Array(15)].map(() => new Animated.Value(1))).current; 

  const swipeRef = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 15 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -60) {
          setPogled(prev => {
            const i = POREDAK_EKRANA.indexOf(prev);
            return i < POREDAK_EKRANA.length - 1 ? POREDAK_EKRANA[i + 1] : prev;
          });
        } else if (g.dx > 60) {
          setPogled(prev => {
            const i = POREDAK_EKRANA.indexOf(prev);
            return i > 0 ? POREDAK_EKRANA[i - 1] : prev;
          });
        }
      },
    })
  ).current;

  const maxEnergija = 100 + ((razine.baterija||0) * 50);
  const maxStitova = 1 + (razine.oklop||0);
  const sansaZaDobitak = 0.25 + ((razine.sreca||0) * 0.03); 
  const potrebanXp = Math.floor(100 * Math.pow(1.3, igracRazina - 1)); 
  
  const prestigeMnožitelj = 1 + (prestigeRazina * 0.5);
  const pasivniMnožitelj = (1 + (igracRazina * 0.05)) * prestigeMnožitelj; 

  useEffect(() => {
    const ucitaj = async () => {
      try {
        const p = await AsyncStorage.getItem('@save_game_eco_v30'); 
        if (p) {
          const d = JSON.parse(p);
          if(d.igracRazina) setIgracRazina(d.igracRazina);
          if(d.prestigeRazina) setPrestigeRazina(d.prestigeRazina);
          if(d.xp) setXp(d.xp);
          if(d.energija !== undefined && !isNaN(d.energija)) setEnergija(d.energija);
          if(d.zlato !== undefined && !isNaN(d.zlato)) setZlato(d.zlato);
          if(d.dijamanti !== undefined && !isNaN(d.dijamanti)) setDijamanti(d.dijamanti);
          if(d.resursi) setResursi(r => ({...r, ...d.resursi}));
          if(d.gradevine) setGradevine(g => ({...g, ...d.gradevine}));
          if(d.ostecenja) setOstecenja(o => ({...o, ...d.ostecenja}));
          if(d.razine) setRazine(r => ({...r, ...d.razine}));
          if(d.stitovi !== undefined) setStitovi(d.stitovi);
          if(d.misije && d.misije.length > 0) setMisije(d.misije);
          if(d.tecaj) setTecaj(d.tecaj);
          if(d.trend) setTrend(d.trend);
          if(d.luckySpinCounter !== undefined) setLuckySpinCounter(d.luckySpinCounter);
          if(d.winStreak !== undefined) setWinStreak(d.winStreak);
        }
        const pa = await AsyncStorage.getItem('@save_dostignuca_v1');
        if (pa) {
          const da = JSON.parse(pa);
          if(da.dostignucaDone) setDostignucaDone(da.dostignucaDone);
          if(da.ukupnoVrtnji) setUkupnoVrtnji(da.ukupnoVrtnji);
          if(da.ukupnoZlata) setUkupnoZlata(da.ukupnoZlata);
        }
        const pd = await AsyncStorage.getItem('@save_dnevna_v1');
        const danas = new Date().toDateString();
        if (pd) {
          const dd = JSON.parse(pd);
          const streak = dd.streak || 0;
          const zadnja = dd.zadnjaDnevna || '';
          setDnevniStreak(streak);
          if (zadnja !== danas) {
            const noviStreak = zadnja === new Date(Date.now() - MS_PER_DAY).toDateString() ? streak + 1 : 1;
            const danIndex = ((noviStreak - 1) % DNEVNE_NAGRADE.length);
            setDnevniStreak(noviStreak);
            setDnevnaNagrada({ ...DNEVNE_NAGRADE[danIndex], streak: noviStreak });
            setPrikazDnevneNagrade(true);
          }
        } else {
          setDnevniStreak(1);
          setDnevnaNagrada({ ...DNEVNE_NAGRADE[0], streak: 1 });
          setPrikazDnevneNagrade(true);
        }
      } catch (e) { console.error(e); } finally { setUcitavam(false); }
    };
    ucitaj();
  }, []);

  useEffect(() => {
    if(ucitavam) return;
    const spremi = async () => {
      try { await AsyncStorage.setItem('@save_game_eco_v30', JSON.stringify({ igracRazina, prestigeRazina, xp, energija, zlato, dijamanti, resursi, gradevine, ostecenja, razine, stitovi, misije, tecaj, trend, luckySpinCounter, winStreak })); } 
      catch (e) { }
    };
    spremi();
  }, [igracRazina, prestigeRazina, xp, energija, zlato, dijamanti, resursi, gradevine, ostecenja, razine, stitovi, misije, tecaj, trend, luckySpinCounter, winStreak, ucitavam]);

  useEffect(() => {
    if(ucitavam) return;
    const spremiDostignuca = async () => {
      try { await AsyncStorage.setItem('@save_dostignuca_v1', JSON.stringify({ dostignucaDone, ukupnoVrtnji, ukupnoZlata })); }
      catch (e) { }
    };
    spremiDostignuca();
  }, [dostignucaDone, ukupnoVrtnji, ukupnoZlata, ucitavam]);

  useEffect(() => {
    const timer = setInterval(() => {
      setEnergija(e => e < maxEnergija ? e + 1 : e); 
      setResursi(r => ({
        drvo: r.drvo + (!ostecenja.pilana ? (gradevine.pilana * ZGRADE[0].bazaProizvodnja * pasivniMnožitelj) : 0),
        kamen: r.kamen + (!ostecenja.kamenolom ? (gradevine.kamenolom * ZGRADE[1].bazaProizvodnja * pasivniMnožitelj) : 0),
        zeljezo: r.zeljezo + (!ostecenja.rudnik ? (gradevine.rudnik * ZGRADE[2].bazaProizvodnja * pasivniMnožitelj) : 0)
      }));
      setStitovi(s => {
          if (s < maxStitova && Math.random() < 0.10) return s + 1;
          return s;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [maxEnergija, maxStitova, gradevine, ostecenja, pasivniMnožitelj]);

  useEffect(() => {
      const marketTimer = setInterval(() => {
          setTecaj(stariTecaj => {
              let noviTecaj = { ...stariTecaj };
              let noviTrend = {};
              ['drvo', 'kamen', 'zeljezo', 'dijamant'].forEach(res => {
                  const promjena = 0.7 + (Math.random() * 0.6); 
                  const novaKupi = Math.max(1, Math.floor(BAZA_TECAJ[res].kupi * promjena));
                  const novaProdaj = Math.max(1, Math.floor(BAZA_TECAJ[res].prodaj * promjena));
                  
                  noviTrend[res] = novaKupi > stariTecaj[res].kupi ? 1 : (novaKupi < stariTecaj[res].kupi ? -1 : 0);
                  noviTecaj[res] = { kupi: novaKupi, prodaj: novaProdaj };
              });
              setTrend(noviTrend);
              return noviTecaj;
          });
      }, 45000);
      return () => clearInterval(marketTimer);
  }, []);

  useEffect(() => {
      if (xp >= potrebanXp) {
          setXp(x => x - potrebanXp);
          setIgracRazina(l => l + 1);
          setDijamanti(d => d + 5); 
          setEnergija(maxEnergija); 
          setPoruka(`LEVEL UP! RAZINA ${igracRazina + 1}`);
      }
  }, [xp, potrebanXp, igracRazina, maxEnergija]);

  const dodajXp = (iznos) => setXp(x => x + iznos);

  const primiNagradu = (nagrada) => {
    if (nagrada.zlato) setZlato(z => z + nagrada.zlato);
    if (nagrada.dijamanti) setDijamanti(d => d + nagrada.dijamanti);
    if (nagrada.energija) setEnergija(e => e + nagrada.energija);
    if (nagrada.drvo) setResursi(r => ({...r, drvo: r.drvo + nagrada.drvo}));
    if (nagrada.kamen) setResursi(r => ({...r, kamen: r.kamen + nagrada.kamen}));
    if (nagrada.zeljezo) setResursi(r => ({...r, zeljezo: r.zeljezo + nagrada.zeljezo}));
  };

  const provjeriDostignuca = (novaVrtnja, novoZlato, novaTipGradnje, noviPrestige) => {
    setDostignucaDone(prev => {
      const novo = { ...prev };
      DOSTIGNUCA.forEach(d => {
        if (novo[d.id]) return;
        let ispunjeno = false;
        if (d.tip === 'spin' && novaVrtnja !== undefined && novaVrtnja >= d.cilj) ispunjeno = true;
        if (d.tip === 'ukupnoZlato' && novoZlato !== undefined && novoZlato >= d.cilj) ispunjeno = true;
        if (d.tip === 'gradnja' && novaTipGradnje !== undefined && novaTipGradnje >= d.cilj) ispunjeno = true;
        if (d.tip === 'prestige' && noviPrestige !== undefined && noviPrestige >= d.cilj) ispunjeno = true;
        if (ispunjeno) {
          novo[d.id] = true;
          primiNagradu(d.nagrada);
          setPoruka(`🏆 DOSTIGNUĆE: ${d.naziv.toUpperCase()}!`);
        }
      });
      return novo;
    });
  };

  const preuzmiDnevniBonus = async () => {
    if (!dnevnaNagrada) return;
    primiNagradu(dnevnaNagrada.nagrada);
    const danas = new Date().toDateString();
    try {
      await AsyncStorage.setItem('@save_dnevna_v1', JSON.stringify({ streak: dnevniStreak, zadnjaDnevna: danas }));
    } catch (e) { }
    setPrikazDnevneNagrade(false);
    setPoruka(`DNEVNA NAGRADA DAN ${dnevniStreak} PREUZETA!`);
  };

  const azurirajMisiju = (tip, kolicina = 1) => {
    setMisije(prev => prev.map(m => {
        if (m.tip === tip && !m.zavrseno && m.trenutno < m.cilj) {
            return { ...m, trenutno: Math.min(m.cilj, m.trenutno + kolicina) };
        }
        return m;
    }));
  };

  const preuzmiNagraduMisije = (id, nagrada) => {
      if (nagrada.dijamanti) setDijamanti(d => d + nagrada.dijamanti);
      if (nagrada.energija) setEnergija(e => e + nagrada.energija);
      if (nagrada.zlato) setZlato(z => z + nagrada.zlato);
      if (nagrada.drvo) setResursi(r => ({...r, drvo: r.drvo + nagrada.drvo}));
      if (nagrada.kamen) setResursi(r => ({...r, kamen: r.kamen + nagrada.kamen}));

      setPoruka('MISIJA ZAVRŠENA! NAGRADA PREUZETA.');
      setMisije(prev => prev.map(m => m.id === id ? generirajMisiju() : m));
  };

  const prikaziUdarac = (boja) => {
    setFlashBoja(boja);
    flashAnim.setValue(1);
    Animated.timing(flashAnim, { toValue: 0, duration: 800, useNativeDriver: false }).start();
  };

  const trziEkran = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 15, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -15, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 15, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true })
    ]).start();
  };

  const animirajDobitak = (polja) => {
    polja.forEach(idx => {
      Animated.sequence([
        Animated.spring(winScaleAnims[idx], { toValue: 1.25, friction: 3, tension: 40, useNativeDriver: true }),
        Animated.timing(winScaleAnims[idx], { toValue: 1.15, duration: 200, useNativeDriver: true })
      ]).start();
    });
  };

  const preuzmiDobitak = () => {
      if (!dobitakNaCekanju) return;
      const d = dobitakNaCekanju;
      if (d.zlato > 0) { setZlato(z => z + d.zlato); azurirajMisiju('zlato', d.zlato); }
      if (d.dijamanti > 0) setDijamanti(dia => dia + d.dijamanti);
      if (d.energija > 0) setEnergija(e => e + d.energija);
      if (d.stitovi > 0) setStitovi(s => Math.min(maxStitova, s + d.stitovi));
      if (d.linije > 0) azurirajMisiju('dobitak', d.linije);

      setResursi(r => ({ drvo: r.drvo + d.drvo, kamen: r.kamen + d.kamen, zeljezo: r.zeljezo + d.zeljezo }));

      if (d.zlato > 0) {
        const novoUkupnoZlato = ukupnoZlata + d.zlato;
        setUkupnoZlata(novoUkupnoZlato);
        provjeriDostignuca(undefined, novoUkupnoZlato, undefined, undefined);
      }

      setPoruka(`DOBITAK PREUZET!`);
      setDobitakNaCekanju(null);
      setDobitnaPolja([]);
  };

  const igrajGamble = (odabranaBoja) => {
      const izvucenaKarta = Math.random() < 0.5 ? 'red' : 'black';
      if (izvucenaKarta === odabranaBoja) {
          prikaziUdarac(izvucenaKarta === 'red' ? 'rgba(255, 42, 85, 0.5)' : 'rgba(100, 100, 100, 0.7)');
          setDobitakNaCekanju(prev => ({
              zlato: prev.zlato * 2, dijamanti: prev.dijamanti * 2, energija: prev.energija * 2,
              stitovi: prev.stitovi * 2, drvo: prev.drvo * 2, kamen: prev.kamen * 2, zeljezo: prev.zeljezo * 2, linije: prev.linije 
          }));
          setPoruka(`POGODAK! IZVUČENA JE ${izvucenaKarta === 'red' ? 'CRVENA' : 'CRNA'}! x2!`);
      } else {
          prikaziUdarac(izvucenaKarta === 'red' ? 'rgba(255, 42, 85, 0.5)' : 'rgba(100, 100, 100, 0.7)');
          setDobitakNaCekanju(null);
          setDobitnaPolja([]);
          setPoruka(`GUBITAK! IZVUČENA JE ${izvucenaKarta === 'red' ? 'CRVENA' : 'CRNA'}.`);
      }
  };

  const zavrtiMasinu = async () => {
    if (dobitakNaCekanju) return; 
    const jeFreeSpin = luckySpinCounter === 1;
    if (vrti || (!jeFreeSpin && energija < ulog)) { 
      if(!vrti) setPoruka('NEDOVOLJNO ENERGIJE'); 
      return; 
    }
    
    if (!jeFreeSpin) {
      setEnergija(e => e - ulog);
    }
    azurirajMisiju('spin'); 
    let dobijeniXp = ulog * 2; 
    const novaVrtnja = ukupnoVrtnji + 1;
    setUkupnoVrtnji(novaVrtnja);
    provjeriDostignuca(novaVrtnja, undefined, undefined, undefined);

    const noviLuckyCounter = jeFreeSpin ? LUCKY_SPIN_INTERVAL : luckySpinCounter - 1;
    setLuckySpinCounter(noviLuckyCounter);
    if (jeFreeSpin) {
      azurirajMisiju('luckySpin');
      setPoruka('🍀 LUCKY SPIN! BESPLATNA VRTNJA!');
    }

    setVrti(true); 
    setDobitnaPolja([]); 
    if (!jeFreeSpin) setPoruka('VRTNJA...');

    winScaleAnims.forEach(anim => anim.setValue(1));
    stupciAnims.forEach(anim => { anim.setValue(0); });

    const spinDuration = turboRezim ? 120 : 250;
    const spinDelay = turboRezim ? 250 : 600;
    const stopDelay = turboRezim ? 100 : 250;
    const finalDelay = turboRezim ? 150 : 300;
    
    Animated.parallel(
      stupciAnims.map((anim, i) => 
        Animated.loop(Animated.timing(anim, { toValue: 300, duration: spinDuration, easing: Easing.linear, useNativeDriver: true }))
      ).concat(stupciBlurs.map((anim) => Animated.timing(anim, { toValue: 0.3, duration: 200, useNativeDriver: true })))
    ).start();

    await delay(spinDelay); 
    
    try {
        const wildBoostLevel = razine.wildBoost || 0;
        const wildBoostChance = wildBoostLevel * WILD_BOOST_CHANCE_PER_LEVEL;
        let noviSimboli = Array(15).fill(null).map(() => {
            if (Math.random() < wildBoostChance) return 'wild';
            return SVO_BLAGO[Math.floor(Math.random() * SVO_BLAGO.length)];
        });
        
        const linije = [
            [5, 6, 7, 8, 9], [0, 1, 2, 3, 4], [10, 11, 12, 13, 14], [0, 6, 12, 8, 4], [10, 6, 2, 8, 14]      
        ];

        if (Math.random() < sansaZaDobitak) {
            const ponudjenoBlago = SVO_BLAGO.filter(s => s !== 'skull');
            const dob = ponudjenoBlago[Math.floor(Math.random() * ponudjenoBlago.length)];
            const rLinija = linije[Math.floor(Math.random() * linije.length)];
            const rand = Math.random();
            const raspon = rand > 0.95 ? [0,1,2,3,4] : (rand > 0.7 ? [0,1,2,3] : [0,1,2]);
            raspon.forEach(i => noviSimboli[rLinija[i]] = dob);
        }
        
        setSimboli(noviSimboli); 

        for (let i = 0; i < 5; i++) {
            stupciAnims[i].stopAnimation();
            stupciAnims[i].setValue(-200); 
            Animated.parallel([
                Animated.spring(stupciAnims[i], { toValue: 0, friction: 5, tension: 80, useNativeDriver: true }),
                Animated.timing(stupciBlurs[i], { toValue: 1, duration: 100, useNativeDriver: true })
            ]).start();
            await delay(stopDelay); 
        }

        await delay(finalDelay); 

        let ukupnoZlato = 0, ukupnoDijamanata = 0, ukupnoEnergije = 0, ukupnoStitova = 0;
        let resursiDobitak = { drvo: 0, kamen: 0, zeljezo: 0 };
        let dobijenaPoljaPrivremena = [];
        let linijaDobitnih = 0;
        let jackpotLinija = false;

        const winStreakMultiplier = 1 + (Math.min(winStreak, MAX_WIN_STREAK) * STREAK_BONUS_PER_WIN);

        linije.forEach(linija => {
            let prviSimbol = noviSimboli[linija[0]];
            
            let targetSymbol = prviSimbol;
            if (targetSymbol === 'wild') {
                for (let i = 1; i < 5; i++) {
                    if (noviSimboli[linija[i]] !== 'wild') {
                        targetSymbol = noviSimboli[linija[i]];
                        break;
                    }
                }
            }

            if (targetSymbol === 'skull') return; 

            let consecutiveCount = 0;
            for (let i = 0; i < 5; i++) {
                if (noviSimboli[linija[i]] === targetSymbol || noviSimboli[linija[i]] === 'wild') {
                    consecutiveCount++;
                } else {
                    break; 
                }
            }
            
            if (consecutiveCount >= 3) {
                linijaDobitnih++;
                const isAllWilds = targetSymbol === 'wild';
                const isJackpot = consecutiveCount === 5;
                if (isJackpot) jackpotLinija = true;
                const detalji = isAllWilds ? BLAGO['gem'] : BLAGO[targetSymbol];
                const multiplier = isJackpot ? 15 : (consecutiveCount === 4 ? 4 : 1);
                const jackpotBonus = isJackpot ? 2 : 1;
                dobijeniXp += (consecutiveCount * ulog * 3);

                if (targetSymbol === 'shield' && !isAllWilds) {
                    ukupnoStitova += (ulog >= 10 ? 2 : 1) * (consecutiveCount - 2); 
                } else if (targetSymbol === 'energy' && !isAllWilds) {
                    ukupnoEnergije += Math.floor(detalji.baza * ulog * 0.5 * multiplier * prestigeMnožitelj * winStreakMultiplier);
                } else if (targetSymbol === 'gem' || isAllWilds) {
                    ukupnoDijamanata += Math.max(1, Math.floor((isAllWilds ? 5 : detalji.baza) * (ulog * 0.1) * multiplier * jackpotBonus * prestigeMnožitelj * winStreakMultiplier));
                } else {
                    const kolicina = Math.floor(detalji.baza * ulog * multiplier * jackpotBonus * (1 + (razine.pojacalo || 0) * 0.1) * prestigeMnožitelj * winStreakMultiplier);
                    if (targetSymbol === 'gold') ukupnoZlato += kolicina;
                    else resursiDobitak[detalji.tip] += kolicina;
                }
                
                linija.slice(0, consecutiveCount).forEach(idx => dobijenaPoljaPrivremena.push(idx));
            }
        });

        dodajXp(dobijeniXp);

        const brojLubanja = noviSimboli.filter(s => s === 'skull').length;
        
        if (dobijenaPoljaPrivremena.length > 0) {
            const jedinstvenaPolja = [...new Set(dobijenaPoljaPrivremena)];
            setDobitnaPolja(jedinstvenaPolja);
            animirajDobitak(jedinstvenaPolja);
            
            const noviWinStreak = winStreak + 1;
            setWinStreak(noviWinStreak);
            if (noviWinStreak >= 3) azurirajMisiju('streak');
            
            setDobitakNaCekanju({
                zlato: ukupnoZlato, dijamanti: ukupnoDijamanata, energija: ukupnoEnergije,
                stitovi: ukupnoStitova, drvo: resursiDobitak.drvo, kamen: resursiDobitak.kamen,
                zeljezo: resursiDobitak.zeljezo, linije: linijaDobitnih
            });

            if (jackpotLinija) {
                prikaziUdarac('rgba(255, 215, 0, 0.5)');
                trziEkran();
                setPoruka(`🎰 JACKPOT! 5 U NIZU! 2× BONUS${winStreak > 0 ? ` + ${Math.round((winStreakMultiplier - 1) * 100)}% NIZ` : ''}! PREUZMI ILI DUPLAJ!`);
            } else if (noviWinStreak >= 3) {
                setPoruka(`🔥 NIZ x${noviWinStreak}! +${Math.round((winStreakMultiplier - 1) * 100)}% BONUS! PREUZMI ILI DUPLAJ!`);
            } else {
                setPoruka('DOBITAK! PREUZMI ILI DUPLAJ!');
            }

        } else if (brojLubanja >= 3) {
            setWinStreak(0);
            trziEkran(); 
            let novaPoruka = "";
            let noviStitovi = stitovi;

            if (stitovi <= 0) {
                prikaziUdarac('rgba(255, 51, 0, 0.4)'); 
                const gubitakZlata = Math.floor(zlato * (0.05 * brojLubanja)); 
                setZlato(zl => Math.max(0, zl - gubitakZlata));
                noviStitovi = 0;

                const izgradeneINeostecene = ZGRADE.filter(zg => gradevine[zg.id] > 0 && !ostecenja[zg.id]);
                if (izgradeneINeostecene.length > 0) {
                    const meta = izgradeneINeostecene[Math.floor(Math.random() * izgradeneINeostecene.length)];
                    setOstecenja(prev => ({...prev, [meta.id]: true}));
                    novaPoruka = `KATASTROFA! -${gubitakZlata} 🪙 I OŠTEĆEN(A) ${meta.naziv.toUpperCase()}!`;
                } else {
                    novaPoruka = `NAPAD! ODUZETO ${gubitakZlata} 🪙`;
                }
            } else {
                prikaziUdarac('rgba(0, 212, 255, 0.4)'); 
                const steta = Math.min(stitovi, Math.floor(brojLubanja / 2) || 1);
                noviStitovi = stitovi - steta;
                novaPoruka = `OBRANA AKTIVNA! -${steta} ŠTITA`;
            }
            
            setStitovi(noviStitovi);
            setPoruka(novaPoruka);
            const skullP = noviSimboli.map((v, i) => v === 'skull' ? i : null).filter(v => v !== null);
            setDobitnaPolja(skullP);
            animirajDobitak(skullP);
        } else {
            setWinStreak(0);
            setPoruka('NEMA DOBITKA. POKUŠAJ PONOVO.');
        }
    } finally { 
      setVrti(false); 
    }
  };

  const popraviZgradu = (zgrada) => {
    const lv = gradevine[zgrada.id];
    const cPopravakZlato = lv * 50;
    const cPopravakDrvo = lv * 20;

    if (zlato >= cPopravakZlato && resursi.drvo >= cPopravakDrvo) {
        setZlato(z => z - cPopravakZlato);
        setResursi(r => ({ ...r, drvo: r.drvo - cPopravakDrvo }));
        setOstecenja(prev => ({ ...prev, [zgrada.id]: false }));
        setPoruka(`${zgrada.naziv.toUpperCase()} USPJEŠNO POPRAVLJEN!`);
    } else {
        setPoruka("NEMAŠ DOVOLJNO RESURSA ZA POPRAVAK");
    }
  };

  const nadogradiZgradu = (zgrada) => {
    const lv = gradevine[zgrada.id] || 0; 
    if (lv >= zgrada.maxLv) return; 
    const c = zgrada.cijena(lv + 1);
    const faliZlata = zlato < c.zlato;
    const faliDrva = (c.drvo || 0) > resursi.drvo;
    const faliKamena = (c.kamen || 0) > resursi.kamen;
    const faliZeljeza = (c.zeljezo || 0) > resursi.zeljezo;

    if (!faliZlata && !faliDrva && !faliKamena && !faliZeljeza) { 
        setZlato(z => z - c.zlato); 
        setResursi(r => ({ drvo: r.drvo - (c.drvo||0), kamen: r.kamen - (c.kamen||0), zeljezo: r.zeljezo - (c.zeljezo||0) })); 
        setGradevine(g => ({ ...g, [zgrada.id]: lv + 1 })); 
        azurirajMisiju('zgrada');
        provjeriDostignuca(undefined, undefined, lv + 1, undefined);
        setPoruka(`${zgrada.naziv.toUpperCase()} NADOGRAĐEN!`); 
    } else setPoruka("FALE RESURSI ZA NADOGRADNJU");
  };

  const izvrsiPrestige = () => {
    const noviPrestige = prestigeRazina + 1;
    setPrestigeRazina(noviPrestige);
    setIgracRazina(1);
    setXp(0);
    setGradevine({ pilana: 0, kamenolom: 0, rudnik: 0 });
    setOstecenja({ pilana: false, kamenolom: false, rudnik: false });
    setResursi({ drvo: 0, kamen: 0, zeljezo: 0 });
    setZlato(50);
    setEnergija(10);
    setWinStreak(0);
    setLuckySpinCounter(LUCKY_SPIN_INTERVAL);
    provjeriDostignuca(undefined, undefined, undefined, noviPrestige);
    setPoruka(`PRESTIGE USPJEŠAN! NOVI MNOŽITELJ x${1 + (noviPrestige * 0.5)}`);
  };

  const trgovina = (akcija, resurs, iznos) => {
    const cijenaPoKomadu = tecaj[resurs][akcija];
    let ukupnaCijena = cijenaPoKomadu * (iznos === 1 ? 1 : 10);

    if (akcija === 'kupi') {
      if (zlato >= ukupnaCijena) { 
          setZlato(z => z - ukupnaCijena); 
          if (resurs === 'dijamant') setDijamanti(d => (d||0) + iznos); 
          else setResursi(r => ({...r, [resurs]: (r[resurs]||0) + iznos})); 
          setPoruka(`KUPLJENO ${iznos} ${resurs.toUpperCase()}`); 
      } else setPoruka('NEDOVOLJNO ZLATA');
    } else {
      if ((resurs === 'dijamant' ? dijamanti : resursi[resurs]) >= iznos) { 
          setZlato(z => (z||0) + ukupnaCijena); 
          if (resurs === 'dijamant') setDijamanti(d => d - iznos); 
          else setResursi(r => ({...r, [resurs]: r[resurs] - iznos})); 
          setPoruka(`PRODANO ZA ${ukupnaCijena} 🪙`); 
          azurirajMisiju('zlato', ukupnaCijena);
      } else setPoruka('NEDOVOLJNO RESURSA');
    }
  };

  const kupiAlat = (alat) => {
    const mult = Math.pow(1.6, razine[alat.id] || 0); 
    const zl = Math.floor(alat.cZlato * mult);
    const ka = Math.floor(alat.cKamen * mult);
    const ze = Math.floor(alat.cZeljezo * mult);

    if (zlato >= zl && resursi.kamen >= ka && resursi.zeljezo >= ze) { 
        setZlato(z => z - zl); 
        setResursi(r => ({...r, kamen: r.kamen - ka, zeljezo: r.zeljezo - ze})); 
        setRazine(r => ({...r, [alat.id]: (r[alat.id]||0) + 1})); 
        if(alat.id === 'oklop') setStitovi(maxStitova + 1); 
        azurirajMisiju('oprema');
        setPoruka(`OPREMA POBOLJŠANA`); 
    } else setPoruka("FALE RESURSI");
  };

  const spremanZaPrestige = gradevine.pilana === ZGRADE[0].maxLv && gradevine.kamenolom === ZGRADE[1].maxLv && gradevine.rudnik === ZGRADE[2].maxLv;

  if (ucitavam) return <View style={styles.container}><ActivityIndicator size="large" color={BOJE.drvo} style={{marginTop: 50}} /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BOJE.bg} />
      
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: flashBoja, opacity: flashAnim, zIndex: 100 }]} pointerEvents="none" />

      {/* --- DNEVNA NAGRADA MODAL --- */}
      {prikazDnevneNagrade && dnevnaNagrada && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🎁 DNEVNA NAGRADA</Text>
            <Text style={styles.modalSubtitle}>Dan {dnevnaNagrada.streak} · Niz prijava</Text>
            <View style={styles.dnevnaStreakRow}>
              {DNEVNE_NAGRADE.map((dn, i) => (
                <View key={i} style={[styles.dnevniDanBadge, i + 1 === dnevniStreak && styles.dnevniDanAktivan, i + 1 < dnevniStreak && styles.dnevniDanPreuzet]}>
                  <Text style={styles.dnevniDanBroj}>{i + 1}</Text>
                </View>
              ))}
            </View>
            <View style={styles.modalNagradeRow}>
              {dnevnaNagrada.nagrada.zlato > 0 && <Text style={styles.modalNagradaTxt}>{dnevnaNagrada.nagrada.zlato} 🪙</Text>}
              {dnevnaNagrada.nagrada.dijamanti > 0 && <Text style={[styles.modalNagradaTxt, {color: BOJE.dijamant}]}>{dnevnaNagrada.nagrada.dijamanti} 💎</Text>}
              {dnevnaNagrada.nagrada.energija > 0 && <Text style={[styles.modalNagradaTxt, {color: BOJE.energija}]}>{dnevnaNagrada.nagrada.energija} ⚡</Text>}
              {dnevnaNagrada.nagrada.drvo > 0 && <Text style={[styles.modalNagradaTxt, {color: BOJE.drvo}]}>{dnevnaNagrada.nagrada.drvo} 🌲</Text>}
              {dnevnaNagrada.nagrada.kamen > 0 && <Text style={[styles.modalNagradaTxt, {color: BOJE.kamen}]}>{dnevnaNagrada.nagrada.kamen} ⛰️</Text>}
              {dnevnaNagrada.nagrada.zeljezo > 0 && <Text style={[styles.modalNagradaTxt, {color: BOJE.zeljezo}]}>{dnevnaNagrada.nagrada.zeljezo} ⛏️</Text>}
            </View>
            <TouchableOpacity activeOpacity={0.8} style={styles.modalBtn} onPress={preuzmiDnevniBonus}>
              <Text style={styles.modalBtnTxt}>PREUZMI</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Animated.View style={[styles.mainWrapper, { transform: [{ translateX: shakeAnim }] }]} {...swipeRef.panHandlers}>
        
        {/* --- PREMIUM ZAGLAVLJE --- */}
        <View style={styles.header}>
          
          <View style={styles.levelContainer}>
             <View style={styles.levelBadgeOuter}><Text style={styles.levelBadgeTxt}>{igracRazina}</Text></View>
             
             {prestigeRazina > 0 && (
                <View style={styles.prestigeBadgeOuter}>
                   <Crown size={14} color="#000" style={{marginRight: 2}}/>
                   <Text style={styles.levelBadgeTxt}>{prestigeRazina}</Text>
                </View>
             )}

             <View style={styles.xpBarContainer}>
                <View style={[styles.xpBarFill, { width: `${Math.min(100, (xp / potrebanXp) * 100)}%` }]} />
                <Text style={styles.xpText}>{xp} / {potrebanXp} XP</Text>
             </View>
             <View style={[styles.multiplierBadge, prestigeRazina > 0 && {backgroundColor: BOJE.prestige}]}>
                <TrendingUp size={12} color="#000" style={{marginRight: 2}} />
                <Text style={styles.multiplierTxt}>{(pasivniMnožitelj).toFixed(2)}x</Text>
             </View>
          </View>

          <View style={styles.headerMainStats}>
            <View style={styles.statChip}><Zap size={16} color={BOJE.energija} strokeWidth={2.5} /><Text style={styles.statChipTxt}>{Math.floor(energija)}</Text></View>
            <View style={styles.statChip}><Coins size={16} color={BOJE.zlato} strokeWidth={2.5} /><Text style={styles.statChipTxt}>{Math.floor(zlato)}</Text></View>
            <View style={styles.statChip}><Gem size={16} color={BOJE.dijamant} strokeWidth={2.5} /><Text style={styles.statChipTxt}>{dijamanti}</Text></View>
          </View>
          
          <View style={styles.resourceHeaderRow}>
               <View style={styles.resMiniChip}><TreePine size={14} color={BOJE.drvo} strokeWidth={2.5} /><Text style={styles.resChipTxt}>{Math.floor(resursi.drvo)}</Text></View>
               <View style={styles.resMiniChip}><Mountain size={14} color={BOJE.kamen} strokeWidth={2.5} /><Text style={styles.resChipTxt}>{Math.floor(resursi.kamen)}</Text></View>
               <View style={styles.resMiniChip}><Pickaxe size={14} color={BOJE.zeljezo} strokeWidth={2.5} /><Text style={styles.resChipTxt}>{Math.floor(resursi.zeljezo)}</Text></View>
          </View>

          <View style={styles.defenseMatrix}>
             <Shield size={16} color={BOJE.stit} strokeWidth={2.5} style={{marginRight: 8}} />
             <Text style={styles.defenseTitle}>OBRANA</Text>
             <View style={styles.shieldSlotsContainer}>
                {[...Array(maxStitova)].map((_, i) => (
                   <View key={i} style={[styles.shieldSlot, i < stitovi ? styles.shieldActive : styles.shieldEmpty]}>
                      {i < stitovi && <View style={styles.shieldGlow} />}
                   </View>
                ))}
             </View>
          </View>
        </View>

        {/* --- GLAVNI SADRŽAJ --- */}
        <View style={styles.content}>
          
          {pogled === 'automat' && (
            <View style={styles.gameContainer}>
              <View style={styles.messageBubble}>
                <Sparkles size={16} color={BOJE.slotVatra} style={{marginRight: 8}} />
                <Text style={styles.messageText} numberOfLines={1}>{poruka}</Text>
                <Sparkles size={16} color={BOJE.slotVatra} style={{marginLeft: 8}} />
              </View>

              <View style={styles.slotMachineOuter}>
                <View style={styles.slotMachineInner}>
                  <View style={styles.gridColumnsWrapper}>
                    {[0, 1, 2, 3, 4].map(stupacIndex => (
                      <Animated.View key={stupacIndex} style={[styles.gridColumn, { transform: [{ translateY: stupciAnims[stupacIndex] }], opacity: stupciBlurs[stupacIndex] }]}>
                        {[0, 1, 2].map(redIndex => {
                          const apsolutniIndeks = redIndex * 5 + stupacIndex;
                          const simbolId = simboli[apsolutniIndeks];
                          const isWin = dobitnaPolja.includes(apsolutniIndeks);
                          const hasWinAnywhere = dobitnaPolja.length > 0;
                          const SIcon = BLAGO[simbolId].Ikona;
                          const boja = BLAGO[simbolId].boja;
                          const bgBoja = BLAGO[simbolId].raritet;
                          
                          const isWild = simbolId === 'wild';
                          const opacityStyle = (!isWin && hasWinAnywhere) ? 0.2 : 1;
                          
                          return (
                            <Animated.View 
                              key={apsolutniIndeks} 
                              style={[
                                  styles.slotItem, 
                                  { backgroundColor: bgBoja, borderColor: boja + (isWild ? '80' : '40') }, 
                                  isWin && [styles.slotItemWinning, { borderColor: BOJE.slotVatra, shadowColor: BOJE.slotVatra }], 
                                  { transform: [{ scale: winScaleAnims[apsolutniIndeks] }], opacity: opacityStyle }
                                ]}
                            >
                              <SIcon size={slotSize * (isWild ? 0.65 : 0.55)} color={isWin ? '#FFF' : boja} strokeWidth={isWin ? 2.5 : 2} />
                            </Animated.View>
                          );
                        })}
                      </Animated.View>
                    ))}
                  </View>
                </View>
              </View>
              
              {dobitakNaCekanju ? (
                 <View style={styles.gambleContainer}>
                    <Text style={styles.gambleTitle}>TRENUTNI DOBITAK</Text>
                    <View style={styles.gamblePrizesRow}>
                        {dobitakNaCekanju.zlato > 0 && <Text style={styles.gamblePrizeTxt}>{dobitakNaCekanju.zlato} 🪙</Text>}
                        {dobitakNaCekanju.dijamanti > 0 && <Text style={[styles.gamblePrizeTxt, {color: BOJE.dijamant}]}>{dobitakNaCekanju.dijamanti} 💎</Text>}
                        {dobitakNaCekanju.energija > 0 && <Text style={[styles.gamblePrizeTxt, {color: BOJE.energija}]}>{dobitakNaCekanju.energija} ⚡</Text>}
                        {dobitakNaCekanju.drvo > 0 && <Text style={[styles.gamblePrizeTxt, {color: BOJE.drvo}]}>{dobitakNaCekanju.drvo} 🌲</Text>}
                        {dobitakNaCekanju.kamen > 0 && <Text style={[styles.gamblePrizeTxt, {color: BOJE.kamen}]}>{dobitakNaCekanju.kamen} ⛰️</Text>}
                        {dobitakNaCekanju.zeljezo > 0 && <Text style={[styles.gamblePrizeTxt, {color: BOJE.zeljezo}]}>{dobitakNaCekanju.zeljezo} ⛏️</Text>}
                    </View>
                    <View style={styles.gambleButtonsRow}>
                        <TouchableOpacity activeOpacity={0.8} style={[styles.gambleBtn, {backgroundColor: '#FF2A55'}]} onPress={() => igrajGamble('red')}><Text style={styles.gambleBtnTxt}>CRVENA (x2)</Text></TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.8} style={[styles.gambleBtn, {backgroundColor: '#1A1A24', borderWidth: 2, borderColor: '#333'}]} onPress={() => igrajGamble('black')}><Text style={styles.gambleBtnTxt}>CRNA (x2)</Text></TouchableOpacity>
                    </View>
                    <TouchableOpacity activeOpacity={0.8} style={styles.collectBtn} onPress={preuzmiDobitak}><Text style={styles.collectBtnTxt}>PREUZMI DOBITAK</Text></TouchableOpacity>
                 </View>
              ) : (
                 <View style={{width: '100%'}}>
                    {/* Lucky Spin Meter */}
                    <View style={styles.luckySpinRow}>
                       <View style={styles.luckySpinMeter}>
                          <View style={[styles.luckySpinFill, { width: `${((LUCKY_SPIN_INTERVAL - luckySpinCounter) / LUCKY_SPIN_INTERVAL) * 100}%` }]} />
                       </View>
                       <Text style={[styles.luckySpinTxt, luckySpinCounter === 1 && {color: BOJE.energija}]}>
                          {luckySpinCounter === 1 ? '🍀 LUCKY!' : `🍀 ${luckySpinCounter}`}
                       </Text>
                    </View>

                    {/* Win Streak & Turbo row */}
                    <View style={styles.streakTurboRow}>
                       {winStreak >= 2 && (
                          <View style={styles.streakBadge}>
                             <Text style={styles.streakTxt}>🔥 NIZ x{winStreak} (+{Math.round(Math.min(winStreak, MAX_WIN_STREAK) * STREAK_BONUS_PER_WIN * 100)}%)</Text>
                          </View>
                       )}
                       <TouchableOpacity activeOpacity={0.7} onPress={() => setTurboRezim(t => !t)} style={[styles.turboBtn, turboRezim && styles.turboBtnActive]}>
                          <Zap size={14} color={turboRezim ? '#000' : BOJE.textMuted} fill={turboRezim ? '#000' : 'transparent'} />
                          <Text style={[styles.turboTxt, turboRezim && {color: '#000'}]}>TURBO</Text>
                       </TouchableOpacity>
                    </View>

                    <View style={styles.betContainer}>
                       {[1, 10, 20, 50].map(op => (
                           <TouchableOpacity activeOpacity={0.7} key={op} onPress={() => setUlog(op)} style={[styles.betBtn, ulog === op && styles.betBtnActive]}><Text style={[styles.betBtnText, ulog === op && styles.betBtnTextActive]}>x{op}</Text></TouchableOpacity>
                       ))}
                    </View>
                    <TouchableOpacity activeOpacity={0.8} style={[styles.spinBtn, luckySpinCounter === 1 && styles.spinBtnLucky, (vrti || (luckySpinCounter !== 1 && energija < ulog)) && styles.spinBtnDisabled]} onPress={zavrtiMasinu} disabled={vrti}>
                        <Zap size={24} color="#000" fill="#000" style={{position: 'absolute', left: 24}} />
                        <Text style={styles.spinBtnText}>{vrti ? 'VRTIM...' : (luckySpinCounter === 1 ? '🍀 FREE SPIN' : 'SPIN')}</Text>
                        {luckySpinCounter !== 1 && <View style={styles.spinCostBadge}><Text style={styles.spinCostTxt}>-{ulog}</Text><Zap size={10} color="#000" fill="#000" /></View>}
                    </TouchableOpacity>
                 </View>
              )}
            </View>
          )}

          {pogled === 'selo' && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              <Text style={[styles.subTitle, { marginTop: 10 }]}>Infrastruktura</Text>
              
              {ZGRADE.map(z => {
                const lv = gradevine[z.id] || 0; 
                const jeOstecena = ostecenja[z.id]; 
                const c = z.cijena(lv + 1); 
                const ZIcon = z.ikona;
                const jeMax = lv >= z.maxLv;
                const mozeKupiti = zlato >= c.zlato && resursi.drvo >= (c.drvo||0) && resursi.kamen >= (c.kamen||0) && resursi.zeljezo >= (c.zeljezo||0);
                const cPopravakZlato = lv * 50;
                const cPopravakDrvo = lv * 20;
                const mozePopraviti = zlato >= cPopravakZlato && resursi.drvo >= cPopravakDrvo;
                const trenutnaProizvodnja = (lv * z.bazaProizvodnja * pasivniMnožitelj).toFixed(1);

                return (
                  <View key={z.id} style={[styles.card, jeMax && styles.cardMaxed, jeOstecena && styles.cardDamaged]}>
                     <View style={styles.cardTop}>
                        <View style={[styles.zgradaIconBg, {backgroundColor: z.bazaBoja + '15', borderColor: z.bazaBoja + '50'}, jeOstecena && {backgroundColor: BOJE.slotVatra + '20', borderColor: BOJE.slotVatra}]}>
                           {jeOstecena ? <Flame size={26} color={BOJE.slotVatra} strokeWidth={2.5} /> : <ZIcon size={26} color={z.bazaBoja} strokeWidth={2} />}
                        </View>
                        <View style={{flex: 1, paddingLeft: 16}}>
                           <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                             <Text style={[styles.cardTitle, jeOstecena && {color: BOJE.slotVatra}]}>{z.naziv}</Text>
                             <View style={styles.levelBadge}><Text style={styles.buildCardLevel}>LVL {lv}/{z.maxLv}</Text></View>
                           </View>
                           <Text style={[styles.perkText, jeOstecena && {color: BOJE.slotVatra, fontWeight: '800'}]}>
                             {jeOstecena ? 'ZGRADA U PLAMENU! Proizvodnja stala.' : (lv > 0 ? `Proizvodi: +${trenutnaProizvodnja}/s` : 'Zgrada nije izgrađena')}
                           </Text>
                        </View>
                     </View>
                     
                     <View style={styles.cardBottom}>
                        {jeOstecena ? (
                          <View style={styles.costRow}>
                             <View style={styles.repairBadge}><AlertTriangle size={14} color="#FFF" /><Text style={styles.repairBadgeTxt}>POPRAVAK:</Text></View>
                             <PrikazCijene Ikona={Coins} boja={BOJE.zlato} iznos={cPopravakZlato} trenutno={zlato} />
                             <PrikazCijene Ikona={TreePine} boja={BOJE.drvo} iznos={cPopravakDrvo} trenutno={resursi.drvo} />
                          </View>
                        ) : !jeMax ? (
                          <View style={styles.costRow}>
                             <PrikazCijene Ikona={Coins} boja={BOJE.zlato} iznos={c.zlato} trenutno={zlato} />
                             <PrikazCijene Ikona={TreePine} boja={BOJE.drvo} iznos={c.drvo} trenutno={resursi.drvo} />
                             <PrikazCijene Ikona={Mountain} boja={BOJE.kamen} iznos={c.kamen} trenutno={resursi.kamen} />
                             <PrikazCijene Ikona={Pickaxe} boja={BOJE.zeljezo} iznos={c.zeljezo} trenutno={resursi.zeljezo} />
                          </View>
                        ) : <Text style={styles.maxTxt}>MAKSIMALNA RAZINA</Text>}
                        
                        {jeOstecena ? (
                          <TouchableOpacity activeOpacity={0.7} style={[styles.actionBtn, mozePopraviti ? {backgroundColor: BOJE.slotVatra} : {backgroundColor: BOJE.slotOkvirZlato}]} onPress={() => popraviZgradu(z)}>
                             <Text style={[styles.actionBtnTxt, !mozePopraviti && {color: BOJE.textMuted}, mozePopraviti && {color: '#FFF'}]}>POPRAVI</Text>
                          </TouchableOpacity>
                        ) : !jeMax && (
                          <TouchableOpacity activeOpacity={0.7} style={[styles.actionBtn, mozeKupiti ? {backgroundColor: z.bazaBoja} : {backgroundColor: BOJE.slotOkvirZlato}]} onPress={() => nadogradiZgradu(z)}>
                             <Text style={[styles.actionBtnTxt, !mozeKupiti && {color: BOJE.textMuted}]}>{lv === 0 ? 'IZGRADI' : 'UPGRADE'}</Text>
                          </TouchableOpacity>
                        )}
                     </View>
                  </View>
                )
              })}

              {spremanZaPrestige && (
                 <View style={[styles.card, {borderColor: BOJE.prestige, backgroundColor: BOJE.prestige + '10', marginTop: 10}]}>
                    <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 16}}>
                        <View style={[styles.iconBadge, { backgroundColor: BOJE.prestige + '20', borderColor: BOJE.prestige, borderWidth: 1 }]}>
                            <Crown size={26} color={BOJE.prestige} />
                        </View>
                        <View style={{flex: 1, paddingLeft: 16}}>
                            <Text style={[styles.cardTitle, {color: BOJE.prestige}]}>KRUNIDBA (PRESTIGE)</Text>
                            <Text style={styles.upgradeDesc}>Resetiraj bazu i vrati se na Level 1, ali dobij trajni x1.5 množitelj na SVE nagrade i proizvodnju u igri!</Text>
                        </View>
                    </View>
                    <TouchableOpacity activeOpacity={0.8} style={[styles.actionBtn, {backgroundColor: BOJE.prestige, width: '100%', alignItems: 'center'}]} onPress={izvrsiPrestige}>
                        <Text style={[styles.actionBtnTxt, {fontSize: 15}]}>IZVRŠI PRESTIGE</Text>
                    </TouchableOpacity>
                 </View>
              )}
            </ScrollView>
          )}

          {pogled === 'misije' && (
             <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
               {/* --- Tab switcher --- */}
               <View style={styles.tabSwitcher}>
                 <TouchableOpacity activeOpacity={0.7} style={[styles.tabSwitchBtn, !prikazDostignuca && styles.tabSwitchActive]} onPress={() => setPrikazDostignuca(false)}>
                   <Text style={[styles.tabSwitchTxt, !prikazDostignuca && {color: BOJE.misije}]}>ZADACI</Text>
                 </TouchableOpacity>
                 <TouchableOpacity activeOpacity={0.7} style={[styles.tabSwitchBtn, prikazDostignuca && styles.tabSwitchActive]} onPress={() => setPrikazDostignuca(true)}>
                   <Text style={[styles.tabSwitchTxt, prikazDostignuca && {color: '#FFD700'}]}>🏆 DOSTIGNUĆA</Text>
                 </TouchableOpacity>
               </View>

               {!prikazDostignuca ? (
                 <>
                   <Text style={[styles.subTitle, { marginTop: 10 }]}>Dnevni Zadaci</Text>
                   {misije.map((m) => {
                      const napredakPostotak = Math.min(100, (m.trenutno / m.cilj) * 100);
                      const gotovo = m.trenutno >= m.cilj;
                      return (
                         <View key={m.id} style={[styles.card, gotovo && {borderColor: BOJE.misije, shadowColor: BOJE.misije, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5}]}>
                            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 16}}>
                               <View style={[styles.iconBadge, { backgroundColor: (gotovo ? BOJE.misije : BOJE.textMuted) + '15', borderColor: (gotovo ? BOJE.misije : BOJE.textMuted) + '50', borderWidth: 1 }]}>
                                  {gotovo ? <Check size={24} color={BOJE.misije} strokeWidth={3} /> : <Target size={24} color={BOJE.textMuted} strokeWidth={2} />}
                               </View>
                               <View style={{flex: 1, paddingLeft: 16}}>
                                  <Text style={[styles.cardTitle, gotovo && {color: BOJE.misije}]}>{m.opis}</Text>
                                  <View style={styles.missionProgressContainer}>
                                     <View style={[styles.missionProgressBar, { width: `${napredakPostotak}%`, backgroundColor: gotovo ? BOJE.misije : BOJE.xp }]} />
                                  </View>
                                  <Text style={styles.missionProgressTxt}>{Math.floor(m.trenutno)} / {m.cilj}</Text>
                               </View>
                            </View>
                            <View style={styles.cardBottom}>
                               <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                                   <Text style={{color: BOJE.textMuted, fontSize: 12, fontWeight: '800'}}>NAGRADA:</Text>
                                   {m.nagrada.dijamanti && <View style={styles.rewardChip}><Gem size={14} color={BOJE.dijamant}/><Text style={[styles.rewardTxt, {color: BOJE.dijamant}]}>{m.nagrada.dijamanti}</Text></View>}
                                   {m.nagrada.energija && <View style={styles.rewardChip}><Zap size={14} color={BOJE.energija}/><Text style={[styles.rewardTxt, {color: BOJE.energija}]}>{m.nagrada.energija}</Text></View>}
                                   {m.nagrada.zlato && <View style={styles.rewardChip}><Coins size={14} color={BOJE.zlato}/><Text style={[styles.rewardTxt, {color: BOJE.zlato}]}>{m.nagrada.zlato}</Text></View>}
                                   {m.nagrada.drvo && <View style={styles.rewardChip}><TreePine size={14} color={BOJE.drvo}/><Text style={[styles.rewardTxt, {color: BOJE.drvo}]}>{m.nagrada.drvo}</Text></View>}
                               </View>
                               <TouchableOpacity activeOpacity={0.7} style={[styles.actionBtn, gotovo ? {backgroundColor: BOJE.misije} : {backgroundColor: BOJE.slotOkvirZlato, opacity: 0.5}]} disabled={!gotovo} onPress={() => preuzmiNagraduMisije(m.id, m.nagrada)}>
                                  <Text style={[styles.actionBtnTxt, !gotovo && {color: BOJE.textMuted}]}>PREUZMI</Text>
                               </TouchableOpacity>
                            </View>
                         </View>
                      )
                   })}
                 </>
               ) : (
                 <>
                   <Text style={[styles.subTitle, { marginTop: 10 }]}>Dostignuća</Text>
                   <View style={styles.statsSummaryRow}>
                     <View style={styles.statsSummaryChip}><Text style={styles.statsSummaryLabel}>Ukupno vrtnji</Text><Text style={styles.statsSummaryValue}>{ukupnoVrtnji}</Text></View>
                     <View style={styles.statsSummaryChip}><Text style={styles.statsSummaryLabel}>Zlato zarađeno</Text><Text style={[styles.statsSummaryValue, {color: BOJE.zlato}]}>{ukupnoZlata}</Text></View>
                     <View style={styles.statsSummaryChip}><Text style={styles.statsSummaryLabel}>Prestige razina</Text><Text style={[styles.statsSummaryValue, {color: BOJE.prestige}]}>{prestigeRazina}</Text></View>
                   </View>
                   {DOSTIGNUCA.map(d => {
                     const otkljucano = !!dostignucaDone[d.id];
                     return (
                       <View key={d.id} style={[styles.card, otkljucano && {borderColor: '#FFD700', backgroundColor: '#FFD70008'}]}>
                         <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
                           <View style={[styles.iconBadge, {backgroundColor: (otkljucano ? '#FFD700' : BOJE.textMuted) + '20', borderColor: (otkljucano ? '#FFD700' : BOJE.textMuted) + '60', borderWidth: 1}]}>
                             <Text style={{fontSize: 22}}>{otkljucano ? '🏆' : '🔒'}</Text>
                           </View>
                           <View style={{flex: 1, paddingLeft: 14}}>
                             <Text style={[styles.cardTitle, otkljucano && {color: '#FFD700'}]}>{d.naziv}</Text>
                             <Text style={styles.upgradeDesc}>{d.opis}</Text>
                           </View>
                         </View>
                         <View style={styles.cardBottom}>
                           <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                             <Text style={{color: BOJE.textMuted, fontSize: 12, fontWeight: '800'}}>NAGRADA:</Text>
                             {d.nagrada.zlato && <View style={styles.rewardChip}><Coins size={14} color={BOJE.zlato}/><Text style={[styles.rewardTxt, {color: BOJE.zlato}]}>{d.nagrada.zlato}</Text></View>}
                             {d.nagrada.dijamanti && <View style={styles.rewardChip}><Gem size={14} color={BOJE.dijamant}/><Text style={[styles.rewardTxt, {color: BOJE.dijamant}]}>{d.nagrada.dijamanti}</Text></View>}
                             {d.nagrada.energija && <View style={styles.rewardChip}><Zap size={14} color={BOJE.energija}/><Text style={[styles.rewardTxt, {color: BOJE.energija}]}>{d.nagrada.energija}</Text></View>}
                             {d.nagrada.kamen && <View style={styles.rewardChip}><Mountain size={14} color={BOJE.kamen}/><Text style={[styles.rewardTxt, {color: BOJE.kamen}]}>{d.nagrada.kamen}</Text></View>}
                           </View>
                           <View style={[styles.actionBtn, {backgroundColor: otkljucano ? '#FFD70030' : BOJE.slotOkvirZlato}]}>
                             <Text style={[styles.actionBtnTxt, {color: otkljucano ? '#FFD700' : BOJE.textMuted}]}>{otkljucano ? 'OTKLJUČANO' : `CILJ: ${d.cilj}`}</Text>
                           </View>
                         </View>
                       </View>
                     );
                   })}
                 </>
               )}
             </ScrollView>
          )}

          {pogled === 'trgovina' && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 16, marginLeft: 4}}>
                  <Text style={[styles.subTitle, {marginBottom: 0, marginLeft: 0}]}>Mjenjačnica</Text>
                  <Text style={{color: BOJE.textMuted, fontSize: 12, fontWeight: '700'}}>Ažurira se svakih 45s</Text>
              </View>

              {[
                {id: 'drvo', n: 'Drvo', ik: TreePine, b: BOJE.drvo},
                {id: 'kamen', n: 'Kamen', ik: Mountain, b: BOJE.kamen},
                {id: 'zeljezo', n: 'Željezo', ik: Pickaxe, b: BOJE.zeljezo},
                {id: 'dijamant', n: 'Dijamant', ik: Gem, b: BOJE.dijamant}
              ].map(r => {
                 const cijenaKupi = tecaj[r.id].kupi;
                 const cijenaProdaj = tecaj[r.id].prodaj;
                 const tr = trend[r.id];

                 return (
                    <View key={r.id} style={styles.card}>
                       <View style={{flexDirection:'row', alignItems:'center', gap: 14, marginBottom: 16}}>
                          <IconBadge Ikona={r.ik} boja={r.b} />
                          <View style={{flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                              <Text style={styles.cardTitle}>{r.n} {r.id !== 'dijamant' && <Text style={styles.paketText}>(x10)</Text>}</Text>
                              <View style={[styles.trendBadge, tr === 1 ? {backgroundColor: '#10B98120'} : tr === -1 ? {backgroundColor: '#EF444420'} : {}]}>
                                 {tr === 1 ? <ArrowUpRight size={16} color="#10B981" /> : tr === -1 ? <ArrowDownRight size={16} color="#EF4444" /> : <Minus size={16} color={BOJE.textMuted} />}
                              </View>
                          </View>
                       </View>
                       
                       <View style={styles.marketActionRow}>
                          <TouchableOpacity activeOpacity={0.7} style={[styles.tradeBtn, {backgroundColor: BOJE.slotOkvirZlato}]} onPress={() => trgovina('prodaj', r.id, r.id === 'dijamant'?1:10)}>
                             <Text style={[styles.tradeBtnTxt, {color: BOJE.textMain}]}>PRODAJ</Text>
                             <Text style={styles.tradePriceTxt}>+ {cijenaProdaj} 🪙</Text>
                          </TouchableOpacity>
                          <TouchableOpacity activeOpacity={0.7} style={[styles.tradeBtn, {backgroundColor: BOJE.zlato + '10', borderColor: BOJE.zlato + '40'}]} onPress={() => trgovina('kupi', r.id, r.id === 'dijamant'?1:10)}>
                             <Text style={[styles.tradeBtnTxt, {color: BOJE.zlato}]}>KUPI</Text>
                             <Text style={[styles.tradePriceTxt, {color: BOJE.zlato}]}>- {cijenaKupi} 🪙</Text>
                          </TouchableOpacity>
                       </View>
                    </View>
                 );
              })}
            </ScrollView>
          )}

          {pogled === 'nadogradnje' && (
             <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
             <Text style={styles.subTitle}>Pasivne Sposobnosti</Text>
             {[
               {id:'sreca', n:'Djetelina', d: 'Povećava šansu za dobitne linije i Wild simbole.', ikona: Clover, cZlato: 500, cKamen: 0, cZeljezo: 50},
               {id:'pojacalo', n:'Množitelj', d: 'Daje bonus resurse ovisno o ulogu.', ikona: Zap, cZlato: 800, cKamen: 100, cZeljezo: 100},
               {id:'baterija', n:'Baterija', d: '+50 Max Energije.', ikona: Zap, cZlato: 1000, cKamen: 200, cZeljezo: 0},
               {id:'oklop', n:'Čelični Štit', d: '+1 Dodatni slot za obranu baze.', ikona: Shield, cZlato: 1200, cKamen: 50, cZeljezo: 200},
               {id:'wildBoost', n:'Wild Magnet', d: `+${Math.round(WILD_BOOST_CHANCE_PER_LEVEL * 100)}% šansa za Wild simbol po razini.`, ikona: Star, cZlato: 1500, cKamen: 300, cZeljezo: 150},
             ].map(p => {
                 const mult = Math.pow(1.6, razine[p.id] || 0); 
                 const zl = Math.floor(p.cZlato * mult);
                 const ka = Math.floor(p.cKamen * mult);
                 const ze = Math.floor(p.cZeljezo * mult);
                 const moze = zlato >= zl && resursi.kamen >= ka && resursi.zeljezo >= ze;

                 return (
                     <View key={p.id} style={styles.card}>
                         <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 16}}>
                            <IconBadge Ikona={p.ikona} boja={BOJE.nadogradnje} velicina={24} />
                            <View style={{flex: 1, paddingHorizontal: 16}}>
                               <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                                 <Text style={styles.cardTitle}>{p.n}</Text>
                                 <View style={styles.levelBadge}><Text style={[styles.buildCardLevel, {color: BOJE.nadogradnje}]}>LVL {razine[p.id] || 0}</Text></View>
                               </View>
                               <Text style={styles.upgradeDesc}>{p.d}</Text>
                            </View>
                         </View>
                         <View style={styles.cardBottom}>
                            <View style={styles.costRow}>
                               <PrikazCijene Ikona={Coins} boja={BOJE.zlato} iznos={zl} trenutno={zlato} />
                               <PrikazCijene Ikona={Mountain} boja={BOJE.kamen} iznos={ka} trenutno={resursi.kamen} />
                               <PrikazCijene Ikona={Pickaxe} boja={BOJE.zeljezo} iznos={ze} trenutno={resursi.zeljezo} />
                            </View>
                            <TouchableOpacity activeOpacity={0.7} style={[styles.actionBtn, moze ? {backgroundColor: BOJE.nadogradnje} : {backgroundColor: BOJE.slotOkvirZlato}]} onPress={() => kupiAlat({...p, cZlato:p.cZlato, cKamen:p.cKamen, cZeljezo:p.cZeljezo})}>
                               <Text style={[styles.actionBtnTxt, !moze && {color: BOJE.textMuted}]}>UPGRADE</Text>
                            </TouchableOpacity>
                         </View>
                     </View>
                 );
             })}
           </ScrollView>
          )}

        </View>
      </Animated.View>

      {/* Page indicator dots */}
      <View style={styles.pageIndicatorRow}>
        {POREDAK_EKRANA.map(ekran => (
          <View key={ekran} style={[styles.pageIndicatorDot, pogled === ekran && styles.pageIndicatorDotActive]} />
        ))}
      </View>

      <View style={styles.floatingNavbar}>
        {[
          { id: 'automat', ikona: Zap, label: 'IGRAJ', boja: BOJE.energija },
          { id: 'selo', ikona: Building2, label: 'BAZA', boja: BOJE.drvo },
          { id: 'misije', ikona: Trophy, label: 'ZADACI', boja: BOJE.misije },
          { id: 'trgovina', ikona: ShoppingCart, label: 'TRŽIŠTE', boja: BOJE.zlato },
          { id: 'nadogradnje', ikona: Sliders, label: 'OPREMA', boja: BOJE.nadogradnje }
        ].map(tab => {
          const aktivan = pogled === tab.id;
          const TIcon = tab.ikona;
          return (
            <TouchableOpacity activeOpacity={0.7} key={tab.id} onPress={() => setPogled(tab.id)} style={styles.navBtn}>
              <View style={[
                styles.navTabPill,
                aktivan
                  ? [styles.navTabPillActive, { backgroundColor: tab.boja, shadowColor: tab.boja }]
                  : styles.navTabPillInactive
              ]}>
                <TIcon size={aktivan ? 20 : 18} color={aktivan ? '#000' : BOJE.textMuted} strokeWidth={aktivan ? 2.5 : 1.8} />
                {aktivan && <Text style={styles.navText}>{tab.label}</Text>}
              </View>
            </TouchableOpacity>
          )
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BOJE.bg },
  mainWrapper: { flex: 1 },
  
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 44 : 16, paddingBottom: 14, zIndex: 10, backgroundColor: 'rgba(4, 4, 8, 0.96)', borderBottomWidth: 1, borderColor: BOJE.border, shadowColor: '#000', shadowOpacity: 0.55, shadowRadius: 12, elevation: 8 },
  
  levelContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: BOJE.slotOkvirZlato, borderRadius: 26, padding: 6, marginBottom: 10, borderWidth: 1, borderColor: BOJE.border },
  levelBadgeOuter: { width: Math.round(34 * uiScale), height: Math.round(34 * uiScale), borderRadius: Math.round(17 * uiScale), backgroundColor: BOJE.xp, justifyContent: 'center', alignItems: 'center', shadowColor: BOJE.xp, shadowOpacity: 0.8, shadowRadius: 6, elevation: 5 },
  prestigeBadgeOuter: { width: Math.round(34 * uiScale), height: Math.round(34 * uiScale), borderRadius: Math.round(17 * uiScale), backgroundColor: BOJE.prestige, justifyContent: 'center', alignItems: 'center', shadowColor: BOJE.prestige, shadowOpacity: 0.8, shadowRadius: 6, elevation: 5, marginLeft: 6, flexDirection: 'row' },
  levelBadgeTxt: { color: '#000', fontWeight: '900', fontSize: Math.round(16 * uiScale) },
  xpBarContainer: { flex: 1, height: Math.round(18 * uiScale), backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: Math.round(9 * uiScale), marginHorizontal: 10, overflow: 'hidden', justifyContent: 'center' },
  xpBarFill: { position: 'absolute', height: '100%', backgroundColor: BOJE.xp, borderRadius: Math.round(9 * uiScale) },
  xpText: { position: 'absolute', width: '100%', textAlign: 'center', color: '#FFF', fontSize: Math.round(10 * uiScale), fontWeight: '800', textShadowColor: '#000', textShadowRadius: 2 },
  multiplierBadge: { backgroundColor: BOJE.xp, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center', shadowColor: BOJE.xp, shadowOpacity: 0.4, shadowRadius: 6, elevation: 3 },
  multiplierTxt: { color: '#000', fontSize: Math.round(11 * uiScale), fontWeight: '900' },

  headerMainStats: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  statChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: BOJE.bgCard, borderRadius: 16, borderWidth: 1, borderColor: BOJE.border, height: Math.round(40 * uiScale), gap: 6 },
  statChipTxt: { fontSize: Math.round(15 * uiScale), fontWeight: '800', color: BOJE.textMain },
  
  resourceHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 8 },
  resMiniChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: BOJE.bgCard, paddingVertical: Math.round(6 * uiScale), borderRadius: 12, borderWidth: 1, borderColor: BOJE.border, gap: 6 },
  resChipTxt: { fontSize: Math.round(13 * uiScale), fontWeight: '800', color: BOJE.textMain },
  
  defenseMatrix: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 212, 255, 0.06)', marginTop: 10, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0, 212, 255, 0.25)' },
  defenseTitle: { color: BOJE.stit, fontSize: 12, fontWeight: '900', letterSpacing: 1, marginRight: 12 },
  shieldSlotsContainer: { flex: 1, flexDirection: 'row', gap: 6 },
  shieldSlot: { flex: 1, height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  shieldActive: { borderColor: BOJE.stit, backgroundColor: 'rgba(0, 212, 255, 0.2)' },
  shieldEmpty: { opacity: 0.5 },
  shieldGlow: { width: '100%', height: '100%', backgroundColor: BOJE.stit, shadowColor: BOJE.stit, shadowOpacity: 1, shadowRadius: 8, elevation: 4 },

  messageBubble: { flexDirection: 'row', backgroundColor: 'rgba(20, 22, 35, 0.98)', paddingHorizontal: 16, paddingVertical: Math.round(14 * uiScale), borderRadius: 18, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,51,0,0.35)', alignItems: 'center', justifyContent: 'center', shadowColor: BOJE.slotVatra, shadowOpacity: 0.45, shadowRadius: 14, elevation: 7 },
  messageText: { color: BOJE.slotVatra, fontSize: Math.round(13 * uiScale), fontWeight: '900', letterSpacing: 1 },
  
  content: { flex: 1, paddingHorizontal: 14 },
  scrollContent: { paddingBottom: 120, paddingTop: 10 }, 

  gameContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 60 },
  
  slotMachineOuter: { backgroundColor: '#080A12', padding: 10, borderRadius: 28, borderWidth: 2, borderColor: 'rgba(255,255,255,0.10)', width: '100%', marginBottom: 26, shadowColor: BOJE.slotVatra, shadowOffset: {width: 0, height: 12}, shadowOpacity: 0.30, shadowRadius: 40, elevation: 20 },
  slotMachineInner: { backgroundColor: BOJE.slotRolaCrna, padding: 10, borderRadius: 20, borderWidth: 2, borderColor: '#000', overflow: 'hidden', position: 'relative' }, 
  gridColumnsWrapper: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  gridColumn: { flex: 1, gap: 6 },
  slotItem: { width: slotSize, height: slotSize, borderRadius: Math.round(16 * uiScale), justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  slotItemWinning: { borderWidth: 3, borderRadius: Math.round(16 * uiScale), shadowOpacity: 1, shadowRadius: 18, elevation: 12, backgroundColor: 'rgba(255,51,0,0.18)' },

  betContainer: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 20 },
  betBtn: { paddingVertical: Math.round(12 * uiScale), paddingHorizontal: Math.round(22 * uiScale), borderRadius: 22, backgroundColor: BOJE.bgCard, borderWidth: 1, borderColor: BOJE.border },
  betBtnActive: { backgroundColor: BOJE.slotVatra, borderColor: BOJE.slotVatra, shadowColor: BOJE.slotVatra, shadowOpacity: 0.6, shadowRadius: 10, elevation: 6 },
  betBtnText: { fontWeight: '900', color: BOJE.textMuted, fontSize: Math.round(16 * uiScale) },
  betBtnTextActive: { color: '#FFF' },
  
  spinBtn: { backgroundColor: BOJE.energija, width: '100%', paddingVertical: Math.round(22 * uiScale), borderRadius: 26, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: BOJE.energija, shadowOpacity: 0.55, shadowRadius: 20, elevation: 12 },
  spinBtnDisabled: { opacity: 0.5, transform: [{scale: 0.98}], shadowOpacity: 0 },
  spinBtnText: { color: '#000', fontSize: Math.round(24 * uiScale), fontWeight: '900', letterSpacing: 3 },
  spinCostBadge: { position: 'absolute', right: 22, backgroundColor: 'rgba(0,0,0,0.18)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  spinCostTxt: { color: '#000', fontWeight: '900', fontSize: 12, marginRight: 2 },

  gambleContainer: { width: '100%', backgroundColor: 'rgba(255, 215, 0, 0.09)', padding: 20, borderRadius: 28, borderWidth: 1, borderColor: BOJE.zlato + '70', alignItems: 'center', shadowColor: BOJE.zlato, shadowOpacity: 0.15, shadowRadius: 14, elevation: 6 },
  gambleTitle: { color: BOJE.textMuted, fontSize: Math.round(14 * uiScale), fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 },
  gamblePrizesRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 20 },
  gamblePrizeTxt: { color: BOJE.zlato, fontSize: Math.round(18 * uiScale), fontWeight: '900', textShadowColor: '#000', textShadowRadius: 5 },
  gambleButtonsRow: { flexDirection: 'row', gap: 12, width: '100%', marginBottom: 14 },
  gambleBtn: { flex: 1, paddingVertical: Math.round(18 * uiScale), borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 },
  gambleBtnTxt: { color: '#FFF', fontSize: Math.round(15 * uiScale), fontWeight: '900', letterSpacing: 1 },
  collectBtn: { backgroundColor: BOJE.energija, width: '100%', paddingVertical: Math.round(18 * uiScale), borderRadius: 18, alignItems: 'center', shadowColor: BOJE.energija, shadowOpacity: 0.35, shadowRadius: 10, elevation: 5 },
  collectBtnTxt: { color: '#000', fontSize: Math.round(16 * uiScale), fontWeight: '900', letterSpacing: 1 },

  subTitle: { fontSize: Math.round(16 * uiScale), fontWeight: '900', color: BOJE.textMain, marginBottom: 16, marginLeft: 4, letterSpacing: 1.2, textTransform: 'uppercase' },

  card: { backgroundColor: BOJE.bgCard, padding: 20, borderRadius: 24, marginBottom: 14, borderWidth: 1, borderColor: BOJE.border, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: {width: 0, height: 4}, elevation: 5 },
  cardMaxed: { borderColor: BOJE.zlato + '40', backgroundColor: BOJE.zlato + '08' },
  cardDamaged: { borderColor: BOJE.slotVatra, backgroundColor: 'rgba(255, 51, 0, 0.06)', shadowColor: BOJE.slotVatra, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  iconBadge: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  zgradaIconBg: { width: 56, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  cardTitle: { fontSize: Math.round(17 * uiScale), fontWeight: '800', color: BOJE.textMain },
  levelBadge: { backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  buildCardLevel: { fontSize: Math.round(12 * uiScale), fontWeight: '900', color: BOJE.textMuted },
  perkText: { fontSize: Math.round(13 * uiScale), fontWeight: '600', color: BOJE.xp, marginTop: 6 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: BOJE.border, paddingTop: 14 },
  
  repairBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: BOJE.slotVatra, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 8, marginRight: 4 },
  repairBadgeTxt: { color: '#FFF', fontSize: 10, fontWeight: '900', marginLeft: 4 },

  actionBtn: { paddingHorizontal: Math.round(20 * uiScale), paddingVertical: Math.round(12 * uiScale), borderRadius: 14 },
  actionBtnTxt: { color: '#000', fontWeight: '900', fontSize: Math.round(13 * uiScale), letterSpacing: 0.5 },
  maxTxt: { color: BOJE.zlato, fontWeight: '800', fontSize: Math.round(13 * uiScale), letterSpacing: 1 },
  
  missionProgressContainer: { width: '100%', height: 6, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 3, marginTop: 10, overflow: 'hidden' },
  missionProgressBar: { height: '100%', borderRadius: 3 },
  missionProgressTxt: { color: BOJE.textMuted, fontSize: 11, fontWeight: '800', marginTop: 4, textAlign: 'right' },
  rewardChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 8 },
  rewardTxt: { fontSize: 12, fontWeight: '900', marginLeft: 4 },

  costRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', flex: 1, paddingRight: 10, alignItems: 'center' },
  costPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
  costPillMissing: { backgroundColor: BOJE.slotVatra + '15' },
  costTxt: { fontSize: 13, fontWeight: '800', color: BOJE.textMain },
  costMissing: { color: BOJE.slotVatra },

  marketActionRow: { flexDirection: 'row', gap: 12 },
  tradeBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: BOJE.border },
  tradeBtnTxt: { fontWeight: '900', fontSize: 14, marginBottom: 4, letterSpacing: 0.5 },
  tradePriceTxt: { fontWeight: '700', fontSize: 13, color: BOJE.textMuted },
  paketText: { fontSize: 13, color: BOJE.textMuted, fontWeight: '600' },
  upgradeDesc: { fontSize: 13, fontWeight: '500', color: BOJE.textMuted, marginTop: 6, lineHeight: 18 },
  
  trendBadge: { padding: 4, borderRadius: 8 },

  floatingNavbar: { position: 'absolute', bottom: Platform.OS === 'ios' ? 28 : 16, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', backgroundColor: BOJE.navBg, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 32, borderWidth: 1, borderColor: BOJE.border, shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 24, elevation: 18 },
  navBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 2 },
  navTabPill: { height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  navTabPillInactive: { width: 44, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  navTabPillActive: { paddingHorizontal: 14, shadowOpacity: 0.55, shadowRadius: 12, elevation: 6, transform: [{ translateY: -2 }] },
  navText: { fontSize: Math.round(11 * uiScale), fontWeight: '900', letterSpacing: 0.5, color: '#000', marginLeft: 5 },

  pageIndicatorRow: { position: 'absolute', bottom: Platform.OS === 'ios' ? 100 : 88, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, zIndex: 15 },
  pageIndicatorDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.18)' },
  pageIndicatorDotActive: { width: 18, height: 5, borderRadius: 2.5, backgroundColor: BOJE.energija, shadowColor: BOJE.energija, shadowOpacity: 0.9, shadowRadius: 6, elevation: 3 },

  // Daily bonus modal
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', alignItems: 'center', zIndex: 200, paddingHorizontal: 24 },
  modalCard: { backgroundColor: '#0C0E1C', borderRadius: 32, padding: 28, width: '100%', borderWidth: 1, borderColor: BOJE.zlato + '70', alignItems: 'center', shadowColor: BOJE.zlato, shadowOpacity: 0.35, shadowRadius: 28, elevation: 24 },
  modalTitle: { fontSize: Math.round(24 * uiScale), fontWeight: '900', color: BOJE.zlato, letterSpacing: 2, marginBottom: 8 },
  modalSubtitle: { fontSize: Math.round(13 * uiScale), color: BOJE.textMuted, fontWeight: '700', marginBottom: 20, letterSpacing: 1 },
  dnevnaStreakRow: { flexDirection: 'row', gap: 6, marginBottom: 24, flexWrap: 'wrap', justifyContent: 'center' },
  dnevniDanBadge: { width: 38, height: 38, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  dnevniDanAktivan: { backgroundColor: BOJE.zlato + '35', borderColor: BOJE.zlato, shadowColor: BOJE.zlato, shadowOpacity: 0.65, shadowRadius: 8, elevation: 5 },
  dnevniDanPreuzet: { backgroundColor: BOJE.xp + '20', borderColor: BOJE.xp + '60' },
  dnevniDanBroj: { color: BOJE.textMain, fontSize: Math.round(13 * uiScale), fontWeight: '900' },
  modalNagradeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginBottom: 28 },
  modalNagradaTxt: { fontSize: Math.round(22 * uiScale), fontWeight: '900', color: BOJE.zlato, textShadowColor: '#000', textShadowRadius: 5 },
  modalBtn: { backgroundColor: BOJE.zlato, width: '100%', paddingVertical: Math.round(18 * uiScale), borderRadius: 20, alignItems: 'center', shadowColor: BOJE.zlato, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  modalBtnTxt: { color: '#000', fontSize: Math.round(18 * uiScale), fontWeight: '900', letterSpacing: 2 },

  // Tab switcher (missions/achievements)
  tabSwitcher: { flexDirection: 'row', backgroundColor: BOJE.bgCard, borderRadius: 18, padding: 4, marginTop: 10, marginBottom: 4, borderWidth: 1, borderColor: BOJE.border },
  tabSwitchBtn: { flex: 1, paddingVertical: 11, borderRadius: 14, alignItems: 'center' },
  tabSwitchActive: { backgroundColor: 'rgba(255,255,255,0.09)' },
  tabSwitchTxt: { fontSize: Math.round(13 * uiScale), fontWeight: '900', color: BOJE.textMuted, letterSpacing: 0.5 },

  // Stats summary row
  statsSummaryRow: { flexDirection: 'row', gap: 8, marginBottom: 16, marginTop: 6 },
  statsSummaryChip: { flex: 1, backgroundColor: BOJE.bgCard, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: BOJE.border, alignItems: 'center' },
  statsSummaryLabel: { fontSize: 10, fontWeight: '700', color: BOJE.textMuted, marginBottom: 4, textAlign: 'center' },
  statsSummaryValue: { fontSize: 16, fontWeight: '900', color: BOJE.textMain },

  // Lucky Spin meter
  luckySpinRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  luckySpinMeter: { flex: 1, height: 8, backgroundColor: 'rgba(0,255,170,0.1)', borderRadius: 4, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,255,170,0.2)' },
  luckySpinFill: { height: '100%', backgroundColor: BOJE.xp, borderRadius: 4 },
  luckySpinTxt: { fontSize: 12, fontWeight: '900', color: BOJE.textMuted, minWidth: 64, textAlign: 'right' },

  // Win streak & turbo row
  streakTurboRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 12, gap: 8 },
  streakBadge: { flex: 1, backgroundColor: 'rgba(255, 100, 0, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 100, 0, 0.4)' },
  streakTxt: { color: '#FF8C00', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  turboBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: BOJE.bgCard, borderWidth: 1, borderColor: BOJE.border },
  turboBtnActive: { backgroundColor: BOJE.energija, borderColor: BOJE.energija },
  turboTxt: { fontSize: 11, fontWeight: '900', color: BOJE.textMuted, letterSpacing: 0.5 },

  // Lucky spin variant of spin button
  spinBtnLucky: { backgroundColor: BOJE.xp, shadowColor: BOJE.xp, shadowOpacity: 0.6, shadowRadius: 22, elevation: 14 },
});
