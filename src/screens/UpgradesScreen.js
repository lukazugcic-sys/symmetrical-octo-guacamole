import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Clover, Zap, Shield, Star, Coins, Mountain, Pickaxe } from 'lucide-react-native';
import { useGameStore } from '../store/gameStore';
import IconBadge from '../components/IconBadge';
import PrikazCijene from '../components/PrikazCijene';
import { BOJE, uiScale, FONT_FAMILY, WILD_BOOST_CHANCE_PER_LEVEL } from '../config/constants';

const ALATI = [
  { id: 'sreca',     n: 'Djetelina',     d: 'Povećava šansu za dobitne linije i Wild simbole.',                      ikona: Clover, cZlato: 500,  cKamen: 0,   cZeljezo: 50  },
  { id: 'pojacalo',  n: 'Množitelj',      d: 'Daje bonus resurse ovisno o ulogu.',                                    ikona: Zap,    cZlato: 800,  cKamen: 100, cZeljezo: 100 },
  { id: 'baterija',  n: 'Baterija',       d: '+50 Max Energije.',                                                     ikona: Zap,    cZlato: 1000, cKamen: 200, cZeljezo: 0   },
  { id: 'oklop',     n: 'Čelični Štit',   d: '+1 Dodatni slot za obranu baze.',                                       ikona: Shield, cZlato: 1200, cKamen: 50,  cZeljezo: 200 },
  { id: 'wildBoost', n: 'Wild Magnet',    d: `+${Math.round(WILD_BOOST_CHANCE_PER_LEVEL * 100)}% šansa za Wild simbol po razini.`, ikona: Star, cZlato: 1500, cKamen: 300, cZeljezo: 150 },
];

/**
 * Ekran nadogradnji — pasivne sposobnosti (oprema) koje poboljšavaju igru.
 */
const UpgradesScreen = () => {
  const zlato   = useGameStore((s) => s.zlato);
  const resursi = useGameStore((s) => s.resursi);
  const razine  = useGameStore((s) => s.razine);
  const kupiAlat = useGameStore((s) => s.kupiAlat);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.subTitle}>Pasivne Sposobnosti</Text>

      {ALATI.map((p) => {
        const mult = Math.pow(1.6, razine[p.id] || 0);
        const zl   = Math.floor(p.cZlato   * mult);
        const ka   = Math.floor(p.cKamen   * mult);
        const ze   = Math.floor(p.cZeljezo * mult);
        const moze = zlato >= zl && resursi.kamen >= ka && resursi.zeljezo >= ze;

        return (
          <View key={p.id} style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <IconBadge Ikona={p.ikona} boja={BOJE.nadogradnje} velicina={24} />
              <View style={{ flex: 1, paddingHorizontal: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.cardTitle}>{p.n}</Text>
                  <View style={styles.levelBadge}>
                    <Text style={[styles.buildCardLevel, { color: BOJE.nadogradnje }]}>LVL {razine[p.id] || 0}</Text>
                  </View>
                </View>
                <Text style={styles.upgradeDesc}>{p.d}</Text>
              </View>
            </View>

            <View style={styles.cardBottom}>
              <View style={styles.costRow}>
                <PrikazCijene Ikona={Coins}   boja={BOJE.zlato}    iznos={zl} trenutno={zlato}          />
                <PrikazCijene Ikona={Mountain} boja={BOJE.kamen}    iznos={ka} trenutno={resursi.kamen}  />
                <PrikazCijene Ikona={Pickaxe}  boja={BOJE.zeljezo}  iznos={ze} trenutno={resursi.zeljezo}/>
              </View>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.actionBtn, { backgroundColor: moze ? BOJE.nadogradnje : BOJE.slotOkvirZlato }]}
                onPress={() => kupiAlat(p)}
              >
                <Text style={[styles.actionBtnTxt, !moze && { color: BOJE.textMuted }]}>UPGRADE</Text>
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
  subTitle: {
    fontSize: Math.round(16 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY,
    color: BOJE.textMain, marginBottom: 16, marginLeft: 4, letterSpacing: 1.2, textTransform: 'uppercase',
  },
  card: {
    backgroundColor: BOJE.bgCard, padding: 20, borderRadius: 24, marginBottom: 14,
    borderWidth: 1, borderColor: BOJE.border,
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  cardTitle:    { fontSize: Math.round(17 * uiScale), fontWeight: '800', fontFamily: FONT_FAMILY, color: BOJE.textMain },
  levelBadge:   { backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  buildCardLevel:{ fontSize: Math.round(12 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY, color: BOJE.textMuted },
  upgradeDesc:  { fontSize: 13, fontWeight: '500', fontFamily: FONT_FAMILY, color: BOJE.textMuted, marginTop: 6, lineHeight: 18 },
  cardBottom:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: BOJE.border, paddingTop: 14 },
  costRow:      { flexDirection: 'row', gap: 8, flexWrap: 'wrap', flex: 1, paddingRight: 10, alignItems: 'center' },
  actionBtn:    { paddingHorizontal: Math.round(20 * uiScale), paddingVertical: Math.round(12 * uiScale), borderRadius: 14 },
  actionBtnTxt: { color: '#000', fontWeight: '900', fontFamily: FONT_FAMILY, fontSize: Math.round(13 * uiScale), letterSpacing: 0.5 },
});

export default UpgradesScreen;
