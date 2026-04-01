/**
 * src/screens/LeaderboardScreen.js
 *
 * Globalna ljestvica igrača — prikazuje top 50 sortirano po
 * prestigeRazina DESC → ukupnoZlata DESC.
 *
 * Osvježi se pull-to-refresh ili automatski pri fokusiranju.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Trophy, Crown, RefreshCw } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { dohvatiTopIgraca } from '../firebase/leaderboard';
import { useGameStore }     from '../store/gameStore';
import { BOJE, uiScale, FONT_FAMILY } from '../config/constants';

// Boje za prvih 3 mjesta
const MEDALJE = ['#FFD700', '#C0C0C0', '#CD7F32'];

const LeaderboardScreen = () => {
  const [igraci,   setIgraci]   = useState([]);
  const [ucitava,  setUcitava]  = useState(true);
  const [greška,   setGreška]   = useState(null);

  const mojUid = useGameStore((s) => s.uid);

  const ucitajLjestvicu = useCallback(async () => {
    setUcitava(true);
    setGreška(null);
    try {
      const podaci = await dohvatiTopIgraca();
      setIgraci(podaci);
    } catch (err) {
      setGreška('Nije moguće učitati ljestvicu. Provjeri internet.');
    } finally {
      setUcitava(false);
    }
  }, []);

  // Osvježi pri fokusiranju ekrana
  useFocusEffect(useCallback(() => { ucitajLjestvicu(); }, [ucitajLjestvicu]));

  const renderIgrac = ({ item, index }) => {
    const jaMojiPodaci = item.uid === mojUid;
    const boja         = index < 3 ? MEDALJE[index] : BOJE.textMuted;

    return (
      <View style={[styles.redak, jaMojiPodaci && styles.mojRedak]}>
        {/* Rank */}
        <View style={[styles.rankBadge, { backgroundColor: boja + '22', borderColor: boja }]}>
          {index === 0 ? (
            <Crown size={14} color={boja} strokeWidth={2.5} />
          ) : (
            <Text style={[styles.rankBroj, { color: boja }]}>{index + 1}</Text>
          )}
        </View>

        {/* Ime + klan */}
        <View style={styles.infoCol}>
          <Text style={[styles.imeIgraca, jaMojiPodaci && { color: BOJE.energija }]} numberOfLines={1}>
            {item.imeIgraca ?? 'Igrač'}
            {jaMojiPodaci && ' (ti)'}
          </Text>
          {item.klanNaziv ? (
            <Text style={styles.klanTxt}>⚔ {item.klanNaziv}</Text>
          ) : null}
        </View>

        {/* Razina + prestige */}
        <View style={styles.statsCol}>
          {item.prestigeRazina > 0 && (
            <Text style={styles.prestigeTxt}>★ {item.prestigeRazina}</Text>
          )}
          <Text style={styles.razinaTxt}>Lv {item.igracRazina}</Text>
          <Text style={styles.zlatoTxt}>{(item.ukupnoZlata ?? 0).toLocaleString()} 🪙</Text>
        </View>
      </View>
    );
  };

  if (ucitava && igraci.length === 0) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={BOJE.zlato} />
        <Text style={styles.hintTxt}>Učitavanje ljestvice…</Text>
      </View>
    );
  }

  if (greška) {
    return (
      <View style={styles.centeredContainer}>
        <Trophy size={52} color={BOJE.textMuted} strokeWidth={1.5} />
        <Text style={styles.greškaTitle}>Nema veze</Text>
        <Text style={styles.hintTxt}>{greška}</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={ucitajLjestvicu}>
          <RefreshCw size={18} color={BOJE.zlato} />
          <Text style={styles.refreshTxt}>Pokušaj ponovo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!ucitava && igraci.length === 0) {
    return (
      <View style={styles.centeredContainer}>
        <Trophy size={52} color={BOJE.textMuted} strokeWidth={1.5} />
        <Text style={styles.greškaTitle}>Ljestvica je prazna</Text>
        <Text style={styles.hintTxt}>Budi prvi! Odigraj nekoliko rundi i pojavit ćeš se ovdje.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Zaglavlje */}
      <View style={styles.headerRow}>
        <Trophy size={22} color={BOJE.zlato} strokeWidth={2} />
        <Text style={styles.headerTitle}>GLOBALNA LJESTVICA</Text>
        <TouchableOpacity onPress={ucitajLjestvicu} style={styles.headerRefreshBtn}>
          <RefreshCw size={16} color={BOJE.textMuted} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={igraci}
        keyExtractor={(item) => item.uid}
        renderItem={renderIgrac}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={ucitava}
            onRefresh={ucitajLjestvicu}
            tintColor={BOJE.zlato}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: BOJE.bg },
  centeredContainer:  { flex: 1, backgroundColor: BOJE.bg, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: BOJE.border,
    backgroundColor: 'rgba(4,4,8,0.96)',
  },
  headerTitle: {
    flex: 1,
    fontSize: Math.round(15 * uiScale),
    fontWeight: '900',
    fontFamily: FONT_FAMILY,
    color: BOJE.zlato,
    letterSpacing: 2,
  },
  headerRefreshBtn: { padding: 6 },

  listContent: { paddingHorizontal: 12, paddingBottom: 100, paddingTop: 8 },

  redak: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BOJE.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BOJE.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginVertical: 4,
    gap: 12,
  },
  mojRedak: {
    borderColor: BOJE.energija + '60',
    backgroundColor: BOJE.energija + '08',
  },

  rankBadge: {
    width: Math.round(34 * uiScale),
    height: Math.round(34 * uiScale),
    borderRadius: Math.round(17 * uiScale),
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankBroj: {
    fontSize: Math.round(13 * uiScale),
    fontWeight: '900',
    fontFamily: FONT_FAMILY,
  },

  infoCol:    { flex: 1 },
  imeIgraca:  { fontSize: Math.round(14 * uiScale), fontWeight: '800', fontFamily: FONT_FAMILY, color: BOJE.textMain },
  klanTxt:    { fontSize: Math.round(11 * uiScale), color: BOJE.klan, fontWeight: '700', fontFamily: FONT_FAMILY, marginTop: 2 },

  statsCol:    { alignItems: 'flex-end', gap: 2 },
  prestigeTxt: { fontSize: Math.round(12 * uiScale), color: BOJE.prestige, fontWeight: '900', fontFamily: FONT_FAMILY },
  razinaTxt:   { fontSize: Math.round(11 * uiScale), color: BOJE.textMuted, fontWeight: '700', fontFamily: FONT_FAMILY },
  zlatoTxt:    { fontSize: Math.round(12 * uiScale), color: BOJE.zlato, fontWeight: '800', fontFamily: FONT_FAMILY },

  greškaTitle: { fontSize: Math.round(18 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY, color: BOJE.textMain, textAlign: 'center' },
  hintTxt:     { fontSize: Math.round(13 * uiScale), color: BOJE.textMuted, fontFamily: FONT_FAMILY, textAlign: 'center' },
  refreshBtn:  { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: BOJE.bgCard, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderColor: BOJE.border },
  refreshTxt:  { color: BOJE.zlato, fontWeight: '800', fontFamily: FONT_FAMILY, fontSize: Math.round(14 * uiScale) },
});

export default LeaderboardScreen;
