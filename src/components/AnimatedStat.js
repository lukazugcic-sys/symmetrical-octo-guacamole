import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  ReduceMotion,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const POP_SPRING = { damping: 8, stiffness: 320, reduceMotion: ReduceMotion.Never };
const RESET_SPRING = { damping: 14, stiffness: 220, reduceMotion: ReduceMotion.Never };
const SHAKE_TIMING = { duration: 60, reduceMotion: ReduceMotion.Never };
const SHAKE_SPRING = { damping: 12, stiffness: 260, reduceMotion: ReduceMotion.Never };

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
        withSpring(1.14, POP_SPRING),
        withSpring(1.0, RESET_SPRING)
      );
    } else {
      // Smanjenje — kratki shake
      scale.value = withSequence(
        withTiming(0.94, SHAKE_TIMING),
        withSpring(1.0, SHAKE_SPRING)
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
