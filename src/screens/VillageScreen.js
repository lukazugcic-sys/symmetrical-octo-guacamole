import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { Crown } from 'lucide-react-native';
import { useGameStore } from '../store/gameStore';
import BuildingCard from '../components/BuildingCard';
import { BOJE, ZGRADE, uiScale, FONT_FAMILY } from '../config/constants';

/**
 * Ekran sela — prikaz zgrada, mogućnost nadogradnje/popravka, prestige gumb.
 */
const VillageScreen = () => {
  const gradevine     = useGameStore((s) => s.gradevine);
  const izvrsiPrestige = useGameStore((s) => s.izvrsiPrestige);

  const spremanZaPrestige =
    gradevine.pilana    === ZGRADE[0].maxLv &&
    gradevine.kamenolom === ZGRADE[1].maxLv &&
    gradevine.rudnik    === ZGRADE[2].maxLv;

  const potvrdiPrestige = () => {
    Alert.alert(
      'Potvrdi Prestige',
      'Ovo će resetirati bazu i razinu na 1. Zadržavaš prestige bonus. Nastaviti?',
      [
        { text: 'Odustani', style: 'cancel' },
        { text: 'Izvrši Prestige', style: 'destructive', onPress: izvrsiPrestige },
      ],
    );
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <Text style={[styles.subTitle, { marginTop: 10 }]}>Infrastruktura</Text>

      {ZGRADE.map((zgrada) => (
        <BuildingCard key={zgrada.id} zgrada={zgrada} />
      ))}

      {spremanZaPrestige && (
        <View style={styles.prestigeCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={styles.prestigeIconBg}>
              <Crown size={26} color={BOJE.prestige} />
            </View>
            <View style={{ flex: 1, paddingLeft: 16 }}>
              <Text style={styles.prestigeTitle}>KRUNIDBA (PRESTIGE)</Text>
              <Text style={styles.prestigeDesc}>
                Resetiraj bazu i vrati se na Level 1, ali dobij trajni x1.5 množitelj na SVE nagrade i proizvodnju u igri!
              </Text>
            </View>
          </View>
          <TouchableOpacity activeOpacity={0.8} style={styles.prestigeBtn} onPress={potvrdiPrestige}>
            <Text style={styles.prestigeBtnTxt}>IZVRŠI PRESTIGE</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 120, paddingTop: 10 },
  subTitle: {
    fontSize: Math.round(16 * uiScale),
    fontWeight: '900',
    fontFamily: FONT_FAMILY,
    color: BOJE.textMain,
    marginBottom: 16,
    marginLeft: 4,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  prestigeCard: {
    backgroundColor: BOJE.prestige + '10',
    padding: 20,
    borderRadius: 24,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BOJE.prestige,
    marginTop: 10,
  },
  prestigeIconBg: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BOJE.prestige + '20',
    borderColor: BOJE.prestige,
    borderWidth: 1,
  },
  prestigeTitle: {
    fontSize: Math.round(17 * uiScale),
    fontWeight: '800',
    fontFamily: FONT_FAMILY,
    color: BOJE.prestige,
  },
  prestigeDesc: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: FONT_FAMILY,
    color: BOJE.textMuted,
    marginTop: 6,
    lineHeight: 18,
  },
  prestigeBtn: {
    backgroundColor: BOJE.prestige,
    width: '100%',
    alignItems: 'center',
    paddingVertical: Math.round(12 * uiScale),
    borderRadius: 14,
  },
  prestigeBtnTxt: {
    color: '#000',
    fontWeight: '900',
    fontFamily: FONT_FAMILY,
    fontSize: 15,
  },
});

export default VillageScreen;
