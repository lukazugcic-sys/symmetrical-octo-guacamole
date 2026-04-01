import React from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useSlotStore } from '../store/slotStore';
import { BLAGO, BOJE, slotSize, uiScale } from '../config/constants';

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
});

export default SlotReel;
