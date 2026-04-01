import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useGameStore } from '../store/gameStore';
import { BOJE, FONT_FAMILY, uiScale } from '../config/constants';

/**
 * Poruka o level-upu koja se uklizava s vrha ekrana, ostaje 2.5 s i odlazi.
 * Uvijek je montirana; vidljivost se kontrolira isključivo Reanimated vrijednostima.
 */
const LevelUpToast = () => {
  const levelUpData = useGameStore((s) => s.levelUpData);
  const clearLevelUp = useGameStore((s) => s.clearLevelUp);

  // Lokalni snapshot podataka — osigurava točan tekst i za vrijeme izlazne animacije
  const [lokalniPodaci, setLokalniPodaci] = useState(null);

  const translateY = useSharedValue(-140);
  const opacity    = useSharedValue(0);

  useEffect(() => {
    if (!levelUpData) return;

    setLokalniPodaci(levelUpData);

    // Uklizaj u ekran
    translateY.value = withSpring(0, { damping: 14, stiffness: 90 });
    opacity.value    = withTiming(1, { duration: 220 });

    // Nakon 2.5 s — izvuci van i resetiraj store
    const timer = setTimeout(() => {
      translateY.value = withTiming(-140, { duration: 380 });
      opacity.value    = withTiming(0, { duration: 380 }, (finished) => {
        if (finished) runOnJS(clearLevelUp)();
      });
    }, 2500);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelUpData]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity:   opacity.value,
  }));

  return (
    <Animated.View style={[styles.toast, animStyle]} pointerEvents="none">
      <View style={styles.inner}>
        <Text style={styles.emoji}>🎉</Text>
        <View>
          <Text style={styles.label}>LEVEL UP!</Text>
          <Text style={styles.razina}>Razina {lokalniPodaci?.razina}</Text>
        </View>
        <Text style={styles.emoji}>🎉</Text>
      </View>
      <Text style={styles.bonus}>+5 💎 · Energija napunjena</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toast: {
    position:        'absolute',
    top:             0,
    left:            16,
    right:           16,
    zIndex:          160,
    backgroundColor: 'rgba(12, 14, 28, 0.97)',
    borderRadius:    20,
    borderWidth:     1.5,
    borderColor:     BOJE.xp + '90',
    paddingVertical: Math.round(12 * uiScale),
    paddingHorizontal: 18,
    alignItems:      'center',
    shadowColor:     BOJE.xp,
    shadowOpacity:   0.65,
    shadowRadius:    20,
    elevation:       18,
  },
  inner: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            14,
    marginBottom:   4,
  },
  emoji: {
    fontSize: Math.round(24 * uiScale),
  },
  label: {
    fontSize:    Math.round(20 * uiScale),
    fontWeight:  '900',
    fontFamily:  FONT_FAMILY,
    color:       BOJE.xp,
    letterSpacing: 2,
  },
  razina: {
    fontSize:   Math.round(13 * uiScale),
    fontWeight: '700',
    fontFamily: FONT_FAMILY,
    color:      BOJE.textMuted,
    marginTop:  2,
    letterSpacing: 0.5,
  },
  bonus: {
    fontSize:   Math.round(12 * uiScale),
    fontWeight: '700',
    fontFamily: FONT_FAMILY,
    color:      BOJE.dijamant,
    letterSpacing: 0.3,
  },
});

export default LevelUpToast;
