import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Gem, Zap, Coins, TreePine, Check, Target } from 'lucide-react-native';
import { useGameStore } from '../store/gameStore';
import { BOJE, uiScale, FONT_FAMILY } from '../config/constants';

/**
 * Kartica jedne aktivne misije — napredak, nagrada i gumb za preuzimanje.
 */
const MissionCard = ({ misija }) => {
  const preuzmiNagraduMisije = useGameStore((s) => s.preuzmiNagraduMisije);

  const napredakPostotak = Math.min(100, (misija.trenutno / misija.cilj) * 100);
  const gotovo = misija.trenutno >= misija.cilj;

  return (
    <View style={[
      styles.card,
      gotovo && { borderColor: BOJE.misije, shadowColor: BOJE.misije, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
    ]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <View style={[
          styles.iconBadge,
          { backgroundColor: (gotovo ? BOJE.misije : BOJE.textMuted) + '15', borderColor: (gotovo ? BOJE.misije : BOJE.textMuted) + '50', borderWidth: 1 },
        ]}>
          {gotovo
            ? <Check  size={24} color={BOJE.misije}    strokeWidth={3} />
            : <Target size={24} color={BOJE.textMuted} strokeWidth={2} />
          }
        </View>

        <View style={{ flex: 1, paddingLeft: 16 }}>
          <Text style={[styles.cardTitle, gotovo && { color: BOJE.misije }]}>{misija.opis}</Text>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${napredakPostotak}%`, backgroundColor: gotovo ? BOJE.misije : BOJE.xp }]} />
          </View>
          <Text style={styles.progressTxt}>{Math.floor(misija.trenutno)} / {misija.cilj}</Text>
        </View>
      </View>

      <View style={styles.cardBottom}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.nagradeLabel}>NAGRADA:</Text>
          {misija.nagrada.dijamanti && <View style={styles.rewardChip}><Gem      size={14} color={BOJE.dijamant}/><Text style={[styles.rewardTxt, { color: BOJE.dijamant }]}>{misija.nagrada.dijamanti}</Text></View>}
          {misija.nagrada.energija  && <View style={styles.rewardChip}><Zap      size={14} color={BOJE.energija}/><Text style={[styles.rewardTxt, { color: BOJE.energija  }]}>{misija.nagrada.energija}</Text></View>}
          {misija.nagrada.zlato     && <View style={styles.rewardChip}><Coins    size={14} color={BOJE.zlato}   /><Text style={[styles.rewardTxt, { color: BOJE.zlato     }]}>{misija.nagrada.zlato}</Text></View>}
          {misija.nagrada.drvo      && <View style={styles.rewardChip}><TreePine size={14} color={BOJE.drvo}    /><Text style={[styles.rewardTxt, { color: BOJE.drvo      }]}>{misija.nagrada.drvo}</Text></View>}
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.actionBtn, gotovo ? { backgroundColor: BOJE.misije } : { backgroundColor: BOJE.slotOkvirZlato, opacity: 0.5 }]}
          disabled={!gotovo}
          onPress={() => preuzmiNagraduMisije(misija.id, misija.nagrada)}
        >
          <Text style={[styles.actionBtnTxt, !gotovo && { color: BOJE.textMuted }]}>PREUZMI</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: BOJE.bgCard, padding: 20, borderRadius: 24, marginBottom: 14,
    borderWidth: 1, borderColor: BOJE.border,
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  iconBadge: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: Math.round(17 * uiScale), fontWeight: '800', fontFamily: FONT_FAMILY, color: BOJE.textMain },
  progressContainer: { width: '100%', height: 6, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 3, marginTop: 10, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 3 },
  progressTxt: { color: BOJE.textMuted, fontSize: 11, fontWeight: '800', fontFamily: FONT_FAMILY, marginTop: 4, textAlign: 'right' },
  cardBottom:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: BOJE.border, paddingTop: 14 },
  nagradeLabel:{ color: BOJE.textMuted, fontSize: 12, fontWeight: '800' },
  rewardChip:  { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 8 },
  rewardTxt:   { fontSize: 12, fontWeight: '900', fontFamily: FONT_FAMILY, marginLeft: 4 },
  actionBtn:   { paddingHorizontal: Math.round(20 * uiScale), paddingVertical: Math.round(12 * uiScale), borderRadius: 14 },
  actionBtnTxt:{ color: '#000', fontWeight: '900', fontFamily: FONT_FAMILY, fontSize: Math.round(13 * uiScale), letterSpacing: 0.5 },
});

export default MissionCard;
