/**
 * src/firebase/raids.js
 *
 * Sustav pljačke (napada) pravih igrača.
 *
 * Tok:
 *   1. Lubanje (skull) na automatu activiraju raid.
 *   2. dohvatiMete(uid, n) — dohvati n slučajnih igrača koji:
 *       - nisu mi (uid)
 *       - imaju resursi > 0
 *       - nisu zaštićeni štitom (stitovi > 0)
 *      Vraća sažetek mete (bez sveg stanja — samo resursi i ime).
 *   3. izvrsiNapad(napadacUid, metaUid, kolicina) — atomska transakcija:
 *       - smanji resurse mete (kamen, drvo, zeljezo)
 *       - zapisi `raids/{id}` log zapis
 *
 * Ograničenja bez pravog servera:
 *   - Nema atomske zaštite od race-condition ako dvoje napadne istu metu istovremeno.
 *     Za produkciju dodati Cloud Function s transakcijskim Firestore writeom.
 */

import {
  collection, query, where, orderBy, limit,
  getDocs, doc, runTransaction, addDoc, serverTimestamp, getDoc,
} from 'firebase/firestore';
import { db } from './config';
import { randomInt, shuffle } from '../utils/helpers';

const KOLEKCIJA_PLAYERS = 'players';
const KOLEKCIJA_RAIDS   = 'raids';
const POSTOTAK_KRADJE   = 0.15; // 15% resursa po uspješnom napadu
const RAID_COOLDOWN_MS  = 30 * 1000;
const RETALIATION_WINDOW_MS = 60 * 60 * 1000;
const RAID_ID_UPPER_BOUND = 1000000000;

/**
 * Dohvati do `n` mogućih meta za napad.
 * Meta mora imati stitovi === 0 i bar nešto resursa.
 * @param {string} napadacUid — vlastiti UID (da ne napadnemo sebe)
 * @param {number} n          — koliko meta dohvatiti (default 5)
 * @returns {Promise<Array<{uid, imeIgraca, resursi, igracRazina}>>}
 */
export const dohvatiMete = async (napadacUid, n = 5) => {
  try {
    // Dohvati igrače bez štita, sortirane po razini (slični napadaču → fer match)
    const q = query(
      collection(db, KOLEKCIJA_PLAYERS),
      where('stitovi', '==', 0),
      orderBy('igracRazina', 'desc'),
      limit(20), // dohvati više pa filtriraj lokalno
    );
    const snap = await getDocs(q);
    const meta = [];
    snap.forEach((d) => {
      const data = d.data();
      if (data.uid !== napadacUid) {
        const ukupnoResursa =
          (data.resursi?.drvo    ?? 0) +
          (data.resursi?.kamen   ?? 0) +
          (data.resursi?.zeljezo ?? 0);
        if (ukupnoResursa > 0) {
          meta.push({
            uid:        data.uid,
            imeIgraca:  data.imeIgraca    ?? 'Nepoznati igrač',
            resursi:    data.resursi      ?? { drvo: 0, kamen: 0, zeljezo: 0 },
            igracRazina: data.igracRazina ?? 1,
          });
        }
      }
    });
    // Nasumično promiješaj i vrati n meta
    return shuffle(meta).slice(0, n);
  } catch (err) {
    console.warn('[Raids] dohvatiMete greška:', err.message);
    return [];
  }
};

/**
 * Izvrši napad na metu — smanji njene resurse, vrati ukradenu količinu napadaču.
 * Koristi Firestore transakciju za konzistentnost.
 * @param {string} napadacUid
 * @param {string} metaUid
 * @returns {Promise<{drvo, kamen, zeljezo}|null>} ukradeni resursi ili null ako napad nije uspio
 */
export const izvrsiNapad = async (napadacUid, metaUid, options = {}) => {
  if (!napadacUid || !metaUid) return null;
  try {
    const napadacRef = doc(db, KOLEKCIJA_PLAYERS, napadacUid);
    const metaRef = doc(db, KOLEKCIJA_PLAYERS, metaUid);
    let ukradeno  = null;
    let metaImeIgraca = 'Meta';

    await runTransaction(db, async (tx) => {
      const metaSnap = await tx.get(metaRef);
      if (!metaSnap.exists()) return;

      const metaData = metaSnap.data();
      const napadacSnap = await tx.get(napadacRef);
      const napadacData = napadacSnap.exists() ? napadacSnap.data() : {};

      // Provjeri štitove
      if ((metaData.stitovi ?? 0) > 0) return;
      const zadnjiNapadMs = metaData.zadnjiNapadMs ?? 0;
      const jeRetaliation = !!options.retaliation;
      if (!jeRetaliation && Date.now() - zadnjiNapadMs < RAID_COOLDOWN_MS) return;

      const resursiMete = metaData.resursi ?? { drvo: 0, kamen: 0, zeljezo: 0 };
      metaImeIgraca = metaData.imeIgraca ?? 'Meta';
      const lootMultiplier = jeRetaliation ? 1.25 : 1;
      ukradeno = {
        drvo:    Math.floor((resursiMete.drvo    ?? 0) * POSTOTAK_KRADJE * lootMultiplier),
        kamen:   Math.floor((resursiMete.kamen   ?? 0) * POSTOTAK_KRADJE * lootMultiplier),
        zeljezo: Math.floor((resursiMete.zeljezo ?? 0) * POSTOTAK_KRADJE * lootMultiplier),
      };

      const noviResursi = {
        drvo:    (resursiMete.drvo    ?? 0) - ukradeno.drvo,
        kamen:   (resursiMete.kamen   ?? 0) - ukradeno.kamen,
        zeljezo: (resursiMete.zeljezo ?? 0) - ukradeno.zeljezo,
      };

      const novaMetaPovijest = [
        {
          id: `in-${Date.now()}-${randomInt(RAID_ID_UPPER_BOUND)}`,
          tip: 'incoming',
          napadacUid,
          napadacIme: napadacData.imeIgraca ?? 'Napadač',
          vrijemeNapadaMs: Date.now(),
          ukradeno,
          mozeProtunapadDo: Date.now() + RETALIATION_WINDOW_MS,
          retaliation: jeRetaliation,
        },
        ...((metaData.raidPovijest ?? []).slice(0, 19)),
      ];

      tx.update(metaRef, { resursi: noviResursi, raidPovijest: novaMetaPovijest, zadnjiNapadMs: Date.now() });
    });

    if (ukradeno) {
      // Zapisi log napada
      await addDoc(collection(db, KOLEKCIJA_RAIDS), {
        napadacUid,
        metaUid,
        ukradeno,
        vrijemeNapada: serverTimestamp(),
      });
    }

    return ukradeno ? { ...ukradeno, metaImeIgraca } : null;
  } catch (err) {
    console.warn('[Raids] izvrsiNapad greška:', err.message);
    return null;
  }
};

export const dohvatiRaidPovijest = async (uid) => {
  if (!uid) return [];
  try {
    const snap = await getDoc(doc(db, KOLEKCIJA_PLAYERS, uid));
    if (!snap.exists()) return [];
    const data = snap.data();
    return Array.isArray(data.raidPovijest) ? data.raidPovijest : [];
  } catch (err) {
    console.warn('[Raids] dohvatiRaidPovijest greška:', err.message);
    return [];
  }
};
