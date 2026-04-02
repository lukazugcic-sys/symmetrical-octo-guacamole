/**
 * src/components/RaidModal.js
 *
 * Modal za pljačku pravih igrača — pojavljuje se kada skull simboli
 * formiraju liniju na automatu.
 *
 * Props:
 *   vidljiv    {bool}       — kontrolira prikaz modala
 *   onZatvori  {() => void} — callback pri zatvaranju
 *
 * Tok:
 *   1. Modal se otvori → učita listu meta iz Firestorea (dohvatiMete)
 *   2. Igrač odabere metu → izvrsiNapad()
 *   3. Ukradeni resursi dodaju se u gameStore
 *   4. Modal se zatvori
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity, FlatList,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { Swords, Shield, X, TreePine, Mountain, Pickaxe } from 'lucide-react-native';
import { dohvatiMete, izvrsiNapad } from '../firebase/raids';
import { useGameStore }             from '../store/gameStore';
import { BOJE, uiScale, FONT_FAMILY } from '../config/constants';

const RaidModal = ({ vidljiv, onZatvori }) => {
  const [mete,      setMete]      = useState([]);
  const [ucitava,   setUcitava]   = useState(false);
  const [napadaUid, setNapadaUid] = useState(null); // uid mete koja se napada
  const [rezultat,  setRezultat]  = useState(null);  // { drvo, kamen, zeljezo } ili 'blokirano'
  const [greska,    setGreska]    = useState(null);
  const [mode,      setMode]      = useState('normal'); // normal | retaliation
  const [retaliationMeta, setRetaliationMeta] = useState(null);

  const uid      = useGameStore((s) => s.uid);
  const primiResurse = useGameStore((s) => s.primiResurse);
  const raidPovijest = useGameStore((s) => s.raidPovijest);

  const ucitajMete = useCallback(async () => {
    if (!uid) return;
    setUcitava(true);
    setMete([]);
    setRezultat(null);
    setGreska(null);
    try {
      const lista = await dohvatiMete(uid, 5);
      setMete(lista);
      if (!lista.length) setGreska('Nema dostupnih meta trenutno.');
    } catch (_) {
      setGreska('Greška pri učitavanju meta. Pokušaj ponovno.');
    }
    setUcitava(false);
  }, [uid]);

  useEffect(() => {
    const kandidat = (raidPovijest ?? []).find((r) =>
      r.tip === 'incoming'
      && r.napadacUid
      && r.mozeProtunapadDo
      && Date.now() < r.mozeProtunapadDo
    );
    if (kandidat) {
      setMode('retaliation');
      setRetaliationMeta({
        uid: kandidat.napadacUid,
        imeIgraca: kandidat.napadacIme ?? 'Napadač',
        igracRazina: 1,
        resursi: { drvo: 0, kamen: 0, zeljezo: 0 },
      });
    } else {
      setMode('normal');
      setRetaliationMeta(null);
    }
  }, [raidPovijest, vidljiv]);

  useEffect(() => {
    if (vidljiv) ucitajMete();
    else {
      setMete([]);
      setRezultat(null);
      setNapadaUid(null);
      setGreska(null);
    }
  }, [vidljiv, ucitajMete]);

  const napadni = async (metaUid) => {
    if (!uid || napadaUid) return;
    setNapadaUid(metaUid);
    const metaObj = mete.find((m) => m.uid === metaUid) || retaliationMeta || { uid: metaUid, imeIgraca: 'Meta' };
    const ukradeno = await izvrsiNapad(uid, metaUid);
    if (ukradeno) {
      primiResurse(ukradeno, { uid: metaUid, imeIgraca: ukradeno.metaImeIgraca ?? metaObj.imeIgraca });
      setRezultat(ukradeno);
    } else {
      setRezultat('blokirano');
    }
    setNapadaUid(null);
  };

  const renderMeta = ({ item }) => {
    const ukupno = (item.resursi?.drvo ?? 0) + (item.resursi?.kamen ?? 0) + (item.resursi?.zeljezo ?? 0);
    const mogucePlijen = Math.floor(ukupno * 0.15);
    const napada = napadaUid === item.uid;

    return (
      <View style={styles.metaKartica}>
        <View style={styles.metaInfo}>
          <Text style={styles.metaIme} numberOfLines={1}>{item.imeIgraca}</Text>
          <Text style={styles.metaRazina}>Lv {item.igracRazina}</Text>
          <View style={styles.resursRow}>
            <TreePine size={12} color={BOJE.drvo} />
            <Text style={styles.resTxt}>{Math.floor(item.resursi?.drvo ?? 0)}</Text>
            <Mountain size={12} color={BOJE.kamen} />
            <Text style={styles.resTxt}>{Math.floor(item.resursi?.kamen ?? 0)}</Text>
            <Pickaxe size={12} color={BOJE.zeljezo} />
            <Text style={styles.resTxt}>{Math.floor(item.resursi?.zeljezo ?? 0)}</Text>
          </View>
        </View>

        <View style={styles.plijenaInfo}>
          <Text style={styles.plijenaLabel}>Plijen ~{mogucePlijen}</Text>
          <TouchableOpacity
            style={[styles.napadBtn, napada && styles.napadBtnDisabled]}
            onPress={() => napadni(item.uid)}
            disabled={!!napadaUid}
            activeOpacity={0.7}
          >
            {napada ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <>
                <Swords size={14} color="#000" />
                <Text style={styles.napadBtnTxt}>NAPADNI</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={vidljiv}
      transparent
      animationType="slide"
      onRequestClose={onZatvori}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Zaglavlje */}
          <View style={styles.modalHeader}>
            <Swords size={22} color={BOJE.slotVatra} strokeWidth={2} />
            <Text style={styles.modalNaslov}>ODABERI METU</Text>
            <TouchableOpacity onPress={onZatvori} style={styles.closeBtn}>
              <X size={20} color={BOJE.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalOpis}>
            {mode === 'retaliation'
              ? 'Uhvatio si trag napadača — izvrši protunapad unutar 1h.'
              : 'Lubanje su formirale napadnu liniju! Odaberi igrača kojeg ćeš opljačkati.'}
          </Text>

          {/* Rezultat napada */}
          {rezultat && (
            <View style={[styles.rezultatBox, rezultat === 'blokirano' ? styles.blokirano : styles.uspjeh]}>
              {rezultat === 'blokirano' ? (
                <>
                  <Shield size={20} color={BOJE.stit} />
                  <Text style={[styles.rezultatTxt, { color: BOJE.stit }]}>
                    Meta je zaštićena štitom! Napad blokiran.
                  </Text>
                </>
              ) : (
                <Text style={styles.rezultatTxt}>
                  ✅ Ukradeno: {Math.floor(rezultat.drvo)} 🌲 · {Math.floor(rezultat.kamen)} ⛰️ · {Math.floor(rezultat.zeljezo)} ⛏️
                </Text>
              )}
            </View>
          )}

          {/* Lista meta */}
          {mode === 'retaliation' && retaliationMeta ? (
            <View style={styles.lista}>
              {renderMeta({ item: retaliationMeta })}
            </View>
          ) : ucitava ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={BOJE.slotVatra} />
              <Text style={styles.ucitavaTxt}>Tražim protivnike…</Text>
            </View>
          ) : mete.length === 0 ? (
            <View style={styles.loadingBox}>
              <Shield size={36} color={BOJE.textMuted} strokeWidth={1.5} />
              <Text style={styles.ucitavaTxt}>{greska || 'Nema dostupnih meta trenutno.'}</Text>
              <Text style={styles.hintTxt}>
                {greska ? 'Provjeri vezu i pokušaj ponovno.' : 'Svi igrači su zaštićeni ili nema resursa.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={mete}
              keyExtractor={(item) => item.uid}
              renderItem={renderMeta}
              showsVerticalScrollIndicator={false}
              style={styles.lista}
            />
          )}

          {/* Osvježi gumb */}
          {!ucitava && !rezultat && (
            <TouchableOpacity style={styles.osvjeziBtn} onPress={ucitajMete}>
              <Text style={styles.osvjeziTxt}>↻ Osvježi mete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#0C0E1C',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: BOJE.slotVatra + '60',
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  modalNaslov: {
    flex: 1,
    fontSize: Math.round(16 * uiScale),
    fontWeight: '900',
    fontFamily: FONT_FAMILY,
    color: BOJE.slotVatra,
    letterSpacing: 1.5,
  },
  closeBtn: { padding: 4 },

  modalOpis: {
    fontSize: Math.round(12 * uiScale),
    color: BOJE.textMuted,
    fontFamily: FONT_FAMILY,
    marginBottom: 14,
    lineHeight: 18,
  },

  rezultatBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  blokirano: { borderColor: BOJE.stit + '60', backgroundColor: BOJE.stit + '12' },
  uspjeh:    { borderColor: BOJE.xp + '60',   backgroundColor: BOJE.xp  + '12' },
  rezultatTxt: {
    flex: 1,
    fontSize: Math.round(13 * uiScale),
    fontWeight: '700',
    fontFamily: FONT_FAMILY,
    color: BOJE.textMain,
  },

  loadingBox: { alignItems: 'center', gap: 10, paddingVertical: 28 },
  ucitavaTxt: { color: BOJE.textMuted, fontFamily: FONT_FAMILY, fontSize: Math.round(13 * uiScale) },
  hintTxt:    { color: BOJE.textMuted, fontFamily: FONT_FAMILY, fontSize: Math.round(11 * uiScale), textAlign: 'center' },

  lista: { maxHeight: 260 },

  metaKartica: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BOJE.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BOJE.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginVertical: 4,
  },
  metaInfo:   { flex: 1, gap: 3 },
  metaIme:    { fontSize: Math.round(14 * uiScale), fontWeight: '800', fontFamily: FONT_FAMILY, color: BOJE.textMain },
  metaRazina: { fontSize: Math.round(11 * uiScale), color: BOJE.textMuted, fontFamily: FONT_FAMILY },
  resursRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  resTxt:     { fontSize: Math.round(11 * uiScale), color: BOJE.textMain, fontFamily: FONT_FAMILY },

  plijenaInfo:  { alignItems: 'flex-end', gap: 6 },
  plijenaLabel: { fontSize: Math.round(11 * uiScale), color: BOJE.kamen, fontFamily: FONT_FAMILY, fontWeight: '700' },

  napadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: BOJE.slotVatra,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: BOJE.slotVatra,
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 4,
  },
  napadBtnDisabled: { backgroundColor: BOJE.border },
  napadBtnTxt: {
    fontSize: Math.round(11 * uiScale),
    fontWeight: '900',
    fontFamily: FONT_FAMILY,
    color: '#fff',
  },

  osvjeziBtn: { marginTop: 10, alignItems: 'center', paddingVertical: 10 },
  osvjeziTxt: { color: BOJE.textMuted, fontFamily: FONT_FAMILY, fontSize: Math.round(13 * uiScale) },
});

export default RaidModal;
