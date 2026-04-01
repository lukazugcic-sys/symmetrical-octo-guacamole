import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { TreePine, Mountain, Pickaxe, Gem, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react-native';
import { useGameStore } from '../store/gameStore';
import IconBadge from '../components/IconBadge';
import { BOJE, uiScale, FONT_FAMILY } from '../config/constants';

/**
 * Ekran tržnice — kupnja i prodaja resursa uz dinamičke cijene.
 */
const ShopScreen = () => {
  const tecaj   = useGameStore((s) => s.tecaj);
  const trend   = useGameStore((s) => s.trend);
  const trgovina = useGameStore((s) => s.trgovina);

  const resursiTrznice = [
    { id: 'drvo',    n: 'Drvo',     ik: TreePine, b: BOJE.drvo    },
    { id: 'kamen',   n: 'Kamen',    ik: Mountain, b: BOJE.kamen   },
    { id: 'zeljezo', n: 'Željezo',  ik: Pickaxe,  b: BOJE.zeljezo },
    { id: 'dijamant',n: 'Dijamant', ik: Gem,      b: BOJE.dijamant},
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <View style={styles.headerRow}>
        <Text style={styles.subTitle}>Mjenjačnica</Text>
        <Text style={styles.updateHint}>Ažurira se svakih 45s</Text>
      </View>

      {resursiTrznice.map((r) => {
        const cijenaKupi   = tecaj[r.id].kupi;
        const cijenaProdaj = tecaj[r.id].prodaj;
        const tr           = trend[r.id];

        return (
          <View key={r.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <IconBadge Ikona={r.ik} boja={r.b} />
              <View style={styles.cardHeaderRight}>
                <Text style={styles.cardTitle}>
                  {r.n}{r.id !== 'dijamant' && <Text style={styles.paketText}> (x10)</Text>}
                </Text>
                <View style={[styles.trendBadge, tr === 1 ? { backgroundColor: '#10B98120' } : tr === -1 ? { backgroundColor: '#EF444420' } : {}]}>
                  {tr === 1
                    ? <ArrowUpRight   size={16} color="#10B981" />
                    : tr === -1
                      ? <ArrowDownRight size={16} color="#EF4444" />
                      : <Minus          size={16} color={BOJE.textMuted} />
                  }
                </View>
              </View>
            </View>

            <View style={styles.marketActionRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.tradeBtn, { backgroundColor: BOJE.slotOkvirZlato }]}
                onPress={() => trgovina('prodaj', r.id, r.id === 'dijamant' ? 1 : 10)}
              >
                <Text style={[styles.tradeBtnTxt, { color: BOJE.textMain }]}>PRODAJ</Text>
                <Text style={styles.tradePriceTxt}>+ {cijenaProdaj} 🪙</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.tradeBtn, { backgroundColor: BOJE.zlato + '10', borderColor: BOJE.zlato + '40' }]}
                onPress={() => trgovina('kupi', r.id, r.id === 'dijamant' ? 1 : 10)}
              >
                <Text style={[styles.tradeBtnTxt, { color: BOJE.zlato }]}>KUPI</Text>
                <Text style={[styles.tradePriceTxt, { color: BOJE.zlato }]}>- {cijenaKupi} 🪙</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 120, paddingTop: 10 },
  headerRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 16, marginLeft: 4 },
  subTitle:      { fontSize: Math.round(16 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY, color: BOJE.textMain, letterSpacing: 1.2, textTransform: 'uppercase' },
  updateHint:    { color: BOJE.textMuted, fontSize: 12, fontWeight: '700' },

  card: {
    backgroundColor: BOJE.bgCard, padding: 20, borderRadius: 24, marginBottom: 14,
    borderWidth: 1, borderColor: BOJE.border,
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  cardHeaderRight: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: Math.round(17 * uiScale), fontWeight: '800', fontFamily: FONT_FAMILY, color: BOJE.textMain },
  paketText: { fontSize: 13, color: BOJE.textMuted, fontWeight: '600', fontFamily: FONT_FAMILY },
  trendBadge: { padding: 4, borderRadius: 8 },

  marketActionRow: { flexDirection: 'row', gap: 12 },
  tradeBtn:  { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: BOJE.border },
  tradeBtnTxt: { fontWeight: '900', fontFamily: FONT_FAMILY, fontSize: 14, marginBottom: 4, letterSpacing: 0.5 },
  tradePriceTxt: { fontWeight: '700', fontFamily: FONT_FAMILY, fontSize: 13, color: BOJE.textMuted },
});

export default ShopScreen;
