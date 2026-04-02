import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Trophy } from 'lucide-react-native';
import { useGameStore } from '../store/gameStore';
import { TURNIR_RAZINE, BOJE, uiScale, FONT_FAMILY } from '../config/constants';

const danaDoSljedecegPonedjeljka = (danUTjednu) => (danUTjednu === 0 ? 1 : 8 - danUTjednu);

const vrijemeDoPonedjeljka = () => {
  const sada = new Date();
  const danUTjednu = sada.getDay();
  const sljedeciPonedjeljak = new Date(sada);
  sljedeciPonedjeljak.setDate(sada.getDate() + danaDoSljedecegPonedjeljka(danUTjednu));
  sljedeciPonedjeljak.setHours(0, 0, 0, 0);
  const preostaloMs = sljedeciPonedjeljak - sada;
  const h = Math.floor(preostaloMs / (60 * 60 * 1000));
  const m = Math.floor((preostaloMs % (60 * 60 * 1000)) / (60 * 1000));
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h ${m}m`;
  return `${h}h ${m}m`;
};

/**
 * TurnirScreen — tjedni turnir s razinama i nagradama.
 * Igrač skuplja bodove vrtnjama, pobjedama i misijama.
 * Na kraju tjedna može preuzeti nagrade za dostignuti rang.
 */
const TurnirScreen = () => {
  const turnir              = useGameStore((s) => s.turnir);
  const preuzimiTurnirNagradu = useGameStore((s) => s.preuzimiTurnirNagradu);

  const bodovi          = turnir?.bodovi ?? 0;
  const nagradePreuzete = turnir?.nagradePreuzete ?? {};

  // Odredi trenutni rang
  const trenutniRang = [...TURNIR_RAZINE]
    .reverse()
    .find((r) => bodovi >= r.minBodova) ?? TURNIR_RAZINE[0];

  // Sljedeći rang (ako postoji)
  const rangIndex       = TURNIR_RAZINE.findIndex((r) => r.id === trenutniRang.id);
  const sljedeciRang    = TURNIR_RAZINE[rangIndex + 1] ?? null;
  const napredak        = sljedeciRang
    ? Math.min(1, (bodovi - trenutniRang.minBodova) / (sljedeciRang.minBodova - trenutniRang.minBodova))
    : 1;

  let preostaloVrijeme = '—';
  try { preostaloVrijeme = vrijemeDoPonedjeljka(); } catch (_) {}

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

      {/* ── Naslov + bodovi ── */}
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Trophy size={22} color={BOJE.turnir} strokeWidth={2} />
          <Text style={styles.headerTitle}>TJEDNI TURNIR</Text>
        </View>
        <Text style={styles.headerSub}>Reset svaki ponedjeljak u ponoć</Text>

        <View style={styles.rangRow}>
          <Text style={styles.rangEmodzi}>{trenutniRang.emodzi}</Text>
          <View>
            <Text style={[styles.rangNaziv, { color: BOJE.turnir }]}>{trenutniRang.naziv.toUpperCase()}</Text>
            <Text style={styles.bodoviBroj}>{bodovi.toLocaleString()} bodova</Text>
          </View>
          <View style={styles.timerChip}>
            <Text style={styles.timerLabel}>Reset za</Text>
            <Text style={[styles.timerVal, { color: BOJE.turnir }]}>{preostaloVrijeme}</Text>
          </View>
        </View>

        {/* Progress bar prema sljedećem rangu */}
        {sljedeciRang && (
          <View style={styles.progressWrap}>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${Math.round(napredak * 100)}%`, backgroundColor: BOJE.turnir }]} />
            </View>
            <Text style={styles.progressTxt}>
              {bodovi} / {sljedeciRang.minBodova} → {sljedeciRang.emodzi} {sljedeciRang.naziv}
            </Text>
          </View>
        )}
      </View>

      {/* ── Kako zaraditi bodove ── */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>📊 KAKO ZARADITI BODOVE</Text>
        {[
          { tekst: '+1 bod po vrtnji automata', emoji: '🎰' },
          { tekst: '+5 bodova po dobitku',      emoji: '🏆' },
          { tekst: '+10 bodova za 2+ dobitak',   emoji: '🔥' },
          { tekst: '+20 bodova za jackpot',       emoji: '💥' },
          { tekst: '+50 bodova za završenu misiju', emoji: '✅' },
        ].map((item, i) => (
          <View key={i} style={styles.infoRow}>
            <Text style={styles.infoEmodzi}>{item.emoji}</Text>
            <Text style={styles.infoTxt}>{item.tekst}</Text>
          </View>
        ))}
      </View>

      {/* ── Rangovi i nagrade ── */}
      <Text style={styles.sectionTitle}>🎖️ RANGOVI I NAGRADE</Text>
      {TURNIR_RAZINE.map((razina) => {
        const preuzeto  = !!nagradePreuzete[razina.id];
        const dostupno  = bodovi >= razina.minBodova;
        const mozePrimiti = dostupno && !preuzeto;

        return (
          <View
            key={razina.id}
            style={[
              styles.razinaCar,
              trenutniRang.id === razina.id && { borderColor: BOJE.turnir + '80' },
              preuzeto && { borderColor: BOJE.xp + '60', backgroundColor: BOJE.xp + '06' },
            ]}
          >
            <View style={styles.razinaHeader}>
              <Text style={styles.razinaEmodzi}>{razina.emodzi}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.razinaNaziv, dostupno && { color: BOJE.turnir }]}>
                  {razina.naziv.toUpperCase()}
                </Text>
                <Text style={styles.razinaMin}>min. {razina.minBodova.toLocaleString()} bodova</Text>
              </View>
              <View style={[styles.statusBadge, preuzeto && { backgroundColor: BOJE.xp + '25', borderColor: BOJE.xp + '60' }]}>
                <Text style={[styles.statusTxt, preuzeto && { color: BOJE.xp }]}>
                  {preuzeto ? '✓ PREUZETO' : (dostupno ? 'DOSTUPNO' : 'ZAKLJUČANO')}
                </Text>
              </View>
            </View>

            {/* Nagrade prikaz */}
            <View style={styles.nagradeRow}>
              <Text style={styles.nagradesLabel}>NAGRADA:</Text>
              {razina.nagrada.zlato && (
                <View style={styles.nagradaChip}>
                  <Text style={[styles.nagradaTxt, { color: BOJE.zlato }]}>🪙 {razina.nagrada.zlato.toLocaleString()}</Text>
                </View>
              )}
              {razina.nagrada.dijamanti && (
                <View style={styles.nagradaChip}>
                  <Text style={[styles.nagradaTxt, { color: BOJE.dijamant }]}>💎 {razina.nagrada.dijamanti}</Text>
                </View>
              )}
            </View>

            {mozePrimiti && (
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.preuzimiBtn}
                onPress={() => preuzimiTurnirNagradu(razina.id)}
              >
                <Text style={styles.preuzimiTxt}>🎁 PREUZMI NAGRADU</Text>
              </TouchableOpacity>
            )}
          </View>
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
    borderColor: BOJE.turnir + '40',
    padding: 18,
    marginBottom: 16,
  },
  headerRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  headerTitle: {
    fontSize: Math.round(17 * uiScale),
    fontWeight: '900',
    fontFamily: FONT_FAMILY,
    color: BOJE.textMain,
    letterSpacing: 1.2,
  },
  headerSub: {
    fontSize: Math.round(11 * uiScale),
    color: BOJE.textMuted,
    fontFamily: FONT_FAMILY,
    marginBottom: 14,
  },

  rangRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  rangEmodzi: { fontSize: 36 },
  rangNaziv:  { fontSize: Math.round(18 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY },
  bodoviBroj: { fontSize: Math.round(13 * uiScale), color: BOJE.textMuted, fontFamily: FONT_FAMILY, marginTop: 2 },
  timerChip: {
    marginLeft: 'auto',
    backgroundColor: BOJE.turnir + '20',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BOJE.turnir + '50',
  },
  timerLabel: { fontSize: 9, color: BOJE.textMuted, fontFamily: FONT_FAMILY, fontWeight: '700' },
  timerVal:   { fontSize: Math.round(12 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY, marginTop: 2 },

  progressWrap: { gap: 6 },
  progressBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4 },
  progressTxt: { fontSize: Math.round(11 * uiScale), color: BOJE.textMuted, fontFamily: FONT_FAMILY },

  infoCard: {
    backgroundColor: BOJE.bgCard,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BOJE.border,
    padding: 16,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: Math.round(13 * uiScale),
    fontWeight: '900',
    fontFamily: FONT_FAMILY,
    color: BOJE.textMain,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  infoRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  infoEmodzi: { fontSize: 16 },
  infoTxt:    { fontSize: Math.round(12 * uiScale), color: BOJE.textMuted, fontFamily: FONT_FAMILY, flex: 1 },

  sectionTitle: {
    fontSize: Math.round(13 * uiScale),
    fontWeight: '900',
    fontFamily: FONT_FAMILY,
    color: BOJE.textMain,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 2,
  },

  razinaCar: {
    backgroundColor: BOJE.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BOJE.border,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  razinaHeader:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  razinaEmodzi:  { fontSize: 28 },
  razinaNaziv:   { fontSize: Math.round(15 * uiScale), fontWeight: '800', fontFamily: FONT_FAMILY, color: BOJE.textMuted },
  razinaMin:     { fontSize: Math.round(11 * uiScale), color: BOJE.textMuted, fontFamily: FONT_FAMILY, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BOJE.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  statusTxt: { fontSize: Math.round(10 * uiScale), fontWeight: '800', fontFamily: FONT_FAMILY, color: BOJE.textMuted },

  nagradeRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  nagradesLabel:  { fontSize: Math.round(10 * uiScale), color: BOJE.textMuted, fontFamily: FONT_FAMILY, fontWeight: '700' },
  nagradaChip:    { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  nagradaTxt:     { fontSize: Math.round(12 * uiScale), fontWeight: '800', fontFamily: FONT_FAMILY },

  preuzimiBtn: {
    backgroundColor: BOJE.turnir + '25',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BOJE.turnir + '70',
    shadowColor: BOJE.turnir,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  preuzimiTxt: {
    fontSize: Math.round(13 * uiScale),
    fontWeight: '900',
    fontFamily: FONT_FAMILY,
    color: BOJE.turnir,
    letterSpacing: 0.5,
  },
});

export default TurnirScreen;
