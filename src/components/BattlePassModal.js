import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useGameStore } from '../store/gameStore';
import {
  BOJE,
  FONT_FAMILY,
  uiScale,
  BATTLE_PASS_NAGRADE,
  BATTLE_PASS_TIER_XP,
  BATTLE_PASS_PREMIUM_CIJENA,
} from '../config/constants';

const BattlePassModal = ({ visible, onClose }) => {
  const sezona = useGameStore((s) => s.sezona);
  const aktivirajPremiumSezona = useGameStore((s) => s.aktivirajPremiumSezona);
  const preuzmiBattlePassNagradu = useGameStore((s) => s.preuzmiBattlePassNagradu);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>
            {sezona?.sezonaTheme?.emodzi || '🎟️'} BATTLE PASS · SEZONA {sezona?.sezonaBroj}
          </Text>
          <Text style={styles.subtitle}>
            Tema: {sezona?.sezonaTheme?.naziv || 'Klasična'} · XP {sezona?.sezonaBP_XP || 0}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, (((sezona?.sezonaBP_XP || 0) % BATTLE_PASS_TIER_XP) / BATTLE_PASS_TIER_XP) * 100)}%` },
              ]}
            />
          </View>
          {!sezona?.sezonaPremium && (
            <TouchableOpacity style={styles.premiumBtn} onPress={aktivirajPremiumSezona}>
              <Text style={styles.premiumTxt}>AKTIVIRAJ PREMIUM ({BATTLE_PASS_PREMIUM_CIJENA}💎)</Text>
            </TouchableOpacity>
          )}
          <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
            {BATTLE_PASS_NAGRADE.map((tier) => {
              const unlocked = (sezona?.sezonaBP_razina || 0) >= tier.razina;
              const freeClaimed = !!sezona?.bpClaimedFree?.[String(tier.razina)];
              const premiumClaimed = !!sezona?.bpClaimedPremium?.[String(tier.razina)];
              return (
                <View key={tier.razina} style={[styles.row, !unlocked && styles.rowLocked]}>
                  <Text style={styles.tier}>Lv {tier.razina}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reward}>Free: {tier.free.zlato || 0}🪙 {tier.free.dijamanti || 0}💎</Text>
                    <Text style={styles.reward}>Premium: {tier.premium.zlato || 0}🪙 {tier.premium.dijamanti || 0}💎 {tier.premium.skin ? `· Skin ${tier.premium.skin}` : ''}</Text>
                  </View>
                  <View style={styles.btnCol}>
                    <TouchableOpacity
                      style={[styles.claimBtn, (freeClaimed || !unlocked) && styles.claimBtnDisabled]}
                      disabled={freeClaimed || !unlocked}
                      onPress={() => preuzmiBattlePassNagradu(tier.razina, false)}
                    >
                      <Text style={styles.claimTxt}>{freeClaimed ? '✓' : 'FREE'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.claimBtn, ((!sezona?.sezonaPremium) || premiumClaimed || !unlocked) && styles.claimBtnDisabled]}
                      disabled={!sezona?.sezonaPremium || premiumClaimed || !unlocked}
                      onPress={() => preuzmiBattlePassNagradu(tier.razina, true)}
                    >
                      <Text style={styles.claimTxt}>{premiumClaimed ? '✓' : 'PREM'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeTxt}>ZATVORI</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modal: { width: '100%', backgroundColor: BOJE.bgCard, borderRadius: 18, borderWidth: 1, borderColor: BOJE.border, padding: 14 },
  title: { color: BOJE.zlato, fontFamily: FONT_FAMILY, fontWeight: '900', fontSize: Math.round(16 * uiScale), marginBottom: 4 },
  subtitle: { color: BOJE.textMuted, fontFamily: FONT_FAMILY, fontSize: 12, marginBottom: 8 },
  progressBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden', marginBottom: 10 },
  progressFill: { height: '100%', backgroundColor: BOJE.zlato },
  premiumBtn: { backgroundColor: BOJE.dijamant, borderRadius: 10, paddingVertical: 10, marginBottom: 10 },
  premiumTxt: { textAlign: 'center', color: '#000', fontFamily: FONT_FAMILY, fontWeight: '900', fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: BOJE.border, borderRadius: 10, padding: 8, marginBottom: 6 },
  rowLocked: { opacity: 0.55 },
  tier: { color: BOJE.textMain, fontFamily: FONT_FAMILY, fontWeight: '900', width: 46 },
  reward: { color: BOJE.textMuted, fontFamily: FONT_FAMILY, fontSize: 11 },
  btnCol: { gap: 4 },
  claimBtn: { backgroundColor: BOJE.energija, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  claimBtnDisabled: { backgroundColor: BOJE.border },
  claimTxt: { color: '#000', fontFamily: FONT_FAMILY, fontWeight: '900', fontSize: 10 },
  closeBtn: { marginTop: 8, backgroundColor: BOJE.zlato, borderRadius: 10, paddingVertical: 10 },
  closeTxt: { textAlign: 'center', color: '#000', fontFamily: FONT_FAMILY, fontWeight: '900' },
});

export default BattlePassModal;
