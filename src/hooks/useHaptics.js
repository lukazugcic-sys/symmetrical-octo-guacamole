import { useCallback } from 'react';

let cachedHapticsModule;
let hasResolvedHapticsModule = false;

const getHapticsModule = () => {
  if (hasResolvedHapticsModule) {
    return cachedHapticsModule;
  }

  hasResolvedHapticsModule = true;

  try {
    cachedHapticsModule = require('expo-haptics');
  } catch (error) {
    cachedHapticsModule = null;
    console.warn('[Haptics] Module unavailable in this build.', error);
  }

  return cachedHapticsModule;
};

const runHaptic = async (runner) => {
  const Haptics = getHapticsModule();
  if (!Haptics) return;

  try {
    await runner(Haptics);
  } catch (_error) {
    // Tiho zanemari greške na uređajima bez podrške za haptiku.
  }
};

/**
 * Centralizirani hook za haptičke povratne informacije.
 * Svaka metoda tiho neuspijeva na uređajima bez podrške za haptiku.
 *
 * Upotreba:
 *   const { light, medium, heavy, success, warning, error } = useHaptics();
 *   light();   // lagan udar — pritisak gumba
 *   medium();  // srednji udar — dobitak, gradnja
 *   heavy();   // jak udar — jackpot, napad
 *   success(); // notifikacija uspjeha — level up, preuzimanje nagrade
 *   warning(); // notifikacija upozorenja — nema dovoljno resursa
 *   error();   // notifikacija greške — napad, gubitak
 */
export const useHaptics = () => {
  const light = useCallback(
    () => runHaptic((Haptics) => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
    []
  );

  const medium = useCallback(
    () => runHaptic((Haptics) => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
    []
  );

  const heavy = useCallback(
    () => runHaptic((Haptics) => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
    []
  );

  const success = useCallback(
    () => runHaptic((Haptics) => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
    []
  );

  const warning = useCallback(
    () => runHaptic((Haptics) => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
    []
  );

  const error = useCallback(
    () => runHaptic((Haptics) => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
    []
  );

  return { light, medium, heavy, success, warning, error };
};
