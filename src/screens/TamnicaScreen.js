import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { Shield } from 'lucide-react-native';
import { useGameStore } from '../store/gameStore';
import { BOJE, uiScale, FONT_FAMILY, TAMNICA_NEPRIJATELJI, TAMNICA_BOSSOVI, TAMNICA_SHOP, TAMNICA_KOST_ENERGIJE } from '../config/constants';

// ─── Pomoćne komponente ───────────────────────────────────────────────────────

const HpBar = ({ trenutno, max, boja, label }) => {
  const postotak = max > 0 ? Math.max(0, Math.min(1, trenutno / max)) : 0;
  return (
    <View style={styles.hpWrap}>
      <View style={styles.hpRow}>
        <Text style={styles.hpLabel}>{label}</Text>
        <Text style={[styles.hpBroj, { color: boja }]}>
          {Math.max(0, Math.ceil(trenutno))} / {max}
        </Text>
      </View>
      <View style={styles.hpBg}>
        <View style={[styles.hpFill, { width: `${Math.round(postotak * 100)}%`, backgroundColor: boja }]} />
      </View>
    </View>
  );
};

const NadogradnjaKartica = ({ def, razina, tokenovi, onKupi }) => {
  const dostignutoMax = razina >= def.maxRazina;
  const kost = def.kost * (razina + 1);
  const mozeKupiti = !dostignutoMax && tokenovi >= kost;
  return (
    <View style={styles.shopKartica}>
      <View style={styles.shopRow}>
        <Text style={styles.shopEmodzi}>{def.emodzi}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.shopNaziv}>{def.naziv}</Text>
          <Text style={styles.shopOpis}>{def.opis}</Text>
        </View>
        <View style={styles.shopRazinaChip}>
          <Text style={styles.shopRazinaTxt}>{razina}/{def.maxRazina}</Text>
        </View>
      </View>
      {!dostignutoMax ? (
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.shopBtn, mozeKupiti && styles.shopBtnAktivan]}
          onPress={() => mozeKupiti && onKupi(def.id)}
        >
          <Text style={[styles.shopBtnTxt, mozeKupiti && { color: BOJE.tamnica }]}>
            {mozeKupiti ? `🪙 ${kost} TOKENA — KUPI` : `🔒 TREBA ${kost} 🪙`}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={[styles.shopBtn, styles.shopBtnMaks]}>
          <Text style={[styles.shopBtnTxt, { color: BOJE.xp }]}>✓ MAKSIMALNA RAZINA</Text>
        </View>
      )}
    </View>
  );
};

// ─── Glavni ekran ─────────────────────────────────────────────────────────────

const TamnicaScreen = () => {
  const tamnica            = useGameStore((s) => s.tamnica);
  const energija           = useGameStore((s) => s.energija);
  const zapocniTamnicu     = useGameStore((s) => s.zapocniTamnicu);
  const napadniUTamnici    = useGameStore((s) => s.napadniUTamnici);
  const pobijegniIzTamnice = useGameStore((s) => s.pobijegniIzTamnice);
  const kupiTamnicuNadogradnju = useGameStore((s) => s.kupiTamnicuNadogradnju);

  const t = tamnica ?? {};
  const aktivna      = t.aktivna ?? false;
  const sprat        = t.sprat   ?? 0;
  const maxSprat     = t.maxSprat ?? 0;
  const tokenovi     = t.tokenovi ?? 0;
  const snagaRazina  = t.snagaRazina  ?? 0;
  const obranaRazina = t.obranaRazina ?? 0;
  const vampirRazina = t.vampirRazina ?? 0;
  const zadnjiIshod  = t.zadnjiIshod ?? null;

  // Pronađi definiciju trenutnog neprijatelja
  const neprijDef = aktivna
    ? TAMNICA_NEPRIJATELJI.find((n) => n.id === t.neprijTipId) ?? TAMNICA_NEPRIJATELJI[0]
    : null;

  const bossDef = aktivna && t.neprijBoss
    ? TAMNICA_BOSSOVI.find((b) => b.sprat === sprat) ?? null
    : null;

  // Prikaz zadnjeg ishoda
  const ishodTekst = (() => {
    if (!zadnjiIshod) return null;
    if (zadnjiIshod.tip === 'borba')   return `⚔️ Napad: -${zadnjiIshod.igracSteta} HP neprijatelju  |  Primio: -${zadnjiIshod.neprijSteta} HP`;
    if (zadnjiIshod.tip === 'pobjeda') return `✅ Pobjeda! +${zadnjiIshod.nagradeZlato} 🪙  +${zadnjiIshod.nagradeTokenovi} 🪙 tokena`;
    if (zadnjiIshod.tip === 'smrt')    return `💀 Poginuo na spratu ${zadnjiIshod.dostigniSprat}`;
    if (zadnjiIshod.tip === 'bijeg')   return `🏃 Pobjegao sa sprata ${zadnjiIshod.dostigniSprat}`;
    return null;
  })();

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

      {/* ── Header ── */}
      <View style={styles.headerKartica}>
        <View style={styles.headerRow}>
          <Shield size={22} color={BOJE.tamnica} strokeWidth={2} />
          <Text style={styles.headerNaslov}>TAMNICA</Text>
        </View>
        <Text style={styles.headerPodnaslov}>Istraži mračne spratove i skupi tokenove</Text>
        <View style={styles.statRow}>
          <View style={styles.statChip}>
            <Text style={styles.statLabel}>NAJVIŠI SPRAT</Text>
            <Text style={[styles.statVrijednost, { color: BOJE.tamnica }]}>⚔️ {maxSprat}</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statLabel}>TOKENOVI</Text>
            <Text style={[styles.statVrijednost, { color: BOJE.zlato }]}>🪙 {tokenovi}</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statLabel}>ENERGIJA</Text>
            <Text style={[styles.statVrijednost, { color: BOJE.energija }]}>⚡ {Math.floor(energija)}</Text>
          </View>
        </View>
      </View>

      {!aktivna ? (
        /* ── Lobby — nije aktivna tura ── */
        <>
          {/* Zadnji ishod */}
          {zadnjiIshod && (
            <View style={styles.ishodKartica}>
              <Text style={styles.ishodTxt}>{ishodTekst}</Text>
            </View>
          )}

          {/* Start gumb */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.startBtn,
              energija < TAMNICA_KOST_ENERGIJE && styles.startBtnDisabled,
            ]}
            onPress={zapocniTamnicu}
          >
            <Text style={styles.startBtnTxt}>🗝️ UĐI U TAMNICU</Text>
            <Text style={styles.startBtnSub}>Cijena: {TAMNICA_KOST_ENERGIJE} ⚡</Text>
          </TouchableOpacity>

          {/* Kako funkcionira */}
          <View style={styles.infoKartica}>
            <Text style={styles.infoNaslov}>🗡️ KAKO FUNKCIONIRA</Text>
            {[
              { e: '⚡', t: `Plaćaš ${TAMNICA_KOST_ENERGIJE} energije za ulaz` },
              { e: '⚔️', t: 'Svaki pritisak "Napadni" udara neprijatelja' },
              { e: '🐉', t: 'Svakih 5 spratova čeka te boss s boljim nagradama' },
              { e: '🪙', t: 'Tokenovi se čuvaju i troše u Oružarni' },
              { e: '💀', t: 'Ako poginemo — tura završava, tokenovi ostaju' },
            ].map((r, i) => (
              <View key={i} style={styles.infoRow}>
                <Text style={styles.infoEmodzi}>{r.e}</Text>
                <Text style={styles.infoTxt}>{r.t}</Text>
              </View>
            ))}
          </View>

          {/* Oružarnica */}
          <Text style={styles.sekcijaNaslov}>🔧 TAMNIČARSKA ORUŽARNA</Text>
          {TAMNICA_SHOP.map((def) => (
            <NadogradnjaKartica
              key={def.id}
              def={def}
              razina={def.id === 'snaga' ? snagaRazina : def.id === 'obrana' ? obranaRazina : vampirRazina}
              tokenovi={tokenovi}
              onKupi={kupiTamnicuNadogradnju}
            />
          ))}
        </>
      ) : (
        /* ── Aktivna borba ── */
        <>
          {/* Sprat info */}
          <View style={[styles.spratBadge, t.neprijBoss && { borderColor: BOJE.slotVatra + '80' }]}>
            <Text style={[styles.spratTxt, t.neprijBoss && { color: BOJE.slotVatra }]}>
              {t.neprijBoss ? '⚠️ BOSS' : '🗝️'} SPRAT {sprat}
            </Text>
          </View>

          {/* Neprijatelj */}
          <View style={[styles.neprijKartica, t.neprijBoss && { borderColor: BOJE.slotVatra + '60' }]}>
            <Text style={styles.neprijEmodzi}>
              {t.neprijBoss
                ? (bossDef?.emodzi ?? TAMNICA_NEPRIJATELJI[0].emodzi)
                : neprijDef?.emodzi ?? '👾'}
            </Text>
            <Text style={[styles.neprijNaziv, t.neprijBoss && { color: BOJE.slotVatra }]}>
              {t.neprijBoss
                ? (bossDef?.naziv ?? 'Boss')
                : neprijDef?.naziv ?? 'Neprijatelj'}
            </Text>
            <HpBar
              trenutno={t.neprijHp}
              max={t.neprijMaxHp}
              boja={t.neprijBoss ? BOJE.slotVatra : BOJE.stit}
              label="❤️ Neprijatelj HP"
            />
          </View>

          {/* Igrač HP */}
          <View style={styles.igracHpKartica}>
            <HpBar
              trenutno={t.igracHp}
              max={t.igracMaxHp}
              boja={BOJE.xp}
              label="🛡️ Tvoj HP"
            />
          </View>

          {/* Zadnji ishod */}
          {ishodTekst && (
            <View style={styles.ishodKartica}>
              <Text style={styles.ishodTxt}>{ishodTekst}</Text>
            </View>
          )}

          {/* Akcijski gumbi */}
          <View style={styles.akcijeRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.napadBtn}
              onPress={napadniUTamnici}
            >
              <Text style={styles.napadBtnTxt}>⚔️ NAPADNI</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.bijegBtn}
              onPress={pobijegniIzTamnice}
            >
              <Text style={styles.bijegBtnTxt}>🏃 POBJEGNI</Text>
            </TouchableOpacity>
          </View>

          {/* Statistike napada */}
          <View style={styles.infoKartica}>
            <Text style={styles.infoNaslov}>📊 TVOJE STATISTIKE</Text>
            {[
              { l: 'Baza napada',   v: `${20 + snagaRazina * 15} + 0-15` },
              { l: 'Max HP',        v: `${t.igracMaxHp}` },
              { l: 'Lifesteal',     v: `${vampirRazina * 8}%` },
            ].map((r, i) => (
              <View key={i} style={styles.statDetailRow}>
                <Text style={styles.statDetailLabel}>{r.l}</Text>
                <Text style={[styles.statDetailVal, { color: BOJE.tamnica }]}>{r.v}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
};

// ─── Stilovi ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { paddingBottom: 120, paddingTop: 10 },

  headerKartica: {
    backgroundColor: BOJE.bgCard,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BOJE.tamnica + '40',
    padding: 18,
    marginBottom: 14,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  headerNaslov: {
    fontSize: Math.round(17 * uiScale),
    fontWeight: '900',
    fontFamily: FONT_FAMILY,
    color: BOJE.textMain,
    letterSpacing: 1.2,
  },
  headerPodnaslov: {
    fontSize: Math.round(11 * uiScale),
    color: BOJE.textMuted,
    fontFamily: FONT_FAMILY,
    marginBottom: 14,
  },
  statRow:       { flexDirection: 'row', gap: 8 },
  statChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BOJE.border,
  },
  statLabel:     { fontSize: Math.round(9 * uiScale), color: BOJE.textMuted, fontFamily: FONT_FAMILY, fontWeight: '700', marginBottom: 4 },
  statVrijednost:{ fontSize: Math.round(14 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY },

  ishodKartica: {
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BOJE.tamnica + '40',
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  ishodTxt: {
    fontSize: Math.round(12 * uiScale),
    color: BOJE.textMain,
    fontFamily: FONT_FAMILY,
    textAlign: 'center',
  },

  startBtn: {
    backgroundColor: BOJE.tamnica + '22',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: BOJE.tamnica + '80',
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: BOJE.tamnica,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  startBtnDisabled: { opacity: 0.45 },
  startBtnTxt: {
    fontSize: Math.round(15 * uiScale),
    fontWeight: '900',
    fontFamily: FONT_FAMILY,
    color: BOJE.tamnica,
    letterSpacing: 0.8,
  },
  startBtnSub: {
    fontSize: Math.round(11 * uiScale),
    color: BOJE.textMuted,
    fontFamily: FONT_FAMILY,
    marginTop: 4,
  },

  infoKartica: {
    backgroundColor: BOJE.bgCard,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BOJE.border,
    padding: 16,
    marginBottom: 14,
  },
  infoNaslov: {
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

  sekcijaNaslov: {
    fontSize: Math.round(13 * uiScale),
    fontWeight: '900',
    fontFamily: FONT_FAMILY,
    color: BOJE.textMain,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 2,
  },

  shopKartica: {
    backgroundColor: BOJE.bgCard,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BOJE.border,
    padding: 14,
    marginBottom: 10,
  },
  shopRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  shopEmodzi:    { fontSize: 26 },
  shopNaziv:     { fontSize: Math.round(13 * uiScale), fontWeight: '800', fontFamily: FONT_FAMILY, color: BOJE.textMain },
  shopOpis:      { fontSize: Math.round(11 * uiScale), color: BOJE.textMuted, fontFamily: FONT_FAMILY, marginTop: 2 },
  shopRazinaChip:{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  shopRazinaTxt: { fontSize: Math.round(11 * uiScale), fontWeight: '800', fontFamily: FONT_FAMILY, color: BOJE.textMuted },
  shopBtn: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BOJE.border,
  },
  shopBtnAktivan:{ backgroundColor: BOJE.tamnica + '20', borderColor: BOJE.tamnica + '70' },
  shopBtnMaks:   { backgroundColor: BOJE.xp + '12', borderColor: BOJE.xp + '40' },
  shopBtnTxt:    { fontSize: Math.round(12 * uiScale), fontWeight: '800', fontFamily: FONT_FAMILY, color: BOJE.textMuted },

  spratBadge: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BOJE.tamnica + '60',
    backgroundColor: BOJE.tamnica + '18',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'center',
    marginBottom: 14,
  },
  spratTxt: {
    fontSize: Math.round(14 * uiScale),
    fontWeight: '900',
    fontFamily: FONT_FAMILY,
    color: BOJE.tamnica,
    letterSpacing: 1,
  },

  neprijKartica: {
    backgroundColor: BOJE.bgCard,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BOJE.border,
    padding: 18,
    marginBottom: 12,
    alignItems: 'center',
  },
  neprijEmodzi: { fontSize: 52, marginBottom: 8 },
  neprijNaziv:  {
    fontSize: Math.round(16 * uiScale),
    fontWeight: '900',
    fontFamily: FONT_FAMILY,
    color: BOJE.textMain,
    marginBottom: 14,
    letterSpacing: 0.5,
  },

  igracHpKartica: {
    backgroundColor: BOJE.bgCard,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BOJE.border,
    padding: 16,
    marginBottom: 12,
  },

  hpWrap: { width: '100%' },
  hpRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  hpLabel:{ fontSize: Math.round(11 * uiScale), fontWeight: '700', fontFamily: FONT_FAMILY, color: BOJE.textMuted },
  hpBroj: { fontSize: Math.round(12 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY },
  hpBg:   { height: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 5, overflow: 'hidden' },
  hpFill: { height: '100%', borderRadius: 5 },

  akcijeRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  napadBtn: {
    flex: 2,
    backgroundColor: BOJE.tamnica + '25',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: BOJE.tamnica + '80',
    shadowColor: BOJE.tamnica,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  napadBtnTxt: {
    fontSize: Math.round(14 * uiScale),
    fontWeight: '900',
    fontFamily: FONT_FAMILY,
    color: BOJE.tamnica,
    letterSpacing: 0.5,
  },
  bijegBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BOJE.border,
  },
  bijegBtnTxt: {
    fontSize: Math.round(13 * uiScale),
    fontWeight: '800',
    fontFamily: FONT_FAMILY,
    color: BOJE.textMuted,
  },

  statDetailRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  statDetailLabel:{ fontSize: Math.round(12 * uiScale), color: BOJE.textMuted, fontFamily: FONT_FAMILY },
  statDetailVal:  { fontSize: Math.round(12 * uiScale), fontWeight: '800', fontFamily: FONT_FAMILY },
});

export default TamnicaScreen;
