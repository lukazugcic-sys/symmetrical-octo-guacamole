import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Pressable,
} from 'react-native';
import { Sword } from 'lucide-react-native';
import { useGameStore } from '../store/gameStore';
import HeroCard from '../components/HeroCard';
import {
  BOJE, uiScale, FONT_FAMILY,
  JUNACI, RARITET_BOJE, RARITET_NAZIVI,
  HERO_SUMMON_KOST, HERO_MAX_AKTIVNIH,
} from '../config/constants';
import { getHeroAssignedRoom, getVillageRoomDefinition, normalizeVillageRooms } from '../utils/village';

const FILTRI = ['svi', 'obican', 'rijetki', 'epski', 'legendarni'];

/**
 * HeroesScreen — ekran za upravljanje kolekcijom junaka.
 * Prikazuje sve junake, fragment progress, aktivaciju i prizivanje.
 */
const HeroesScreen = () => {
  const junaci        = useGameStore((s) => s.junaci);
  const aktivniJunaci = useGameStore((s) => s.aktivniJunaci);
  const dijamanti     = useGameStore((s) => s.dijamanti);
  const villageRoomsState = useGameStore((s) => s.villageRooms);
  const gradevine = useGameStore((s) => s.gradevine);
  const ostecenja = useGameStore((s) => s.ostecenja);
  const prizivajHeroja  = useGameStore((s) => s.prizivajHeroja);
  const aktivirajHeroja = useGameStore((s) => s.aktivirajHeroja);

  const [filtar, setFiltar] = useState('svi');
  const villageRooms = normalizeVillageRooms(villageRoomsState, gradevine, ostecenja);

  const otkriveniBroj = JUNACI.filter((h) => (junaci[h.id]?.razina ?? 0) > 0).length;
  const mozePrivati    = dijamanti >= HERO_SUMMON_KOST;

  const filtriraniJunaci = filtar === 'svi'
    ? JUNACI
    : JUNACI.filter((h) => h.raritet === filtar);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

      {/* ── Naslov + statistike ── */}
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Sword size={22} color={BOJE.nadogradnje} strokeWidth={2} />
          <Text style={styles.headerTitle}>KOLEKCIJA JUNAKA</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{otkriveniBroj}</Text>
            <Text style={styles.statLbl}>/ {JUNACI.length} otkriveno</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: BOJE.nadogradnje }]}>{aktivniJunaci.length}</Text>
            <Text style={styles.statLbl}>/ {HERO_MAX_AKTIVNIH} aktivno</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: BOJE.dijamant }]}>{dijamanti}</Text>
            <Text style={styles.statLbl}>💎 dijamanata</Text>
          </View>
        </View>
      </View>

      {/* ── Prizivanje ── */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.prizivanjBtn, !mozePrivati && styles.prizivanjBtnOff]}
        onPress={prizivajHeroja}
        disabled={!mozePrivati}
      >
        <Text style={[styles.prizivanjTxt, !mozePrivati && { color: BOJE.textMuted }]}>
          ✨ PRIZOVI JUNAKA — {HERO_SUMMON_KOST} 💎
        </Text>
        <Text style={[styles.prizivanjSub, !mozePrivati && { color: BOJE.textMuted }]}>
          Dobij 3–6 nasumičnih fragmenata • šansa na rijetke junake
        </Text>
      </TouchableOpacity>

      {/* ── Info o padovima ── */}
      <View style={styles.infoRow}>
        <Text style={styles.infoTxt}>🎰 Fragmenti padaju i sa vrtnji automata (6% šanse)</Text>
        <Text style={styles.infoTxt}>🏠 Svaki otključani junak može dati globalni bonus i zasebno raditi u jednoj sobi sela.</Text>
      </View>

      {/* ── Filtri po raritetu ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtriWrap}>
        {FILTRI.map((f) => {
          const aktivan = f === filtar;
          const boja = f === 'svi' ? BOJE.textMain : (RARITET_BOJE[f] ?? BOJE.textMain);
          return (
            <Pressable
              key={f}
              onPress={() => setFiltar(f)}
              style={[styles.filtrBtn, aktivan && { backgroundColor: boja + '30', borderColor: boja }]}
            >
              <Text style={[styles.filtrTxt, { color: aktivan ? boja : BOJE.textMuted }]}>
                {f === 'svi' ? 'SVI' : (RARITET_NAZIVI[f]?.toUpperCase() ?? f.toUpperCase())}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Kartice junaka ── */}
      {filtriraniJunaci.map((hero) => {
        const assignedRoom = getHeroAssignedRoom(villageRooms, hero.id);
        const assignmentLabel = assignedRoom
          ? `SOBA · ${getVillageRoomDefinition(assignedRoom)?.naziv ?? 'Naselje'}`
          : null;

        return (
          <HeroCard
            key={hero.id}
            hero={hero}
            heroState={junaci[hero.id]}
            aktivan={aktivniJunaci.includes(hero.id)}
            assignmentLabel={assignmentLabel}
            onActivate={() => aktivirajHeroja(hero.id)}
          />
        );
      })}

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingBottom: 120, paddingTop: 10 },

  headerCard: {
    backgroundColor: BOJE.bgCard,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BOJE.nadogradnje + '40',
    padding: 18,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: Math.round(17 * uiScale),
    fontWeight: '900',
    fontFamily: FONT_FAMILY,
    color: BOJE.textMain,
    letterSpacing: 1.2,
  },
  statsRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  statItem:    { alignItems: 'center', flex: 1 },
  statVal:     { fontSize: Math.round(22 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY, color: BOJE.textMain },
  statLbl:     { fontSize: Math.round(11 * uiScale), color: BOJE.textMuted, fontFamily: FONT_FAMILY, marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: BOJE.border },

  prizivanjBtn: {
    backgroundColor: BOJE.nadogradnje + '25',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BOJE.nadogradnje + '70',
    padding: 18,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: BOJE.nadogradnje,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  prizivanjBtnOff: { borderColor: BOJE.border, shadowOpacity: 0 },
  prizivanjTxt: {
    fontSize: Math.round(15 * uiScale),
    fontWeight: '900',
    fontFamily: FONT_FAMILY,
    color: BOJE.nadogradnje,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  prizivanjSub: {
    fontSize: Math.round(11 * uiScale),
    color: BOJE.textMuted,
    fontFamily: FONT_FAMILY,
  },

  infoRow: { marginBottom: 14, paddingHorizontal: 4 },
  infoTxt: { fontSize: Math.round(11 * uiScale), color: BOJE.textMuted, fontFamily: FONT_FAMILY },

  filtriWrap: { marginBottom: 14 },
  filtrBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BOJE.border,
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  filtrTxt: { fontSize: Math.round(11 * uiScale), fontWeight: '800', fontFamily: FONT_FAMILY, letterSpacing: 0.5 },
});

export default HeroesScreen;
