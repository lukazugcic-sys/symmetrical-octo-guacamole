import { useCallback, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import { useGameStore } from '../store/gameStore';

const genericEnvAdUnitId = process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID;
const platformEnvAdUnitId = Platform.select({
  android: process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID_ANDROID,
  ios: process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID_IOS,
  default: undefined,
});
const releaseAdUnitId = platformEnvAdUnitId || genericEnvAdUnitId;
const fallbackTestAdUnitId = 'ca-app-pub-3940256099942544/5224354917';

let cachedMobileAdsModule;
let hasResolvedMobileAdsModule = false;
let hasWarnedAboutMissingAdUnit = false;

const getMobileAdsModule = () => {
  if (hasResolvedMobileAdsModule) {
    return cachedMobileAdsModule;
  }

  hasResolvedMobileAdsModule = true;

  try {
    cachedMobileAdsModule = require('react-native-google-mobile-ads');
  } catch (error) {
    cachedMobileAdsModule = null;
    console.warn('[Ads] Rewarded ads are unavailable in this build.', error);
  }

  return cachedMobileAdsModule;
};

const resolveAdUnitId = (mobileAdsModule) => {
  const testAdUnitId = mobileAdsModule?.TestIds?.REWARDED || fallbackTestAdUnitId;

  if (__DEV__) {
    return testAdUnitId;
  }

  if (releaseAdUnitId) {
    return releaseAdUnitId;
  }

  if (!hasWarnedAboutMissingAdUnit) {
    hasWarnedAboutMissingAdUnit = true;
    console.warn('[Ads] Missing rewarded AdMob unit ID. Falling back to Google test rewarded unit.');
  }

  return testAdUnitId;
};

export const useRewardedAds = () => {
  const mozePogledatiOglas = useGameStore((s) => s.mozePogledatiOglas);
  const primijeniAdNagradu = useGameStore((s) => s.primijeniAdNagradu);
  const adInFlightRef = useRef(false);

  const prikaziRewardedAd = useCallback((tip, payload = {}) => {
    if (!mozePogledatiOglas()) {
      Alert.alert('Limit oglasa', 'Dnevni limit oglasa je dosegnut.');
      return;
    }

    if (adInFlightRef.current) {
      return;
    }

    const mobileAdsModule = getMobileAdsModule();
    if (!mobileAdsModule) {
      Alert.alert('Oglas', 'Oglasi trenutno nisu dostupni u ovoj verziji aplikacije.');
      return;
    }

    const {
      AdEventType,
      RewardedAd,
      RewardedAdEventType,
    } = mobileAdsModule;
    const adUnitId = resolveAdUnitId(mobileAdsModule);

    if (!AdEventType || !RewardedAd || !RewardedAdEventType || !adUnitId) {
      Alert.alert('Oglas', 'Oglas trenutno nije dostupan.');
      return;
    }

    adInFlightRef.current = true;

    let isCleanedUp = false;
    const subscriptions = [];
    const cleanup = () => {
      if (isCleanedUp) {
        return;
      }

      isCleanedUp = true;
      adInFlightRef.current = false;
      subscriptions.forEach((unsubscribe) => {
        try {
          unsubscribe?.();
        } catch (error) {
          console.warn('[Ads] Failed to remove rewarded ad listener.', error);
        }
      });
    };

    let rewarded;
    try {
      rewarded = RewardedAd.createForAdRequest(adUnitId);
    } catch (error) {
      cleanup();
      console.warn('[Ads] Failed to create rewarded ad request.', error);
      Alert.alert('Oglas', 'Oglas trenutno nije dostupan.');
      return;
    }

    subscriptions.push(
      rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        primijeniAdNagradu(tip, payload);
      }),
    );
    subscriptions.push(
      rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
        rewarded.show().catch((error) => {
          cleanup();
          console.warn('[Ads] Failed to show rewarded ad.', error);
          Alert.alert('Oglas', 'Oglas trenutno nije dostupan.');
        });
      }),
    );
    subscriptions.push(
      rewarded.addAdEventListener(AdEventType.ERROR, (error) => {
        cleanup();
        console.warn('[Ads] Failed to load rewarded ad.', error);
        Alert.alert('Oglas', 'Oglas trenutno nije dostupan.');
      }),
    );
    subscriptions.push(
      rewarded.addAdEventListener(AdEventType.CLOSED, () => {
        cleanup();
      }),
    );

    try {
      rewarded.load();
    } catch (error) {
      cleanup();
      console.warn('[Ads] Failed to start rewarded ad load.', error);
      Alert.alert('Oglas', 'Oglas trenutno nije dostupan.');
    }
  }, [mozePogledatiOglas, primijeniAdNagradu]);

  return { prikaziRewardedAd };
};

export default useRewardedAds;
