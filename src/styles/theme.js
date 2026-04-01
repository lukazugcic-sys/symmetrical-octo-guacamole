import { StyleSheet } from 'react-native';
import { BOJE, uiScale, FONT_FAMILY } from '../config/constants';

// Dijeljeni stilovi koji se koriste na više ekrana / komponenti.
const theme = StyleSheet.create({
  // Kartice
  card: {
    backgroundColor: BOJE.bgCard,
    padding: 20,
    borderRadius: 24,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BOJE.border,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  cardMaxed: {
    borderColor: BOJE.zlato + '40',
    backgroundColor: BOJE.zlato + '08',
  },
  cardDamaged: {
    borderColor: BOJE.slotVatra,
    backgroundColor: BOJE.slotVatra + '0F',
    shadowColor: BOJE.slotVatra,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  cardTitle: {
    fontSize: Math.round(17 * uiScale),
    fontWeight: '800',
    fontFamily: FONT_FAMILY,
    color: BOJE.textMain,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: BOJE.border,
    paddingTop: 14,
  },

  // Ikone / badgevi
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Gumbi za akcije
  actionBtn: {
    paddingHorizontal: Math.round(20 * uiScale),
    paddingVertical: Math.round(12 * uiScale),
    borderRadius: 14,
  },
  actionBtnTxt: {
    color: '#000',
    fontWeight: '900',
    fontFamily: FONT_FAMILY,
    fontSize: Math.round(13 * uiScale),
    letterSpacing: 0.5,
  },
  maxTxt: {
    color: BOJE.zlato,
    fontWeight: '800',
    fontFamily: FONT_FAMILY,
    fontSize: Math.round(13 * uiScale),
    letterSpacing: 1,
  },

  // Redak s cijenom resursa
  costRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    flex: 1,
    paddingRight: 10,
    alignItems: 'center',
  },
  costPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  costPillMissing: { backgroundColor: BOJE.slotVatra + '15' },
  costTxt: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: FONT_FAMILY,
    color: BOJE.textMain,
  },
  costMissing: { color: BOJE.slotVatra },

  // Chip za nagradu misije
  rewardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rewardTxt: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: FONT_FAMILY,
    marginLeft: 4,
  },

  // Scroll sadržaj
  scrollContent: { paddingBottom: 120, paddingTop: 10 },

  // Podnaslov sekcije
  subTitle: {
    fontSize: Math.round(16 * uiScale),
    fontWeight: '900',
    fontFamily: FONT_FAMILY,
    color: BOJE.textMain,
    marginBottom: 16,
    marginLeft: 4,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});

export default theme;
