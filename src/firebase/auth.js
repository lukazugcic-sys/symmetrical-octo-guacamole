/**
 * src/firebase/auth.js
 *
 * Autentifikacija igrača:
 *   - prijaviAnonimno()          — anonimna prijava (bez registracije)
 *   - povežiSGoogleom(credential) — nadogradnja anonimnog računa na Google
 *   - odjavi()                   — odjava
 *   - dohvatiUid()               — sinhrono čitanje trenutnog uid-a
 *
 * Tok:
 *   1. Aplikacija se pokreće → prijaviAnonimno() ako nema korisnika
 *   2. Korisnik može u postavkama nadograditi na Google/Apple bez gubitka podataka
 *   3. uid se sprema u gameStore.uid i koristi kao Firestore dokument ID
 */

import {
  signInAnonymously,
  linkWithCredential,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from './config';

/**
 * Anonimna prijava — vraća Firebase User objekt.
 * Ako je korisnik već prijavljen, vraća trenutnog korisnika.
 */
export const prijaviAnonimno = async () => {
  if (auth.currentUser) return auth.currentUser;
  const result = await signInAnonymously(auth);
  return result.user;
};

/**
 * Nadogradnja anonimnog računa na Google.
 * @param {OAuthCredential} googleCredential — credential iz expo-auth-session
 * @returns {Promise<User>}
 */
export const povežiSGoogleom = async (googleCredential) => {
  const googleCred = GoogleAuthProvider.credential(googleCredential.idToken);
  const result     = await linkWithCredential(auth.currentUser, googleCred);
  return result.user;
};

/**
 * Odjava igrača.
 */
export const odjavi = () => signOut(auth);

/**
 * Sinhrono čitanje UID-a trenutnog korisnika (ili null).
 */
export const dohvatiUid = () => auth.currentUser?.uid ?? null;

/**
 * Pretplata na promjene stanja autentifikacije.
 * @param {(user: User|null) => void} callback
 * @returns {() => void} unsubscribe funkcija
 */
export const slušajAuth = (callback) => onAuthStateChanged(auth, callback);
