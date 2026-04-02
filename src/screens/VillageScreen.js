import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { Crown } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useGameStore } from '../store/gameStore';
import { useSlotStore } from '../store/slotStore';
import BuildingCard from '../components/BuildingCard';
import { BOJE, ZGRADE, uiScale, FONT_FAMILY } from '../config/constants';
import { dohvatiRaidPovijest } from '../firebase/raids';

/**
 * Ekran sela — prikaz zgrada, mogućnost nadogradnje/popravka, prestige gumb.
 */
const VillageScreen = () => {
  const gradevine     = useGameStore((s) => s.gradevine);
  const izvrsiPrestige = useGameStore((s) => s.izvrsiPrestige);
  const uid = useGameStore((s) => s.uid);
  const raidPovijest = useGameStore((s) => s.raidPovijest);
  const postaviRevengeTarget = useGameStore((s) => s.postaviRevengeTarget);
  const setRaidAktivan = useSlotStore((s) => s.setRaidAktivan);
  const navigation = useNavigation();
  const [ucitavaPovijest, setUcitavaPovijest] = useState(false);

  const spremanZaPrestige =
    gradevine.pilana    === ZGRADE[0].maxLv &&
    gradevine.kamenolom === ZGRADE[1].maxLv &&
    gradevine.rudnik    === ZGRADE[2].maxLv;

  useEffect(() => {
    let aktivan = true;
    if (!uid) return undefined;
    setUcitavaPovijest(true);
    dohvatiRaidPovijest(uid).then((povijest) => {
      if (!aktivan || !Array.isArray(povijest)) return;
      useGameStore.setState({ raidPovijest: povijest.slice(0, 20) });
    }).finally(() => { if (aktivan) setUcitavaPovijest(false); });
    return () => { aktivan = false; };
  }, [uid]);

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
      <View style={styles.raidLogCard}>
        <Text style={styles.raidLogTitle}>NEDAVNI RAIDOVI</Text>
        {ucitavaPovijest ? (
          <Text style={styles.raidLogEmpty}>Učitavanje...</Text>
        ) : raidPovijest.length === 0 ? (
          <Text style={styles.raidLogEmpty}>Nema nedavnih napada.</Text>
        ) : raidPovijest.slice(0, 6).map((r) => {
          const vrijeme = r.vrijemeNapadaMs ? new Date(r.vrijemeNapadaMs).toLocaleTimeString() : '';
          const jeOut = r.tip === 'outgoing';
          const mozeOsveta = !jeOut && r.napadacUid && r.mozeProtunapadDo && Date.now() < r.mozeProtunapadDo;
          return (
            <View key={r.id} style={styles.raidLogRow}>
              <Text style={styles.raidLogItem}>
                {jeOut ? '⚔️ Napao' : '🛡️ Napadnut'} {jeOut ? (r.metaIme ?? 'meta') : (r.napadacIme ?? 'napadač')} ·
                {' '}{Math.floor(r.ukradeno?.drvo ?? 0)}🌲 {Math.floor(r.ukradeno?.kamen ?? 0)}⛰️ {Math.floor(r.ukradeno?.zeljezo ?? 0)}⛏️
                {vrijeme ? ` · ${vrijeme}` : ''}
              </Text>
              {mozeOsveta && (
                <TouchableOpacity
                  style={styles.revengeBtn}
                  onPress={() => {
                    postaviRevengeTarget(r);
                    useGameStore.setState({ poruka: '⚔️ OSVETA: +25% PLIJEN AKTIVAN' });
                    setRaidAktivan(true);
                    navigation.navigate('Igraj');
                  }}
                >
                  <Text style={styles.revengeBtnTxt}>OSVETI SE</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
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
  raidLogCard: {
    marginTop: 8,
    backgroundColor: BOJE.bgCard,
    borderWidth: 1,
    borderColor: BOJE.border,
    borderRadius: 18,
    padding: 14,
  },
  raidLogTitle: {
    color: BOJE.textMain,
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    marginBottom: 8,
    fontSize: 13,
    letterSpacing: 1,
  },
  raidLogItem: {
    color: BOJE.textMuted,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    marginBottom: 6,
  },
  raidLogRow: {
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: BOJE.border,
    paddingBottom: 8,
  },
  revengeBtn: {
    alignSelf: 'flex-start',
    backgroundColor: BOJE.slotVatra,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 4,
  },
  revengeBtnTxt: {
    color: '#fff',
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    fontSize: 11,
  },
  raidLogEmpty: {
    color: BOJE.textMuted,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
  },
});

export default VillageScreen;
