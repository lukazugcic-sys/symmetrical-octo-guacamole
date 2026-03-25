import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TouchableOpacity, ScrollView, StyleSheet, 
  Animated, SafeAreaView, Platform, Dimensions 
} from 'react-native';
import { 
  Zap, Circle, Play, Hammer, Shield, 
  Wrench, Flame, Star, Crown, Map, BarChart2, Timer, Crosshair, Book
} from 'lucide-react-native';
import { Audio } from 'expo-av';

const VRIJEDNOST_SIMBOLA = {
  '💀': 0, '🍎': 1, '⭐': 2, '🔥': 3, '⚡': 4, 
  '🍀': 5, '🎁': 8, '🔔': 10, '📦': 15, '💎': 20
};
const SIMBOLI = Object.keys(VRIJEDNOST_SIMBOLA);

// --- SETOVI KARATA ---
const SETOVI_KARATA = [
  { id: 'ratnici', naziv: 'Ratnici', nagradaEnergija: 100, nagradaBodovi: 1500, karte: ['⚔️', '🛡️', '🏹'] },
  { id: 'magija', naziv: 'Tajne Magije', nagradaEnergija: 250, nagradaBodovi: 3000, karte: ['🔮', '📜', '🪄'] },
  { id: 'kraljevstvo', naziv: 'Kraljevstvo', nagradaEnergija: 600, nagradaBodovi: 8000, karte: ['👑', '💍', '🪙'] }
];

const BOJE = {
  bgSl: '#f1f5f9', bgCard: '#ffffff', bgLight: '#e2e8f0', 
  textMain: '#1e293b', textMuted: '#64748b', koloBg: '#1e293b', 
  slotBg: '#0f172a', slotValueText: '#cbd5e1', koloHighlight: 'rgba(245, 158, 11, 0.2)', 
  bodovi: '#f59e0b', energija: '#0891b2', zdravlje: '#ef4444', 
  siva: '#94a3b8', dvorac: '#8b5cf6', vatra: '#fb923c', zlato: '#fcd34d',
  statistika: '#3b82f6', vjestina: '#10b981', karte: '#ec4899'
};

const OPCIJE_ULOGA = [1, 2, 5, 10, 25, 50, 100];
const delay = ms => new Promise(res => setTimeout(res, ms));
const screenWidth = Dimensions.get('window').width;

const ZGRADE = [
  { id: 'zidine', naziv: 'Obrambene Zidine', maxLv: 4, baznaCijena: 150, ikona: <Shield size={24} color="#64748b" /> },
  { id: 'kula', naziv: 'Čarobna Kula', maxLv: 4, baznaCijena: 250, ikona: <Zap size={24} color="#0ea5e9" /> },
  { id: 'kovacnica', naziv: 'Kovačnica Oružja', maxLv: 4, baznaCijena: 400, ikona: <Hammer size={24} color="#f59e0b" /> },
  { id: 'prijestolje', naziv: 'Zlatno Prijestolje', maxLv: 4, baznaCijena: 600, ikona: <Crown size={24} color="#fcd34d" /> }
];

export default function App() {
  const [pogled, setPogled] = useState('igra');
  const [energija, setEnergija] = useState(100); 
  const [bodovi, setBodovi] = useState(500); 
  const [zdravlje, setZdravlje] = useState(5);
  const [grid, setGrid] = useState(Array(15).fill('⭐'));
  
  const [vrtiSe, setVrtiSe] = useState(false);
  const [ulog, setUlog] = useState(10);
  const [dobitniIndeksi, setDobitniIndeksi] = useState([]);
  const [poruka, setPoruka] = useState('Sreća je na tvojoj strani!');

  const [razine, setRazine] = useState({ skupljac: 0, pojacalo: 0, baterija: 0, oklop: 0 });
  const maxEnergija = 100 + (razine.baterija * 50);
  const maxZdravlje = 5 + razine.oklop;

  const [nizGubitaka, setNizGubitaka] = useState(0);
  const MAX_GUBITAKA_ZA_PITY = 3; 
  const baznaSansa = 0.45;
  const ukupnaSansaZaDobitak = baznaSansa + (razine.skupljac * 0.05);

  const [dogadaj, setDogadaj] = useState(null);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Sustav Radionice (Mini-igra vještine)
  const [toplina, setToplina] = useState(0); 
  const [napredak, setNapredak] = useState(0);
  const [aktivniPosao, setAktivniPosao] = useState(null);
  const [miniIgra, setMiniIgra] = useState(null);
  const cursorAnim = useRef(new Animated.Value(0)).current;
  const [rezultatMiniIgre, setRezultatMiniIgre] = useState(null);

  // --- NOVI SUSTAV: KOLEKCIJA KARATA ---
  const [kolekcija, setKolekcija] = useState([]); // Niz znakova (karata) koje igrač posjeduje
  const [preuzetiSetovi, setPreuzetiSetovi] = useState([]); // Niz ID-eva preuzetih setova
  const [prikazKarte, setPrikazKarte] = useState(null); // Karta koja se upravo prikazuje preko ekrana

  const [dvoracNivo, setDvoracNivo] = useState(1);
  const [gradevine, setGradevine] = useState({ zidine: 0, kula: 0, kovacnica: 0, prijestolje: 0 });

  const pustiZvuk = async (tip) => {
    try {
      let z;
      switch(tip) {
        case 'klik': z = require('./assets/klik.mp3'); break;
        case 'spin': z = require('./assets/spin.mp3'); break;
        case 'dobitak': z = require('./assets/dobitak.mp3'); break;
        case 'steta': z = require('./assets/steta.mp3'); break;
        case 'gradnja': z = require('./assets/gradnja.mp3'); break;
        case 'levelUp': z = require('./assets/levelup.mp3'); break;
        default: return;
      }
      const { sound } = await Audio.Sound.createAsync(z);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) sound.unloadAsync();
      });
    } catch (e) { }
  };

  useEffect(() => {
    const timer = setInterval(() => setEnergija(e => Math.min(maxEnergija, e + 1)), 2000);
    return () => clearInterval(timer);
  }, [maxEnergija]);

  useEffect(() => {
    let interval;
    if (aktivniPosao) interval = setInterval(() => setToplina(t => Math.max(0, t - 2)), 150);
    return () => clearInterval(interval);
  }, [aktivniPosao]);

  useEffect(() => {
    const eventTimer = setInterval(() => {
      setDogadaj(trenutni => {
        if (trenutni) {
          if (trenutni.trajanje <= 1) {
            setPoruka("Događaj je završio. Vraćamo se na normalu.");
            return null; 
          }
          return { ...trenutni, trajanje: trenutni.trajanje - 1 };
        } else {
          if (Math.random() < 0.03) {
            const tip = Math.random() > 0.5 ? 'zetva' : 'kostur';
            if (tip === 'zetva') return { id: 'zetva', naziv: '✨ ZLATNA ŽETVA ✨', opis: 'Svi dobici x2!', trajanje: 45, mnozitelj: 2, stetaMnozitelj: 1, boja: '#f59e0b' };
            else return { id: 'kostur', naziv: '☠️ BIJES KOSTURA ☠️', opis: 'Dobici x3, ali dupla šteta oklopu!', trajanje: 30, mnozitelj: 3, stetaMnozitelj: 2, boja: '#ef4444' };
          }
          return null;
        }
      });
    }, 1000);
    return () => clearInterval(eventTimer);
  }, []);

  const trziEkran = () => {
    pustiZvuk('steta'); 
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
  };

  const promijeniPogled = (novi) => {
    pustiZvuk('klik');
    setPogled(novi);
  };

  const pokreniKupnju = (stavka, trenutnaCijena) => {
      if (bodovi < trenutnaCijena) {
          pustiZvuk('steta');
          setPoruka("Nedovoljno bodova!");
          return;
      }
      pustiZvuk('klik');
      cursorAnim.setValue(0);
      setRezultatMiniIgre(null);
      setMiniIgra({ ...stavka, trenutnaCijena });
      
      Animated.loop(
          Animated.sequence([
              Animated.timing(cursorAnim, { toValue: 100, duration: 600, useNativeDriver: false }),
              Animated.timing(cursorAnim, { toValue: 0, duration: 600, useNativeDriver: false })
          ])
      ).start();
  };

  const zaustaviKazaljku = () => {
      pustiZvuk('klik');
      cursorAnim.stopAnimation(vrijednost => {
          let popust = 0;
          let msg = "";
          let boja = "";
          
          if (vrijednost >= 42 && vrijednost <= 58) {
              popust = 0.5; 
              msg = "SAVRŠEN TAJMING! 50% popusta!";
              boja = "#22c55e";
              pustiZvuk('dobitak');
          } else if (vrijednost >= 25 && vrijednost <= 75) {
              popust = 0.2; 
              msg = "DOBAR REFLEKS! 20% popusta!";
              boja = "#eab308";
              pustiZvuk('levelUp'); 
          } else {
              popust = 0;
              msg = "PROMAŠAJ! Puna cijena.";
              boja = "#ef4444";
              pustiZvuk('steta');
          }

          setRezultatMiniIgre({ msg, boja, popust });
          
          setTimeout(() => {
              const finalnaCijena = Math.floor(miniIgra.trenutnaCijena * (1 - popust));
              setBodovi(b => b - finalnaCijena);
              setAktivniPosao({ ...miniIgra, cijena: finalnaCijena });
              setNapredak(0);
              setToplina(0);
              setPoruka(`Započeta izrada: ${miniIgra.n} za ${finalnaCijena} bodova!`);
              setMiniIgra(null);
              setRezultatMiniIgre(null);
          }, 1800);
      });
  };

  const odustaniOdKupnje = () => {
      pustiZvuk('klik');
      cursorAnim.stopAnimation();
      setMiniIgra(null);
  };

  const nadogradiZgradu = (zgrada) => {
    const trenutniLv = gradevine[zgrada.id];
    if (trenutniLv >= zgrada.maxLv) return;

    const cijena = Math.floor(zgrada.baznaCijena * Math.pow(1.8, trenutniLv) * Math.pow(1.5, dvoracNivo - 1));
    if (bodovi >= cijena) {
        setBodovi(b => b - cijena);
        setGradevine(g => {
            const nove = { ...g, [zgrada.id]: trenutniLv + 1 };
            provjeriPrijelazNivoa(nove);
            return nove;
        });
        pustiZvuk('gradnja'); 
        setPoruka(`Izgrađeno: ${zgrada.naziv} (Lv.${trenutniLv + 1})!`);
    } else {
        pustiZvuk('steta'); 
        setPoruka("Nemaš dovoljno bodova za ovu gradnju!");
    }
  };

  const provjeriPrijelazNivoa = (trenutneGradevine) => {
    const sveNaMaksimumu = ZGRADE.every(z => trenutneGradevine[z.id] === z.maxLv);
    if (sveNaMaksimumu) {
        setTimeout(() => {
            pustiZvuk('levelUp'); 
            setDvoracNivo(n => n + 1);
            setGradevine({ zidine: 0, kula: 0, kovacnica: 0, prijestolje: 0 });
            setPoruka(`NOVO DOBA! Dvorac je unaprijeđen na razinu ${dvoracNivo + 1}!`);
            setEnergija(e => Math.min(maxEnergija, e + 200));
        }, 800);
    }
  };

  const dvoracUkupniNapredak = () => {
    const maxZbroj = ZGRADE.reduce((acc, z) => acc + z.maxLv, 0);
    const trenutniZbroj = Object.values(gradevine).reduce((acc, val) => acc + val, 0);
    return (trenutniZbroj / maxZbroj) * 100;
  };

  const udariCekicem = () => {
    if (!aktivniPosao) return;
    pustiZvuk('gradnja');
    setToplina(t => {
      const nova = Math.min(100, t + 18);
      if (nova > 55) {
        setNapredak(n => {
          const skok = nova > 80 ? 15 : 8; 
          const noviNapredak = n + skok;
          if (noviNapredak >= 100) {
            setTimeout(() => zavrsiPosao(aktivniPosao), 0);
            return 0;
          }
          return noviNapredak;
        });
      }
      return nova;
    });
  };

  const zavrsiPosao = (posao) => {
    if (!posao) return;
    pustiZvuk('levelUp');
    setRazine(r => ({ ...r, [posao.id]: r[posao.id] + 1 }));
    setPoruka(`Unaprijeđeno: ${posao.n}!`);
    if(posao.id === 'baterija') setEnergija(maxEnergija + 50); 
    if(posao.id === 'oklop') setZdravlje(maxZdravlje + 1); 
    setAktivniPosao(null);
    setToplina(0);
    setNapredak(0);
  };

  const prekiniRad = () => {
    if (!aktivniPosao) return;
    pustiZvuk('klik');
    setBodovi(b => b + aktivniPosao.cijena);
    setAktivniPosao(null);
    setNapredak(0);
    setToplina(0);
    setPoruka("Rad prekinut. Bodovi su vraćeni.");
  };

  // --- LOGIKA ZA PREUZIMANJE NAGRADE ZA SET KARATA ---
  const preuzmiNagraduZaSet = (set) => {
      pustiZvuk('levelUp');
      setEnergija(e => Math.min(maxEnergija + 500, e + set.nagradaEnergija));
      setBodovi(b => b + set.nagradaBodovi);
      setPreuzetiSetovi(prev => [...prev, set.id]);
      setPoruka(`Kolekcija "${set.naziv}" dovršena! Osvojio si ogromnu nagradu!`);
  };

  const zavrtiKolo = async () => {
    if (vrtiSe) return;
    if (energija < ulog) {
        pustiZvuk('steta');
        setPoruka('Nemaš dovoljno energije za ovaj ulog!');
        return;
    }

    pustiZvuk('spin'); 
    setEnergija(e => e - ulog);
    setVrtiSe(true);
    setDobitniIndeksi([]);
    setPoruka('Kolo sreće se okreće...');
    
    try {
        let noviGrid = Array(15).fill(null).map(() => SIMBOLI[Math.floor(Math.random() * SIMBOLI.length)]);
        
        const zajamcenDobitak = nizGubitaka >= MAX_GUBITAKA_ZA_PITY;
        const srecaJeProsla = Math.random() < ukupnaSansaZaDobitak;
        
        if (zajamcenDobitak || srecaJeProsla) {
            const dobitniSimboli = SIMBOLI.filter(s => s !== '💀');
            const pobjednickiSimbol = dobitniSimboli[Math.floor(Math.random() * dobitniSimboli.length)];
            const brojIstih = 3 + Math.floor(Math.random() * 3); 
            let middleIndices = [5, 6, 7, 8, 9];
            middleIndices.sort(() => Math.random() - 0.5);
            for (let i = 0; i < brojIstih; i++) {
                noviGrid[middleIndices[i]] = pobjednickiSimbol;
            }
        }

        setGrid(noviGrid);
        await delay(500); 

        let trenutniGrid = [...noviGrid];
        let iteracija = 0;
        let rundaDobitak = 0;
        const trenutniMnoziteljDogadaja = dogadaj ? dogadaj.mnozitelj : 1;
        const trenutniMnoziteljStete = dogadaj ? dogadaj.stetaMnozitelj : 1;

        while (true) {
            const srednjiRed = trenutniGrid.slice(5, 10);
            const counts = srednjiRed.reduce((acc, val) => ({ ...acc, [val]: (acc[val] || 0) + 1 }), {});
            
            let maxCount = 0;
            let winningSymbol = null;
            
            for (const [sym, count] of Object.entries(counts)) {
                if (sym !== '💀' && count > maxCount) {
                    maxCount = count;
                    winningSymbol = sym;
                }
            }

            if (maxCount >= 3) {
                pustiZvuk('dobitak'); 
                if (iteracija === 0) setNizGubitaka(0); 
                
                // KOLEKCIJA: AKO JE IGRAČ DOBIO ŠKRINJE 📦
                if (winningSymbol === '📦') {
                    const sveKarte = SETOVI_KARATA.flatMap(s => s.karte);
                    const novaKarta = sveKarte[Math.floor(Math.random() * sveKarte.length)];
                    
                    setKolekcija(prev => [...prev, novaKarta]);
                    setPrikazKarte(novaKarta);
                    setPoruka(`PRONAŠAO SI ŠKRINJU! Nova karta: ${novaKarta}`);
                    pustiZvuk('levelUp');
                    
                    // Pauziramo igru na 2 sekunde da igrač vidi kartu
                    await delay(2000);
                    setPrikazKarte(null);
                }

                const osnovica = VRIJEDNOST_SIMBOLA[winningSymbol] * maxCount * ulog;
                const bonusRazine = razine.pojacalo * 25;
                const dobitak = (osnovica + bonusRazine) * trenutniMnoziteljDogadaja;
                
                rundaDobitak += dobitak;
                setBodovi(b => b + dobitak); 

                let winIdxs = [];
                for (let i = 0; i < 5; i++) {
                    if (trenutniGrid[5 + i] === winningSymbol) winIdxs.push(5 + i);
                }
                
                setDobitniIndeksi(winIdxs);
                
                if (winningSymbol !== '📦') {
                    let porukaDobitka = `POGODAK! +${dobitak} 🏆 (x${iteracija + 1} Combo)`;
                    if (trenutniMnoziteljDogadaja > 1) porukaDobitka += ` [DOGAĐAJ x${trenutniMnoziteljDogadaja}]`;
                    setPoruka(porukaDobitka);
                }
                
                await delay(700); 

                let gridNakonPopa = [...trenutniGrid];
                winIdxs.forEach(idx => gridNakonPopa[idx] = '✨');
                setGrid(gridNakonPopa);
                
                await delay(300);

                let nextGrid = [...gridNakonPopa];
                winIdxs.forEach(idx => {
                    const gornjiIdx = idx - 5;
                    const donjiIdx = idx + 5;
                    nextGrid[idx] = nextGrid[gornjiIdx]; 
                    nextGrid[gornjiIdx] = SIMBOLI[Math.floor(Math.random() * SIMBOLI.length)]; 
                    nextGrid[donjiIdx] = SIMBOLI[Math.floor(Math.random() * SIMBOLI.length)]; 
                });

                setGrid(nextGrid);
                setDobitniIndeksi([]); 
                trenutniGrid = nextGrid; 
                
                await delay(500); 
                iteracija++;

            } else {
                const brojOsnovnihKostura = srednjiRed.filter(s => s === '💀').length;
                const brojKostura = brojOsnovnihKostura * trenutniMnoziteljStete;
                
                if (iteracija === 0) setNizGubitaka(prev => prev + 1);

                if (brojKostura > 0) {
                    trziEkran(); 
                    setZdravlje(z => {
                        const novoZdravlje = z - brojKostura;
                        if (novoZdravlje <= 0) {
                            setBodovi(b => Math.max(0, Math.floor(b * 0.5)));
                            setPoruka('KOLAPS! Oklop probijen, izgubio si 50% bodova!');
                            return maxZdravlje; 
                        }
                        if (iteracija > 0) setPoruka(`KRAJ NIZA: +${rundaDobitak} bodova. Kostur udara: -${brojKostura} HP!`);
                        else setPoruka(`AU! Kostur ti je oštetio oklop za ${brojKostura}!`);
                        return novoZdravlje;
                    });
                } else {
                    if (iteracija > 0) setPoruka(`KRAJ NIZA! Ukupno osvojeno: +${rundaDobitak} bodova!`);
                    else setPoruka('Zamalo! Pokušaj ponovo.');
                }
                break; 
            }
        }
    } finally {
        setVrtiSe(false);
        setDobitniIndeksi([]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.mainWrapper, { transform: [{ translateX: shakeAnim }] }]}>
        
        {/* OVERLAY ZA PRIKAZ NOVE KARTE */}
        {prikazKarte && (
          <View style={styles.cardOverlay}>
             <Text style={styles.cardOverlayTitle}>OTVORIO SI ŠKRINJU!</Text>
             <View style={styles.cardReveal}>
                <Text style={styles.cardRevealIcon}>{prikazKarte}</Text>
             </View>
             <Text style={styles.cardOverlayDesc}>Nova karta je dodana u tvoju kolekciju!</Text>
          </View>
        )}

        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <View style={styles.statRow}>
              <Zap size={18} color={BOJE.energija} />
              <Text style={[styles.statText, { color: BOJE.energija }]}>{energija}</Text>
            </View>
            <View style={styles.statRow}>
              <Circle size={18} color={BOJE.bodovi} />
              <Text style={[styles.statText, { color: BOJE.bodovi }]}>{bodovi}</Text>
            </View>
          </View>
          <View style={styles.armorContainer}>
            <View style={styles.armorDots}>
              {[...Array(maxZdravlje)].map((_, i) => (
                <View key={i} style={[styles.armorDot, { backgroundColor: i < zdravlje ? '#ef4444' : '#cbd5e1' }]} />
              ))}
            </View>
            <Text style={styles.armorText}>OKLOP</Text>
          </View>
        </View>

        {dogadaj && (
          <View style={[styles.eventBanner, { backgroundColor: dogadaj.boja }]}>
             <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                <Timer size={16} color="#fff" />
                <Text style={styles.eventTitle}>{dogadaj.naziv} ({dogadaj.trajanje}s)</Text>
             </View>
             <Text style={styles.eventDesc}>{dogadaj.opis}</Text>
          </View>
        )}

        <View style={styles.messageArea}>
          <Text style={styles.messageText}>{poruka}</Text>
        </View>

        {/* GLAVNI SADRŽAJ */}
        <View style={styles.content}>
          {pogled === 'igra' && (
            <View style={styles.gameContainer}>
              <View style={[styles.gridContainer, dogadaj && {borderColor: dogadaj.boja, borderWidth: 3}]}>
                {[0, 1, 2].map(r => (
                  <View key={r} style={[styles.gridRow, r === 1 && styles.middleGridRow]}>
                    {grid.slice(r * 5, (r + 1) * 5).map((s, i) => {
                      const apsolutniIndex = r * 5 + i;
                      const jeDobitni = dobitniIndeksi.includes(apsolutniIndex);
                      return (
                        <View key={i} style={[styles.slotItem, jeDobitni && styles.slotItemWinning]}>
                          <Text style={[styles.slotSymbol, { opacity: (vrtiSe && !jeDobitni && r === 1) ? 0.3 : (r !== 1 ? 0.5 : 1) }]}>{s}</Text>
                          {s !== '💀' && s !== '✨' && <Text style={styles.slotValue}>{VRIJEDNOST_SIMBOLA[s]}</Text>}
                          {r === 1 && !vrtiSe && !jeDobitni && <View style={styles.middleHighlightBorder} />}
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>

              <View style={styles.statsContainer}>
                 <View style={styles.statsHeader}>
                    <BarChart2 size={14} color={BOJE.statistika} />
                    <Text style={styles.statsTitle}>PREGLED VJEROJATNOSTI</Text>
                 </View>
                 <View style={styles.statsRow}>
                    <Text style={styles.statsLabel}>Šansa za pobjedu na vrtnji:</Text>
                    <Text style={[styles.statsValue, nizGubitaka >= MAX_GUBITAKA_ZA_PITY && {color: '#22c55e'}]}>
                       {nizGubitaka >= MAX_GUBITAKA_ZA_PITY ? '100' : (ukupnaSansaZaDobitak * 100).toFixed(0)}%
                    </Text>
                 </View>
                 <View style={styles.pityBarContainer}>
                    <View style={styles.pityBarBg}>
                       <View style={[styles.pityBarFill, { width: `${(nizGubitaka / MAX_GUBITAKA_ZA_PITY) * 100}%`, backgroundColor: nizGubitaka >= MAX_GUBITAKA_ZA_PITY ? '#22c55e' : BOJE.statistika }]} />
                    </View>
                    <Text style={styles.pityHelperText}>
                       {nizGubitaka >= MAX_GUBITAKA_ZA_PITY ? "✨ Zajamčen dobitak aktivan! ✨" : `Pokušaja do zajamčenog dobitka: ${MAX_GUBITAKA_ZA_PITY - nizGubitaka}`}
                    </Text>
                 </View>
              </View>

              <View style={styles.betContainer}>
                 <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.betScroll}>
                     {OPCIJE_ULOGA.map(opcija => (
                         <TouchableOpacity key={opcija} onPress={() => { setUlog(opcija); pustiZvuk('klik'); }} disabled={vrtiSe} style={[styles.betBtn, ulog === opcija ? styles.betBtnActive : styles.betBtnInactive]}>
                             <Text style={[styles.betBtnText, ulog === opcija ? styles.betBtnTextActive : styles.betBtnTextInactive]}>{opcija} E</Text>
                         </TouchableOpacity>
                     ))}
                 </ScrollView>
              </View>

              <TouchableOpacity style={[styles.spinBtn, vrtiSe && styles.spinBtnDisabled, dogadaj && {backgroundColor: dogadaj.boja}]} onPress={zavrtiKolo} disabled={vrtiSe} activeOpacity={0.8}>
                  <Star size={24} color={BOJE.zlato} fill={BOJE.zlato} />
                  <Text style={styles.spinBtnText}>{vrtiSe ? 'VRTI SE...' : `ZAVRTI KOLO`}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* NOVI POGLED - KOLEKCIJA KARATA */}
          {pogled === 'karte' && (
            <View style={styles.workshopContainer}>
              <View style={styles.dvoracHeader}>
                <View>
                  <Text style={[styles.dvoracTitle, {color: BOJE.karte}]}>KOLEKCIJA KARATA</Text>
                  <Text style={styles.dvoracSubtitle}>Skupljaj i osvoji!</Text>
                </View>
                <Book size={32} color={BOJE.karte} />
              </View>
              
              <Text style={styles.kolekcijaUputa}>Zavrti kolo, pronađi škrinje (📦) i popuni setove za ogromne nagrade!</Text>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{gap: 16, paddingBottom: 20}}>
                {SETOVI_KARATA.map(set => {
                   const sakupljenoUSetu = set.karte.filter(k => kolekcija.includes(k)).length;
                   const jePun = sakupljenoUSetu === set.karte.length;
                   const jePreuzet = preuzetiSetovi.includes(set.id);

                   return (
                     <View key={set.id} style={[styles.cardSetContainer, jePun && !jePreuzet && styles.cardSetReady]}>
                        <View style={styles.cardSetHeader}>
                           <Text style={styles.cardSetTitle}>{set.naziv}</Text>
                           <Text style={styles.cardSetProgress}>{sakupljenoUSetu} / {set.karte.length}</Text>
                        </View>
                        
                        <View style={styles.cardSlotsRow}>
                           {set.karte.map((karta, idx) => {
                               const posjeduje = kolekcija.includes(karta);
                               return (
                                  <View key={idx} style={[styles.singleCardSlot, posjeduje ? styles.singleCardOwned : styles.singleCardMissing]}>
                                     <Text style={[styles.singleCardIcon, !posjeduje && {opacity: 0.2}]}>{posjeduje ? karta : '❓'}</Text>
                                  </View>
                               );
                           })}
                        </View>

                        {jePun && !jePreuzet && (
                           <TouchableOpacity 
                             style={styles.claimRewardBtn}
                             activeOpacity={0.8}
                             onPress={() => preuzmiNagraduZaSet(set)}
                           >
                              <Text style={styles.claimRewardText}>PREUZMI NAGRADU!</Text>
                              <View style={{flexDirection: 'row', gap: 10, marginTop: 4}}>
                                 <Text style={styles.claimRewardSubText}>+{set.nagradaBodovi} 🏆</Text>
                                 <Text style={styles.claimRewardSubText}>+{set.nagradaEnergija} ⚡</Text>
                              </View>
                           </TouchableOpacity>
                        )}
                        {jePreuzet && (
                           <View style={styles.claimedBadge}>
                              <Text style={styles.claimedBadgeText}>NAGRADA PREUZETA ✓</Text>
                           </View>
                        )}
                     </View>
                   );
                })}
              </ScrollView>
            </View>
          )}

          {pogled === 'radionica' && (
            <View style={styles.workshopContainer}>
              <View style={styles.tabHeader}>
                 <Wrench size={16} color={BOJE.siva} />
                 <Text style={styles.tabHeaderText}>RADIONICA NADOGRADNJI</Text>
              </View>
              
              {miniIgra ? (
                 <View style={styles.miniGameCard}>
                    <View style={styles.miniGameHeader}>
                       <Crosshair size={20} color={BOJE.vjestina} />
                       <Text style={styles.miniGameTitle}>KOVANJE CIJENE</Text>
                    </View>
                    <Text style={styles.miniGameItemName}>{miniIgra.n}</Text>
                    <Text style={styles.miniGameDesc}>Zaustavi alat u sredini za nevjerojatnih 50% popusta na cijenu od {miniIgra.trenutnaCijena} bodova!</Text>
                    
                    <View style={styles.barContainer}>
                        <View style={styles.redZone} />
                        <View style={styles.yellowZone} />
                        <View style={styles.greenZone} />
                        <View style={styles.yellowZone} />
                        <View style={styles.redZone} />
                        <Animated.View style={[styles.cursor, { left: cursorAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '96%'] }) }]} />
                    </View>

                    {!rezultatMiniIgre ? (
                        <TouchableOpacity style={styles.stopSkillBtn} onPress={zaustaviKazaljku}>
                            <Text style={styles.stopSkillBtnText}>UDARI ČEKIĆ!</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.resultContainer}>
                           <Text style={[styles.resultText, { color: rezultatMiniIgre.boja }]}>{rezultatMiniIgre.msg}</Text>
                           {rezultatMiniIgre.popust > 0 && <Text style={styles.savedPointsText}>Ušteda: {Math.floor(miniIgra.trenutnaCijena * rezultatMiniIgre.popust)} bodova</Text>}
                        </View>
                    )}
                    
                    {!rezultatMiniIgre && (
                        <TouchableOpacity style={{marginTop: 15}} onPress={odustaniOdKupnje}>
                            <Text style={styles.cancelWorkText}>Odustani</Text>
                        </TouchableOpacity>
                    )}
                 </View>
              ) : aktivniPosao ? (
                 <View style={styles.activeJobCard}>
                    <Text style={styles.activeJobTitle}>{aktivniPosao.n}</Text>
                    <View style={styles.progressBars}>
                       <Text style={styles.progressLabel}>Intenzitet plamena: {toplina}%</Text>
                       <View style={styles.progressBarBg}>
                          <View style={[styles.progressBarFill, { width: `${toplina}%`, backgroundColor: toplina > 80 ? '#ef4444' : toplina > 55 ? '#f97316' : '#fbbf24' }]} />
                       </View>
                       <Text style={[styles.progressLabel, {marginTop: 10}]}>Napredak izrade: {napredak}%</Text>
                       <View style={styles.progressBarBg}>
                          <View style={[styles.progressBarFill, { width: `${napredak}%`, backgroundColor: '#22c55e' }]} />
                       </View>
                    </View>
                    <TouchableOpacity onPress={udariCekicem} activeOpacity={0.7} style={styles.hammerBtn}>
                       <Hammer size={40} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={prekiniRad} style={{marginTop: 20}}>
                       <Text style={styles.cancelWorkText}>Prekini rad (Vrati bodove)</Text>
                    </TouchableOpacity>
                 </View>
              ) : (
                 <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{gap: 12, paddingBottom: 20}}>
                  {[
                    {id:'skupljac', n:'Magnet Sreće', d: 'Povećava osnovne šanse za dobitak.', osnovnaCijena: 150, ikona: <Star size={20} color={BOJE.zlato}/>},
                    {id:'pojacalo', n:'Super Dobitak', d: 'Uvećava svaku nagradu za +25.', osnovnaCijena: 300, ikona: <Flame size={20} color={BOJE.vatra}/>},
                    {id:'baterija', n:'Baterija', d: 'Povećava max energiju i puni je.', osnovnaCijena: 200, ikona: <Zap size={20} color={BOJE.energija}/>},
                    {id:'oklop', n:'Oklop', d: 'Dodaje +1 max oklop i obnavlja.', osnovnaCijena: 250, ikona: <Shield size={20} color={BOJE.zdravlje}/>}
                  ].map(p => {
                      const trenutnaCijena = Math.floor(p.osnovnaCijena * Math.pow(1.5, razine[p.id]));
                      const mozeKupiti = bodovi >= trenutnaCijena;
                      
                      return (
                          <TouchableOpacity 
                              key={p.id} 
                              activeOpacity={mozeKupiti ? 0.7 : 1}
                              onPress={() => { if (mozeKupiti) pokreniKupnju(p, trenutnaCijena); else { pustiZvuk('steta'); setPoruka("Nedovoljno bodova!"); } }}
                              style={[styles.upgradeCard, !mozeKupiti && {opacity: 0.5}]}
                          >
                              <View style={styles.upgradeIconBg}>{p.ikona}</View>
                              <View style={styles.upgradeInfo}>
                                 <Text style={styles.upgradeTitle}>{p.n} (Lv.{razine[p.id]})</Text>
                                 <Text style={styles.upgradeDesc}>{p.d}</Text>
                              </View>
                              <View style={styles.priceTag}>
                                 <Text style={styles.priceText}>{trenutnaCijena}</Text>
                              </View>
                          </TouchableOpacity>
                      );
                  })}
                 </ScrollView>
              )}
            </View>
          )}

          {pogled === 'dvorac' && (
            <View style={styles.workshopContainer}>
              <View style={styles.dvoracHeader}>
                <View>
                  <Text style={styles.dvoracTitle}>KRALJEVSTVO</Text>
                  <Text style={styles.dvoracSubtitle}>Razina {dvoracNivo}</Text>
                </View>
                <Crown size={32} color={BOJE.dvorac} />
              </View>

              <View style={styles.dvoracProgressContainer}>
                <Text style={styles.progressLabel}>Napredak prema razini {dvoracNivo + 1}:</Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${dvoracUkupniNapredak()}%`, backgroundColor: BOJE.dvorac }]} />
                </View>
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{gap: 12, paddingBottom: 20}}>
                {ZGRADE.map(zgrada => {
                  const trenutniLv = gradevine[zgrada.id];
                  const jeMax = trenutniLv === zgrada.maxLv;
                  const cijena = Math.floor(zgrada.baznaCijena * Math.pow(1.8, trenutniLv) * Math.pow(1.5, dvoracNivo - 1));
                  const mozeKupiti = bodovi >= cijena && !jeMax;

                  return (
                    <View key={zgrada.id} style={styles.upgradeCard}>
                      <View style={[styles.upgradeIconBg, jeMax && {backgroundColor: 'rgba(139, 92, 246, 0.2)'}]}>
                        {zgrada.ikona}
                      </View>
                      <View style={styles.upgradeInfo}>
                        <Text style={styles.upgradeTitle}>{zgrada.naziv}</Text>
                        <View style={styles.zgradaLvBarContainer}>
                          {[...Array(zgrada.maxLv)].map((_, i) => (<View key={i} style={[styles.zgradaLvDot, { backgroundColor: i < trenutniLv ? BOJE.dvorac : BOJE.bgLight }]} />))}
                        </View>
                      </View>
                      <TouchableOpacity activeOpacity={0.7} disabled={!mozeKupiti && !jeMax} onPress={() => nadogradiZgradu(zgrada)} style={[styles.gradnjaBtn, jeMax ? styles.gradnjaBtnMax : mozeKupiti ? styles.gradnjaBtnActive : styles.gradnjaBtnInactive]}>
                        {jeMax ? <Text style={styles.gradnjaBtnTextMax}>MAX</Text> : <><Hammer size={12} color={mozeKupiti ? '#fff' : BOJE.textMuted} /><Text style={[styles.gradnjaBtnText, { color: mozeKupiti ? '#fff' : BOJE.textMuted }]}>{cijena}</Text></>}
                      </TouchableOpacity>
                    </View>
                  )
                })}
              </ScrollView>
            </View>
          )}
        </View>

        {/* NAVIGACIJA S ČETIRI OPCIJE */}
        <View style={styles.navbar}>
          <TouchableOpacity onPress={() => promijeniPogled('igra')} style={styles.navBtn}>
            <Play size={22} color={pogled === 'igra' ? BOJE.energija : BOJE.textMuted} />
            <Text style={[styles.navText, { color: pogled === 'igra' ? BOJE.energija : BOJE.textMuted }]}>IGRA</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => promijeniPogled('dvorac')} style={styles.navBtn}>
            <Map size={22} color={pogled === 'dvorac' ? BOJE.dvorac : BOJE.textMuted} />
            <Text style={[styles.navText, { color: pogled === 'dvorac' ? BOJE.dvorac : BOJE.textMuted }]}>DVORAC</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => promijeniPogled('radionica')} style={styles.navBtn}>
            <Wrench size={22} color={pogled === 'radionica' ? BOJE.bodovi : BOJE.textMuted} />
            <Text style={[styles.navText, { color: pogled === 'radionica' ? BOJE.bodovi : BOJE.textMuted }]}>ALATI</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => promijeniPogled('karte')} style={styles.navBtn}>
            <Book size={22} color={pogled === 'karte' ? BOJE.karte : BOJE.textMuted} />
            <Text style={[styles.navText, { color: pogled === 'karte' ? BOJE.karte : BOJE.textMuted }]}>KARTE</Text>
          </TouchableOpacity>
        </View>

      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BOJE.bgSl },
  mainWrapper: { flex: 1, backgroundColor: BOJE.bgSl },
  
  // OVERLAY STILOVI ZA KARTE
  cardOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, justifyContent: 'center', alignItems: 'center', padding: 20 },
  cardOverlayTitle: { color: BOJE.zlato, fontSize: 24, fontWeight: 'bold', marginBottom: 30, letterSpacing: 2 },
  cardReveal: { width: 150, height: 200, backgroundColor: BOJE.bgCard, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: BOJE.karte, shadowColor: BOJE.karte, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 30, elevation: 20, marginBottom: 30 },
  cardRevealIcon: { fontSize: 80 },
  cardOverlayDesc: { color: '#fff', fontSize: 16, textAlign: 'center' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingBottom: 10, paddingTop: Platform.OS === 'android' ? 40 : 10, backgroundColor: 'rgba(255,255,255,0.7)' },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  statText: { fontSize: 24, fontWeight: 'bold' },
  armorContainer: { alignItems: 'flex-end', maxWidth: 120 },
  armorDots: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 4 },
  armorDot: { width: 14, height: 8, borderRadius: 2, marginBottom: 2 },
  armorText: { color: BOJE.zdravlje, fontSize: 10, fontWeight: 'bold', marginTop: 4 },
  
  eventBanner: { marginHorizontal: 16, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5, marginTop: 5 },
  eventTitle: { color: '#fff', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
  eventDesc: { color: '#fff', fontSize: 11, opacity: 0.9, marginTop: 4, fontWeight: '500' },

  messageArea: { height: 45, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  messageText: { color: BOJE.textMain, fontSize: 13, fontWeight: 'bold', textAlign: 'center' },
  content: { flex: 1, paddingHorizontal: 16, paddingBottom: 16, justifyContent: 'flex-end' },
  gameContainer: { width: '100%', alignItems: 'center' },
  
  gridContainer: { backgroundColor: BOJE.koloBg, borderRadius: 24, padding: 12, borderWidth: 2, borderColor: '#475569', width: '100%', marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 6 },
  gridRow: { flexDirection: 'row', gap: 8, padding: 4 },
  middleGridRow: { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 16 },
  slotItem: { flex: 1, aspectRatio: 1, backgroundColor: BOJE.slotBg, borderRadius: 12, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  slotItemWinning: { backgroundColor: 'rgba(245, 158, 11, 0.35)', transform: [{ scale: 1.05 }], shadowColor: "#fbbf24", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 5 },
  slotSymbol: { fontSize: screenWidth * 0.08 },
  slotValue: { position: 'absolute', bottom: 4, right: 4, fontSize: 9, color: BOJE.slotValueText, fontWeight: 'bold' },
  middleHighlightBorder: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)', borderRadius: 12 },
  
  statsContainer: { width: '100%', backgroundColor: BOJE.bgCard, padding: 12, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: BOJE.bgLight, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  statsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  statsTitle: { fontSize: 11, fontWeight: 'bold', color: BOJE.textMuted, letterSpacing: 1 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statsLabel: { fontSize: 13, color: BOJE.textMain, fontWeight: '500' },
  statsValue: { fontSize: 15, fontWeight: 'bold', color: BOJE.statistika },
  pityBarContainer: { width: '100%' },
  pityBarBg: { width: '100%', height: 6, backgroundColor: BOJE.bgSl, borderRadius: 3, overflow: 'hidden' },
  pityBarFill: { height: '100%', borderRadius: 3 },
  pityHelperText: { fontSize: 10, color: BOJE.textMuted, marginTop: 6, fontStyle: 'italic', alignSelf: 'flex-end' },

  betContainer: { width: '100%', marginBottom: 12 },
  betScroll: { gap: 10, paddingBottom: 4 },
  betBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, borderWidth: 2 },
  betBtnActive: { backgroundColor: BOJE.energija, borderColor: '#06b6d4' },
  betBtnInactive: { backgroundColor: '#f8fafc', borderColor: BOJE.bgLight },
  betBtnText: { fontWeight: 'bold', fontSize: 14 },
  betBtnTextActive: { color: '#fff' },
  betBtnTextInactive: { color: BOJE.textMuted },
  spinBtn: { backgroundColor: '#0ea5e9', borderRadius: 16, paddingVertical: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, width: '100%', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  spinBtnDisabled: { opacity: 0.7, transform: [{ scale: 0.95 }] },
  spinBtnText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  
  workshopContainer: { flex: 1 },
  tabHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  tabHeaderText: { color: BOJE.textMuted, fontSize: 13, fontWeight: 'bold', letterSpacing: 1.5 },
  
  // STILOVI ZA KOLEKCIJU KARATA
  kolekcijaUputa: { fontSize: 13, color: BOJE.textMuted, textAlign: 'center', marginBottom: 16, paddingHorizontal: 10 },
  cardSetContainer: { backgroundColor: BOJE.bgCard, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: BOJE.bgLight, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 3 },
  cardSetReady: { borderColor: BOJE.karte, borderWidth: 2, shadowColor: BOJE.karte, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  cardSetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardSetTitle: { fontSize: 16, fontWeight: 'bold', color: BOJE.textMain },
  cardSetProgress: { fontSize: 14, fontWeight: 'bold', color: BOJE.textMuted },
  cardSlotsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  singleCardSlot: { flex: 1, aspectRatio: 0.7, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  singleCardOwned: { backgroundColor: 'rgba(236, 72, 153, 0.1)', borderColor: BOJE.karte },
  singleCardMissing: { backgroundColor: BOJE.bgSl, borderColor: BOJE.bgLight, borderStyle: 'dashed' },
  singleCardIcon: { fontSize: 32 },
  claimRewardBtn: { backgroundColor: BOJE.karte, marginTop: 16, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  claimRewardText: { color: '#fff', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
  claimRewardSubText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 'bold' },
  claimedBadge: { marginTop: 16, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  claimedBadgeText: { color: '#64748b', fontWeight: 'bold', fontSize: 12, letterSpacing: 1 },

  // STILOVI ZA MINI-IGRU
  miniGameCard: { backgroundColor: BOJE.bgCard, padding: 24, borderRadius: 28, alignItems: 'center', borderWidth: 2, borderColor: BOJE.vjestina, shadowColor: BOJE.vjestina, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 6 },
  miniGameHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  miniGameTitle: { fontSize: 12, fontWeight: 'bold', color: BOJE.vjestina, letterSpacing: 1.5 },
  miniGameItemName: { fontSize: 22, fontWeight: 'bold', color: BOJE.textMain, marginBottom: 8 },
  miniGameDesc: { fontSize: 12, color: BOJE.textMuted, marginBottom: 24, textAlign: 'center', paddingHorizontal: 10 },
  barContainer: { width: '100%', height: 36, flexDirection: 'row', borderRadius: 18, overflow: 'hidden', backgroundColor: '#e2e8f0', position: 'relative', marginBottom: 24, borderWidth: 2, borderColor: BOJE.bgLight },
  redZone: { flex: 25, backgroundColor: '#ef4444' },
  yellowZone: { flex: 17, backgroundColor: '#eab308' },
  greenZone: { flex: 16, backgroundColor: '#22c55e' },
  cursor: { position: 'absolute', width: '4%', height: '120%', backgroundColor: '#1e293b', top: '-10%', borderRadius: 4, borderWidth: 2, borderColor: '#fff' },
  stopSkillBtn: { backgroundColor: BOJE.vjestina, paddingVertical: 16, paddingHorizontal: 32, borderRadius: 20, shadowColor: BOJE.vjestina, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 5, width: '100%', alignItems: 'center' },
  stopSkillBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18, letterSpacing: 1 },
  resultContainer: { alignItems: 'center', marginVertical: 10 },
  resultText: { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  savedPointsText: { fontSize: 12, color: BOJE.textMuted, marginTop: 4, fontStyle: 'italic' },

  activeJobCard: { backgroundColor: BOJE.bgCard, padding: 24, borderRadius: 28, alignItems: 'center', borderWidth: 1, borderColor: BOJE.bgLight, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 4 },
  activeJobTitle: { color: BOJE.textMain, fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  progressBars: { width: '100%', marginBottom: 24 },
  progressLabel: { color: BOJE.textMuted, fontSize: 12, marginBottom: 4 },
  progressBarBg: { width: '100%', height: 14, backgroundColor: BOJE.bgSl, borderRadius: 7, overflow: 'hidden', borderWidth: 1, borderColor: BOJE.bgLight },
  progressBarFill: { height: '100%' },
  hammerBtn: { backgroundColor: '#ef4444', width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', shadowColor: "#ef4444", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 5 },
  cancelWorkText: { color: BOJE.textMuted, textDecorationLine: 'underline', fontSize: 13 },
  upgradeCard: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: BOJE.bgCard, borderRadius: 16, borderWidth: 1, borderColor: BOJE.bgLight, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2 },
  upgradeIconBg: { width: 44, height: 44, backgroundColor: BOJE.bgSl, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  upgradeInfo: { flex: 1, marginLeft: 12 },
  upgradeTitle: { color: BOJE.textMain, fontWeight: 'bold', fontSize: 15 },
  upgradeDesc: { color: BOJE.textMuted, fontSize: 11, marginTop: 4 },
  priceTag: { backgroundColor: BOJE.bgSl, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: BOJE.bgLight, marginLeft: 8 },
  priceText: { color: BOJE.bodovi, fontWeight: 'bold', fontSize: 14 },
  
  dvoracHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: BOJE.bgCard, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: BOJE.dvorac, marginBottom: 16, shadowColor: BOJE.dvorac, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  dvoracTitle: { color: BOJE.dvorac, fontSize: 13, fontWeight: 'bold', letterSpacing: 1.5 },
  dvoracSubtitle: { color: BOJE.textMain, fontSize: 24, fontWeight: 'bold', marginTop: 2 },
  dvoracProgressContainer: { marginBottom: 20 },
  zgradaLvBarContainer: { flexDirection: 'row', gap: 4, marginTop: 8 },
  zgradaLvDot: { height: 6, flex: 1, borderRadius: 3 },
  gradnjaBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, marginLeft: 8 },
  gradnjaBtnActive: { backgroundColor: BOJE.dvorac, shadowColor: BOJE.dvorac, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 2 },
  gradnjaBtnInactive: { backgroundColor: BOJE.bgSl, borderWidth: 1, borderColor: BOJE.bgLight },
  gradnjaBtnMax: { backgroundColor: 'rgba(34, 197, 94, 0.1)', borderWidth: 1, borderColor: '#22c55e' },
  gradnjaBtnText: { fontWeight: 'bold', fontSize: 14 },
  gradnjaBtnTextMax: { color: '#22c55e', fontWeight: 'bold', fontSize: 12, letterSpacing: 1 },

  navbar: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 15, paddingBottom: Platform.OS === 'ios' ? 30 : 15, backgroundColor: BOJE.bgCard, borderTopWidth: 1, borderTopColor: BOJE.bgLight },
  navBtn: { alignItems: 'center', gap: 6 },
  navText: { fontSize: 10, fontWeight: 'bold' }
});
