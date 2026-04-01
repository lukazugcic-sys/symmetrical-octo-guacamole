import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Gem, Zap, Coins, Mountain } from 'lucide-react-native';
import { useGameStore } from '../store/gameStore';
import MissionCard from '../components/MissionCard';
import { DOSTIGNUCA, BOJE, uiScale, FONT_FAMILY } from '../config/constants';

/**
 * Ekran misija i dostignuća — tab switcher između dnevnih zadataka i trofeja.
 */
const MissionsScreen = () => {
  const [prikazDostignuca, setPrikazDostignuca] = useState(false);

  const misije          = useGameStore((s) => s.misije);
  const dostignucaDone  = useGameStore((s) => s.dostignucaDone);
  const ukupnoVrtnji    = useGameStore((s) => s.ukupnoVrtnji);
  const ukupnoZlata     = useGameStore((s) => s.ukupnoZlata);
  const prestigeRazina  = useGameStore((s) => s.prestigeRazina);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {/* Tab switcher */}
      <View style={styles.tabSwitcher}>
        <TouchableOpacity activeOpacity={0.7} style={[styles.tabBtn, !prikazDostignuca && styles.tabBtnActive]} onPress={() => setPrikazDostignuca(false)}>
          <Text style={[styles.tabBtnTxt, !prikazDostignuca && { color: BOJE.misije }]}>ZADACI</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} style={[styles.tabBtn, prikazDostignuca && styles.tabBtnActive]} onPress={() => setPrikazDostignuca(true)}>
          <Text style={[styles.tabBtnTxt, prikazDostignuca && { color: BOJE.zlato }]}>🏆 DOSTIGNUĆA</Text>
        </TouchableOpacity>
      </View>

      {!prikazDostignuca ? (
        <>
          <Text style={[styles.subTitle, { marginTop: 10 }]}>Dnevni Zadaci</Text>
          {misije.map((m) => <MissionCard key={m.id} misija={m} />)}
        </>
      ) : (
        <>
          <Text style={[styles.subTitle, { marginTop: 10 }]}>Dostignuća</Text>

          {/* Statistike */}
          <View style={styles.statsSummaryRow}>
            <View style={styles.statsSummaryChip}><Text style={styles.statsLabel}>Ukupno vrtnji</Text><Text style={styles.statsValue}>{ukupnoVrtnji}</Text></View>
            <View style={styles.statsSummaryChip}><Text style={styles.statsLabel}>Zlato zarađeno</Text><Text style={[styles.statsValue, { color: BOJE.zlato }]}>{ukupnoZlata}</Text></View>
            <View style={styles.statsSummaryChip}><Text style={styles.statsLabel}>Prestige razina</Text><Text style={[styles.statsValue, { color: BOJE.prestige }]}>{prestigeRazina}</Text></View>
          </View>

          {DOSTIGNUCA.map((d) => {
            const otkljucano = !!dostignucaDone[d.id];
            return (
              <View key={d.id} style={[styles.card, otkljucano && { borderColor: BOJE.zlato, backgroundColor: BOJE.zlato + '08' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View style={[styles.iconBadge, { backgroundColor: (otkljucano ? BOJE.zlato : BOJE.textMuted) + '20', borderColor: (otkljucano ? BOJE.zlato : BOJE.textMuted) + '60', borderWidth: 1 }]}>
                    <Text style={{ fontSize: 22 }}>{otkljucano ? '🏆' : '🔒'}</Text>
                  </View>
                  <View style={{ flex: 1, paddingLeft: 14 }}>
                    <Text style={[styles.cardTitle, otkljucano && { color: BOJE.zlato }]}>{d.naziv}</Text>
                    <Text style={styles.upgradeDesc}>{d.opis}</Text>
                  </View>
                </View>
                <View style={styles.cardBottom}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: BOJE.textMuted, fontSize: 12, fontWeight: '800' }}>NAGRADA:</Text>
                    {d.nagrada.zlato     && <View style={styles.rewardChip}><Coins    size={14} color={BOJE.zlato}   /><Text style={[styles.rewardTxt, { color: BOJE.zlato    }]}>{d.nagrada.zlato}</Text></View>}
                    {d.nagrada.dijamanti && <View style={styles.rewardChip}><Gem      size={14} color={BOJE.dijamant}/><Text style={[styles.rewardTxt, { color: BOJE.dijamant }]}>{d.nagrada.dijamanti}</Text></View>}
                    {d.nagrada.energija  && <View style={styles.rewardChip}><Zap      size={14} color={BOJE.energija}/><Text style={[styles.rewardTxt, { color: BOJE.energija }]}>{d.nagrada.energija}</Text></View>}
                    {d.nagrada.kamen     && <View style={styles.rewardChip}><Mountain size={14} color={BOJE.kamen}   /><Text style={[styles.rewardTxt, { color: BOJE.kamen    }]}>{d.nagrada.kamen}</Text></View>}
                  </View>
                  <View style={[styles.actionBtn, { backgroundColor: otkljucano ? BOJE.zlato + '30' : BOJE.slotOkvirZlato }]}>
                    <Text style={[styles.actionBtnTxt, { color: otkljucano ? BOJE.zlato : BOJE.textMuted }]}>
                      {otkljucano ? 'OTKLJUČANO' : `CILJ: ${d.cilj}`}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 120, paddingTop: 10 },
  subTitle: {
    fontSize: Math.round(16 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY,
    color: BOJE.textMain, marginBottom: 16, marginLeft: 4, letterSpacing: 1.2, textTransform: 'uppercase',
  },

  tabSwitcher: { flexDirection: 'row', backgroundColor: BOJE.bgCard, borderRadius: 18, padding: 4, marginTop: 10, marginBottom: 4, borderWidth: 1, borderColor: BOJE.border },
  tabBtn:      { flex: 1, paddingVertical: 11, borderRadius: 14, alignItems: 'center' },
  tabBtnActive:{ backgroundColor: 'rgba(255,255,255,0.09)' },
  tabBtnTxt:   { fontSize: Math.round(13 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY, color: BOJE.textMuted, letterSpacing: 0.5 },

  statsSummaryRow:  { flexDirection: 'row', gap: 8, marginBottom: 16, marginTop: 6 },
  statsSummaryChip: { flex: 1, backgroundColor: BOJE.bgCard, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: BOJE.border, alignItems: 'center' },
  statsLabel: { fontSize: 10, fontWeight: '700', fontFamily: FONT_FAMILY, color: BOJE.textMuted, marginBottom: 4, textAlign: 'center' },
  statsValue: { fontSize: 16, fontWeight: '900', fontFamily: FONT_FAMILY, color: BOJE.textMain },

  card: {
    backgroundColor: BOJE.bgCard, padding: 20, borderRadius: 24, marginBottom: 14,
    borderWidth: 1, borderColor: BOJE.border,
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  iconBadge: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: Math.round(17 * uiScale), fontWeight: '800', fontFamily: FONT_FAMILY, color: BOJE.textMain },
  upgradeDesc:{ fontSize: 13, fontWeight: '500', fontFamily: FONT_FAMILY, color: BOJE.textMuted, marginTop: 6, lineHeight: 18 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: BOJE.border, paddingTop: 14 },
  rewardChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 8 },
  rewardTxt:  { fontSize: 12, fontWeight: '900', fontFamily: FONT_FAMILY, marginLeft: 4 },
  actionBtn:  { paddingHorizontal: Math.round(20 * uiScale), paddingVertical: Math.round(12 * uiScale), borderRadius: 14 },
  actionBtnTxt:{ color: '#000', fontWeight: '900', fontFamily: FONT_FAMILY, fontSize: Math.round(13 * uiScale), letterSpacing: 0.5 },
});

export default MissionsScreen;
