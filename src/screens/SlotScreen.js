import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  interpolateColor,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Zap, Sparkles, CircleHelp, Shield, Skull, Star, Gem, Coins, TreePine, Mountain, Pickaxe, BatteryCharging } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useGameStore } from '../store/gameStore';
import { useSlotStore } from '../store/slotStore';
import { useSlotMachine } from '../hooks/useSlotMachine';
import { useSeasonalEvent } from '../hooks/useSeasonalEvent';
import SlotReel    from '../components/SlotReel';
import EventBanner from '../components/EventBanner';
import RaidModal   from '../components/RaidModal';
import SandukModal from '../components/SandukModal';
import { BOJE, LUCKY_SPIN_INTERVAL, MAX_WIN_STREAK, STREAK_BONUS_PER_WIN, MAX_GAMBLE_ROUNDS, uiScale, FONT_FAMILY } from '../config/constants';
import { useRewardedAds } from '../hooks/useRewardedAds';

/**
 * Ekran automata — vrtnja, prikaz mreže simbola, gamble i preuzimanje dobitka.
 * Flash i shake efekti dolaze iz UIContext (bez prop drillinga).
 */
const SlotScreen = () => {
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();
  const poruka          = useGameStore((s) => s.poruka);
  const aktivniDogadaj  = useSeasonalEvent();
  const energija        = useGameStore((s) => s.energija);
  const luckySpinCounter = useGameStore((s) => s.luckySpinCounter);
  const winStreak       = useGameStore((s) => s.winStreak);
  const kupiEnergijuHitno = useGameStore((s) => s.kupiEnergijuHitno);
  const spinBoostPreostalo = useGameStore((s) => s.spinBoostPreostalo);
  const [prikazLegend, setPrikazLegend] = useState(false);
  const [prikazSanduk, setPrikazSanduk] = useState(false);
  const stitovi = useGameStore((s) => s.stitovi);
  const sandukDatum = useGameStore((s) => s.sandukDatum);
  const dobitakRef = useSlotStore((s) => s.dobitakNaCekanju);
  const { prikaziRewardedAd } = useRewardedAds();

  const vrti            = useSlotStore((s) => s.vrti);
  const ulog            = useSlotStore((s) => s.ulog);
  const dobitakNaCekanju = useSlotStore((s) => s.dobitakNaCekanju);
  const turboRezim      = useSlotStore((s) => s.turboRezim);
  const raidAktivan     = useSlotStore((s) => s.raidAktivan);
  const setUlog         = useSlotStore((s) => s.setUlog);
  const setTurboRezim   = useSlotStore((s) => s.setTurboRezim);
  const setRaidAktivan  = useSlotStore((s) => s.setRaidAktivan);

  const { stupciAnims, stupciBlurs, winScaleAnims, zavrtiMasinu, preuzmiDobitak, igrajGamble } =
    useSlotMachine();

  const jeFreeSpin = luckySpinCounter === 1;
  const streakMultiplier = 1 + (Math.min(winStreak, MAX_WIN_STREAK) * STREAK_BONUS_PER_WIN);

  const danas = new Date().toDateString();
  const besplatniOtvoren = sandukDatum === danas;
  const compactUi = width < 390 || height < 760;
  const denseUi = width < 360 || height < 700;
  const horizontalPadding = denseUi ? 12 : compactUi ? 14 : 18;
  const panelPadding = Math.round((denseUi ? 14 : compactUi ? 16 : 18) * uiScale);
  const framePadding = Math.round((denseUi ? 8 : compactUi ? 9 : 10) * uiScale);

  // Animacija spin gumba
  const spinBtnScale = useSharedValue(1);
  const machinePulse = useSharedValue(vrti ? 1 : 0);
  const spinBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: spinBtnScale.value }],
  }));
  const machineShellStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      machinePulse.value,
      [0, 1],
      ['rgba(251,191,36,0.16)', `${BOJE.energija}55`],
    ),
    shadowOpacity: 0.18 + (machinePulse.value * 0.16),
    transform: [{ scale: 1 + (machinePulse.value * 0.006) }],
  }));

  useEffect(() => {
    machinePulse.value = withTiming(vrti ? 1 : 0, {
      duration: vrti ? 160 : 220,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.Never,
    });
  }, [machinePulse, vrti]);

  const onSpinPressIn  = useCallback(() => { spinBtnScale.value = withSpring(0.96, { damping: 18, stiffness: 420, reduceMotion: ReduceMotion.Never }); }, []);
  const onSpinPressOut = useCallback(() => { spinBtnScale.value = withSpring(1.0,  { damping: 16, stiffness: 260, reduceMotion: ReduceMotion.Never }); }, []);

  return (
    <View style={[styles.gameContainer, { paddingHorizontal: horizontalPadding, paddingBottom: denseUi ? 18 : 26 }]}>
      {/* Sezonalni događaj */}
      <EventBanner dogadaj={aktivniDogadaj} />

      <View style={styles.supportCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.supportTitle}>Automat je pomoćni tok ekonomije.</Text>
          <Text style={styles.supportCopy}>Koristi ga za burst resurse, hitne popravke i kratke skokove u progresiji sela.</Text>
        </View>
        <TouchableOpacity activeOpacity={0.8} style={styles.supportBtn} onPress={() => navigation.navigate('Baza')}>
          <Text style={styles.supportBtnTxt}>OTVORI BAZU</Text>
        </TouchableOpacity>
      </View>

      {/* Poruka + sanduk gumb */}
      <View style={[styles.topRow, { marginBottom: compactUi ? 14 : 18 }]}>
        <View style={[styles.messageBubble, { flex: 1, paddingVertical: denseUi ? 12 : Math.round(14 * uiScale) }]}>
          <Sparkles size={denseUi ? 14 : 16} color={BOJE.zlato} style={{ marginRight: 8 }} />
          <Text style={styles.messageText} numberOfLines={2}>{poruka}</Text>
          <Sparkles size={denseUi ? 14 : 16} color={BOJE.zlato} style={{ marginLeft: 8 }} />
          <TouchableOpacity onPress={() => setPrikazLegend(true)} style={styles.legendBtn}>
            <CircleHelp size={16} color={BOJE.zlato} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[
            styles.sandukBtn,
            besplatniOtvoren && styles.sandukBtnOtvoren,
            { width: denseUi ? 46 : 50, height: denseUi ? 46 : 50 },
          ]}
          onPress={() => setPrikazSanduk(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.sandukEmodzi}>📦</Text>
          {!besplatniOtvoren && <View style={styles.sandukDot} />}
        </TouchableOpacity>
      </View>

      {spinBoostPreostalo > 0 && (
        <View style={[styles.boostBadge, { marginBottom: compactUi ? 12 : 14 }]}>
          <Text style={styles.boostTxt}>⚡ BOOST x2 · još {spinBoostPreostalo} spinova</Text>
        </View>
      )}

      {/* Automat */}
      <Animated.View style={[styles.slotMachineOuter, machineShellStyle, { padding: framePadding, marginBottom: compactUi ? 20 : 24 }]}>
        <View style={[styles.slotMachineInner, { padding: framePadding }]}>
          <SlotReel
            stupciAnims={stupciAnims}
            stupciBlurs={stupciBlurs}
            winScaleAnims={winScaleAnims}
          />
        </View>
      </Animated.View>

      {dobitakNaCekanju ? (
        /* ── Gamble / Preuzmi ──────────────────────────────────────────────── */
        <View style={[styles.gambleContainer, { padding: panelPadding }]}>
          <Text style={styles.gambleTitle}>TRENUTNI DOBITAK</Text>
          <View style={styles.gamblePrizesRow}>
            {dobitakNaCekanju.zlato     > 0 && <Text style={styles.gamblePrizeTxt}>{dobitakNaCekanju.zlato} 🪙</Text>}
            {dobitakNaCekanju.dijamanti > 0 && <Text style={[styles.gamblePrizeTxt, { color: BOJE.dijamant }]}>{dobitakNaCekanju.dijamanti} 💎</Text>}
            {dobitakNaCekanju.energija  > 0 && <Text style={[styles.gamblePrizeTxt, { color: BOJE.energija }]}>{dobitakNaCekanju.energija} ⚡</Text>}
            {dobitakNaCekanju.drvo      > 0 && <Text style={[styles.gamblePrizeTxt, { color: BOJE.drvo }]}>{dobitakNaCekanju.drvo} 🌲</Text>}
            {dobitakNaCekanju.kamen     > 0 && <Text style={[styles.gamblePrizeTxt, { color: BOJE.kamen }]}>{dobitakNaCekanju.kamen} ⛰️</Text>}
            {dobitakNaCekanju.zeljezo   > 0 && <Text style={[styles.gamblePrizeTxt, { color: BOJE.zeljezo }]}>{dobitakNaCekanju.zeljezo} ⛏️</Text>}
          </View>
          <View style={styles.gambleButtonsRow}>
            <TouchableOpacity activeOpacity={0.8} style={[styles.gambleBtn, { backgroundColor: BOJE.slotVatra }]} onPress={() => igrajGamble('red')}>
              <Text style={styles.gambleBtnTxt}>CRVENA (x2)</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} style={[styles.gambleBtn, { backgroundColor: '#1A1A24', borderWidth: 2, borderColor: '#333' }]} onPress={() => igrajGamble('black')}>
              <Text style={styles.gambleBtnTxt}>CRNA (x2)</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.adBtn}
            onPress={() => prikaziRewardedAd('duplirajDobitak', { dobitakNaCekanju: dobitakRef })}
          >
            <Text style={styles.adBtnTxt}>📺 DUPLAJ OGLASOM</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8} style={styles.collectBtn} onPress={preuzmiDobitak}>
            <Text style={styles.collectBtnTxt}>PREUZMI DOBITAK</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* ── Kontrole vrtnje ────────────────────────────────────────────────── */
        <View style={[styles.controlDeck, { padding: panelPadding }]}>
          {/* Lucky Spin meter */}
          <View style={styles.luckySpinRow}>
            <View style={styles.luckySpinMeter}>
              <View style={[styles.luckySpinFill, { width: `${((LUCKY_SPIN_INTERVAL - luckySpinCounter) / LUCKY_SPIN_INTERVAL) * 100}%`, backgroundColor: jeFreeSpin ? BOJE.zlato : BOJE.xp }]} />
            </View>
            <Text style={[styles.luckySpinTxt, jeFreeSpin && { color: BOJE.zlato }]}>
              {jeFreeSpin ? '🍀 LUCKY!' : `🍀 ${luckySpinCounter}`}
            </Text>
          </View>

          {/* Win streak + Turbo */}
          <View style={styles.streakTurboRow}>
            {winStreak >= 2 && (
              <View style={styles.streakBadge}>
                <Text style={styles.streakTxt}>🔥 NIZ x{winStreak} (+{Math.round((streakMultiplier - 1) * 100)}%)</Text>
              </View>
            )}
            <TouchableOpacity activeOpacity={0.7} onPress={() => setTurboRezim(!turboRezim)} style={[styles.turboBtn, turboRezim && styles.turboBtnActive]}>
              <Zap size={14} color={turboRezim ? '#000' : BOJE.textMuted} fill={turboRezim ? '#000' : 'transparent'} />
              <Text style={[styles.turboTxt, turboRezim && { color: '#000' }]}>TURBO</Text>
            </TouchableOpacity>
          </View>

          {/* Ulog */}
          <View style={styles.betContainer}>
            {[1, 10, 20, 50].map((op) => (
              <TouchableOpacity activeOpacity={0.7} key={op} onPress={() => setUlog(op)} style={[styles.betBtn, ulog === op && styles.betBtnActive]}>
                <Text style={[styles.betBtnText, ulog === op && styles.betBtnTextActive]}>x{op}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Spin gumb */}
          <Animated.View style={spinBtnStyle}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.spinBtn,
                jeFreeSpin && styles.spinBtnLucky,
                (vrti || (!jeFreeSpin && energija < ulog)) && styles.spinBtnDisabled,
                { paddingVertical: denseUi ? Math.round(18 * uiScale) : Math.round(22 * uiScale) },
              ]}
              onPress={zavrtiMasinu}
              onPressIn={onSpinPressIn}
              onPressOut={onSpinPressOut}
              disabled={vrti}
            >
              <Zap size={denseUi ? 20 : 24} color="#000" fill="#000" style={{ position: 'absolute', left: denseUi ? 16 : 24 }} />
              <Text style={[styles.spinBtnText, { fontSize: Math.round((denseUi ? 20 : compactUi ? 22 : 24) * uiScale) }]}>{vrti ? 'VRTIM...' : (jeFreeSpin ? '🍀 FREE SPIN' : 'SPIN')}</Text>
              {!jeFreeSpin && (
                <View style={styles.spinCostBadge}>
                  <Text style={styles.spinCostTxt}>-{ulog}</Text>
                  <Zap size={10} color="#000" fill="#000" />
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
          {!jeFreeSpin && energija < ulog && !vrti && (
            <View style={{ gap: 8, marginTop: 10 }}>
              <TouchableOpacity style={styles.quickEnergyBtn} activeOpacity={0.8} onPress={kupiEnergijuHitno}>
                <Text style={styles.quickEnergyTxt}>⚡ KUPI +100 ENERGIJE ZA 100 🪙</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.adEnergyBtn} activeOpacity={0.8} onPress={() => prikaziRewardedAd('energija')}>
                <Text style={styles.adEnergyTxt}>📺 GLEDAJ OGLAS ZA +30 ENERGIJE</Text>
              </TouchableOpacity>
            </View>
          )}
          {stitovi <= 0 && !vrti && (
            <TouchableOpacity style={styles.adShieldBtn} activeOpacity={0.8} onPress={() => prikaziRewardedAd('stit')}>
              <Text style={styles.adShieldTxt}>📺 OBNOVI ŠTITOVE OGLASOM</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      <RaidModal
        vidljiv={raidAktivan}
        onZatvori={() => setRaidAktivan(false)}
      />
      <SandukModal
        vidljiv={prikazSanduk}
        onZatvori={() => setPrikazSanduk(false)}
      />
      <Modal visible={prikazLegend} transparent animationType="fade" onRequestClose={() => setPrikazLegend(false)}>
        <View style={styles.legendOverlay}>
          <View style={styles.legendCard}>
            <Text style={styles.legendTitle}>SIMBOLI AUTOMATA</Text>
            <View style={styles.legendItem}><Skull size={16} color={BOJE.slotVatra} /><Text style={styles.legendTxt}>Lubanja: raid i šteta</Text></View>
            <View style={styles.legendItem}><Star size={16} color="#FFF" /><Text style={styles.legendTxt}>Wild: joker simbol</Text></View>
            <View style={styles.legendItem}><Shield size={16} color={BOJE.stit} /><Text style={styles.legendTxt}>Štit: obrana baze</Text></View>
            <View style={styles.legendItem}><Gem size={16} color={BOJE.dijamant} /><Text style={styles.legendTxt}>Dijamant: premium valuta</Text></View>
            <View style={styles.legendItem}><Coins size={16} color={BOJE.zlato} /><Text style={styles.legendTxt}>Zlato: glavna valuta</Text></View>
            <View style={styles.legendItem}><TreePine size={16} color={BOJE.drvo} /><Text style={styles.legendTxt}>Drvo resurs</Text></View>
            <View style={styles.legendItem}><Mountain size={16} color={BOJE.kamen} /><Text style={styles.legendTxt}>Kamen resurs</Text></View>
            <View style={styles.legendItem}><Pickaxe size={16} color={BOJE.zeljezo} /><Text style={styles.legendTxt}>Željezo resurs</Text></View>
            <View style={styles.legendItem}><BatteryCharging size={16} color={BOJE.energija} /><Text style={styles.legendTxt}>Energija za spin</Text></View>
            <TouchableOpacity style={styles.legendCloseBtn} onPress={() => setPrikazLegend(false)}>
              <Text style={styles.legendCloseTxt}>ZATVORI</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  gameContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    paddingTop: 6,
  },

  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 22,
    padding: 14,
    marginBottom: 14,
  },
  supportTitle: {
    color: BOJE.textMain,
    fontSize: Math.round(13 * uiScale),
    fontWeight: '900',
    fontFamily: FONT_FAMILY,
  },
  supportCopy: {
    color: BOJE.textMuted,
    fontSize: Math.round(11 * uiScale),
    fontFamily: FONT_FAMILY,
    marginTop: 4,
    lineHeight: 16,
  },
  supportBtn: {
    backgroundColor: BOJE.textMain,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  supportBtnTxt: {
    color: '#000',
    fontSize: Math.round(11 * uiScale),
    fontWeight: '900',
    fontFamily: FONT_FAMILY,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'stretch',
  },
  sandukBtn: {
    borderRadius: 16,
    backgroundColor: 'rgba(10, 15, 27, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.24)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  sandukBtnOtvoren: { borderColor: BOJE.border, opacity: 0.6 },
  sandukEmodzi: { fontSize: 22 },
  sandukDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 1.5,
    borderColor: '#06060F',
  },

  messageBubble: {
    flexDirection: 'row',
    backgroundColor: 'rgba(10, 15, 27, 0.96)',
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 5,
  },
  messageText: { flex: 1, color: BOJE.textMain, fontSize: Math.round(13 * uiScale), fontWeight: '800', fontFamily: FONT_FAMILY, letterSpacing: 0.4, textAlign: 'center' },
  legendBtn: { marginLeft: 8, padding: 2 },
  boostBadge: { alignSelf: 'stretch', backgroundColor: 'rgba(163,230,53,0.10)', borderWidth: 1, borderColor: 'rgba(163,230,53,0.28)', borderRadius: 14, paddingVertical: 8 },
  boostTxt: { color: BOJE.energija, textAlign: 'center', fontFamily: FONT_FAMILY, fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },

  slotMachineOuter: {
    backgroundColor: '#09101B',
    borderRadius: 28,
    borderWidth: 2,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 28,
    elevation: 18,
  },
  slotMachineInner: {
    backgroundColor: '#04070F',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },

  controlDeck: {
    width: '100%',
    backgroundColor: 'rgba(10, 15, 27, 0.94)',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
  },

  betContainer: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 20 },
  betBtn: { paddingVertical: Math.round(12 * uiScale), paddingHorizontal: Math.round(20 * uiScale), borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  betBtnActive: { backgroundColor: BOJE.zlato, borderColor: BOJE.zlato, shadowColor: BOJE.zlato, shadowOpacity: 0.28, shadowRadius: 10, elevation: 5 },
  betBtnText: { fontWeight: '900', fontFamily: FONT_FAMILY, color: BOJE.textMuted, fontSize: Math.round(16 * uiScale) },
  betBtnTextActive: { color: '#000' },

  spinBtn: {
    backgroundColor: BOJE.energija, width: '100%', borderRadius: 24,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.18)',
    shadowColor: BOJE.energija, shadowOpacity: 0.32, shadowRadius: 18, elevation: 10,
  },
  spinBtnDisabled: { opacity: 0.45, shadowOpacity: 0 },
  spinBtnLucky:    { backgroundColor: BOJE.zlato, shadowColor: BOJE.zlato, shadowOpacity: 0.32, shadowRadius: 20, elevation: 12 },
  spinBtnText:     { color: '#000', fontWeight: '900', fontFamily: FONT_FAMILY, letterSpacing: 2.2 },
  spinCostBadge:   { position: 'absolute', right: 18, backgroundColor: 'rgba(6,10,18,0.16)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  spinCostTxt:     { color: '#000', fontWeight: '900', fontFamily: FONT_FAMILY, fontSize: 12, marginRight: 2 },

  gambleContainer: {
    width: '100%', backgroundColor: 'rgba(20, 14, 5, 0.94)', borderRadius: 28,
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.34)', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, elevation: 6,
  },
  gambleTitle:      { color: BOJE.textMuted, fontSize: Math.round(14 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY, letterSpacing: 1.5, marginBottom: 8 },
  gamblePrizesRow:  { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 20 },
  gamblePrizeTxt:   { color: BOJE.zlato, fontSize: Math.round(18 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY, textShadowColor: '#000', textShadowRadius: 5 },
  gambleButtonsRow: { flexDirection: 'row', gap: 12, width: '100%', marginBottom: 14 },
  gambleBtn:        { flex: 1, paddingVertical: Math.round(18 * uiScale), borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 },
  gambleBtnTxt:     { color: '#FFF', fontSize: Math.round(15 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY, letterSpacing: 1 },
  collectBtn:       { backgroundColor: BOJE.energija, width: '100%', paddingVertical: Math.round(18 * uiScale), borderRadius: 18, alignItems: 'center', shadowColor: BOJE.energija, shadowOpacity: 0.35, shadowRadius: 10, elevation: 5 },
  collectBtnTxt:    { color: '#000', fontSize: Math.round(16 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY, letterSpacing: 1 },
  adBtn: { width: '100%', marginBottom: 10, borderRadius: 14, backgroundColor: 'rgba(232,121,249,0.18)', borderWidth: 1, borderColor: 'rgba(232,121,249,0.36)', paddingVertical: 12 },
  adBtnTxt: { textAlign: 'center', color: BOJE.dijamant, fontWeight: '900', fontFamily: FONT_FAMILY, fontSize: 12 },

  luckySpinRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  luckySpinMeter:{ flex: 1, height: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 5, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  luckySpinFill: { height: '100%', borderRadius: 5 },
  luckySpinTxt:  { fontSize: 12, fontWeight: '900', fontFamily: FONT_FAMILY, color: BOJE.textMuted, minWidth: 64, textAlign: 'right' },

  streakTurboRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 12, gap: 8 },
  streakBadge:    { flex: 1, backgroundColor: 'rgba(251,146,60,0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(251,146,60,0.28)' },
  streakTxt:      { color: '#FF8C00', fontSize: 12, fontWeight: '900', fontFamily: FONT_FAMILY, letterSpacing: 0.5 },
  turboBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  turboBtnActive: { backgroundColor: BOJE.energija, borderColor: BOJE.energija },
  turboTxt:       { fontSize: 11, fontWeight: '900', fontFamily: FONT_FAMILY, color: BOJE.textMuted, letterSpacing: 0.5 },
  quickEnergyBtn: { backgroundColor: 'rgba(251,191,36,0.10)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.26)', borderRadius: 14, paddingVertical: 11 },
  quickEnergyTxt: { textAlign: 'center', color: BOJE.zlato, fontFamily: FONT_FAMILY, fontWeight: '900', fontSize: 12 },
  adEnergyBtn: { backgroundColor: 'rgba(163,230,53,0.10)', borderWidth: 1, borderColor: 'rgba(163,230,53,0.26)', borderRadius: 14, paddingVertical: 11 },
  adEnergyTxt: { textAlign: 'center', color: BOJE.energija, fontFamily: FONT_FAMILY, fontWeight: '900', fontSize: 12 },
  adShieldBtn: { marginTop: 8, backgroundColor: 'rgba(34,211,238,0.10)', borderWidth: 1, borderColor: 'rgba(34,211,238,0.28)', borderRadius: 14, paddingVertical: 10 },
  adShieldTxt: { textAlign: 'center', color: BOJE.stit, fontFamily: FONT_FAMILY, fontWeight: '900', fontSize: 12 },
  legendOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  legendCard: { width: '100%', backgroundColor: BOJE.bgCard, borderWidth: 1, borderColor: BOJE.border, borderRadius: 18, padding: 18 },
  legendTitle: { color: BOJE.textMain, fontFamily: FONT_FAMILY, fontWeight: '900', marginBottom: 12, textAlign: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  legendTxt: { color: BOJE.textMuted, fontFamily: FONT_FAMILY, fontSize: 12 },
  legendCloseBtn: { marginTop: 10, backgroundColor: BOJE.energija, borderRadius: 10, paddingVertical: 10 },
  legendCloseTxt: { textAlign: 'center', color: '#000', fontFamily: FONT_FAMILY, fontWeight: '900' },
});

export default SlotScreen;
