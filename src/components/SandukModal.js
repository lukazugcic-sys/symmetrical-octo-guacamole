import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { useGameStore } from '../store/gameStore';
import { SANDUK_TIPOVI, BOJE, uiScale, FONT_FAMILY } from '../config/constants';

/**
 * SandukModal — modal za otvaranje dnevnih i premium sanduka.
 * Prikazuje sve tri vrste sanduka i nagrade nakon otvaranja.
 */
const SandukModal = ({ vidljiv, onZatvori }) => {
  const dijamanti     = useGameStore((s) => s.dijamanti);
  const sandukDatum   = useGameStore((s) => s.sandukDatum);
  const otvoriSanduk  = useGameStore((s) => s.otvoriSanduk);

  const [nagradeIshod, setNagradeIshod] = useState(null);
  const [otvorenTip,   setOtvorenTip]   = useState(null);

  const danas = new Date().toDateString();
  const besplatniOtvoren = sandukDatum === danas;

  const handleOtvori = (tipId) => {
    const ishod = otvoriSanduk(tipId);
    if (ishod) {
      setNagradeIshod(ishod);
      setOtvorenTip(tipId);
    }
  };

  const handleZatvori = () => {
    setNagradeIshod(null);
    setOtvorenTip(null);
    onZatvori();
  };

  const formatNagrada = (ishod) => {
    const redci = [];
    if (ishod.zlato)         redci.push({ labela: 'Zlato',        vrijednost: `+${ishod.zlato.toLocaleString()}`, boja: BOJE.zlato,    emodzi: '🪙' });
    if (ishod.dijamanti)     redci.push({ labela: 'Dijamanti',    vrijednost: `+${ishod.dijamanti}`,             boja: BOJE.dijamant, emodzi: '💎' });
    if (ishod.energija)      redci.push({ labela: 'Energija',     vrijednost: `+${ishod.energija}`,              boja: BOJE.energija, emodzi: '⚡' });
    if (ishod.drvo)          redci.push({ labela: 'Drvo',         vrijednost: `+${Math.floor(ishod.drvo)}`,      boja: BOJE.drvo,     emodzi: '🌲' });
    if (ishod.kamen)         redci.push({ labela: 'Kamen',        vrijednost: `+${Math.floor(ishod.kamen)}`,     boja: BOJE.kamen,    emodzi: '⛰️' });
    if (ishod.zeljezo)       redci.push({ labela: 'Železo',       vrijednost: `+${Math.floor(ishod.zeljezo)}`,   boja: BOJE.zeljezo,  emodzi: '⚙️' });
    if (ishod.hero_fragment) redci.push({ labela: 'Hero Fragmenti', vrijednost: `+${ishod.hero_fragment}`,       boja: '#A855F7',     emodzi: '⚗️' });
    return redci;
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={vidljiv}
      onRequestClose={handleZatvori}
    >
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>📦 DNEVNI SANDUCI</Text>
            <TouchableOpacity onPress={handleZatvori} style={styles.closeBtn}>
              <Text style={styles.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Prikaz nagrade nakon otvaranja */}
          {nagradeIshod ? (
            <ScrollView contentContainerStyle={styles.nagradaContainer}>
              <Text style={styles.nagradaTitle}>
                {SANDUK_TIPOVI.find((t) => t.id === otvorenTip)?.emodzi ?? '📦'} SANDUK OTVOREN!
              </Text>
              <Text style={styles.nagradaSub}>Tvoje nagrade:</Text>

              {formatNagrada(nagradeIshod).map((r) => (
                <View key={r.labela} style={[styles.nagradaRedak, { borderColor: r.boja + '40' }]}>
                  <Text style={styles.nagradaEmodzi}>{r.emodzi}</Text>
                  <Text style={styles.nagradaLabela}>{r.labela}</Text>
                  <Text style={[styles.nagradaVrijednost, { color: r.boja }]}>{r.vrijednost}</Text>
                </View>
              ))}

              <TouchableOpacity style={styles.preuzimiBtn} onPress={handleZatvori}>
                <Text style={styles.preuzimiTxt}>✓ PREUZMI</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={styles.sandukiContainer}>
              {SANDUK_TIPOVI.map((tip) => {
                const jeBesplatni  = tip.besplatanJednom;
                const jeOtvoren    = jeBesplatni && besplatniOtvoren;
                const mozePlatiti  = !jeBesplatni && dijamanti >= tip.cijenaDijamanti;
                const mozeOtvoriti = jeBesplatni ? !jeOtvoren : mozePlatiti;

                return (
                  <View key={tip.id} style={[styles.sandukCard, { borderColor: tip.boja + '50' }]}>
                    <View style={styles.sandukHeader}>
                      <Text style={styles.sandukEmodzi}>{tip.emodzi}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.sandukNaziv, { color: tip.boja }]}>{tip.naziv}</Text>
                        <Text style={styles.sandukCijena}>
                          {jeBesplatni ? (jeOtvoren ? '✓ Otvoren danas' : '🆓 Besplatno') : `💎 ${tip.cijenaDijamanti} dijamanata`}
                        </Text>
                      </View>
                    </View>

                    {/* Nagrade preview */}
                    <View style={styles.nagradaPreview}>
                      {tip.nagrade.filter((n) => n.tip !== 'hero_fragment').slice(0, 4).map((n) => (
                        <View key={n.tip} style={styles.previewChip}>
                          <Text style={styles.previewTxt}>
                            {n.tip === 'zlato' ? '🪙' : n.tip === 'energija' ? '⚡' : n.tip === 'dijamanti' ? '💎' : n.tip === 'drvo' ? '🌲' : n.tip === 'kamen' ? '⛰️' : '⚙️'}
                            {' '}{n.min}–{n.max}
                          </Text>
                        </View>
                      ))}
                      {tip.nagrade.find((n) => n.tip === 'hero_fragment') && (
                        <View style={styles.previewChip}>
                          <Text style={styles.previewTxt}>
                            ⚗️ Hero
                            {tip.nagrade.find((n) => n.tip === 'hero_fragment')?.sansa < 1
                              ? ` (${Math.round((tip.nagrade.find((n) => n.tip === 'hero_fragment')?.sansa ?? 0) * 100)}%)`
                              : ''}
                          </Text>
                        </View>
                      )}
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={[
                        styles.otvoriBtn,
                        !mozeOtvoriti
                          ? styles.otvoriBtnOff
                          : { backgroundColor: tip.boja + '25', borderColor: tip.boja + '70' },
                      ]}
                      onPress={() => mozeOtvoriti && handleOtvori(tip.id)}
                      disabled={!mozeOtvoriti}
                    >
                      <Text style={[styles.otvoriTxt, !mozeOtvoriti && { color: BOJE.textMuted }]}>
                        {jeOtvoren ? '✓ OTVOREN' : (!mozePlatiti && !jeBesplatni ? 'NEMA DIJAMANATA' : '📦 OTVORI')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#0D0F1E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: BOJE.border,
    maxHeight: '82%',
    paddingTop: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: BOJE.border,
  },
  modalTitle: {
    fontSize: Math.round(16 * uiScale),
    fontWeight: '900',
    fontFamily: FONT_FAMILY,
    color: BOJE.textMain,
    letterSpacing: 0.8,
  },
  closeBtn: { padding: 6 },
  closeTxt: { fontSize: 18, color: BOJE.textMuted },

  sandukiContainer: { padding: 16, paddingBottom: 32 },
  sandukCard: {
    backgroundColor: BOJE.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  sandukHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  sandukEmodzi: { fontSize: 32 },
  sandukNaziv:  { fontSize: Math.round(15 * uiScale), fontWeight: '800', fontFamily: FONT_FAMILY },
  sandukCijena: { fontSize: Math.round(12 * uiScale), color: BOJE.textMuted, fontFamily: FONT_FAMILY, marginTop: 2 },

  nagradaPreview: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  previewChip: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  previewTxt: { fontSize: Math.round(11 * uiScale), color: BOJE.textMuted, fontFamily: FONT_FAMILY },

  otvoriBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  otvoriBtnOff: { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: BOJE.border },
  otvoriTxt: {
    fontSize: Math.round(13 * uiScale),
    fontWeight: '900',
    fontFamily: FONT_FAMILY,
    color: BOJE.textMain,
    letterSpacing: 0.5,
  },

  nagradaContainer: { padding: 20, paddingBottom: 32, alignItems: 'center' },
  nagradaTitle: {
    fontSize: Math.round(20 * uiScale),
    fontWeight: '900',
    fontFamily: FONT_FAMILY,
    color: BOJE.textMain,
    letterSpacing: 1,
    marginBottom: 6,
    textAlign: 'center',
  },
  nagradaSub: {
    fontSize: Math.round(13 * uiScale),
    color: BOJE.textMuted,
    fontFamily: FONT_FAMILY,
    marginBottom: 20,
  },
  nagradaRedak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: BOJE.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    width: '100%',
  },
  nagradaEmodzi:     { fontSize: 22 },
  nagradaLabela:     { flex: 1, fontSize: Math.round(13 * uiScale), color: BOJE.textMuted, fontFamily: FONT_FAMILY },
  nagradaVrijednost: { fontSize: Math.round(16 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY },

  preuzimiBtn: {
    marginTop: 16,
    backgroundColor: BOJE.energija + '25',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderWidth: 1,
    borderColor: BOJE.energija + '70',
  },
  preuzimiTxt: {
    fontSize: Math.round(14 * uiScale),
    fontWeight: '900',
    fontFamily: FONT_FAMILY,
    color: BOJE.energija,
    letterSpacing: 0.8,
  },
});

export default SandukModal;
