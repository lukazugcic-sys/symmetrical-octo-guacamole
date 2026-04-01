import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BOJE, FONT_FAMILY } from '../config/constants';

/**
 * Pill koji prikazuje cijenu jednog resursa.
 * Ako igrač nema dovoljno resursa, prikazuje se crvenom bojom.
 */
const PrikazCijene = ({ Ikona, boja, iznos, trenutno }) => {
  if (!iznos || iznos <= 0) return null;
  const nedostaje = trenutno < iznos;
  return (
    <View style={[styles.pill, nedostaje && styles.pillMissing]}>
      <Ikona size={12} color={nedostaje ? BOJE.slotVatra : boja} strokeWidth={2.5} />
      <Text style={[styles.txt, nedostaje && styles.txtMissing]}>{iznos}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pillMissing: { backgroundColor: BOJE.slotVatra + '15' },
  txt: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: FONT_FAMILY,
    color: BOJE.textMain,
  },
  txtMissing: { color: BOJE.slotVatra },
});

export default PrikazCijene;
