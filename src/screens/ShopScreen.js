import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { TreePine, Mountain, Pickaxe, Gem, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react-native';
import { useGameStore } from '../store/gameStore';
import IconBadge from '../components/IconBadge';
import { BOJE, ZGRADE_SKINOVI, uiScale, FONT_FAMILY } from '../config/constants';

/**
 * Ekran tržnice — kupnja i prodaja resursa uz dinamičke cijene + Kozmetika (skinovi zgrada).
 */
const ShopScreen = () => {
  const tecaj      = useGameStore((s) => s.tecaj);
  const trend      = useGameStore((s) => s.trend);
  const dijamanti  = useGameStore((s) => s.dijamanti);
  const aktivniSkin = useGameStore((s) => s.aktivniSkin);
  const trgovina   = useGameStore((s) => s.trgovina);
  const kupiSkin   = useGameStore((s) => s.kupiSkin);

  const resursiTrznice = [
    { id: 'drvo',    n: 'Drvo',     ik: TreePine, b: BOJE.drvo    },
    { id: 'kamen',   n: 'Kamen',    ik: Mountain, b: BOJE.kamen   },
    { id: 'zeljezo', n: 'Željezo',  ik: Pickaxe,  b: BOJE.zeljezo },
    { id: 'dijamant',n: 'Dijamant', ik: Gem,      b: BOJE.dijamant},
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {/* ─── Tržnica ────────────────────────────────────────────────────────── */}
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

      {/* ─── Kozmetika — skinovi zgrada ──────────────────────────────────────── */}
      <View style={[styles.headerRow, { marginTop: 20 }]}>
        <Text style={styles.subTitle}>Kozmetika</Text>
        <Text style={styles.updateHint}>Skinovi zgrada</Text>
      </View>
      <Text style={styles.kozmetikaHint}>Promijeni izgled svih zgrada u Bazi odjednom.</Text>

      {ZGRADE_SKINOVI.map((skin) => {
        const aktivan       = aktivniSkin === skin.id;
        const dostupno      = skin.cijenaDijamanti === 0 || aktivan;
        const mozePlatiti   = dijamanti >= skin.cijenaDijamanti;

        return (
          <View key={skin.id} style={[styles.skinCard, aktivan && { borderColor: skin.boja, shadowColor: skin.boja, shadowOpacity: 0.35, elevation: 6 }]}>
            <View style={styles.skinLeft}>
              <Text style={[styles.skinEmodzi, { color: skin.boja }]}>{skin.emodzi}</Text>
              <View>
                <Text style={styles.skinNaziv}>{skin.naziv}</Text>
                <Text style={styles.skinCijena}>
                  {skin.cijenaDijamanti === 0
                    ? 'Besplatno'
                    : aktivan
                      ? 'Aktivno ✓'
                      : `${skin.cijenaDijamanti} 💎`}
                </Text>
              </View>
            </View>
            {aktivan ? (
              <View style={[styles.skinBtn, { backgroundColor: skin.boja + '30', borderColor: skin.boja + '60' }]}>
                <Text style={[styles.skinBtnTxt, { color: skin.boja }]}>AKTIVAN</Text>
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.skinBtn, { backgroundColor: mozePlatiti ? skin.boja : 'rgba(255,255,255,0.05)', borderColor: mozePlatiti ? skin.boja : BOJE.border }]}
                onPress={() => kupiSkin(skin)}
              >
                <Text style={[styles.skinBtnTxt, { color: mozePlatiti ? '#000' : BOJE.textMuted }]}>
                  {skin.cijenaDijamanti === 0 ? 'ODABERI' : 'KUPI'}
                </Text>
              </TouchableOpacity>
            )}
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
  kozmetikaHint: { fontSize: Math.round(12 * uiScale), color: BOJE.textMuted, fontFamily: FONT_FAMILY, marginBottom: 14, marginLeft: 4 },

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

  // Skinovi
  skinCard: {
    backgroundColor: BOJE.bgCard, padding: 16, borderRadius: 20, marginBottom: 12,
    borderWidth: 1, borderColor: BOJE.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, elevation: 3,
  },
  skinLeft:    { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  skinEmodzi:  { fontSize: 32 },
  skinNaziv:   { fontSize: Math.round(15 * uiScale), fontWeight: '800', fontFamily: FONT_FAMILY, color: BOJE.textMain },
  skinCijena:  { fontSize: Math.round(13 * uiScale), fontWeight: '700', fontFamily: FONT_FAMILY, color: BOJE.dijamant, marginTop: 2 },
  skinBtn:     { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
  skinBtnTxt:  { fontWeight: '900', fontFamily: FONT_FAMILY, fontSize: 13, letterSpacing: 0.5 },
});

export default ShopScreen;
