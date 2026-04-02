import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Users, Swords, CheckCircle2, Circle, Gift } from 'lucide-react-native';
import { useGameStore }     from '../store/gameStore';
import { BOJE, uiScale, FONT_FAMILY } from '../config/constants';
import {
  kreirajKlan, slušajKlan, doniraiXpKlanu, azurirajKlanZadatak,
  preuzmiNagradu as preuzmiNagraduCloud,
  osvjeziZadatkeAkoTreba, slugKlana, osigurajClanRat, slusajClanRat, zakljuciClanRatAkoIstekao,
} from '../firebase/clanMultiplayer';
import { posaljiNotifikaciju } from '../hooks/useNotifications';
import { ucitajCloud } from '../firebase/cloudSave';

const DONACIJA_IZNOS = 200; // zlato po jednom kliku donacije
const xpZaKlanRazinu = (razina = 1) => Math.max(1000, razina * 1000);

/**
 * Ekran Klana (Ceha) — osnivanje, pregled zadataka, donacija i nagrade.
 * Multiplayer: real-time Firestore listener (Faza 5) s lokalnim fallbackom.
 */
const ClanScreen = () => {
  const zlato              = useGameStore((s) => s.zlato);
  const klan               = useGameStore((s) => s.klan);
  const uid                = useGameStore((s) => s.uid);
  const osnujiKlan         = useGameStore((s) => s.osnujiKlan);
  const doniraiUKlan       = useGameStore((s) => s.doniraiUKlan);
  const preuzmiKlanNagradu = useGameStore((s) => s.preuzmiKlanNagradu);
  const refreshKlanZadatke = useGameStore((s) => s.refreshKlanZadatke);

  const [imeTxt,     setImeTxt]     = useState('');
  const [cloudKlan,  setCloudKlan]  = useState(null); // real-time Firestore podaci
  const [clanMembers, setClanMembers] = useState([]);
  const [tab, setTab] = useState('zadaci');
  const [cloudWar, setCloudWar] = useState(null);
  const unsubscribeRef = useRef(null);
  const warUnsubscribeRef = useRef(null);

  // ─── Real-time Firestore listener ────────────────────────────────────────────
  useEffect(() => {
    if (!klan.naziv) {
      if (unsubscribeRef.current) { unsubscribeRef.current(); unsubscribeRef.current = null; }
      setCloudKlan(null);
      return;
    }
    const clanId = slugKlana(klan.naziv);
    // Osvježi tjedne zadatke i pretplati se na real-time izmjene
    osvjeziZadatkeAkoTreba(clanId);
    unsubscribeRef.current = slušajKlan(clanId, (data) => setCloudKlan(data));
    return () => {
      if (unsubscribeRef.current) { unsubscribeRef.current(); unsubscribeRef.current = null; }
    };
  }, [klan.naziv]);

  // Sinkroniziraj lokalni refreshKlanZadatke ako nema mreže
  useEffect(() => { if (klan.naziv && !cloudKlan) refreshKlanZadatke(); }, [klan.naziv]);

  useEffect(() => {
    let aktivan = true;
    const ucitajClanMembers = async () => {
      const membri = cloudKlan?.membri ? Object.keys(cloudKlan.membri) : [];
      if (!membri.length) {
        if (aktivan) setClanMembers([]);
        return;
      }
      const detalji = await Promise.all(
        membri.map(async (memberUid) => {
          const d = await ucitajCloud(memberUid);
          return {
            uid: memberUid,
            ime: d?.imeIgraca ?? memberUid.slice(0, 6),
            razina: d?.igracRazina ?? 1,
            prestige: d?.prestigeRazina ?? 0,
            zlato: d?.ukupnoZlata ?? 0,
            azurirano: d?.azurirano ?? null,
          };
        }),
      );
      if (aktivan) setClanMembers(detalji);
    };
    if (cloudKlan) ucitajClanMembers();
    return () => { aktivan = false; };
  }, [cloudKlan]);

  useEffect(() => {
    let aktivan = true;
    if (!klan.naziv) return undefined;
    const clanId = slugKlana(klan.naziv);
    osigurajClanRat(clanId, klan.naziv, klan.razina || 1).then((war) => {
      if (!aktivan || !war?.id) return;
      useGameStore.getState().postaviClanRat({
        aktivan: war.status === 'active',
        warId: war.id,
        klanA: war.klanA,
        klanB: war.klanB,
        bodovi: war.bodovi,
        pocelo: war.pocelo,
        zavrsilo: war.zavrsilo,
        status: war.status,
        nagrada: war.nagrada,
      });
      if (warUnsubscribeRef.current) warUnsubscribeRef.current();
      warUnsubscribeRef.current = slusajClanRat(war.id, (d) => {
        setCloudWar(d);
        useGameStore.getState().postaviClanRat({
          aktivan: d.status === 'active',
          warId: d.id,
          klanA: d.klanA,
          klanB: d.klanB,
          bodovi: d.bodovi,
          pocelo: d.pocelo,
          zavrsilo: d.zavrsilo,
          status: d.status,
          nagrada: d.nagrada,
        });
      });
    }).catch(() => {});
    return () => {
      aktivan = false;
      if (warUnsubscribeRef.current) { warUnsubscribeRef.current(); warUnsubscribeRef.current = null; }
    };
  }, [klan.naziv, klan.razina]);

  // Koristi cloud podatke ako su dostupni, inače lokalne
  const aktivniKlan = cloudKlan ?? klan;

  // ─── Osnivanje klana ─────────────────────────────────────────────────────────

  const handleOsnuji = async () => {
    const naziv = imeTxt.trim();
    if (naziv.length < 2) return;
    // Lokalno (gameStore)
    osnujiKlan(naziv);
    // Cloud (Firestore) — ne blokira
    if (uid) kreirajKlan(uid, naziv).catch(() => {});
  };

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
          onPress={handleOsnuji}
        >
          <Text style={[styles.btnTxt, { color: imeTxt.trim().length >= 2 ? '#000' : BOJE.textMuted }]}>
            OSNUJ KLAN
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Klan HQ ─────────────────────────────────────────────────────────────────
  const xpZaRazinu = xpZaKlanRazinu(aktivniKlan.razina);
  const xpPostotak = Math.min(1, aktivniKlan.xp / xpZaRazinu);
  const warMinutesRemaining = cloudWar?.zavrsilo ? Math.floor((cloudWar.zavrsilo - Date.now()) / 60000) : null;
  const warFinished = warMinutesRemaining !== null && warMinutesRemaining <= 0;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      {!cloudKlan && (
        <View style={styles.skeletonCard}>
          <Text style={styles.memberMeta}>Učitavanje klanskih podataka...</Text>
        </View>
      )}

      {/* Zaglavlje klana */}
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Swords size={28} color={BOJE.klan} strokeWidth={2} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.klanNaziv}>{aktivniKlan.naziv}</Text>
            <Text style={styles.klanRazina}>Razina {aktivniKlan.razina}</Text>
          </View>
          <View style={styles.xpBadge}>
            <Text style={styles.xpBadgeTxt}>{aktivniKlan.xp} / {xpZaRazinu} XP</Text>
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
          onPress={() => {
            doniraiUKlan(DONACIJA_IZNOS);
            if (uid && aktivniKlan?.naziv) {
              const clanId = slugKlana(aktivniKlan.naziv);
              doniraiXpKlanu(clanId, Math.floor(DONACIJA_IZNOS / 10)).catch(() => {});
              // Napredak "donacija" zadatka sinkroniziraj i u cloud klan dokumentu
              azurirajKlanZadatak(clanId, 'donacija', DONACIJA_IZNOS).catch(() => {});
            }
          }}
        >
          <Text style={[styles.btnTxt, { color: zlato >= DONACIJA_IZNOS ? '#000' : BOJE.textMuted }]}>
            DONIRAJ
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'zadaci' && styles.tabBtnActive]} onPress={() => setTab('zadaci')}>
          <Text style={[styles.tabTxt, tab === 'zadaci' && styles.tabTxtActive]}>ZADACI</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'rat' && styles.tabBtnActive]} onPress={() => setTab('rat')}>
          <Text style={[styles.tabTxt, tab === 'rat' && styles.tabTxtActive]}>RAT</Text>
        </TouchableOpacity>
      </View>

      {tab === 'zadaci' ? (
        <>
      <Text style={styles.sectionTitle}>TJEDNI KLANSKI ZADACI</Text>
      {aktivniKlan.zadaci.map((z) => {
        const postotak = Math.min(1, z.trenutno / z.cilj);
        // Provjeri je li ovaj igrač već preuzeo nagradu (cloud: preuzetoOd array, lokalno: preuzeto bool)
        const preuzetoOd = Array.isArray(z.preuzetoOd) ? z.preuzetoOd : [];
        const vecPreuzeto = cloudKlan
          ? (uid && preuzetoOd.includes(uid))
          : !!z.preuzeto;
        const mozePrimiti = z.zavrseno && !vecPreuzeto;

        const handlePreuzmi = async () => {
          if (cloudKlan && uid) {
            const clanId = slugKlana(klan.naziv);
            const nagrada = await preuzmiNagraduCloud(clanId, z.id, uid);
            if (nagrada) {
              // Dodaj nagradu lokalno
              useGameStore.setState((s) => ({
                dijamanti: s.dijamanti + (nagrada.dijamanti ?? 0),
                zlato:     s.zlato     + (nagrada.zlato     ?? 0),
                energija:  s.energija  + (nagrada.energija  ?? 0),
                resursi: {
                  drvo:    s.resursi.drvo    + (nagrada.drvo    ?? 0),
                  kamen:   s.resursi.kamen   + (nagrada.kamen   ?? 0),
                  zeljezo: s.resursi.zeljezo + (nagrada.zeljezo ?? 0),
                },
                poruka: '⚔️ KLANSKI ZADATAK PREUZET!',
              }));
              posaljiNotifikaciju('⚔️ Klanski zadatak!', 'Nagrada uspješno preuzeta.');
            }
          } else {
            preuzmiKlanNagradu(z.id);
          }
        };

        return (
          <View
            key={z.id}
            style={[
              styles.zadatakCard,
              z.zavrseno && !vecPreuzeto && { borderColor: BOJE.klan + '80', shadowColor: BOJE.klan, shadowOpacity: 0.3 },
              vecPreuzeto && { opacity: 0.45 },
            ]}
          >
            <View style={styles.zadatakTop}>
              {z.zavrseno
                ? <CheckCircle2 size={18} color={BOJE.klan} strokeWidth={2.5} />
                : <Circle       size={18} color={BOJE.textMuted} strokeWidth={2} />
              }
              <Text style={[styles.zadatakOpis, vecPreuzeto && { color: BOJE.textMuted }]} numberOfLines={2}>
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
                  onPress={handlePreuzmi}
                >
                  <Gift size={14} color="#000" />
                  <Text style={styles.nagrBtnTxt}>PREUZMI</Text>
                </TouchableOpacity>
              )}
              {vecPreuzeto && (
                <Text style={styles.preuzetoTxt}>✓ Preuzeto</Text>
              )}
            </View>
          </View>
        );
      })}

      <Text style={styles.sectionTitle}>ČLANOVI KLANA</Text>
      {clanMembers.length === 0 ? (
        <View style={styles.memberCard}>
          <Text style={styles.memberName}>Nema učitanih članova</Text>
        </View>
      ) : clanMembers.map((m) => (
        <View key={m.uid} style={styles.memberCard}>
          <Text style={styles.memberName}>{m.ime} {m.uid === uid ? '(ti)' : ''}</Text>
          <Text style={styles.memberMeta}>UID: {m.uid.slice(0, 10)}…</Text>
          <Text style={styles.memberMeta}>Lv {m.razina} · ★{m.prestige} · {Math.floor(m.zlato)} 🪙</Text>
        </View>
      ))}
      </>
      ) : (
        <View style={styles.warCard}>
          <Text style={styles.sectionTitle}>KLAN RAT (24h)</Text>
          <Text style={styles.warLine}>{cloudWar?.klanA?.naziv ?? aktivniKlan.naziv} vs {cloudWar?.klanB?.naziv ?? 'Rivali'}</Text>
          <Text style={styles.warScore}>BODOVI: {(cloudWar?.bodovi?.A ?? 0)} : {(cloudWar?.bodovi?.B ?? 0)}</Text>
          <Text style={styles.warLine}>
            Status: {cloudWar?.status ?? 'active'} ·
            {cloudWar?.zavrsilo ? (warFinished ? ' završeno' : ` ${warMinutesRemaining} min`) : ' 24h'}
          </Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={async () => {
              const rez = await zakljuciClanRatAkoIstekao(cloudWar?.id);
              if (rez?.pobjednik === 'A') {
                useGameStore.getState().zavrsiClanRat(true);
                useGameStore.setState({ aktivniSkin: rez?.nagrada?.skin || useGameStore.getState().aktivniSkin });
              } else if (rez) {
                useGameStore.getState().zavrsiClanRat(false);
              }
            }}
          >
            <Text style={styles.btnTxt}>PROVJERI ISHOD</Text>
          </TouchableOpacity>
        </View>
      )}

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
  skeletonCard: {
    backgroundColor: BOJE.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BOJE.border,
    padding: 12,
    marginBottom: 10,
  },
  memberCard: {
    backgroundColor: BOJE.bgCard,
    borderWidth: 1,
    borderColor: BOJE.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  memberName: { color: BOJE.textMain, fontFamily: FONT_FAMILY, fontWeight: '800', fontSize: 13, marginBottom: 2 },
  memberMeta: { color: BOJE.textMuted, fontFamily: FONT_FAMILY, fontSize: 11 },
  tabRow: { flexDirection: 'row', backgroundColor: BOJE.bgCard, borderRadius: 12, borderWidth: 1, borderColor: BOJE.border, marginBottom: 10, padding: 4 },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
  tabBtnActive: { backgroundColor: BOJE.klan + '20' },
  tabTxt: { color: BOJE.textMuted, fontFamily: FONT_FAMILY, fontWeight: '800', fontSize: 12 },
  tabTxtActive: { color: BOJE.klan },
  warCard: { backgroundColor: BOJE.bgCard, borderRadius: 14, borderWidth: 1, borderColor: BOJE.border, padding: 14 },
  warLine: { color: BOJE.textMuted, fontFamily: FONT_FAMILY, fontSize: 12, marginBottom: 6 },
  warScore: { color: BOJE.textMain, fontFamily: FONT_FAMILY, fontWeight: '900', fontSize: 20, marginBottom: 8 },
});

export default ClanScreen;
