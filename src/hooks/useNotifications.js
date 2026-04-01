/**
 * src/hooks/useNotifications.js
 *
 * Push notifikacije i lokalni raspored (expo-notifications).
 *
 * Podržane notifikacije:
 *   1. Energija puna — lokalna, raspored za trenutak kad energija dostigne max
 *   2. Klan zadatak završen — lokalna, pali se odmah
 *   3. Sezonalni dogadaj — lokalna, pali se na datum početka eventa
 *
 * Za serverske push notifikacije (FCM) dodati Cloud Function koja šalje
 * poruke putem Expo Push API (https://docs.expo.dev/push-notifications/overview/).
 */

import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform, Alert }       from 'react-native';
import { useGameStore }   from '../store/gameStore';
import { izracunajMaxEnergiju } from '../utils/economy';
import { SEZONALNI_DOGADAJI }   from '../config/sezonalniDogadaji';

// Postavi prikaz dok je aplikacija u prvom planu
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge:  false,
  }),
});

/**
 * Zatraži dopuštenje za notifikacije.
 * @returns {Promise<boolean>} true ako je dopuštenje odobreno
 */
export const zatraziDopustenje = async () => {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

/**
 * Pošalji trenutnu lokalnu notifikaciju.
 * @param {string} naslov
 * @param {string} tijelo
 * @param {object} [podaci] — dodatni podaci
 */
export const posaljiNotifikaciju = async (naslov, tijelo, podaci = {}) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title: naslov, body: tijelo, data: podaci },
      trigger:  null, // odmah
    });
  } catch (e) {
    console.warn('[Notifications] posaljiNotifikaciju greška:', e?.message || e);
  }
};

/**
 * Zakaži notifikaciju za određeni datum/vrijeme.
 * @param {string} naslov
 * @param {string} tijelo
 * @param {Date}   datum
 * @returns {Promise<string|null>} identifier schedulirane notifikacije
 */
export const zakaziNotifikaciju = async (naslov, tijelo, datum) => {
  if (datum <= new Date()) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title: naslov, body: tijelo },
      trigger:  { date: datum },
    });
  } catch (e) {
    console.warn('[Notifications] zakaziNotifikaciju greška:', e?.message || e);
    return null;
  }
};

/**
 * Otkaži sve planirane notifikacije određenog tipa (po id-u).
 * @param {string} identifier
 */
export const otkaziNotifikaciju = async (identifier) => {
  if (!identifier) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (e) {
    console.warn('[Notifications] otkaziNotifikaciju greška:', e?.message || e);
  }
};

// ─── React hook ──────────────────────────────────────────────────────────────

const useNotifications = () => {
  const energija     = useGameStore((s) => s.energija);
  const razine       = useGameStore((s) => s.razine);
  const energijaNtfRef = useRef(null);

  // Inicijalno — zatraži dopuštenje i zakaži sezonalne evente
  useEffect(() => {
    zatraziDopustenje().then((dopusteno) => {
      if (!dopusteno) {
        Alert.alert(
          'Notifikacije isključene',
          'Uključi notifikacije u postavkama uređaja za podsjetnike o energiji i događajima.'
        );
        return;
      }
      _zakaziSezonalneEvente();
    });
  }, []);

  // Zakaži notifikaciju kada energija dostigne max
  useEffect(() => {
    const maxEnergija = izracunajMaxEnergiju(razine.baterija ?? 0);
    if (energija >= maxEnergija) {
      // Energija je već puna — otkaži staru
      otkaziNotifikaciju(energijaNtfRef.current);
      energijaNtfRef.current = null;
      return;
    }

    const nedostaje  = maxEnergija - energija;
    const sekundeObnove = nedostaje * 60; // 1 energija = 60 sekundi
    const vrijemePunjenja = new Date(Date.now() + sekundeObnove * 1000);

    otkaziNotifikaciju(energijaNtfRef.current);
    zakaziNotifikaciju(
      '⚡ Energija puna!',
      'Vaš automat je spreman. Zavrtite i pobijedi!',
      vrijemePunjenja,
    ).then((id) => { energijaNtfRef.current = id; });
  }, [Math.floor(energija), razine.baterija]);

  return null;
};

// ─── Interna pomoćna funkcija ─────────────────────────────────────────────────

const _zakaziSezonalneEvente = async () => {
  const sada    = new Date();
  const godina  = sada.getFullYear();

  for (const event of SEZONALNI_DOGADAJI) {
    // Konstruiraj datum početka za tekuću godinu
    const mj  = String(event.pocetakMjesec).padStart(2, '0');
    const dan = String(event.pocetakDan).padStart(2, '0');
    const pocetak = new Date(`${godina}-${mj}-${dan}T00:00:00`);
    if (pocetak > sada) {
      await zakaziNotifikaciju(
        `🎉 ${event.naziv} je počeo!`,
        event.opis ?? 'Posebni bonusi su aktivni. Igrajte sada!',
        pocetak,
      );
    }
  }
};

export default useNotifications;
