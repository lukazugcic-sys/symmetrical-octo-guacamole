import React, { useEffect } from 'react';
import { Animated, StyleSheet } from 'react-native';
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing as ReEasing,
} from 'react-native-reanimated';
import { useSlotStore } from '../store/slotStore';
import { BLAGO, BOJE, slotSize, uiScale } from '../config/constants';

// ─── Pulsing glow overlay za pobjednička polja ────────────────────────────────
const WinPulse = React.memo(() => {
  const glow = useSharedValue(0);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1,   { duration: 350, easing: ReEasing.out(ReEasing.quad) }),
        withTiming(0.15, { duration: 350, easing: ReEasing.in(ReEasing.quad) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(glow);
  }, [glow]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  return <ReAnimated.View style={[StyleSheet.absoluteFill, styles.winPulseLayer, pulseStyle]} />;
});

/**
 * Mreža automata — 5 stupaca × 3 reda.
 * Animacije stupaca i mjerila polja dolaze iz useSlotMachine hooka.
 *
 * @param {Animated.Value[]} stupciAnims   - translacija Y po stupcu
 * @param {Animated.Value[]} stupciBlurs   - opacity po stupcu (zamućenje pri vrtnji)
 * @param {Animated.Value[]} winScaleAnims - mjerilo skaliranja po ćeliji
 */
const SlotReel = ({ stupciAnims, stupciBlurs, winScaleAnims }) => {
  const simboli      = useSlotStore((s) => s.simboli);
  const dobitnaPolja = useSlotStore((s) => s.dobitnaPolja);

  const hasWinAnywhere = dobitnaPolja.length > 0;

  return (
    <Animated.View style={styles.gridColumnsWrapper}>
      {[0, 1, 2, 3, 4].map((stupacIndex) => (
        <Animated.View
          key={stupacIndex}
          style={[
            styles.gridColumn,
            {
              transform: [{ translateY: stupciAnims[stupacIndex] }],
              opacity: stupciBlurs[stupacIndex],
            },
          ]}
        >
          {[0, 1, 2].map((redIndex) => {
            const apsolutniIndeks = redIndex * 5 + stupacIndex;
            const simbolId = simboli[apsolutniIndeks];
            const isWin    = dobitnaPolja.includes(apsolutniIndeks);
            const SIcon    = BLAGO[simbolId].Ikona;
            const boja     = BLAGO[simbolId].boja;
            const bgBoja   = BLAGO[simbolId].raritet;
            const isWild   = simbolId === 'wild';
            const opacity  = (!isWin && hasWinAnywhere) ? 0.2 : 1;

            return (
              <Animated.View
                key={apsolutniIndeks}
                style={[
                  styles.slotItem,
                  { backgroundColor: bgBoja, borderColor: boja + (isWild ? '80' : '40') },
                  isWin && [styles.slotItemWinning, { borderColor: BOJE.slotVatra, shadowColor: BOJE.slotVatra }],
                  { transform: [{ scale: winScaleAnims[apsolutniIndeks] }], opacity },
                ]}
              >
                {isWin && <WinPulse />}
                <SIcon
                  size={slotSize * (isWild ? 0.65 : 0.55)}
                  color={isWin ? '#FFF' : boja}
                  strokeWidth={isWin ? 2.5 : 2}
                />
              </Animated.View>
            );
          })}
        </Animated.View>
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  gridColumnsWrapper: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  gridColumn:         { flex: 1, gap: 6 },
  slotItem: {
    width: slotSize,
    height: slotSize,
    borderRadius: Math.round(16 * uiScale),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  slotItemWinning: {
    borderWidth: 3,
    borderRadius: Math.round(16 * uiScale),
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 12,
    backgroundColor: BOJE.slotVatra + '2E',
  },
  winPulseLayer: {
    borderRadius: Math.round(14 * uiScale),
    backgroundColor: BOJE.slotVatra + '55',
  },
});

export default SlotReel;
