import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TouchableOpacity, ScrollView, StyleSheet, 
  Animated, SafeAreaView, Platform, Dimensions, ActivityIndicator, StatusBar, Easing
} from 'react-native';
import { 
  Zap, Shield, Wrench, Map, Store, Gem, TreePine, Mountain, 
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
    { opis: 'Prikupi 1000 zlata', tip: 'zlato', cilj: 1000, nagrada: { energija: 30 } },
    { opis: 'Prikupi 2500 zlata', tip: 'zlato', cilj: 2500, nagrada: { energija: 80 } },
    { opis: 'Izgradi/Nadogradi zgradu', tip: 'zgrada', cilj: 1, nagrada: { dijamanti: 3, zlato: 500 } },
    { opis: 'Kupi ili nadogradi opremu', tip: 'oprema', cilj: 1, nagrada: { dijamanti: 3, energija: 50 } },
    { opis: 'Ostvari 5 dobitnih linija', tip: 'dobitak', cilj: 5, nagrada: { drvo: 100, kamen: 100 } }
];

const generirajMisiju = () => {
    const sablon = BAZA_MISIJA[Math.floor(Math.random() * BAZA_MISIJA.length)];
    return { id: Date.now() + Math.random(), ...sablon, trenutno: 0, zavrseno: false };
};

const screenWidth = Dimensions.get('window').width;
const slotSize = (screenWidth - 80) / 5; 

const delay = ms => new Promise(res => setTimeout(res, ms));

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

  const [tecaj, setTecaj] = useState(BAZA_TECAJ);
  const [trend, setTrend] = useState({ drvo: 0, kamen: 0, zeljezo: 0, dijamant: 0 });

  const [simboli, setSimboli] = useState(Array(15).fill('gold'));
  const [vrti, setVrti] = useState(false);
  const [ulog, setUlog] = useState(1);
  const [dobitnaPolja, setDobitnaPolja] = useState([]);
  const [poruka, setPoruka] = useState('SPREMAN ZA VRTNJU');
  const [dobitakNaCekanju, setDobitakNaCekanju] = useState(null); 
  
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current; 
  const [flashBoja, setFlashBoja] = useState('rgba(0,0,0,0)');

  const stupciAnims = useRef([...Array(5)].map(() => new Animated.Value(0))).current; 
  const stupciBlurs = useRef([...Array(5)].map(() => new Animated.Value(1))).current; 
  const winScaleAnims = useRef([...Array(15)].map(() => new Animated.Value(1))).current; 

  const maxEnergija = 100 + ((razine.baterija||0) * 50);
  const maxStitova = 1 + (razine.oklop||0);
  const sansaZaDobitak = 0.25 + ((razine.sreca||0) * 0.03); 
  const potrebanXp = Math.floor(100 * Math.pow(1.3, igracRazina - 1)); 
  
  const prestigeMnožitelj = 1 + (prestigeRazina * 0.5);
  const pasivniMnožitelj = (1 + (igracRazina * 0.05)) * prestigeMnožitelj; 

  useEffect(() => {
    const ucitaj = async () => {
      try {
        const p = await AsyncStorage.getItem('@save_game_eco_v29'); 
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
        }
      } catch (e) { console.error(e); } finally { setUcitavam(false); }
    };
    ucitaj();
  }, []);

  useEffect(() => {
    if(ucitavam) return;
    const spremi = async () => {
      try { await AsyncStorage.setItem('@save_game_eco_v29', JSON.stringify({ igracRazina, prestigeRazina, xp, energija, zlato, dijamanti, resursi, gradevine, ostecenja, razine, stitovi, misije, tecaj, trend })); } 
      catch (e) { }
    };
    spremi();
  }, [igracRazina, prestigeRazina, xp, energija, zlato, dijamanti, resursi, gradevine, ostecenja, razine, stitovi, misije, tecaj, trend, ucitavam]);

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
    if (vrti || energija < ulog) { 
      if(!vrti) setPoruka('NEDOVOLJNO ENERGIJE'); 
      return; 
    }
    
    setEnergija(e => e - ulog);
    azurirajMisiju('spin'); 
    let dobijeniXp = ulog * 2; 
    
    setVrti(true); 
    setDobitnaPolja([]); 
    setPoruka('VRTNJA...');

    winScaleAnims.forEach(anim => anim.setValue(1));
    stupciAnims.forEach(anim => { anim.setValue(0); });
    
    Animated.parallel(
      stupciAnims.map((anim, i) => 
        Animated.loop(Animated.timing(anim, { toValue: 300, duration: 250, easing: Easing.linear, useNativeDriver: true }))
      ).concat(stupciBlurs.map((anim) => Animated.timing(anim, { toValue: 0.3, duration: 200, useNativeDriver: true })))
    ).start();

    await delay(600); 
    
    try {
        let noviSimboli = Array(15).fill(null).map(() => SVO_BLAGO[Math.floor(Math.random() * SVO_BLAGO.length)]);
        
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
            await delay(250); 
        }

        await delay(300); 

        let ukupnoZlato = 0, ukupnoDijamanata = 0, ukupnoEnergije = 0, ukupnoStitova = 0;
        let resursiDobitak = { drvo: 0, kamen: 0, zeljezo: 0 };
        let dobijenaPoljaPrivremena = [];
        let linijaDobitnih = 0;

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
                const detalji = isAllWilds ? BLAGO['gem'] : BLAGO[targetSymbol];
                const multiplier = consecutiveCount === 5 ? 15 : (consecutiveCount === 4 ? 4 : 1);
                dobijeniXp += (consecutiveCount * ulog * 3);

                if (targetSymbol === 'shield' && !isAllWilds) {
                    ukupnoStitova += (ulog >= 10 ? 2 : 1) * (consecutiveCount - 2); 
                } else if (targetSymbol === 'energy' && !isAllWilds) {
                    ukupnoEnergije += Math.floor(detalji.baza * ulog * 0.5 * multiplier * prestigeMnožitelj);
                } else if (targetSymbol === 'gem' || isAllWilds) {
                    ukupnoDijamanata += Math.max(1, Math.floor((isAllWilds ? 5 : detalji.baza) * (ulog * 0.1) * multiplier * prestigeMnožitelj));
                } else {
                    const kolicina = Math.floor(detalji.baza * ulog * multiplier * (1 + (razine.pojacalo || 0) * 0.1) * prestigeMnožitelj);
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
            
            setDobitakNaCekanju({
                zlato: ukupnoZlato, dijamanti: ukupnoDijamanata, energija: ukupnoEnergije,
                stitovi: ukupnoStitova, drvo: resursiDobitak.drvo, kamen: resursiDobitak.kamen,
                zeljezo: resursiDobitak.zeljezo, linije: linijaDobitnih
            });

            setPoruka('DOBITAK! PREUZMI ILI DUPLAJ!');

        } else if (brojLubanja >= 3) {
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
        setPoruka(`${zgrada.naziv.toUpperCase()} NADOGRAĐEN!`); 
    } else setPoruka("FALE RESURSI ZA NADOGRADNJU");
  };

  const izvrsiPrestige = () => {
    setPrestigeRazina(p => p + 1);
    setIgracRazina(1);
    setXp(0);
    setGradevine({ pilana: 0, kamenolom: 0, rudnik: 0 });
    setOstecenja({ pilana: false, kamenolom: false, rudnik: false });
    setResursi({ drvo: 0, kamen: 0, zeljezo: 0 });
    setZlato(50);
    setEnergija(10);
    setPoruka(`PRESTIGE USPJEŠAN! NOVI MNOŽITELJ x${1 + ((prestigeRazina + 1) * 0.5)}`);
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

      <Animated.View style={[styles.mainWrapper, { transform: [{ translateX: shakeAnim }] }]}>
        
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
                    <View style={styles.betContainer}>
                       {[1, 10, 20, 50].map(op => (
                           <TouchableOpacity activeOpacity={0.7} key={op} onPress={() => setUlog(op)} style={[styles.betBtn, ulog === op && styles.betBtnActive]}><Text style={[styles.betBtnText, ulog === op && styles.betBtnTextActive]}>x{op}</Text></TouchableOpacity>
                       ))}
                    </View>
                    <TouchableOpacity activeOpacity={0.8} style={[styles.spinBtn, (vrti || energija < ulog) && styles.spinBtnDisabled]} onPress={zavrtiMasinu} disabled={vrti}>
                        <Zap size={24} color="#000" fill="#000" style={{position: 'absolute', left: 24}} /><Text style={styles.spinBtnText}>{vrti ? 'VRTIM...' : 'SPIN'}</Text>
                        <View style={styles.spinCostBadge}><Text style={styles.spinCostTxt}>-{ulog}</Text><Zap size={10} color="#000" fill="#000" /></View>
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
               {id:'oklop', n:'Čelični Štit', d: '+1 Dodatni slot za obranu baze.', ikona: Shield, cZlato: 1200, cKamen: 50, cZeljezo: 200}
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

      <View style={styles.floatingNavbar}>
        {[
          { id: 'automat', ikona: Zap, label: 'IGRAJ' },
          { id: 'selo', ikona: Map, label: 'BAZA' },
          { id: 'misije', ikona: Target, label: 'ZADACI' },
          { id: 'trgovina', ikona: Store, label: 'TRŽIŠTE' },
          { id: 'nadogradnje', ikona: Wrench, label: 'OPREMA' }
        ].map(tab => {
          const aktivan = pogled === tab.id;
          const TIcon = tab.ikona;
          return (
            <TouchableOpacity activeOpacity={0.6} key={tab.id} onPress={() => setPogled(tab.id)} style={styles.navBtn}>
              <View style={[styles.navIconContainer, aktivan && styles.navIconActive]}>
                <TIcon size={22} color={aktivan ? '#FFF' : BOJE.textMuted} strokeWidth={aktivan ? 2.5 : 2} />
              </View>
              {aktivan && <Text style={[styles.navText, {color: '#FFF'}]}>{tab.label}</Text>}
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
  
  header: { padding: 16, paddingTop: Platform.OS === 'android' ? 44 : 20, zIndex: 10, backgroundColor: 'rgba(5, 5, 10, 0.85)', borderBottomWidth: 1, borderColor: BOJE.border },
  
  levelContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: BOJE.slotOkvirZlato, borderRadius: 24, padding: 6, marginBottom: 12, borderWidth: 1, borderColor: BOJE.border },
  levelBadgeOuter: { width: 34, height: 34, borderRadius: 17, backgroundColor: BOJE.xp, justifyContent: 'center', alignItems: 'center', shadowColor: BOJE.xp, shadowOpacity: 0.8, shadowRadius: 5, elevation: 4 },
  prestigeBadgeOuter: { width: 34, height: 34, borderRadius: 17, backgroundColor: BOJE.prestige, justifyContent: 'center', alignItems: 'center', shadowColor: BOJE.prestige, shadowOpacity: 0.8, shadowRadius: 5, elevation: 4, marginLeft: 6, flexDirection: 'row' },
  levelBadgeTxt: { color: '#000', fontWeight: '900', fontSize: 16 },
  xpBarContainer: { flex: 1, height: 18, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 9, marginHorizontal: 10, overflow: 'hidden', justifyContent: 'center' },
  xpBarFill: { position: 'absolute', height: '100%', backgroundColor: BOJE.xp, borderRadius: 9 },
  xpText: { position: 'absolute', width: '100%', textAlign: 'center', color: '#FFF', fontSize: 10, fontWeight: '800', textShadowColor: '#000', textShadowRadius: 2 },
  multiplierBadge: { backgroundColor: BOJE.xp, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  multiplierTxt: { color: '#000', fontSize: 11, fontWeight: '900' },

  headerMainStats: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  statChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: BOJE.bgCard, borderRadius: 16, borderWidth: 1, borderColor: BOJE.border, height: 38 },
  statChipTxt: { fontSize: 15, fontWeight: '800', color: BOJE.textMain, marginLeft: 6 },
  
  resourceHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 8 },
  resMiniChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: BOJE.bgCard, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: BOJE.border },
  resChipTxt: { fontSize: 13, fontWeight: '800', color: BOJE.textMain, marginLeft: 6 },
  
  defenseMatrix: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 212, 255, 0.05)', marginTop: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0, 212, 255, 0.2)' },
  defenseTitle: { color: BOJE.stit, fontSize: 12, fontWeight: '900', letterSpacing: 1, marginRight: 12 },
  shieldSlotsContainer: { flex: 1, flexDirection: 'row', gap: 6 },
  shieldSlot: { flex: 1, height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  shieldActive: { borderColor: BOJE.stit, backgroundColor: 'rgba(0, 212, 255, 0.2)' },
  shieldEmpty: { opacity: 0.5 },
  shieldGlow: { width: '100%', height: '100%', backgroundColor: BOJE.stit, shadowColor: BOJE.stit, shadowOpacity: 1, shadowRadius: 8, elevation: 4 },

  messageBubble: { flexDirection: 'row', backgroundColor: BOJE.bgCard, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: BOJE.border, alignItems: 'center', justifyContent: 'center', shadowColor: BOJE.slotVatra, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  messageText: { color: BOJE.slotVatra, fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  
  content: { flex: 1, paddingHorizontal: 16 },
  scrollContent: { paddingBottom: 120, paddingTop: 10 }, 

  gameContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 60 },
  
  slotMachineOuter: { backgroundColor: '#0D0F17', padding: 8, borderRadius: 24, borderWidth: 2, borderColor: '#222533', width: '100%', marginBottom: 32, shadowColor: BOJE.slotVatra, shadowOffset: {width: 0, height: 10}, shadowOpacity: 0.2, shadowRadius: 30, elevation: 15 },
  slotMachineInner: { backgroundColor: BOJE.slotRolaCrna, padding: 10, borderRadius: 16, borderWidth: 2, borderColor: '#000', overflow: 'hidden', position: 'relative' }, 
  gridColumnsWrapper: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  gridColumn: { flex: 1, gap: 6 },
  slotItem: { width: slotSize, height: slotSize, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  slotItemWinning: { borderWidth: 3, borderRadius: 16, shadowOpacity: 1, shadowRadius: 15, elevation: 10, backgroundColor: 'rgba(255,51,0,0.15)' },

  betContainer: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 24 },
  betBtn: { paddingVertical: 12, paddingHorizontal: 22, borderRadius: 20, backgroundColor: BOJE.bgCard, borderWidth: 1, borderColor: BOJE.border },
  betBtnActive: { backgroundColor: BOJE.slotVatra, borderColor: BOJE.slotVatra, shadowColor: BOJE.slotVatra, shadowOpacity: 0.5, shadowRadius: 8 },
  betBtnText: { fontWeight: '900', color: BOJE.textMuted, fontSize: 16 },
  betBtnTextActive: { color: '#FFF' },
  
  spinBtn: { backgroundColor: BOJE.energija, width: '100%', paddingVertical: 22, borderRadius: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: BOJE.energija, shadowOpacity: 0.4, shadowRadius: 15, elevation: 8 },
  spinBtnDisabled: { opacity: 0.5, transform: [{scale: 0.98}], shadowOpacity: 0 },
  spinBtnText: { color: '#000', fontSize: 24, fontWeight: '900', letterSpacing: 2 },
  spinCostBadge: { position: 'absolute', right: 24, backgroundColor: 'rgba(0,0,0,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  spinCostTxt: { color: '#000', fontWeight: '900', fontSize: 12, marginRight: 2 },

  gambleContainer: { width: '100%', backgroundColor: 'rgba(255, 215, 0, 0.08)', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: BOJE.zlato + '60', alignItems: 'center' },
  gambleTitle: { color: BOJE.textMuted, fontSize: 14, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
  gamblePrizesRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 20 },
  gamblePrizeTxt: { color: BOJE.zlato, fontSize: 18, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 5 },
  gambleButtonsRow: { flexDirection: 'row', gap: 12, width: '100%', marginBottom: 16 },
  gambleBtn: { flex: 1, paddingVertical: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 10, elevation: 6 },
  gambleBtnTxt: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  collectBtn: { backgroundColor: BOJE.energija, width: '100%', paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  collectBtnTxt: { color: '#000', fontSize: 16, fontWeight: '900', letterSpacing: 1 },

  subTitle: { fontSize: 16, fontWeight: '900', color: BOJE.textMain, marginBottom: 16, marginLeft: 4, letterSpacing: 1, textTransform: 'uppercase' },

  card: { backgroundColor: BOJE.bgCard, padding: 20, borderRadius: 24, marginBottom: 16, borderWidth: 1, borderColor: BOJE.border },
  cardMaxed: { borderColor: BOJE.zlato + '40', backgroundColor: BOJE.zlato + '08' },
  cardDamaged: { borderColor: BOJE.slotVatra, backgroundColor: 'rgba(255, 51, 0, 0.05)', shadowColor: BOJE.slotVatra, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  iconBadge: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  zgradaIconBg: { width: 56, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: BOJE.textMain },
  levelBadge: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  buildCardLevel: { fontSize: 12, fontWeight: '900', color: BOJE.textMuted },
  perkText: { fontSize: 13, fontWeight: '600', color: BOJE.xp, marginTop: 6 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: BOJE.border, paddingTop: 16 },
  
  repairBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: BOJE.slotVatra, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 8, marginRight: 4 },
  repairBadgeTxt: { color: '#FFF', fontSize: 10, fontWeight: '900', marginLeft: 4 },

  actionBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14 },
  actionBtnTxt: { color: '#000', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },
  maxTxt: { color: BOJE.zlato, fontWeight: '800', fontSize: 13, letterSpacing: 1 },
  
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

  floatingNavbar: { position: 'absolute', bottom: Platform.OS === 'ios' ? 30 : 20, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-evenly', backgroundColor: BOJE.navBg, paddingVertical: 14, borderRadius: 28, borderWidth: 1, borderColor: BOJE.border },
  navBtn: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', paddingHorizontal: 6 },
  navIconContainer: { marginRight: 4 },
  navIconActive: { },
  navText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 }
});
