import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

/**
 * Wrapper za stat chip koji animira (pulse / shake) pri promjeni vrijednosti.
 *
 * @param {number|string} value     - Vrijednost za prikaz (ažuriranje trigerira animaciju)
 * @param {object}        style     - StyleSheet koji se primjenjuje na Animated.View
 * @param {ReactNode}     children  - Ikona + tekst unutar chipa
 */
const AnimatedStat = ({ value, style, children }) => {
  const scale  = useSharedValue(1);
  const prevValue = useRef(value);

  useEffect(() => {
    const prev = prevValue.current;
    prevValue.current = value;

    if (prev === value) return;

    if (value > prev) {
      // Povećanje — zeleni pop efekt
      scale.value = withSequence(
        withSpring(1.38, { damping: 5, stiffness: 260 }),
        withSpring(1.0,  { damping: 10, stiffness: 160 })
      );
    } else {
      // Smanjenje — kratki shake
      scale.value = withSequence(
        withTiming(0.82, { duration: 70 }),
        withSpring(1.0,  { damping: 8, stiffness: 220 })
      );
    }
  }, [value]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[style, animStyle]}>
      {children}
    </Animated.View>
  );
};

export default AnimatedStat;
