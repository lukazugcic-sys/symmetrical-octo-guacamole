import React, { useEffect, useMemo } from 'react';
import { Animated, StyleSheet, useWindowDimensions } from 'react-native';
import ReAnimated, {
  ReduceMotion,
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

const PULSE_IN = { duration: 240, easing: ReEasing.out(ReEasing.quad), reduceMotion: ReduceMotion.Never };
const PULSE_OUT = { duration: 220, easing: ReEasing.in(ReEasing.quad), reduceMotion: ReduceMotion.Never };

// ─── Pulsing glow overlay za pobjednička polja ────────────────────────────────
const WinPulse = React.memo(() => {
  const glow = useSharedValue(0);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, PULSE_IN),
        withTiming(0.15, PULSE_OUT),
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
 * @param {Animated.Value[]} stupciAnims   - progress 0..1 po stupcu
 * @param {Animated.Value[]} stupciBlurs   - opacity po stupcu (zamućenje pri vrtnji)
 * @param {Animated.Value[]} winScaleAnims - mjerilo skaliranja po ćeliji
 */
const SlotReel = ({ stupciAnims, stupciBlurs, winScaleAnims }) => {
  const { width } = useWindowDimensions();
  const simboli      = useSlotStore((s) => s.simboli);
  const reelColumns  = useSlotStore((s) => s.reelColumns);
  const dobitnaPolja = useSlotStore((s) => s.dobitnaPolja);

  const hasWinAnywhere = dobitnaPolja.length > 0;
  const compactUi = width < 390;
  const reelGap = compactUi ? 4 : 6;
  const reelTileSize = useMemo(() => {
    const estimatedSize = Math.floor((width - (compactUi ? 88 : 96)) / 5);
    return Math.max(46, Math.min(slotSize, estimatedSize));
  }, [compactUi, width]);
  const tileRadius = Math.round((compactUi ? 14 : 16) * uiScale);
  const viewportHeight = (reelTileSize * 3) + (reelGap * 2);

  return (
    <Animated.View style={[styles.gridColumnsWrapper, { gap: reelGap }]}>
      {[0, 1, 2, 3, 4].map((stupacIndex) => {
        const finalColumn = [
          simboli[stupacIndex],
          simboli[stupacIndex + 5],
          simboli[stupacIndex + 10],
        ];
        const columnSymbols = reelColumns?.[stupacIndex]?.length ? reelColumns[stupacIndex] : finalColumn;
        const travelSteps = Math.max(0, columnSymbols.length - 3);
        const pitch = reelTileSize + reelGap;
        const translateY = travelSteps > 0
          ? Animated.multiply(stupciAnims[stupacIndex], -(travelSteps * pitch))
          : 0;

        return (
          <Animated.View
            key={stupacIndex}
            style={[
              styles.gridColumnViewport,
              {
                height: viewportHeight,
                borderRadius: tileRadius + 2,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.gridColumn,
                {
                  transform: [{ translateY }],
                  opacity: stupciBlurs[stupacIndex],
                },
              ]}
            >
              {columnSymbols.map((simbolId, stripIndex) => {
                const finalRowIndex = stripIndex - (columnSymbols.length - 3);
                const apsolutniIndeks = finalRowIndex >= 0 ? (finalRowIndex * 5) + stupacIndex : -1;
                const isWin = apsolutniIndeks >= 0 && dobitnaPolja.includes(apsolutniIndeks);
                const SIcon = BLAGO[simbolId].Ikona;
                const boja = BLAGO[simbolId].boja;
                const bgBoja = BLAGO[simbolId].raritet;
                const isWild = simbolId === 'wild';
                const opacity = (apsolutniIndeks >= 0 && !isWin && hasWinAnywhere) ? 0.26 : 1;
                const scaleTransform = apsolutniIndeks >= 0
                  ? winScaleAnims[apsolutniIndeks]
                  : 1;

                return (
                  <Animated.View
                    key={`${stupacIndex}-${stripIndex}`}
                    style={[
                      styles.slotItem,
                      {
                        width: reelTileSize,
                        height: reelTileSize,
                        borderRadius: tileRadius,
                        marginBottom: stripIndex === columnSymbols.length - 1 ? 0 : reelGap,
                      },
                      { backgroundColor: bgBoja, borderColor: boja + (isWild ? '80' : '40') },
                      isWin && [styles.slotItemWinning, { borderColor: BOJE.slotVatra, shadowColor: BOJE.slotVatra, borderRadius: tileRadius }],
                      { transform: [{ scale: scaleTransform }], opacity },
                    ]}
                  >
                    {isWin && <WinPulse />}
                    <SIcon
                      size={reelTileSize * (isWild ? 0.65 : 0.55)}
                      color={isWin ? '#FFF' : boja}
                      strokeWidth={isWin ? 2.5 : 2}
                    />
                  </Animated.View>
                );
              })}
            </Animated.View>
          </Animated.View>
        );
      })}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  gridColumnsWrapper: { flexDirection: 'row', justifyContent: 'space-between' },
  gridColumnViewport: {
    flex: 1,
    overflow: 'hidden',
  },
  gridColumn: {
    width: '100%',
  },
  slotItem: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  slotItemWinning: {
    borderWidth: 3,
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 10,
    backgroundColor: BOJE.slotVatra + '24',
  },
  winPulseLayer: {
    borderRadius: Math.round(14 * uiScale),
    backgroundColor: BOJE.slotVatra + '40',
  },
});

export default SlotReel;
