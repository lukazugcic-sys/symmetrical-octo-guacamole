import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useGameStore } from '../store/gameStore';

export const useRewardedAds = () => {
  const primijeniAdNagradu = useGameStore((s) => s.primijeniAdNagradu);

  const prikaziRewardedAd = useCallback((tip, payload = {}) => {
    Alert.alert(
      '📺 Test build',
      'Oglasi su isključeni u ovom APK buildu. Nagradu možeš odmah preuzeti za testiranje.',
      [
        { text: 'Odustani', style: 'cancel' },
        { text: 'Preuzmi', onPress: () => primijeniAdNagradu(tip, payload) },
      ]
    );
  }, [primijeniAdNagradu]);

  return {
    prikaziRewardedAd,
    ready: true,
    loading: false,
  };
};

export default useRewardedAds;
