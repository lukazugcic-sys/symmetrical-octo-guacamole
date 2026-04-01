import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Zap } from 'lucide-react-native';
import { useGameStore } from '../store/gameStore';
import { useSlotStore } from '../store/slotStore';
import { useSlotMachine } from '../hooks/useSlotMachine';
import SlotReel from '../components/SlotReel';
import { BOJE, LUCKY_SPIN_INTERVAL, MAX_WIN_STREAK, STREAK_BONUS_PER_WIN, uiScale, FONT_FAMILY } from '../config/constants';
import { Sparkles } from 'lucide-react-native';

/**
 * Ekran automata — vrtnja, prikaz mreže simbola, gamble i preuzimanje dobitka.
 *
 * @param {function} onFlash  - callback za flash overlay (iz App.js)
 * @param {function} onShake  - callback za animaciju tresenja (iz App.js)
 */
const SlotScreen = ({ onFlash, onShake }) => {
  const poruka          = useGameStore((s) => s.poruka);
  const energija        = useGameStore((s) => s.energija);
  const luckySpinCounter = useGameStore((s) => s.luckySpinCounter);
  const winStreak       = useGameStore((s) => s.winStreak);

  const vrti            = useSlotStore((s) => s.vrti);
  const ulog            = useSlotStore((s) => s.ulog);
  const dobitakNaCekanju = useSlotStore((s) => s.dobitakNaCekanju);
  const turboRezim      = useSlotStore((s) => s.turboRezim);
  const setUlog         = useSlotStore((s) => s.setUlog);
  const setTurboRezim   = useSlotStore((s) => s.setTurboRezim);

  const { stupciAnims, stupciBlurs, winScaleAnims, zavrtiMasinu, preuzmiDobitak, igrajGamble } =
    useSlotMachine({ onFlash, onShake });

  const jeFreeSpin = luckySpinCounter === 1;
  const streakMultiplier = 1 + (Math.min(winStreak, MAX_WIN_STREAK) * STREAK_BONUS_PER_WIN);

  return (
    <View style={styles.gameContainer}>
      {/* Poruka */}
      <View style={styles.messageBubble}>
        <Sparkles size={16} color={BOJE.slotVatra} style={{ marginRight: 8 }} />
        <Text style={styles.messageText} numberOfLines={1}>{poruka}</Text>
        <Sparkles size={16} color={BOJE.slotVatra} style={{ marginLeft: 8 }} />
      </View>

      {/* Automat */}
      <View style={styles.slotMachineOuter}>
        <View style={styles.slotMachineInner}>
          <SlotReel
            stupciAnims={stupciAnims}
            stupciBlurs={stupciBlurs}
            winScaleAnims={winScaleAnims}
          />
        </View>
      </View>

      {dobitakNaCekanju ? (
        /* ── Gamble / Preuzmi ──────────────────────────────────────────────── */
        <View style={styles.gambleContainer}>
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
          <TouchableOpacity activeOpacity={0.8} style={styles.collectBtn} onPress={preuzmiDobitak}>
            <Text style={styles.collectBtnTxt}>PREUZMI DOBITAK</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* ── Kontrole vrtnje ────────────────────────────────────────────────── */
        <View style={{ width: '100%' }}>
          {/* Lucky Spin meter */}
          <View style={styles.luckySpinRow}>
            <View style={styles.luckySpinMeter}>
              <View style={[styles.luckySpinFill, { width: `${((LUCKY_SPIN_INTERVAL - luckySpinCounter) / LUCKY_SPIN_INTERVAL) * 100}%` }]} />
            </View>
            <Text style={[styles.luckySpinTxt, jeFreeSpin && { color: BOJE.energija }]}>
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
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.spinBtn,
              jeFreeSpin && styles.spinBtnLucky,
              (vrti || (!jeFreeSpin && energija < ulog)) && styles.spinBtnDisabled,
            ]}
            onPress={zavrtiMasinu}
            disabled={vrti}
          >
            <Zap size={24} color="#000" fill="#000" style={{ position: 'absolute', left: 24 }} />
            <Text style={styles.spinBtnText}>{vrti ? 'VRTIM...' : (jeFreeSpin ? '🍀 FREE SPIN' : 'SPIN')}</Text>
            {!jeFreeSpin && (
              <View style={styles.spinCostBadge}>
                <Text style={styles.spinCostTxt}>-{ulog}</Text>
                <Zap size={10} color="#000" fill="#000" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  gameContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 60 },

  messageBubble: {
    flexDirection: 'row',
    backgroundColor: 'rgba(20, 22, 35, 0.98)',
    paddingHorizontal: 16,
    paddingVertical: Math.round(14 * uiScale),
    borderRadius: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BOJE.slotVatra + '59',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BOJE.slotVatra,
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 7,
  },
  messageText: { color: BOJE.slotVatra, fontSize: Math.round(13 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY, letterSpacing: 1 },

  slotMachineOuter: {
    backgroundColor: '#080A12', padding: 10, borderRadius: 28, borderWidth: 2, borderColor: 'rgba(255,255,255,0.10)',
    width: '100%', marginBottom: 26,
    shadowColor: BOJE.slotVatra, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.30, shadowRadius: 40, elevation: 20,
  },
  slotMachineInner: {
    backgroundColor: BOJE.slotRolaCrna, padding: 10, borderRadius: 20, borderWidth: 2, borderColor: '#000', overflow: 'hidden',
  },

  betContainer: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 20 },
  betBtn: { paddingVertical: Math.round(12 * uiScale), paddingHorizontal: Math.round(22 * uiScale), borderRadius: 22, backgroundColor: BOJE.bgCard, borderWidth: 1, borderColor: BOJE.border },
  betBtnActive: { backgroundColor: BOJE.slotVatra, borderColor: BOJE.slotVatra, shadowColor: BOJE.slotVatra, shadowOpacity: 0.6, shadowRadius: 10, elevation: 6 },
  betBtnText: { fontWeight: '900', fontFamily: FONT_FAMILY, color: BOJE.textMuted, fontSize: Math.round(16 * uiScale) },
  betBtnTextActive: { color: '#FFF' },

  spinBtn: {
    backgroundColor: BOJE.energija, width: '100%', paddingVertical: Math.round(22 * uiScale), borderRadius: 26,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    shadowColor: BOJE.energija, shadowOpacity: 0.55, shadowRadius: 20, elevation: 12,
  },
  spinBtnDisabled: { opacity: 0.5, transform: [{ scale: 0.98 }], shadowOpacity: 0 },
  spinBtnLucky:    { backgroundColor: BOJE.xp, shadowColor: BOJE.xp, shadowOpacity: 0.6, shadowRadius: 22, elevation: 14 },
  spinBtnText:     { color: '#000', fontSize: Math.round(24 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY, letterSpacing: 3 },
  spinCostBadge:   { position: 'absolute', right: 22, backgroundColor: 'rgba(0,0,0,0.18)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  spinCostTxt:     { color: '#000', fontWeight: '900', fontFamily: FONT_FAMILY, fontSize: 12, marginRight: 2 },

  gambleContainer: {
    width: '100%', backgroundColor: 'rgba(255, 215, 0, 0.09)', padding: 20, borderRadius: 28,
    borderWidth: 1, borderColor: BOJE.zlato + '70', alignItems: 'center',
    shadowColor: BOJE.zlato, shadowOpacity: 0.15, shadowRadius: 14, elevation: 6,
  },
  gambleTitle:      { color: BOJE.textMuted, fontSize: Math.round(14 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY, letterSpacing: 1.5, marginBottom: 8 },
  gamblePrizesRow:  { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 20 },
  gamblePrizeTxt:   { color: BOJE.zlato, fontSize: Math.round(18 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY, textShadowColor: '#000', textShadowRadius: 5 },
  gambleButtonsRow: { flexDirection: 'row', gap: 12, width: '100%', marginBottom: 14 },
  gambleBtn:        { flex: 1, paddingVertical: Math.round(18 * uiScale), borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 },
  gambleBtnTxt:     { color: '#FFF', fontSize: Math.round(15 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY, letterSpacing: 1 },
  collectBtn:       { backgroundColor: BOJE.energija, width: '100%', paddingVertical: Math.round(18 * uiScale), borderRadius: 18, alignItems: 'center', shadowColor: BOJE.energija, shadowOpacity: 0.35, shadowRadius: 10, elevation: 5 },
  collectBtnTxt:    { color: '#000', fontSize: Math.round(16 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY, letterSpacing: 1 },

  luckySpinRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  luckySpinMeter:{ flex: 1, height: 8, backgroundColor: 'rgba(0,255,170,0.1)', borderRadius: 4, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,255,170,0.2)' },
  luckySpinFill: { height: '100%', backgroundColor: BOJE.xp, borderRadius: 4 },
  luckySpinTxt:  { fontSize: 12, fontWeight: '900', fontFamily: FONT_FAMILY, color: BOJE.textMuted, minWidth: 64, textAlign: 'right' },

  streakTurboRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 12, gap: 8 },
  streakBadge:    { flex: 1, backgroundColor: 'rgba(255, 100, 0, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 100, 0, 0.4)' },
  streakTxt:      { color: '#FF8C00', fontSize: 12, fontWeight: '900', fontFamily: FONT_FAMILY, letterSpacing: 0.5 },
  turboBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: BOJE.bgCard, borderWidth: 1, borderColor: BOJE.border },
  turboBtnActive: { backgroundColor: BOJE.energija, borderColor: BOJE.energija },
  turboTxt:       { fontSize: 11, fontWeight: '900', fontFamily: FONT_FAMILY, color: BOJE.textMuted, letterSpacing: 0.5 },
});

export default SlotScreen;
