import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useGameStore } from '../store/gameStore';

// Set EXPO_PUBLIC_USE_AD_STUB=true in .env.local to run in Expo Go without the
// native ads module. Production / EAS builds should leave this unset so that
// real rewarded ads are served and monetisation is not bypassed.
const USE_AD_STUB = process.env.EXPO_PUBLIC_USE_AD_STUB === 'true';

export const useRewardedAds = () => {
  const mozePogledatiOglas = useGameStore((s) => s.mozePogledatiOglas);
  const primijeniAdNagradu = useGameStore((s) => s.primijeniAdNagradu);

  const prikaziRewardedAd = useCallback((tip, payload = {}) => {
    if (!mozePogledatiOglas()) {
      Alert.alert('Limit oglasa', 'Dnevni limit oglasa je dosegnut.');
      return;
    }

    if (USE_AD_STUB) {
      // Development stub for Expo Go — no native module required.
      // EXPO_PUBLIC_USE_AD_STUB is inlined at bundle time by babel-preset-expo,
      // so this branch (and the require below) are tree-shaken in production.
      Alert.alert(
        '📺 Oglas',
        'Pogledaj oglas i dobij nagradu.',
        [
          { text: 'Odustani', style: 'cancel' },
          { text: 'Pogledaj', onPress: () => primijeniAdNagradu(tip, payload) },
        ]
      );
      return;
    }

    // Production path — requires react-native-google-mobile-ads (EAS/bare build).
    const { RewardedAd, RewardedAdEventType, TestIds } = require('react-native-google-mobile-ads');
    const envAdUnitId = process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID;
    const adUnitId = __DEV__ ? TestIds.REWARDED : (envAdUnitId || TestIds.REWARDED);

    const rewarded = RewardedAd.createForAdRequest(adUnitId);
    const unsubscribe = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      primijeniAdNagradu(tip, payload);
    });
    rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      rewarded.show().catch(() => {
        Alert.alert('Oglas', 'Oglas trenutno nije dostupan.');
        unsubscribe();
      });
    });
    rewarded.addAdEventListener(RewardedAdEventType.CLOSED, () => unsubscribe());
    rewarded.load();
  }, [mozePogledatiOglas, primijeniAdNagradu]);

  return { prikaziRewardedAd };
};

export default useRewardedAds;
