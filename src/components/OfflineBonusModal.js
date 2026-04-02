import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { BOJE, FONT_FAMILY } from '../config/constants';

const OfflineBonusModal = () => {
  const offlineBonus = useGameStore((s) => s.offlineBonus);
  const clearOfflineBonus = useGameStore((s) => s.clearOfflineBonus);

  if (!offlineBonus) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={clearOfflineBonus}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>🏠 OFFLINE BONUS</Text>
          <Text style={styles.subtitle}>
            Dok si bio odsutan, tvoja baza je proizvela:
          </Text>
          <Text style={styles.reward}>
            {Math.floor(offlineBonus.drvo || 0)} 🌲 · {Math.floor(offlineBonus.kamen || 0)} ⛰️ · {Math.floor(offlineBonus.zeljezo || 0)} ⛏️
          </Text>
          <Text style={styles.time}>Offline: {Math.floor((offlineBonus.sekunde || 0) / 60)} min</Text>
          <TouchableOpacity style={styles.btn} onPress={clearOfflineBonus}>
            <Text style={styles.btnTxt}>SUPER</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.86)', justifyContent: 'center', alignItems: 'center', padding: 18 },
  card: { width: '100%', backgroundColor: BOJE.bgCard, borderRadius: 18, borderWidth: 1, borderColor: BOJE.border, padding: 18, alignItems: 'center' },
  title: { color: BOJE.drvo, fontFamily: FONT_FAMILY, fontWeight: '900', fontSize: 22, marginBottom: 6 },
  subtitle: { color: BOJE.textMuted, fontFamily: FONT_FAMILY, fontSize: 12, textAlign: 'center', marginBottom: 12 },
  reward: { color: BOJE.textMain, fontFamily: FONT_FAMILY, fontWeight: '900', fontSize: 14, marginBottom: 8 },
  time: { color: BOJE.textMuted, fontFamily: FONT_FAMILY, fontSize: 11, marginBottom: 12 },
  btn: { backgroundColor: BOJE.drvo, borderRadius: 10, width: '100%', paddingVertical: 10 },
  btnTxt: { textAlign: 'center', color: '#000', fontFamily: FONT_FAMILY, fontWeight: '900' },
});

export default OfflineBonusModal;
