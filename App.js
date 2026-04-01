import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  SafeAreaView, StatusBar, StyleSheet, Animated, View, Text,
  TouchableOpacity, ActivityIndicator, PanResponder,
} from 'react-native';
import {
  Zap, Building2, Trophy, ShoppingCart, Sliders,
} from 'lucide-react-native';
import { Platform } from 'react-native';
import { useGameStore } from './src/store/gameStore';
import { useVillage }   from './src/hooks/useVillage';
import { useMarket }    from './src/hooks/useMarket';
import Header           from './src/components/Header';
import SlotScreen       from './src/screens/SlotScreen';
import VillageScreen    from './src/screens/VillageScreen';
import MissionsScreen   from './src/screens/MissionsScreen';
import ShopScreen       from './src/screens/ShopScreen';
import UpgradesScreen   from './src/screens/UpgradesScreen';
import { BOJE, POREDAK_EKRANA, DNEVNE_NAGRADE, uiScale, FONT_FAMILY } from './src/config/constants';

export default function App() {
  // ─── Navigacijsko stanje ──────────────────────────────────────────────────
  const [pogled, setPogled] = useState('automat');

  // ─── Globalne animacije (flash overlay + tresenje ekrana) ─────────────────
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const [flashBoja, setFlashBoja] = useState('rgba(0,0,0,0)');

  const prikaziUdarac = useCallback((boja) => {
    setFlashBoja(boja);
    flashAnim.setValue(1);
    Animated.timing(flashAnim, { toValue: 0, duration: 800, useNativeDriver: false }).start();
  }, [flashAnim]);

  const trziEkran = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 15,  duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -15, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 15,  duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 40, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  // ─── Swipe navigacija ─────────────────────────────────────────────────────
  const swipeRef = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 15 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -60) {
          setPogled((prev) => {
            const i = POREDAK_EKRANA.indexOf(prev);
            return i < POREDAK_EKRANA.length - 1 ? POREDAK_EKRANA[i + 1] : prev;
          });
        } else if (g.dx > 60) {
          setPogled((prev) => {
            const i = POREDAK_EKRANA.indexOf(prev);
            return i > 0 ? POREDAK_EKRANA[i - 1] : prev;
          });
        }
      },
    })
  ).current;

  // ─── Zustand store ────────────────────────────────────────────────────────
  const ucitavam            = useGameStore((s) => s.ucitavam);
  const ucitaj              = useGameStore((s) => s.ucitaj);
  const spremi              = useGameStore((s) => s.spremi);
  const spremiDostignuca    = useGameStore((s) => s.spremiDostignuca);
  const prikazDnevneNagrade = useGameStore((s) => s.prikazDnevneNagrade);
  const dnevnaNagrada       = useGameStore((s) => s.dnevnaNagrada);
  const dnevniStreak        = useGameStore((s) => s.dnevniStreak);
  const preuzmiDnevniBonus  = useGameStore((s) => s.preuzmiDnevniBonus);

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

  // ─── Inicijalno učitavanje ────────────────────────────────────────────────
  useEffect(() => { ucitaj(); }, [ucitaj]);

  // ─── Auto-save glavnih podataka ───────────────────────────────────────────
  useEffect(() => {
    if (ucitavam) return;
    spremi();
  }, [spremi, igracRazina, prestigeRazina, xp, energija, zlato, dijamanti, resursi,
      gradevine, ostecenja, razine, stitovi, misije, luckySpinCounter, winStreak, ucitavam]);

  // ─── Auto-save dostignuća ─────────────────────────────────────────────────
  useEffect(() => {
    if (ucitavam) return;
    spremiDostignuca();
  }, [dostignucaDone, ukupnoVrtnji, ukupnoZlata, ucitavam]);

  // ─── Tajmeri (pasivna produkcija + tržište) ───────────────────────────────
  useVillage();
  useMarket();

  // ─── Loading ekran ────────────────────────────────────────────────────────
  if (ucitavam) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={BOJE.drvo} style={{ marginTop: 50 }} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BOJE.bg} />

      {/* Flash overlay za animacije udarca */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: flashBoja, opacity: flashAnim, zIndex: 100 }]}
        pointerEvents="none"
      />

      {/* Dnevna nagrada modal */}
      {prikazDnevneNagrade && dnevnaNagrada && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
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
          </View>
        </View>
      )}

      <Animated.View style={[styles.mainWrapper, { transform: [{ translateX: shakeAnim }] }]} {...swipeRef.panHandlers}>
        <Header />

        {/* Sadržaj ekrana */}
        <View style={styles.content}>
          {pogled === 'automat'     && <SlotScreen      onFlash={prikaziUdarac} onShake={trziEkran} />}
          {pogled === 'selo'        && <VillageScreen   />}
          {pogled === 'misije'      && <MissionsScreen  />}
          {pogled === 'trgovina'    && <ShopScreen      />}
          {pogled === 'nadogradnje' && <UpgradesScreen  />}
        </View>
      </Animated.View>

      {/* Indikator stranica (dots) */}
      <View style={styles.pageIndicatorRow}>
        {POREDAK_EKRANA.map((ekran) => (
          <View key={ekran} style={[styles.pageIndicatorDot, pogled === ekran && styles.pageIndicatorDotActive]} />
        ))}
      </View>

      {/* Navigacijska traka */}
      <View style={styles.floatingNavbar}>
        {[
          { id: 'automat',     ikona: Zap,          label: 'IGRAJ',   boja: BOJE.energija    },
          { id: 'selo',        ikona: Building2,    label: 'BAZA',    boja: BOJE.drvo        },
          { id: 'misije',      ikona: Trophy,       label: 'ZADACI',  boja: BOJE.misije      },
          { id: 'trgovina',    ikona: ShoppingCart, label: 'TRŽIŠTE', boja: BOJE.zlato       },
          { id: 'nadogradnje', ikona: Sliders,      label: 'OPREMA',  boja: BOJE.nadogradnje },
        ].map((tab) => {
          const aktivan = pogled === tab.id;
          const TIcon   = tab.ikona;
          return (
            <TouchableOpacity activeOpacity={0.7} key={tab.id} onPress={() => setPogled(tab.id)} style={styles.navBtn}>
              <View style={[
                styles.navTabPill,
                aktivan
                  ? [styles.navTabPillActive, { backgroundColor: tab.boja, shadowColor: tab.boja }]
                  : styles.navTabPillInactive,
              ]}>
                <TIcon size={aktivan ? 20 : 18} color={aktivan ? '#000' : BOJE.textMuted} strokeWidth={aktivan ? 2.5 : 1.8} />
                {aktivan && <Text style={styles.navText}>{tab.label}</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: BOJE.bg },
  mainWrapper: { flex: 1 },
  content:     { flex: 1, paddingHorizontal: 14 },

  // Navigacija
  floatingNavbar: {
    position: 'absolute', bottom: Platform.OS === 'ios' ? 28 : 16, left: 10, right: 10,
    flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center',
    backgroundColor: BOJE.navBg, paddingVertical: 10, paddingHorizontal: 6,
    borderRadius: 32, borderWidth: 1, borderColor: BOJE.border,
    shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 24, elevation: 18,
  },
  navBtn:            { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 2 },
  navTabPill:        { height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  navTabPillInactive:{ width: 44, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  navTabPillActive:  { paddingHorizontal: 14, shadowOpacity: 0.55, shadowRadius: 12, elevation: 6, transform: [{ translateY: -2 }] },
  navText:           { fontSize: Math.round(11 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY, letterSpacing: 0.5, color: '#000', marginLeft: 5 },

  // Indikator stranica
  pageIndicatorRow:      { position: 'absolute', bottom: Platform.OS === 'ios' ? 100 : 88, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, zIndex: 15 },
  pageIndicatorDot:      { width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.18)' },
  pageIndicatorDotActive:{ width: 18, height: 5, borderRadius: 2.5, backgroundColor: BOJE.energija, shadowColor: BOJE.energija, shadowOpacity: 0.9, shadowRadius: 6, elevation: 3 },

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
