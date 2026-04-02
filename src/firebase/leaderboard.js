/**
 * src/firebase/leaderboard.js
 *
 * Globalna ljestvica igrača — Firestore kolekcija `leaderboard/{uid}`.
 *
 * Zapis ljestvice (podskup stanja igrača, bez osjetljivih podataka):
 *   {
 *     uid, imeIgraca,
 *     igracRazina, prestigeRazina,
 *     ukupnoZlata, ukupnoVrtnji,
 *     klanNaziv,   // naziv klana ili null
 *     azurirano,
 *   }
 *
 * Sortiranje: prestigeRazina DESC, pa ukupnoZlata DESC.
 * Upit ograničen na 50 zapisa (limit).
 */

import {
  doc, setDoc, collection, query,
  orderBy, limit, getDocs, serverTimestamp, startAfter,
} from 'firebase/firestore';
import { db } from './config';

const KOLEKCIJA = 'leaderboard';
const TOP_N     = 50;

/**
 * Ažuriraj vlastiti zapis na ljestvici.
 * Poziva se iz gameStore.spremi() kad god se promijeni razina / ukupnoZlata.
 * @param {string} uid
 * @param {object} podaci — { imeIgraca, igracRazina, prestigeRazina, ukupnoZlata, ukupnoVrtnji, klan }
 */
export const azurirajLjestvicu = async (uid, podaci) => {
  if (!uid) return;
  try {
    await setDoc(
      doc(db, KOLEKCIJA, uid),
      {
        uid,
        imeIgraca:      podaci.imeIgraca      ?? 'Igrač',
        igracRazina:    podaci.igracRazina    ?? 1,
        prestigeRazina: podaci.prestigeRazina ?? 0,
        ukupnoZlata:    podaci.ukupnoZlata    ?? 0,
        ukupnoVrtnji:   podaci.ukupnoVrtnji   ?? 0,
        klanNaziv:      podaci.klan?.naziv    ?? null,
        azurirano:      serverTimestamp(),
      },
      { merge: true },
    );
  } catch (err) {
    console.warn('[Leaderboard] azurirajLjestvicu greška:', err.message);
  }
};

/**
 * Dohvati top-N igrača s ljestvice.
 * Sortiran po prestigeRazina DESC → ukupnoZlata DESC.
 * @returns {Promise<Array<object>>} niz zapisa ljestvice
 */
export const dohvatiTopIgraca = async (cursorDoc = null, pageSize = TOP_N) => {
  try {
    const base = [
      collection(db, KOLEKCIJA),
      orderBy('prestigeRazina', 'desc'),
      orderBy('ukupnoZlata',    'desc'),
      limit(pageSize),
    ];
    if (cursorDoc) base.splice(3, 0, startAfter(cursorDoc));
    const q = query(...base);
    const snap    = await getDocs(q);
    const rezultat = [];
    snap.forEach((d) => rezultat.push(d.data()));
    const docs = snap.docs;
    return {
      igraci: rezultat,
      cursor: docs.length ? docs[docs.length - 1] : null,
      hasMore: docs.length === pageSize,
    };
  } catch (err) {
    console.warn('[Leaderboard] dohvatiTopIgraca greška:', err.message);
    return { igraci: [], cursor: null, hasMore: false };
  }
};
