import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Zap, Coins, Gem, Shield, TreePine, Mountain, Pickaxe, TrendingUp, Crown } from 'lucide-react-native';
import { useGameStore } from '../store/gameStore';
import AnimatedStat from './AnimatedStat';
import { BOJE, uiScale, FONT_FAMILY } from '../config/constants';
import { izracunajMaxStitova, izracunajPotrebniXp, izracunajPasivniMnozitelj } from '../utils/economy';

/**
 * Globalno zaglavlje aplikacije — razina, XP bar, resursi, obrana.
 */
const Header = () => {
  const igracRazina    = useGameStore((s) => s.igracRazina);
  const prestigeRazina = useGameStore((s) => s.prestigeRazina);
  const xp             = useGameStore((s) => s.xp);
  const energija       = useGameStore((s) => s.energija);
  const zlato          = useGameStore((s) => s.zlato);
  const dijamanti      = useGameStore((s) => s.dijamanti);
  const resursi        = useGameStore((s) => s.resursi);
  const stitovi        = useGameStore((s) => s.stitovi);
  const razine         = useGameStore((s) => s.razine);

  const maxStitova      = izracunajMaxStitova(razine.oklop || 0);
  const potrebanXp      = izracunajPotrebniXp(igracRazina);
  const pasivniMnozitelj = izracunajPasivniMnozitelj(igracRazina, prestigeRazina);

  return (
    <View style={styles.header}>
      {/* Razina + XP bar */}
      <View style={styles.levelContainer}>
        <View style={styles.levelBadgeOuter}>
          <Text style={styles.levelBadgeTxt}>{igracRazina}</Text>
        </View>

        {prestigeRazina > 0 && (
          <View style={styles.prestigeBadgeOuter}>
            <Crown size={14} color="#000" style={{ marginRight: 2 }} />
            <Text style={styles.levelBadgeTxt}>{prestigeRazina}</Text>
          </View>
        )}

        <View style={styles.xpBarContainer}>
          <View style={[styles.xpBarFill, { width: `${Math.min(100, (xp / potrebanXp) * 100)}%` }]} />
          <Text style={styles.xpText}>{xp} / {potrebanXp} XP</Text>
        </View>

        <View style={[styles.multiplierBadge, prestigeRazina > 0 && { backgroundColor: BOJE.prestige }]}>
          <TrendingUp size={12} color="#000" style={{ marginRight: 2 }} />
          <Text style={styles.multiplierTxt}>{pasivniMnozitelj.toFixed(2)}x</Text>
        </View>
      </View>

      {/* Zlato, energija, dijamanti */}
      <View style={styles.headerMainStats}>
        <AnimatedStat value={Math.floor(energija)} style={styles.statChip}>
          <Zap size={16} color={BOJE.energija} strokeWidth={2.5} />
          <Text style={styles.statChipTxt}>{Math.floor(energija)}</Text>
        </AnimatedStat>
        <AnimatedStat value={Math.floor(zlato)} style={styles.statChip}>
          <Coins size={16} color={BOJE.zlato} strokeWidth={2.5} />
          <Text style={styles.statChipTxt}>{Math.floor(zlato)}</Text>
        </AnimatedStat>
        <AnimatedStat value={dijamanti} style={styles.statChip}>
          <Gem size={16} color={BOJE.dijamant} strokeWidth={2.5} />
          <Text style={styles.statChipTxt}>{dijamanti}</Text>
        </AnimatedStat>
      </View>

      {/* Resursi */}
      <View style={styles.resourceHeaderRow}>
        <AnimatedStat value={Math.floor(resursi.drvo)} style={styles.resMiniChip}>
          <TreePine size={14} color={BOJE.drvo} strokeWidth={2.5} />
          <Text style={styles.resChipTxt}>{Math.floor(resursi.drvo)}</Text>
        </AnimatedStat>
        <AnimatedStat value={Math.floor(resursi.kamen)} style={styles.resMiniChip}>
          <Mountain size={14} color={BOJE.kamen} strokeWidth={2.5} />
          <Text style={styles.resChipTxt}>{Math.floor(resursi.kamen)}</Text>
        </AnimatedStat>
        <AnimatedStat value={Math.floor(resursi.zeljezo)} style={styles.resMiniChip}>
          <Pickaxe size={14} color={BOJE.zeljezo} strokeWidth={2.5} />
          <Text style={styles.resChipTxt}>{Math.floor(resursi.zeljezo)}</Text>
        </AnimatedStat>
      </View>

      {/* Obrana */}
      <View style={styles.defenseMatrix}>
        <Shield size={16} color={BOJE.stit} strokeWidth={2.5} style={{ marginRight: 8 }} />
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
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 44 : 16,
    paddingBottom: 14,
    zIndex: 10,
    backgroundColor: 'rgba(4, 4, 8, 0.96)',
    borderBottomWidth: 1,
    borderColor: BOJE.border,
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 8,
  },
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BOJE.slotOkvirZlato,
    borderRadius: 26,
    padding: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BOJE.border,
  },
  levelBadgeOuter: {
    width: Math.round(34 * uiScale),
    height: Math.round(34 * uiScale),
    borderRadius: Math.round(17 * uiScale),
    backgroundColor: BOJE.xp,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BOJE.xp,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 5,
  },
  prestigeBadgeOuter: {
    width: Math.round(34 * uiScale),
    height: Math.round(34 * uiScale),
    borderRadius: Math.round(17 * uiScale),
    backgroundColor: BOJE.prestige,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BOJE.prestige,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 5,
    marginLeft: 6,
    flexDirection: 'row',
  },
  levelBadgeTxt: {
    color: '#000',
    fontWeight: '900',
    fontSize: Math.round(16 * uiScale),
    fontFamily: FONT_FAMILY,
  },
  xpBarContainer: {
    flex: 1,
    height: Math.round(18 * uiScale),
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: Math.round(9 * uiScale),
    marginHorizontal: 10,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  xpBarFill: {
    position: 'absolute',
    height: '100%',
    backgroundColor: BOJE.xp,
    borderRadius: Math.round(9 * uiScale),
  },
  xpText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    color: '#FFF',
    fontSize: Math.round(10 * uiScale),
    fontWeight: '800',
    fontFamily: FONT_FAMILY,
    textShadowColor: '#000',
    textShadowRadius: 2,
  },
  multiplierBadge: {
    backgroundColor: BOJE.xp,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: BOJE.xp,
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  multiplierTxt: {
    color: '#000',
    fontSize: Math.round(11 * uiScale),
    fontWeight: '900',
    fontFamily: FONT_FAMILY,
  },
  headerMainStats: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  statChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BOJE.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BOJE.border,
    height: Math.round(40 * uiScale),
    gap: 6,
  },
  statChipTxt: {
    fontSize: Math.round(15 * uiScale),
    fontWeight: '800',
    fontFamily: FONT_FAMILY,
    color: BOJE.textMain,
  },
  resourceHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 8 },
  resMiniChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BOJE.bgCard,
    paddingVertical: Math.round(6 * uiScale),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BOJE.border,
    gap: 6,
  },
  resChipTxt: {
    fontSize: Math.round(13 * uiScale),
    fontWeight: '800',
    fontFamily: FONT_FAMILY,
    color: BOJE.textMain,
  },
  defenseMatrix: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BOJE.stit + '10',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BOJE.stit + '40',
  },
  defenseTitle: {
    color: BOJE.stit,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: FONT_FAMILY,
    letterSpacing: 1,
    marginRight: 12,
  },
  shieldSlotsContainer: { flex: 1, flexDirection: 'row', gap: 6 },
  shieldSlot: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  shieldActive: { borderColor: BOJE.stit, backgroundColor: BOJE.stit + '33' },
  shieldEmpty:  { opacity: 0.5 },
  shieldGlow: {
    width: '100%',
    height: '100%',
    backgroundColor: BOJE.stit,
    shadowColor: BOJE.stit,
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
});

export default Header;
