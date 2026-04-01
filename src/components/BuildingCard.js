import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Coins, TreePine, Mountain, Pickaxe, Flame, AlertTriangle } from 'lucide-react-native';
import { useGameStore } from '../store/gameStore';
import PrikazCijene from './PrikazCijene';
import { BOJE, ZGRADE_SKINOVI, uiScale, FONT_FAMILY } from '../config/constants';
import { izracunajPasivniMnozitelj } from '../utils/economy';

/**
 * Kartica jedne zgrade u selu — prikazuje razinu, produkciju, cijenu nadogradnje/popravka.
 */
const BuildingCard = ({ zgrada }) => {
  const zlato     = useGameStore((s) => s.zlato);
  const resursi   = useGameStore((s) => s.resursi);
  const gradevine = useGameStore((s) => s.gradevine);
  const ostecenja = useGameStore((s) => s.ostecenja);
  const razine    = useGameStore((s) => s.razine);
  const igracRazina    = useGameStore((s) => s.igracRazina);
  const prestigeRazina = useGameStore((s) => s.prestigeRazina);
  const aktivniSkin    = useGameStore((s) => s.aktivniSkin);

  const nadogradiZgradu = useGameStore((s) => s.nadogradiZgradu);
  const popraviZgradu   = useGameStore((s) => s.popraviZgradu);

  const pasivniMnozitelj = izracunajPasivniMnozitelj(igracRazina, prestigeRazina);

  const lv          = gradevine[zgrada.id] || 0;
  const jeOstecena  = ostecenja[zgrada.id];
  const c           = zgrada.cijena(lv + 1);
  const ZIcon       = zgrada.ikona;
  const jeMax       = lv >= zgrada.maxLv;

  // Aktivni skin — za kozmetiku zgrada
  const skin = ZGRADE_SKINOVI.find((s) => s.id === aktivniSkin) ?? ZGRADE_SKINOVI[0];
  const skinBoja = skin.id === 'default' ? zgrada.bazaBoja : skin.boja;

  const mozeKupiti = zlato >= c.zlato
    && resursi.drvo    >= (c.drvo    || 0)
    && resursi.kamen   >= (c.kamen   || 0)
    && resursi.zeljezo >= (c.zeljezo || 0);

  const cPopravakZlato = lv * 50;
  const cPopravakDrvo  = lv * 20;
  const mozePopraviti  = zlato >= cPopravakZlato && resursi.drvo >= cPopravakDrvo;

  const trenutnaProizvodnja = (lv * zgrada.bazaProizvodnja * pasivniMnozitelj).toFixed(1);

  return (
    <View style={[styles.card, jeMax && styles.cardMaxed, jeOstecena && styles.cardDamaged]}>
      <View style={styles.cardTop}>
        <View style={[
          styles.zgradaIconBg,
          { backgroundColor: skinBoja + '15', borderColor: skinBoja + '50' },
          jeOstecena && { backgroundColor: BOJE.slotVatra + '20', borderColor: BOJE.slotVatra },
        ]}>
          {jeOstecena
            ? <Flame size={26} color={BOJE.slotVatra} strokeWidth={2.5} />
            : skin.id !== 'default'
              ? <Text style={{ fontSize: 24 }}>{skin.emodzi}</Text>
              : <ZIcon size={26} color={skinBoja} strokeWidth={2} />
          }
        </View>

        <View style={{ flex: 1, paddingLeft: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.cardTitle, jeOstecena && { color: BOJE.slotVatra }]}>{zgrada.naziv}</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.buildCardLevel}>LVL {lv}/{zgrada.maxLv}</Text>
            </View>
          </View>
          <Text style={[styles.perkText, jeOstecena && { color: BOJE.slotVatra, fontWeight: '800' }]}>
            {jeOstecena
              ? 'ZGRADA U PLAMENU! Proizvodnja stala.'
              : (lv > 0 ? `Proizvodi: +${trenutnaProizvodnja}/s` : 'Zgrada nije izgrađena')
            }
          </Text>
        </View>
      </View>

      <View style={styles.cardBottom}>
        {jeOstecena ? (
          <View style={styles.costRow}>
            <View style={styles.repairBadge}>
              <AlertTriangle size={14} color="#FFF" />
              <Text style={styles.repairBadgeTxt}>POPRAVAK:</Text>
            </View>
            <PrikazCijene Ikona={Coins}    boja={BOJE.zlato} iznos={cPopravakZlato} trenutno={zlato}       />
            <PrikazCijene Ikona={TreePine} boja={BOJE.drvo}  iznos={cPopravakDrvo}  trenutno={resursi.drvo}/>
          </View>
        ) : !jeMax ? (
          <View style={styles.costRow}>
            <PrikazCijene Ikona={Coins}    boja={BOJE.zlato}    iznos={c.zlato}    trenutno={zlato}          />
            <PrikazCijene Ikona={TreePine} boja={BOJE.drvo}     iznos={c.drvo}     trenutno={resursi.drvo}   />
            <PrikazCijene Ikona={Mountain} boja={BOJE.kamen}    iznos={c.kamen}    trenutno={resursi.kamen}  />
            <PrikazCijene Ikona={Pickaxe}  boja={BOJE.zeljezo}  iznos={c.zeljezo}  trenutno={resursi.zeljezo}/>
          </View>
        ) : (
          <Text style={styles.maxTxt}>MAKSIMALNA RAZINA</Text>
        )}

        {jeOstecena ? (
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.actionBtn, { backgroundColor: mozePopraviti ? BOJE.slotVatra : BOJE.slotOkvirZlato }]}
            onPress={() => popraviZgradu(zgrada)}
          >
            <Text style={[styles.actionBtnTxt, !mozePopraviti && { color: BOJE.textMuted }, mozePopraviti && { color: '#FFF' }]}>
              POPRAVI
            </Text>
          </TouchableOpacity>
        ) : !jeMax && (
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.actionBtn, { backgroundColor: mozeKupiti ? skinBoja : BOJE.slotOkvirZlato }]}
            onPress={() => nadogradiZgradu(zgrada)}
          >
            <Text style={[styles.actionBtnTxt, !mozeKupiti && { color: BOJE.textMuted }]}>
              {lv === 0 ? 'IZGRADI' : 'UPGRADE'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: BOJE.bgCard, padding: 20, borderRadius: 24, marginBottom: 14,
    borderWidth: 1, borderColor: BOJE.border,
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  cardMaxed:   { borderColor: BOJE.zlato + '40', backgroundColor: BOJE.zlato + '08' },
  cardDamaged: { borderColor: BOJE.slotVatra, backgroundColor: BOJE.slotVatra + '0F', shadowColor: BOJE.slotVatra, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  cardTop:     { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  cardTitle:   { fontSize: Math.round(17 * uiScale), fontWeight: '800', fontFamily: FONT_FAMILY, color: BOJE.textMain },
  levelBadge:  { backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  buildCardLevel: { fontSize: Math.round(12 * uiScale), fontWeight: '900', fontFamily: FONT_FAMILY, color: BOJE.textMuted },
  perkText:    { fontSize: Math.round(13 * uiScale), fontWeight: '600', fontFamily: FONT_FAMILY, color: BOJE.xp, marginTop: 6 },
  cardBottom:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: BOJE.border, paddingTop: 14 },
  costRow:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap', flex: 1, paddingRight: 10, alignItems: 'center' },
  repairBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: BOJE.slotVatra, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 8, marginRight: 4 },
  repairBadgeTxt: { color: '#FFF', fontSize: 10, fontWeight: '900', fontFamily: FONT_FAMILY, marginLeft: 4 },
  actionBtn:   { paddingHorizontal: Math.round(20 * uiScale), paddingVertical: Math.round(12 * uiScale), borderRadius: 14 },
  actionBtnTxt:{ color: '#000', fontWeight: '900', fontFamily: FONT_FAMILY, fontSize: Math.round(13 * uiScale), letterSpacing: 0.5 },
  maxTxt:      { color: BOJE.zlato, fontWeight: '800', fontFamily: FONT_FAMILY, fontSize: Math.round(13 * uiScale), letterSpacing: 1 },
  zgradaIconBg:{ width: 56, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
});

export default BuildingCard;
