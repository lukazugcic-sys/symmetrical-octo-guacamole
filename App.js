import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  StatusBar, StyleSheet, Animated, View, Text,
  TouchableOpacity, ActivityIndicator, AppState,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { enableScreens } from 'react-native-screens';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useGameStore } from './src/store/gameStore';
import { useVillage }   from './src/hooks/useVillage';
import { useMarket }    from './src/hooks/useMarket';
import { UIContext }    from './src/context/UIContext';
import Header           from './src/components/Header';
import WinCelebration   from './src/components/WinCelebration';
import LevelUpToast     from './src/components/LevelUpToast';
import BattlePassModal  from './src/components/BattlePassModal';
import OfflineBonusModal from './src/components/OfflineBonusModal';
import AppNavigator     from './src/navigation/AppNavigator';
import useAuth          from './src/hooks/useAuth';
import useNotifications from './src/hooks/useNotifications';
import { BOJE, DNEVNE_NAGRADE, uiScale, FONT_FAMILY } from './src/config/constants';
import { useSeasonalEvent } from './src/hooks/useSeasonalEvent';

// Aktiviraj native screen optimizacije (react-native-screens)
enableScreens();

export default function App() {
  // ─── Flash overlay + tresenje ekrana ─────────────────────────────────────
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const dailyModalAnim = useRef(new Animated.Value(0)).current;
  const eventModalAnim = useRef(new Animated.Value(0)).current;
  const [flashBoja, setFlashBoja] = useState('rgba(0,0,0,0)');
  const [prikaziBattlePass, setPrikaziBattlePass] = useState(false);

  const onFlash = useCallback((boja) => {
    setFlashBoja(boja);
    flashAnim.setValue(1);
    Animated.timing(flashAnim, { toValue: 0, duration: 800, useNativeDriver: false }).start();
  }, [flashAnim]);

  const onShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 15,  duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -15, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 15,  duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 40, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const { ucitava: authUcitava } = useAuth();

  // ─── Zustand store ────────────────────────────────────────────────────────
  const ucitavam            = useGameStore((s) => s.ucitavam);
  const ucitaj              = useGameStore((s) => s.ucitaj);
  const spremi              = useGameStore((s) => s.spremi);
  const spremiDostignuca    = useGameStore((s) => s.spremiDostignuca);
  const prikazDnevneNagrade = useGameStore((s) => s.prikazDnevneNagrade);
  const dnevnaNagrada       = useGameStore((s) => s.dnevnaNagrada);
  const dnevniStreak        = useGameStore((s) => s.dnevniStreak);
  const preuzmiDnevniBonus  = useGameStore((s) => s.preuzmiDnevniBonus);
  const uid                 = useGameStore((s) => s.uid);
  const imeIgraca           = useGameStore((s) => s.imeIgraca);

  // Praćena stanja za auto-save
  const igracRazina      = useGameStore((s) => s.igracRazina);
  const prestigeRazina   = useGameStore((s) => s.prestigeRazina);
  const xp               = useGameStore((s) => s.xp);
  const energija         = useGameStore((s) => s.energija);
  const zlato            = useGameStore((s) => s.zlato);
  const dijamanti        = useGameStore((s) => s.dijamanti);
  const resursi          = useGameStore((s) => s.resursi);
  const gradevine        = useGameStore((s) => s.gradevine);
  const ostecenja        = useGameStore((s) => s.ostecenja);
  const razine           = useGameStore((s) => s.razine);
  const stitovi          = useGameStore((s) => s.stitovi);
  const misije           = useGameStore((s) => s.misije);
  const luckySpinCounter = useGameStore((s) => s.luckySpinCounter);
  const winStreak        = useGameStore((s) => s.winStreak);
  const dostignucaDone   = useGameStore((s) => s.dostignucaDone);
  const ukupnoVrtnji     = useGameStore((s) => s.ukupnoVrtnji);
  const ukupnoZlata      = useGameStore((s) => s.ukupnoZlata);
  const ukupnoRaidova    = useGameStore((s) => s.ukupnoRaidova);
  const aktivniSkin      = useGameStore((s) => s.aktivniSkin);
  const klan             = useGameStore((s) => s.klan);
  const zadnjiVideniEventId = useGameStore((s) => s.zadnjiVideniEventId);
  const oznaciEventVidjen = useGameStore((s) => s.oznaciEventVidjen);
  const primijeniOfflineNapredak = useGameStore((s) => s.primijeniOfflineNapredak);
  const junaci           = useGameStore((s) => s.junaci);
  const aktivniJunaci    = useGameStore((s) => s.aktivniJunaci);
  const [prikaziEventModal, setPrikaziEventModal] = useState(false);
  const aktivniDogadaj = useSeasonalEvent();

  // ─── Inicijalno učitavanje ────────────────────────────────────────────────
  useEffect(() => {
    if (authUcitava) return;
    ucitaj();
  }, [authUcitava, ucitaj]);

  useEffect(() => {
    if (ucitavam) return;
    const now = Date.now();
    const last = useGameStore.getState().zadnjiOnlineMs;
    if (last && now > last) {
      primijeniOfflineNapredak(Math.floor((now - last) / 1000));
    }
    useGameStore.setState({ zadnjiOnlineMs: now });
  }, [ucitavam, primijeniOfflineNapredak]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        useGameStore.setState({ zadnjiOnlineMs: Date.now() });
      }
      if (state === 'active') {
        const last = useGameStore.getState().zadnjiOnlineMs;
        if (last && Date.now() > last) {
          useGameStore.getState().primijeniOfflineNapredak(Math.floor((Date.now() - last) / 1000));
        }
        useGameStore.setState({ zadnjiOnlineMs: Date.now() });
      }
    });
    return () => sub.remove();
  }, []);

  // ─── Auto-save glavnih podataka ───────────────────────────────────────────
  useEffect(() => {
    if (ucitavam) return;
    spremi();
  }, [spremi, igracRazina, prestigeRazina, xp, energija, zlato, dijamanti, resursi,
      gradevine, ostecenja, razine, stitovi, misije, luckySpinCounter, winStreak,
      aktivniSkin, klan, junaci, aktivniJunaci, imeIgraca, uid, ucitavam]);

  // ─── Auto-save dostignuća ─────────────────────────────────────────────────
  useEffect(() => {
    if (ucitavam) return;
    spremiDostignuca();
  }, [dostignucaDone, ukupnoVrtnji, ukupnoZlata, ukupnoRaidova, ucitavam]);

  useEffect(() => {
    if (!aktivniDogadaj?.id) return;
    if (zadnjiVideniEventId === aktivniDogadaj.id) return;
    setPrikaziEventModal(true);
  }, [aktivniDogadaj?.id, zadnjiVideniEventId]);

  // ─── Animacije modalova ───────────────────────────────────────────────────
  useEffect(() => {
    if (prikazDnevneNagrade) {
      dailyModalAnim.setValue(0);
      Animated.spring(dailyModalAnim, { toValue: 1, damping: 16, stiffness: 180, useNativeDriver: true }).start();
    }
  }, [prikazDnevneNagrade, dailyModalAnim]);

  useEffect(() => {
    if (prikaziEventModal) {
      eventModalAnim.setValue(0);
      Animated.spring(eventModalAnim, { toValue: 1, damping: 16, stiffness: 180, useNativeDriver: true }).start();
    }
  }, [prikaziEventModal, eventModalAnim]);

  // ─── Tajmeri (pasivna produkcija + tržište) ───────────────────────────────
  useVillage();
  useMarket();

  // ─── Push notifikacije ────────────────────────────────────────────────────
  useNotifications();

  // ─── Loading ekran ────────────────────────────────────────────────────────
  if (ucitavam) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={BOJE.drvo} style={{ marginTop: 50 }} />
      </View>
    );
  }

  return (
    <UIContext.Provider value={{ onFlash, onShake }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <SafeAreaView style={styles.container} edges={[ 'left', 'right' ]}>
            <StatusBar barStyle="light-content" backgroundColor={BOJE.bg} />

          {/* Flash overlay za animacije udarca */}
          <Animated.View
            style={[StyleSheet.absoluteFill, { backgroundColor: flashBoja, opacity: flashAnim, zIndex: 100 }]}
            pointerEvents="none"
          />

          {/* Dnevna nagrada modal */}
          {prikazDnevneNagrade && dnevnaNagrada && (
            <View style={styles.modalOverlay}>
              <Animated.View style={[styles.modalCard, { transform: [{ scale: dailyModalAnim }], opacity: dailyModalAnim }]}>
                <Text style={styles.modalTitle}>🎁 DNEVNA NAGRADA</Text>
                <Text style={styles.modalSubtitle}>Dan {dnevnaNagrada.streak} · Niz prijava</Text>
                <View style={styles.dnevnaStreakRow}>
                  {DNEVNE_NAGRADE.map((_, i) => (
                    <View key={i} style={[
                      styles.dnevniDanBadge,
                      i + 1 === dnevniStreak && styles.dnevniDanAktivan,
                      i + 1 < dnevniStreak  && styles.dnevniDanPreuzet,
                    ]}>
                      <Text style={styles.dnevniDanBroj}>{i + 1}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.modalNagradeRow}>
                  {dnevnaNagrada.nagrada.zlato     > 0 && <Text style={styles.modalNagradaTxt}>{dnevnaNagrada.nagrada.zlato} 🪙</Text>}
                  {dnevnaNagrada.nagrada.dijamanti > 0 && <Text style={[styles.modalNagradaTxt, { color: BOJE.dijamant }]}>{dnevnaNagrada.nagrada.dijamanti} 💎</Text>}
                  {dnevnaNagrada.nagrada.energija  > 0 && <Text style={[styles.modalNagradaTxt, { color: BOJE.energija }]}>{dnevnaNagrada.nagrada.energija} ⚡</Text>}
                  {dnevnaNagrada.nagrada.drvo      > 0 && <Text style={[styles.modalNagradaTxt, { color: BOJE.drvo }]}>{dnevnaNagrada.nagrada.drvo} 🌲</Text>}
                  {dnevnaNagrada.nagrada.kamen     > 0 && <Text style={[styles.modalNagradaTxt, { color: BOJE.kamen }]}>{dnevnaNagrada.nagrada.kamen} ⛰️</Text>}
                  {dnevnaNagrada.nagrada.zeljezo   > 0 && <Text style={[styles.modalNagradaTxt, { color: BOJE.zeljezo }]}>{dnevnaNagrada.nagrada.zeljezo} ⛏️</Text>}
                </View>
                <TouchableOpacity activeOpacity={0.8} style={styles.modalBtn} onPress={preuzmiDnevniBonus}>
                  <Text style={styles.modalBtnTxt}>PREUZMI</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          )}

          {prikaziEventModal && aktivniDogadaj && (
            <View style={styles.modalOverlay}>
              <Animated.View style={[styles.modalCard, { borderColor: (aktivniDogadaj.boja || BOJE.zlato) + '80' }, { transform: [{ scale: eventModalAnim }], opacity: eventModalAnim }]}>
                <Text style={styles.modalTitle}>{aktivniDogadaj.emodzi} {aktivniDogadaj.naziv.toUpperCase()}</Text>
                <Text style={styles.modalSubtitle}>{aktivniDogadaj.opis}</Text>
                <Text style={[styles.modalSubtitle, { color: aktivniDogadaj.boja }]}>Bonus: x{aktivniDogadaj.bonusMnozitelj}</Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.modalBtn}
                  onPress={() => {
                    oznaciEventVidjen(aktivniDogadaj.id);
                    setPrikaziEventModal(false);
                  }}
                >
                  <Text style={styles.modalBtnTxt}>NASTAVI</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          )}

          {/* Čestice proslave pobjede / jackpota */}
          <WinCelebration />

          {/* Level-up toast */}
          <LevelUpToast />
          <OfflineBonusModal />
          <BattlePassModal visible={prikaziBattlePass} onClose={() => setPrikaziBattlePass(false)} />

          {/* Sadržaj aplikacije — shake wrapper */}
          <Animated.View style={[styles.mainWrapper, { transform: [{ translateX: shakeAnim }] }]}>
            <Header onOpenBattlePass={() => setPrikaziBattlePass(true)} />
            <AppNavigator />
          </Animated.View>

          </SafeAreaView>
        </NavigationContainer>
      </SafeAreaProvider>
    </UIContext.Provider>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: BOJE.bg },
  mainWrapper: { flex: 1 },

  // Dnevna nagrada modal
  modalOverlay:    { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', alignItems: 'center', zIndex: 200, paddingHorizontal: 24 },
  modalCard:       { backgroundColor: '#0C0E1C', borderRadius: 32, padding: 28, width: '100%', borderWidth: 1, borderColor: BOJE.zlato + '70', alignItems: 'center', shadowColor: BOJE.zlato, shadowOpacity: 0.35, shadowRadius: 28, elevation: 24 },
  modalTitle:      { fontSize: Math.round(24 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY, color: BOJE.zlato, letterSpacing: 2, marginBottom: 8 },
  modalSubtitle:   { fontSize: Math.round(13 * uiScale), color: BOJE.textMuted, fontWeight: '700', fontFamily: FONT_FAMILY, marginBottom: 20, letterSpacing: 1 },
  dnevnaStreakRow: { flexDirection: 'row', gap: 6, marginBottom: 24, flexWrap: 'wrap', justifyContent: 'center' },
  dnevniDanBadge:  { width: 38, height: 38, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  dnevniDanAktivan:{ backgroundColor: BOJE.zlato + '35', borderColor: BOJE.zlato, shadowColor: BOJE.zlato, shadowOpacity: 0.65, shadowRadius: 8, elevation: 5 },
  dnevniDanPreuzet:{ backgroundColor: BOJE.xp + '20', borderColor: BOJE.xp + '60' },
  dnevniDanBroj:   { color: BOJE.textMain, fontSize: Math.round(13 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY },
  modalNagradeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginBottom: 28 },
  modalNagradaTxt: { fontSize: Math.round(22 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY, color: BOJE.zlato, textShadowColor: '#000', textShadowRadius: 5 },
  modalBtn:        { backgroundColor: BOJE.zlato, width: '100%', paddingVertical: Math.round(18 * uiScale), borderRadius: 20, alignItems: 'center', shadowColor: BOJE.zlato, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  modalBtnTxt:     { color: '#000', fontSize: Math.round(18 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY, letterSpacing: 2 },
});
