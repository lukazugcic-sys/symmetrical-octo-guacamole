import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useGameStore } from '../store/gameStore';
import { BOJE, FONT_FAMILY, uiScale } from '../config/constants';
import { getVillageRoomDefinition } from '../utils/village';

const VillageUnlockToast = () => {
  const navigation = useNavigation();
  const villageUnlockData = useGameStore((s) => s.villageUnlockData);
  const clearVillageUnlock = useGameStore((s) => s.clearVillageUnlock);
  const [lokalniPodaci, setLokalniPodaci] = useState(null);

  const translateY = useSharedValue(-132);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!villageUnlockData) return;

    setLokalniPodaci(villageUnlockData);
    translateY.value = withSpring(0, { damping: 18, stiffness: 180, reduceMotion: ReduceMotion.Never });
    opacity.value = withTiming(1, { duration: 180, reduceMotion: ReduceMotion.Never });

    const timer = setTimeout(() => {
      translateY.value = withTiming(-132, { duration: 260, reduceMotion: ReduceMotion.Never });
      opacity.value = withTiming(0, { duration: 260, reduceMotion: ReduceMotion.Never }, (finished) => {
        if (finished) runOnJS(clearVillageUnlock)();
      });
    }, 3200);

    return () => clearTimeout(timer);
  }, [villageUnlockData, clearVillageUnlock, opacity, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const roomDefinition = getVillageRoomDefinition(lokalniPodaci?.roomType);
  if (!lokalniPodaci || !roomDefinition) return null;

  return (
    <Animated.View style={[styles.toast, { borderColor: `${roomDefinition.boja}90`, shadowColor: roomDefinition.boja }, animStyle]}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🏠</Text>
        <View style={styles.copyWrap}>
          <Text style={[styles.label, { color: roomDefinition.boja }]}>NOVA SOBA OTKLJUČANA</Text>
          <Text style={styles.title}>{roomDefinition.naziv}</Text>
          <Text style={styles.copy}>{roomDefinition.opis}</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.82}
          style={[styles.openBtn, { backgroundColor: roomDefinition.boja }]}
          onPress={() => {
            clearVillageUnlock();
            navigation.navigate('Baza');
          }}
        >
          <Text style={styles.openBtnTxt}>OTVORI</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    zIndex: 158,
    backgroundColor: 'rgba(12, 14, 28, 0.98)',
    borderRadius: 22,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 18,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    fontSize: Math.round(24 * uiScale),
    marginRight: 12,
  },
  copyWrap: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontSize: Math.round(11 * uiScale),
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  title: {
    color: BOJE.textMain,
    fontSize: Math.round(16 * uiScale),
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
    marginTop: 3,
  },
  copy: {
    color: BOJE.textMuted,
    fontSize: Math.round(11 * uiScale),
    fontFamily: FONT_FAMILY,
    lineHeight: 16,
    marginTop: 4,
  },
  openBtn: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  openBtnTxt: {
    color: '#000',
    fontSize: Math.round(11 * uiScale),
    fontFamily: FONT_FAMILY,
    fontWeight: '900',
  },
});

export default VillageUnlockToast;