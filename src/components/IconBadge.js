import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BOJE } from '../config/constants';

/**
 * Okrugli badge koji prikazuje ikonu unutar obojenog okvira.
 * Koristi se kao vizualni identifikator resursa ili zgrada.
 */
const IconBadge = ({ Ikona, boja, velicina = 24 }) => (
  <View style={[styles.badge, { backgroundColor: boja + '15', borderColor: boja + '50' }]}>
    <Ikona size={velicina} color={boja} strokeWidth={2} />
  </View>
);

const styles = StyleSheet.create({
  badge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});

export default IconBadge;
