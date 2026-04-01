import React, { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BOJE, uiScale, FONT_FAMILY } from '../config/constants';

/**
 * Animirani banner prikazan na vrhu SlotScreen-a za trajanja aktivnog događaja.
 * Ulazi s animacijom odozgo; pritiskom nestaje (samo vizualno, ne završava event).
 *
 * @param {object} dogadaj — sezonalni događaj iz SEZONALNI_DOGADAJI (ili null)
 */
const EventBanner = ({ dogadaj }) => {
  const slideAnim = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    if (!dogadaj) return;
    Animated.spring(slideAnim, {
      toValue: 0,
      friction: 7,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [dogadaj, slideAnim]);

  if (!dogadaj) return null;

  const dismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -80,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.banner,
        { backgroundColor: dogadaj.boja + '22', borderColor: dogadaj.boja + '80' },
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Text style={styles.emodzi}>{dogadaj.emodzi}</Text>
      <Text style={[styles.naziv, { color: dogadaj.boja }]}>{dogadaj.naziv.toUpperCase()}</Text>
      <Text style={styles.opis} numberOfLines={1}>{dogadaj.opis}</Text>
      <Text style={[styles.bonus, { color: dogadaj.boja }]}>
        ×{dogadaj.bonusMnozitelj} DOBITAK
      </Text>
      <TouchableOpacity onPress={dismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.zatvori}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  emodzi:  { fontSize: 20 },
  naziv:   { fontSize: Math.round(12 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY, letterSpacing: 0.8 },
  opis:    { flex: 1, fontSize: Math.round(11 * uiScale), color: BOJE.textMuted, fontFamily: FONT_FAMILY },
  bonus:   { fontSize: Math.round(12 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY },
  zatvori: { color: BOJE.textMuted, fontSize: 14, paddingLeft: 4 },
});

export default EventBanner;
