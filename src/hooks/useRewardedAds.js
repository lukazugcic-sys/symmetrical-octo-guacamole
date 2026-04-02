import { useCallback } from 'react';
import { Alert } from 'react-native';
import { RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';
import { useGameStore } from '../store/gameStore';

const adUnitId = __DEV__ ? TestIds.REWARDED : 'ca-app-pub-3940256099942544/5224354917';

export const useRewardedAds = () => {
  const mozePogledatiOglas = useGameStore((s) => s.mozePogledatiOglas);
  const primijeniAdNagradu = useGameStore((s) => s.primijeniAdNagradu);

  const prikaziRewardedAd = useCallback((tip, payload = {}) => {
    if (!mozePogledatiOglas()) {
      Alert.alert('Limit oglasa', 'Dnevni limit oglasa je dosegnut.');
      return;
    }
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
