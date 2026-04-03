import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useGameStore } from '../store/gameStore';

export const useRewardedAds = () => {
  const mozePogledatiOglas = useGameStore((s) => s.mozePogledatiOglas);
  const primijeniAdNagradu = useGameStore((s) => s.primijeniAdNagradu);

  const prikaziRewardedAd = useCallback((tip, payload = {}) => {
    if (!mozePogledatiOglas()) {
      Alert.alert('Limit oglasa', 'Dnevni limit oglasa je dosegnut.');
      return;
    }
    Alert.alert(
      '📺 Oglas',
      'Pogledaj oglas i dobij nagradu.',
      [
        { text: 'Odustani', style: 'cancel' },
        {
          text: 'Pogledaj',
          onPress: () => primijeniAdNagradu(tip, payload),
        },
      ]
    );
  }, [mozePogledatiOglas, primijeniAdNagradu]);

  return { prikaziRewardedAd };
};

export default useRewardedAds;
