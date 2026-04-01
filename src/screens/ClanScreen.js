import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Users, Swords, CheckCircle2, Circle, Gift } from 'lucide-react-native';
import { useGameStore } from '../store/gameStore';
import { BOJE, uiScale, FONT_FAMILY } from '../config/constants';

const DONACIJA_IZNOS = 200; // zlato po jednom kliku donacije

/**
 * Ekran Klana (Ceha) — osnivanje, pregled zadataka, donacija i nagrade.
 * Klan je lokalna simulacija bez backenda; multiplayer se dodaje u fazi 5 (server).
 */
const ClanScreen = () => {
  const zlato              = useGameStore((s) => s.zlato);
  const klan               = useGameStore((s) => s.klan);
  const osnujiKlan         = useGameStore((s) => s.osnujiKlan);
  const doniraiUKlan       = useGameStore((s) => s.doniraiUKlan);
  const preuzmiKlanNagradu = useGameStore((s) => s.preuzmiKlanNagradu);
  const refreshKlanZadatke = useGameStore((s) => s.refreshKlanZadatke);

  const [imeTxt, setImeTxt] = useState('');

  // Osvježi tjedne zadatke ako su zastarjeli
  useEffect(() => { if (klan.naziv) refreshKlanZadatke(); }, [klan.naziv]);

  // ─── Osnivanje klana ─────────────────────────────────────────────────────────
  if (!klan.naziv) {
    return (
      <View style={styles.centeredContainer}>
        <Users size={56} color={BOJE.klan} strokeWidth={1.5} />
        <Text style={styles.bigTitle}>Nemaš Klan</Text>
        <Text style={styles.hintText}>Osnuj klan i zajedno osvajaj tjedne zadatke!</Text>
        <TextInput
          style={styles.input}
          placeholder="Ime klana (min. 2 slova)"
          placeholderTextColor={BOJE.textMuted}
          value={imeTxt}
          onChangeText={setImeTxt}
          maxLength={24}
        />
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.btn, { backgroundColor: imeTxt.trim().length >= 2 ? BOJE.klan : BOJE.border }]}
          onPress={() => { if (imeTxt.trim().length >= 2) osnujiKlan(imeTxt.trim()); }}
        >
          <Text style={[styles.btnTxt, { color: imeTxt.trim().length >= 2 ? '#000' : BOJE.textMuted }]}>
            OSNUJ KLAN
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Klan HQ ─────────────────────────────────────────────────────────────────
  const xpZaRazinu = klan.razina * 1000;
  const xpPostotak = Math.min(1, klan.xp / xpZaRazinu);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

      {/* Zaglavlje klana */}
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Swords size={28} color={BOJE.klan} strokeWidth={2} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.klanNaziv}>{klan.naziv}</Text>
            <Text style={styles.klanRazina}>Razina {klan.razina}</Text>
          </View>
          <View style={styles.xpBadge}>
            <Text style={styles.xpBadgeTxt}>{klan.xp} / {xpZaRazinu} XP</Text>
          </View>
        </View>
        {/* XP traka */}
        <View style={styles.xpTraka}>
          <View style={[styles.xpFill, { width: `${xpPostotak * 100}%`, backgroundColor: BOJE.klan }]} />
        </View>
      </View>

      {/* Donacija */}
      <View style={styles.donacijaCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.donacijaTitle}>Donacija klanu</Text>
          <Text style={styles.donacijaHint}>{DONACIJA_IZNOS} 🪙 → +{Math.floor(DONACIJA_IZNOS / 10)} XP klanu</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.btn, styles.donBtn, { backgroundColor: zlato >= DONACIJA_IZNOS ? BOJE.klan : BOJE.border }]}
          onPress={() => doniraiUKlan(DONACIJA_IZNOS)}
        >
          <Text style={[styles.btnTxt, { color: zlato >= DONACIJA_IZNOS ? '#000' : BOJE.textMuted }]}>
            DONIRAJ
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tjedni zadaci */}
      <Text style={styles.sectionTitle}>TJEDNI KLANSKI ZADACI</Text>

      {klan.zadaci.map((z) => {
        const postotak = Math.min(1, z.trenutno / z.cilj);
        const mozePrimiti = z.zavrseno && !z.preuzeto;

        return (
          <View
            key={z.id}
            style={[
              styles.zadatakCard,
              z.zavrseno && !z.preuzeto && { borderColor: BOJE.klan + '80', shadowColor: BOJE.klan, shadowOpacity: 0.3 },
              z.preuzeto && { opacity: 0.45 },
            ]}
          >
            <View style={styles.zadatakTop}>
              {z.zavrseno
                ? <CheckCircle2 size={18} color={BOJE.klan} strokeWidth={2.5} />
                : <Circle       size={18} color={BOJE.textMuted} strokeWidth={2} />
              }
              <Text style={[styles.zadatakOpis, z.preuzeto && { color: BOJE.textMuted }]} numberOfLines={2}>
                {z.opis}
              </Text>
            </View>

            {/* Napredak */}
            <View style={styles.progressTraka}>
              <View style={[styles.progressFill, { width: `${postotak * 100}%`, backgroundColor: z.zavrseno ? BOJE.klan : BOJE.xp }]} />
            </View>
            <Text style={styles.progressTxt}>{z.trenutno} / {z.cilj}</Text>

            {/* Nagrada + preuzmi */}
            <View style={styles.zadatakBottom}>
              <View style={styles.nagradeRow}>
                {z.nagrada.dijamanti > 0 && <Text style={styles.nagradaTxt}>{z.nagrada.dijamanti} 💎</Text>}
                {z.nagrada.zlato     > 0 && <Text style={styles.nagradaTxt}>{z.nagrada.zlato} 🪙</Text>}
                {z.nagrada.energija  > 0 && <Text style={styles.nagradaTxt}>{z.nagrada.energija} ⚡</Text>}
                {z.nagrada.drvo      > 0 && <Text style={styles.nagradaTxt}>{z.nagrada.drvo} 🌲</Text>}
                {z.nagrada.kamen     > 0 && <Text style={styles.nagradaTxt}>{z.nagrada.kamen} ⛰️</Text>}
                {z.nagrada.zeljezo   > 0 && <Text style={styles.nagradaTxt}>{z.nagrada.zeljezo} ⛏️</Text>}
              </View>
              {mozePrimiti && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.btn, styles.nagrBtn]}
                  onPress={() => preuzmiKlanNagradu(z.id)}
                >
                  <Gift size={14} color="#000" />
                  <Text style={styles.nagrBtnTxt}>PREUZMI</Text>
                </TouchableOpacity>
              )}
              {z.preuzeto && (
                <Text style={styles.preuzetoTxt}>✓ Preuzeto</Text>
              )}
            </View>
          </View>
        );
      })}

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 0, paddingBottom: 120, paddingTop: 10 },

  // Osnivanje klana
  centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  bigTitle:  { fontSize: Math.round(24 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY, color: BOJE.textMain, marginTop: 20, marginBottom: 8 },
  hintText:  { fontSize: Math.round(13 * uiScale), color: BOJE.textMuted, fontFamily: FONT_FAMILY, textAlign: 'center', marginBottom: 28 },
  input: {
    width: '100%', backgroundColor: BOJE.bgCard, borderWidth: 1, borderColor: BOJE.klan + '60',
    borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14, color: BOJE.textMain,
    fontFamily: FONT_FAMILY, fontSize: Math.round(15 * uiScale), marginBottom: 16,
  },

  // Gumbi
  btn: { paddingHorizontal: 20, paddingVertical: 13, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { fontWeight: '900', fontFamily: FONT_FAMILY, fontSize: Math.round(14 * uiScale), letterSpacing: 0.5 },
  donBtn: { marginLeft: 14 },
  nagrBtn: { flexDirection: 'row', gap: 6, backgroundColor: BOJE.klan, paddingVertical: 10, paddingHorizontal: 14 },
  nagrBtnTxt: { color: '#000', fontWeight: '900', fontFamily: FONT_FAMILY, fontSize: 13 },

  // Header klana
  headerCard: {
    backgroundColor: BOJE.bgCard, borderRadius: 24, padding: 20, marginBottom: 14,
    borderWidth: 1, borderColor: BOJE.klan + '40',
    shadowColor: BOJE.klan, shadowOpacity: 0.2, shadowRadius: 12, elevation: 5,
  },
  headerRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  klanNaziv:   { fontSize: Math.round(20 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY, color: BOJE.klan, letterSpacing: 1 },
  klanRazina:  { fontSize: Math.round(13 * uiScale), color: BOJE.textMuted, fontFamily: FONT_FAMILY, marginTop: 2 },
  xpBadge:     { backgroundColor: BOJE.klan + '20', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  xpBadgeTxt:  { color: BOJE.klan, fontWeight: '800', fontFamily: FONT_FAMILY, fontSize: 12 },
  xpTraka:     { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  xpFill:      { height: '100%', borderRadius: 3 },

  // Donacija
  donacijaCard: {
    backgroundColor: BOJE.bgCard, borderRadius: 20, padding: 18, marginBottom: 20,
    borderWidth: 1, borderColor: BOJE.border,
    flexDirection: 'row', alignItems: 'center',
  },
  donacijaTitle: { fontSize: Math.round(15 * uiScale), fontWeight: '800', fontFamily: FONT_FAMILY, color: BOJE.textMain },
  donacijaHint:  { fontSize: Math.round(12 * uiScale), color: BOJE.textMuted, fontFamily: FONT_FAMILY, marginTop: 3 },

  sectionTitle: { fontSize: Math.round(14 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY, color: BOJE.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 },

  // Zadaci
  zadatakCard: {
    backgroundColor: BOJE.bgCard, borderRadius: 20, padding: 18, marginBottom: 12,
    borderWidth: 1, borderColor: BOJE.border,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, elevation: 3,
  },
  zadatakTop:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  zadatakOpis:   { flex: 1, fontSize: Math.round(13 * uiScale), fontWeight: '700', fontFamily: FONT_FAMILY, color: BOJE.textMain, lineHeight: 20 },
  progressTraka: { height: 5, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressFill:  { height: '100%', borderRadius: 3 },
  progressTxt:   { fontSize: 11, color: BOJE.textMuted, fontFamily: FONT_FAMILY, marginBottom: 10 },
  zadatakBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderColor: BOJE.border, paddingTop: 10 },
  nagradeRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  nagradaTxt:    { fontSize: Math.round(13 * uiScale), fontWeight: '800', fontFamily: FONT_FAMILY, color: BOJE.textMain },
  preuzetoTxt:   { fontSize: 12, color: BOJE.klan, fontWeight: '700', fontFamily: FONT_FAMILY },
});

export default ClanScreen;
