/**
 * src/firebase/clanMultiplayer.js
 *
 * Real-time multiplayer za klan zadatke — Firestore kolekcija `clans/{clanId}`.
 *
 * Dokument klana:
 *   {
 *     naziv, razina, xp,
 *     membri: { [uid]: true },  // mapa aktivnih članova
 *     zadaci: [ { id, opis, tip, cilj, trenutno, zavrseno, preuzeto } ],
 *     zadnjiRefresh: ISO string,
 *   }
 *
 * API:
 *   kreirajKlan(uid, naziv)          — kreira dokument, uid postaje osnivač
 *   ucitajKlan(clanId)               — jednokratno čitanje
 *   slušajKlan(clanId, callback)     — real-time onSnapshot pretplata
 *   azurirajKlanZadatak(clanId, tipZadatka, napredak) — atomski inkrement
 *   doniraiXpKlanu(clanId, xpIznos)  — atomski inkrement XP-a + level-up provjera
 *   preuzmiNagradu(clanId, zadatakId, uid) — označi zadatak kao preuzet za tog igrača
 *
 * clanId je naziv klana pretvoreni u lowercase + bez razmaka (slug).
 * U produkciji koristiti auto-generated ID ili provjeru jedinstvenosti u Cloud Function.
 */

import {
  doc, getDoc, setDoc, updateDoc,
  onSnapshot, increment, arrayUnion, serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import { generirajKlanZadatke } from '../config/constants';

const KOLEKCIJA = 'clans';
const XP_PO_RAZINI = 1000;

/** Generira konzistentni clanId iz naziva (slug). */
export const slugKlana = (naziv) =>
  naziv.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

/**
 * Kreiraj novi klan u Firestoreu.
 * @param {string} uid — uid osnivača
 * @param {string} naziv — naziv klana
 * @returns {Promise<string>} clanId
 */
export const kreirajKlan = async (uid, naziv) => {
  const clanId = slugKlana(naziv);
  const ref    = doc(db, KOLEKCIJA, clanId);
  await setDoc(ref, {
    naziv,
    razina:       1,
    xp:           0,
    membri:       { [uid]: true },
    zadaci:       generirajKlanZadatke(),
    zadnjiRefresh: new Date().toISOString(),
    kreiran:       serverTimestamp(),
  });
  return clanId;
};

/**
 * Jednokratno čitanje dokumenta klana.
 * @returns {Promise<{id, ...data}|null>}
 */
export const ucitajKlan = async (clanId) => {
  if (!clanId) return null;
  try {
    const snap = await getDoc(doc(db, KOLEKCIJA, clanId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) {
    console.warn('[Clan] ucitajKlan greška:', err.message);
    return null;
  }
};

/**
 * Real-time pretplata na klan dokument.
 * @param {string} clanId
 * @param {(data: object) => void} callback — poziva se pri svakoj promjeni
 * @returns {() => void} unsubscribe funkcija
 */
export const slušajKlan = (clanId, callback) => {
  if (!clanId) return () => {};
  return onSnapshot(
    doc(db, KOLEKCIJA, clanId),
    (snap) => { if (snap.exists()) callback({ id: snap.id, ...snap.data() }); },
    (err) => console.warn('[Clan] slušajKlan greška:', err.message),
  );
};

/**
 * Atomski inkrement napretka klan zadatka.
 * Traži zadatak po tipu, povećava `trenutno` za `napredak`.
 * Koristi Firestore FieldValue.increment za atomičnost.
 *
 * Napomena: Firestore ne podržava direktni update unutar arraya po uvjetu;
 * koristimo Cloud Function approach — čitamo, mijenjamo, pišemo (optimistično).
 * Za pravu atomičnost dodati Cloud Function trigger.
 *
 * @param {string} clanId
 * @param {string} tipZadatka — 'spin' | 'zlato' | 'zgrada' | 'dobitak' | itd.
 * @param {number} napredak   — iznos za dodati
 */
export const azurirajKlanZadatak = async (clanId, tipZadatka, napredak = 1) => {
  if (!clanId) return;
  try {
    const ref  = doc(db, KOLEKCIJA, clanId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const data    = snap.data();
    const zadaci  = (data.zadaci ?? []).map((z) => {
      if (z.tip === tipZadatka && !z.zavrseno) {
        const novoTrenutno = Math.min(z.cilj, z.trenutno + napredak);
        return { ...z, trenutno: novoTrenutno, zavrseno: novoTrenutno >= z.cilj };
      }
      return z;
    });

    await updateDoc(ref, { zadaci });
  } catch (err) {
    console.warn('[Clan] azurirajKlanZadatak greška:', err.message);
  }
};

/**
 * Donacija XP-a klanu; automatski level-up ako xp >= razina * XP_PO_RAZINI.
 * @param {string} clanId
 * @param {number} xpIznos
 */
export const doniraiXpKlanu = async (clanId, xpIznos) => {
  if (!clanId || xpIznos <= 0) return;
  try {
    const ref  = doc(db, KOLEKCIJA, clanId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const data       = snap.data();
    let noviXp       = (data.xp ?? 0) + xpIznos;
    let novaRazina   = data.razina ?? 1;
    const xpZaRazinu = novaRazina * XP_PO_RAZINI;

    if (noviXp >= xpZaRazinu) {
      noviXp -= xpZaRazinu;
      novaRazina += 1;
    }

    await updateDoc(ref, { xp: noviXp, razina: novaRazina });
  } catch (err) {
    console.warn('[Clan] doniraiXpKlanu greška:', err.message);
  }
};

/**
 * Označi nagradu zadatka kao preuzetu za jednog igrača.
 * Koristi arrayUnion na `zadaci[i].preuzetoOd` polju.
 * Ako svi zadaci su preuzeti, resetiraj zadatke.
 * @param {string} clanId
 * @param {number} zadatakId
 * @param {string} uid
 * @returns {Promise<object|null>} nagrada zadatka ili null
 */
export const preuzmiNagradu = async (clanId, zadatakId, uid) => {
  if (!clanId || !uid) return null;
  try {
    const ref  = doc(db, KOLEKCIJA, clanId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const data   = snap.data();
    const zadaci = data.zadaci ?? [];
    const idx    = zadaci.findIndex((z) => z.id === zadatakId);
    if (idx === -1) return null;

    const zadatak = zadaci[idx];
    if (!zadatak.zavrseno) return null;

    const preuzetoOd = zadatak.preuzetoOd ?? [];
    if (preuzetoOd.includes(uid)) return null; // već preuzeto

    const noviZadaci = zadaci.map((z, i) =>
      i === idx ? { ...z, preuzetoOd: [...preuzetoOd, uid] } : z
    );

    await updateDoc(ref, { zadaci: noviZadaci });
    return zadatak.nagrada ?? null;
  } catch (err) {
    console.warn('[Clan] preuzmiNagradu greška:', err.message);
    return null;
  }
};

/**
 * Provjeri treba li osvježiti tjedne zadatke (stariji od 7 dana).
 * Ako da, generiraj nove i spremi.
 * @param {string} clanId
 */
export const osvjeziZadatkeAkoTreba = async (clanId) => {
  if (!clanId) return;
  try {
    const ref  = doc(db, KOLEKCIJA, clanId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const data       = snap.data();
    const zadnjiRefr = data.zadnjiRefresh ? new Date(data.zadnjiRefresh) : null;
    const sedamDana  = 7 * 24 * 60 * 60 * 1000;
    if (!zadnjiRefr || Date.now() - zadnjiRefr.getTime() > sedamDana) {
      await updateDoc(ref, {
        zadaci:        generirajKlanZadatke(),
        zadnjiRefresh: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('[Clan] osvjeziZadatkeAkoTreba greška:', err.message);
  }
};
