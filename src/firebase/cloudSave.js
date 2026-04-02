/**
 * src/firebase/cloudSave.js
 *
 * Pohrana igračevog stanja u Firestore kolekciji `players/{uid}`.
 *
 * Strategija:
 *   - Primarni izvor istine je Firestore (cloud).
 *   - expo-sqlite ostaje kao offline cache — koristi se dok nema mreže.
 *   - spremiCloud(uid, stanje) — debounced; pali se svaki put kad auto-save
 *     pozove spremi() u gameStore.
 *   - ucitajCloud(uid) — čita Firestore pri pokretanju; ako nema mreže,
 *     pad-through na SQLite.
 *
 * Firestore dokument struktura (players/{uid}):
 *   {
 *     uid, igracRazina, prestigeRazina, xp, energija, zlato, dijamanti,
 *     resursi, gradevine, ostecenja, razine, stitovi, misije, tecaj, trend,
 *     luckySpinCounter, winStreak, aktivniSkin, klan,
 *     dostignucaDone, ukupnoVrtnji, ukupnoZlata,
 *     dnevniStreak, zadnjaDnevna,
 *     imeIgraca,   // prikazno ime (postavljeno pri registraciji ili "Igrač")
 *     azurirano,   // ISO timestamp zadnjeg spremi
 *   }
 */

import {
  doc, getDoc, setDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';

const KOLEKCIJA = 'players';

const validanCloudPayload = (data) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  // Validate nested objects have expected shape
  if (data.resursi && typeof data.resursi !== 'object') return false;
  if (data.gradevine && typeof data.gradevine !== 'object') return false;
  if (data.ostecenja && typeof data.ostecenja !== 'object') return false;
  if (data.razine && typeof data.razine !== 'object') return false;
  // Validate numeric fields are actually numbers
  if (data.zlato !== undefined && typeof data.zlato !== 'number') return false;
  if (data.energija !== undefined && typeof data.energija !== 'number') return false;
  if (data.dijamanti !== undefined && typeof data.dijamanti !== 'number') return false;
  if (data.igracRazina !== undefined && typeof data.igracRazina !== 'number') return false;
  return true;
};

/**
 * Spremi stanje igrača u Firestore.
 * @param {string} uid
 * @param {object} stanje — podskup gameStore stanja koji se serializira
 */
export const spremiCloud = async (uid, stanje) => {
  if (!uid) return;
  try {
    await setDoc(
      doc(db, KOLEKCIJA, uid),
      { ...stanje, uid, azurirano: serverTimestamp() },
      { merge: true },
    );
  } catch (err) {
    // Tiha greška — SQLite cache ostaje valjanim fallbackom
    console.warn('[CloudSave] spremiCloud greška:', err.message);
  }
};

/**
 * Učitaj stanje igrača iz Firestorea.
 * @param {string} uid
 * @returns {Promise<object|null>} objekt stanja ili null ako dokument ne postoji
 */
export const ucitajCloud = async (uid) => {
  if (!uid) return null;
  try {
    const snap = await getDoc(doc(db, KOLEKCIJA, uid));
    if (snap.exists()) {
      const data = snap.data();
      if (!validanCloudPayload(data)) {
        console.warn('[CloudSave] ucitajCloud neispravan payload.');
        return null;
      }
      return data;
    }
    return null;
  } catch (err) {
    console.warn('[CloudSave] ucitajCloud greška:', err.message);
    return null;
  }
};

/**
 * Ažuriraj samo ime igrača za prikaz u ljestvici / razini.
 * @param {string} uid
 * @param {string} imeIgraca
 */
export const postaviIme = async (uid, imeIgraca) => {
  if (!uid || !imeIgraca) return;
  try {
    await setDoc(
      doc(db, KOLEKCIJA, uid),
      { imeIgraca, azurirano: serverTimestamp() },
      { merge: true },
    );
  } catch (err) {
    console.warn('[CloudSave] postaviIme greška:', err.message);
  }
};
