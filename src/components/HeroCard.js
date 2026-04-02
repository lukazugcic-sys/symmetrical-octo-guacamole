import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  BOJE, uiScale, FONT_FAMILY,
  RARITET_BOJE, RARITET_NAZIVI, HERO_FRAGMENTI_ZA_OTKLJ, HERO_FRAGMENTI_ZA_RAZINU,
  HERO_MAX_RAZINA,
} from '../config/constants';

const formatBonus = (tipBonusa, bonusPoRazini, razina) => {
  const val = bonusPoRazini * razina;
  if (tipBonusa === 'stit') return `+${val} max štit`;
  if (tipBonusa === 'energija') return `+${val.toFixed(1)} en/tik`;
  return `+${val % 1 === 0 ? val : val.toFixed(1)}%`;
};

/**
 * Prikazuje jednu karticu junaka s razinom, fragmentima i aktivacijskim gumbom.
 */
const HeroCard = ({ hero, heroState = {}, aktivan, onActivate }) => {
  const { fragmenti = 0, razina = 0 } = heroState;
  const otkriven     = razina > 0;
  const maxed        = razina >= HERO_MAX_RAZINA;
  const potrebno     = razina === 0
    ? HERO_FRAGMENTI_ZA_OTKLJ
    : (maxed ? 0 : HERO_FRAGMENTI_ZA_RAZINU);
  const progresPos   = maxed ? 1 : Math.min(1, fragmenti / Math.max(1, potrebno));
  const raritetBoja  = RARITET_BOJE[hero.raritet] ?? BOJE.textMuted;

  return (
    <View style={[styles.card, { borderColor: raritetBoja + '55', opacity: otkriven ? 1 : 0.65 }]}>
      {/* ── Gornji red: emoji + info + razina ── */}
      <View style={styles.topRow}>
        <View style={[styles.emojiWrap, { backgroundColor: raritetBoja + '22' }]}>
          <Text style={styles.emoji}>{hero.emodzi}</Text>
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.naziv}>{hero.naziv}</Text>
          <View style={[styles.raritetBadge, { backgroundColor: raritetBoja + '22', borderColor: raritetBoja + '88' }]}>
            <Text style={[styles.raritetTxt, { color: raritetBoja }]}>
              {RARITET_NAZIVI[hero.raritet]?.toUpperCase() ?? hero.raritet.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Zvjezdice razine */}
        {otkriven && (
          <View style={styles.razinaBlock}>
            <Text style={[styles.zvjezdice, { color: raritetBoja }]}>
              {'★'.repeat(razina)}{'☆'.repeat(HERO_MAX_RAZINA - razina)}
            </Text>
          </View>
        )}
      </View>

      {/* ── Opis bonusa ── */}
      <Text style={styles.opis}>{hero.opisBonusa}</Text>

      {otkriven && (
        <Text style={[styles.bonusTxt, { color: raritetBoja }]}>
          Trenutno: {formatBonus(hero.tipBonusa, hero.bonusPoRazini, razina)}
        </Text>
      )}

      {/* ── Progress bar fragmenti ── */}
      {!maxed && (
        <View style={styles.progressOuter}>
          <View style={[styles.progressInner, { width: `${Math.round(progresPos * 100)}%`, backgroundColor: raritetBoja }]} />
          <Text style={styles.fragTxt}>
            {fragmenti}/{potrebno} 🔮 {otkriven ? `(LVL ${razina + 1})` : '(otkrić)'}
          </Text>
        </View>
      )}
      {maxed && (
        <Text style={[styles.maxTxt, { color: raritetBoja }]}>✨ MAKSIMALNA RAZINA</Text>
      )}

      {/* ── Aktivacijski gumb ── */}
      {otkriven ? (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onActivate}
          style={[styles.btn, aktivan ? { backgroundColor: raritetBoja } : styles.btnInactive]}
        >
          <Text style={[styles.btnTxt, aktivan && { color: '#000' }]}>
            {aktivan ? '✓ AKTIVNO' : 'AKTIVIRAJ'}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.lockedRow}>
          <Text style={styles.lockedTxt}>🔒 Treba još {Math.max(0, HERO_FRAGMENTI_ZA_OTKLJ - fragmenti)} fragmenata</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: BOJE.bgCard,
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  topRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12 },
  emojiWrap:    { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  emoji:        { fontSize: Math.round(26 * uiScale) },
  infoBlock:    { flex: 1 },
  naziv:        { fontSize: Math.round(16 * uiScale), fontWeight: '800', fontFamily: FONT_FAMILY, color: BOJE.textMain, marginBottom: 4 },
  raritetBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  raritetTxt:   { fontSize: Math.round(10 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY, letterSpacing: 0.5 },
  razinaBlock:  { alignItems: 'flex-end' },
  zvjezdice:    { fontSize: Math.round(13 * uiScale), letterSpacing: 2 },
  opis:         { fontSize: Math.round(12 * uiScale), color: BOJE.textMuted, fontFamily: FONT_FAMILY, marginBottom: 4, lineHeight: 17 },
  bonusTxt:     { fontSize: Math.round(12 * uiScale), fontWeight: '700', fontFamily: FONT_FAMILY, marginBottom: 8 },
  progressOuter:{
    height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden', marginBottom: 4, position: 'relative',
  },
  progressInner:{ height: '100%', borderRadius: 4 },
  fragTxt:      { fontSize: Math.round(10 * uiScale), color: BOJE.textMuted, fontFamily: FONT_FAMILY, marginBottom: 10, marginTop: 2 },
  maxTxt:       { fontSize: Math.round(12 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY, textAlign: 'center', marginBottom: 10 },
  btn: {
    paddingVertical: Math.round(11 * uiScale), borderRadius: 14,
    alignItems: 'center', marginTop: 4,
  },
  btnInactive: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  btnTxt:       { fontSize: Math.round(12 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY, color: BOJE.textMain, letterSpacing: 0.8 },
  lockedRow:    { alignItems: 'center', marginTop: 4 },
  lockedTxt:    { fontSize: Math.round(11 * uiScale), color: BOJE.textMuted, fontFamily: FONT_FAMILY },
});

export default HeroCard;
