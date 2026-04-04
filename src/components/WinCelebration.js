import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import Animated, {
  ReduceMotion,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useSlotStore } from '../store/slotStore';

const { width: SW, height: SH } = Dimensions.get('window');

const WIN_EMOJIS     = ['🪙', '⭐', '✨', '💫', '🌟'];
const JACKPOT_EMOJIS = ['🪙', '💎', '👑', '🌟', '✨', '🎰', '💰', '🔥'];
const FADE_IN = { duration: 110, reduceMotion: ReduceMotion.Never };
const FADE_OUT = { duration: 320, reduceMotion: ReduceMotion.Never };
const PARTICLE_MOVE = { duration: 680, easing: Easing.out(Easing.quad), reduceMotion: ReduceMotion.Never };
const PARTICLE_POP = { damping: 12, stiffness: 220, reduceMotion: ReduceMotion.Never };

// ─── Pojedinačna čestica ──────────────────────────────────────────────────────
const Particle = React.memo(({ emoji, targetX, targetY, delay: d, size }) => {
  const tx      = useSharedValue(0);
  const ty      = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale   = useSharedValue(0);

  useEffect(() => {
    // Fade-in + rast
    opacity.value = withDelay(d, withSequence(
      withTiming(1, FADE_IN),
      withDelay(360, withTiming(0, FADE_OUT))
    ));
    scale.value = withDelay(d, withSpring(1, PARTICLE_POP));

    // Kretanje prema cilju
    tx.value = withDelay(d, withTiming(targetX, PARTICLE_MOVE));
    ty.value = withDelay(d, withTiming(targetY, PARTICLE_MOVE));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[styles.particle, animStyle]}>
      <Text style={{ fontSize: size, lineHeight: size * 1.25 }}>{emoji}</Text>
    </Animated.View>
  );
});

// ─── Generira konfiguraciju čestica ──────────────────────────────────────────
const generirajCestice = (tip) => {
  const jeJackpot = tip === 'jackpot';
  const count     = jeJackpot ? 28 : 16;
  const emojis    = jeJackpot ? JACKPOT_EMOJIS : WIN_EMOJIS;

  return Array.from({ length: count }, (_, i) => {
    const angle    = (i / count) * 2 * Math.PI + (Math.random() - 0.5) * 0.7;
    const distance = (jeJackpot ? 110 : 70) + Math.random() * 110;
    return {
      id:      i,
      emoji:   emojis[Math.floor(Math.random() * emojis.length)],
      targetX: Math.cos(angle) * distance,
      targetY: Math.sin(angle) * distance - 30, // blagi uzlazni pomak
      delay:   Math.floor(Math.random() * (jeJackpot ? 280 : 180)),
      size:    jeJackpot
                 ? 18 + Math.floor(Math.random() * 14)
                 : 14 + Math.floor(Math.random() * 12),
    };
  });
};

// ─── Kontejner proslave ───────────────────────────────────────────────────────
const WinCelebration = () => {
  const winCelebration = useSlotStore((s) => s.winCelebration);
  const celebrationKey = useSlotStore((s) => s.celebrationKey);
  const setWinCelebration = useSlotStore((s) => s.setWinCelebration);

  const [lokalniTip, setLokalniTip] = useState(null);

  // Svaki put kad celebrationKey poraste i winCelebration nije null — aktiviraj
  useEffect(() => {
    if (!winCelebration) return;
    setLokalniTip(winCelebration);
    const timer = setTimeout(() => {
      setWinCelebration(null);
    }, 1200);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebrationKey]);

  const cestice = useMemo(
    () => (lokalniTip ? generirajCestice(lokalniTip) : []),
    // Regeneriraj čestice za svaku novu proslavu
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [celebrationKey, lokalniTip]
  );

  if (!lokalniTip || cestice.length === 0) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      {cestice.map((c) => (
        <Particle
          key={`${celebrationKey}-${c.id}`}
          emoji={c.emoji}
          targetX={c.targetX}
          targetY={c.targetY}
          delay={c.delay}
          size={c.size}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  particle: {
    position: 'absolute',
  },
});

export default WinCelebration;
