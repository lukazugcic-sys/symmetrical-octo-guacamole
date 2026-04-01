import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';

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
    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
    []
  );

  const medium = useCallback(
    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
    []
  );

  const heavy = useCallback(
    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}),
    []
  );

  const success = useCallback(
    () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
    []
  );

  const warning = useCallback(
    () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
    []
  );

  const error = useCallback(
    () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
    []
  );

  return { light, medium, heavy, success, warning, error };
};
