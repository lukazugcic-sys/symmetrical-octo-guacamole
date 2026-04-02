import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Hammer } from 'lucide-react-native';
import { useGameStore } from '../store/gameStore';
import { RECEPTI, BOJE, uiScale, FONT_FAMILY } from '../config/constants';

const sekundeUVrijeme = (sek) => {
  if (sek <= 0) return 'Isteklo';
  const h = Math.floor(sek / 3600);
  const m = Math.floor((sek % 3600) / 60);
  const s = sek % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

/**
 * KovacnicaScreen — ekran za izradu predmeta (crafting / forge).
 * Prikazuje dostupne recepte i aktivne bonuse s odbrojavanjem.
 */
const KovacnicaScreen = () => {
  const resursi      = useGameStore((s) => s.resursi);
  const kovanice     = useGameStore((s) => s.kovanice);
  const izradiPredmet = useGameStore((s) => s.izradiPredmet);

  const sada = Date.now();

  const aktivniBuffovi = RECEPTI.filter(
    (r) => r.trajanjeSek > 0 && kovanice[r.id]?.expiresAt > sada,
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

      {/* ── Naslov ── */}
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Hammer size={22} color={BOJE.kovacnica} strokeWidth={2} />
          <Text style={styles.headerTitle}>KOVAČNICA</Text>
        </View>
        <Text style={styles.headerSub}>Kombinuj resurse i izradi moćne predmete</Text>

        {/* Resursi igrača */}
        <View style={styles.resursiRow}>
          {[
            { naziv: 'Drvo',   kolicina: Math.floor(resursi.drvo),    boja: BOJE.drvo },
            { naziv: 'Kamen',  kolicina: Math.floor(resursi.kamen),   boja: BOJE.kamen },
            { naziv: 'Železo', kolicina: Math.floor(resursi.zeljezo), boja: BOJE.zeljezo },
          ].map((r) => (
            <View key={r.naziv} style={styles.resursChip}>
              <Text style={[styles.resursVal, { color: r.boja }]}>{r.kolicina}</Text>
              <Text style={styles.resursNaziv}>{r.naziv}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Aktivni buffovi ── */}
      {aktivniBuffovi.length > 0 && (
        <View style={styles.aktivniSection}>
          <Text style={styles.sectionTitle}>⚡ AKTIVNI BONUSI</Text>
          {aktivniBuffovi.map((r) => {
            const preostaloSek = Math.max(0, Math.floor((kovanice[r.id].expiresAt - sada) / 1000));
            return (
              <View key={r.id} style={[styles.aktivniBuff, { borderColor: r.boja + '60' }]}>
                <Text style={styles.aktivniEmodzi}>{r.emodzi}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.aktivniNaziv, { color: r.boja }]}>{r.naziv}</Text>
                  <Text style={styles.aktivniOpis}>{r.opis}</Text>
                </View>
                <View style={[styles.timerBadge, { backgroundColor: r.boja + '25', borderColor: r.boja + '60' }]}>
                  <Text style={[styles.timerTxt, { color: r.boja }]}>{sekundeUVrijeme(preostaloSek)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ── Recepti ── */}
      <Text style={styles.sectionTitle}>🔨 RECEPTI</Text>
      {RECEPTI.map((recept) => {
        const mozeIzraditi =
          (recept.cijena.drvo    === 0 || resursi.drvo    >= recept.cijena.drvo)    &&
          (recept.cijena.kamen   === 0 || resursi.kamen   >= recept.cijena.kamen)   &&
          (recept.cijena.zeljezo === 0 || resursi.zeljezo >= recept.cijena.zeljezo);

        const vecAktivan = recept.trajanjeSek > 0 && kovanice[recept.id]?.expiresAt > sada;

        return (
          <View key={recept.id} style={[styles.receptCard, { borderColor: recept.boja + '40' }]}>
            <View style={styles.receptHeader}>
              <Text style={styles.receptEmodzi}>{recept.emodzi}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.receptNaziv, { color: recept.boja }]}>{recept.naziv}</Text>
                <Text style={styles.receptOpis}>{recept.opis}</Text>
                <Text style={styles.receptDetalji}>⏱ {recept.detalji}</Text>
              </View>
            </View>

            {/* Cijena */}
            <View style={styles.cijenaRow}>
              <Text style={styles.cijenaLabel}>CIJENA:</Text>
              {recept.cijena.drvo > 0 && (
                <View style={styles.cijenaChip}>
                  <Text style={[styles.cijenaTxt, { color: resursi.drvo >= recept.cijena.drvo ? BOJE.drvo : BOJE.slotVatra }]}>
                    🌲 {recept.cijena.drvo}
                  </Text>
                </View>
              )}
              {recept.cijena.kamen > 0 && (
                <View style={styles.cijenaChip}>
                  <Text style={[styles.cijenaTxt, { color: resursi.kamen >= recept.cijena.kamen ? BOJE.kamen : BOJE.slotVatra }]}>
                    ⛰️ {recept.cijena.kamen}
                  </Text>
                </View>
              )}
              {recept.cijena.zeljezo > 0 && (
                <View style={styles.cijenaChip}>
                  <Text style={[styles.cijenaTxt, { color: resursi.zeljezo >= recept.cijena.zeljezo ? BOJE.zeljezo : BOJE.slotVatra }]}>
                    ⚙️ {recept.cijena.zeljezo}
                  </Text>
                </View>
              )}
            </View>

            {/* Gumb */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.izradiBtn,
                (!mozeIzraditi || vecAktivan)
                  ? styles.izradiiBtnOff
                  : { backgroundColor: recept.boja + '25', borderColor: recept.boja + '70' },
              ]}
              onPress={() => izradiPredmet(recept.id)}
              disabled={!mozeIzraditi || vecAktivan}
            >
              <Text style={[
                styles.izradiTxt,
                (!mozeIzraditi || vecAktivan) && { color: BOJE.textMuted },
              ]}>
                {vecAktivan ? '✓ AKTIVAN' : (!mozeIzraditi ? 'NEMA RESURSA' : '🔨 IZRADI')}
              </Text>
            </TouchableOpacity>
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
    borderColor: BOJE.kovacnica + '40',
    padding: 18,
    marginBottom: 16,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  headerTitle: {
    fontSize: Math.round(17 * uiScale),
    fontWeight: '900',
    fontFamily: FONT_FAMILY,
    color: BOJE.textMain,
    letterSpacing: 1.2,
  },
  headerSub: {
    fontSize: Math.round(12 * uiScale),
    color: BOJE.textMuted,
    fontFamily: FONT_FAMILY,
    marginBottom: 14,
  },

  resursiRow: { flexDirection: 'row', gap: 8 },
  resursChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BOJE.border,
  },
  resursVal:   { fontSize: Math.round(16 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY },
  resursNaziv: { fontSize: Math.round(10 * uiScale), color: BOJE.textMuted, fontFamily: FONT_FAMILY, marginTop: 2 },

  aktivniSection: { marginBottom: 16 },
  sectionTitle: {
    fontSize: Math.round(13 * uiScale),
    fontWeight: '900',
    fontFamily: FONT_FAMILY,
    color: BOJE.textMain,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 2,
  },
  aktivniBuff: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: BOJE.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  aktivniEmodzi: { fontSize: 24 },
  aktivniNaziv: { fontSize: Math.round(13 * uiScale), fontWeight: '800', fontFamily: FONT_FAMILY },
  aktivniOpis:  { fontSize: Math.round(11 * uiScale), color: BOJE.textMuted, fontFamily: FONT_FAMILY, marginTop: 2 },
  timerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  timerTxt: { fontSize: Math.round(12 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY },

  receptCard: {
    backgroundColor: BOJE.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  receptHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  receptEmodzi: { fontSize: 28, marginTop: 2 },
  receptNaziv:  { fontSize: Math.round(15 * uiScale), fontWeight: '800', fontFamily: FONT_FAMILY },
  receptOpis:   { fontSize: Math.round(12 * uiScale), color: BOJE.textMuted, fontFamily: FONT_FAMILY, marginTop: 3 },
  receptDetalji:{ fontSize: Math.round(11 * uiScale), color: BOJE.textMuted, fontFamily: FONT_FAMILY, marginTop: 2 },

  cijenaRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cijenaLabel:  { fontSize: Math.round(10 * uiScale), color: BOJE.textMuted, fontFamily: FONT_FAMILY, fontWeight: '700' },
  cijenaChip:   { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  cijenaTxt:    { fontSize: Math.round(12 * uiScale), fontWeight: '800', fontFamily: FONT_FAMILY },

  izradiBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  izradiiBtnOff: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: BOJE.border,
  },
  izradiTxt: {
    fontSize: Math.round(13 * uiScale),
    fontWeight: '900',
    fontFamily: FONT_FAMILY,
    color: BOJE.textMain,
    letterSpacing: 0.5,
  },
});

export default KovacnicaScreen;
