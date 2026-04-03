/**
 * src/firebase/config.js
 *
 * Firebase JS SDK v10 inicijalizacija (modularni API).
 *
 * ⚠️  POPUNITE SVOJOM Firebase konfiguracijom:
 *    1. Idite na https://console.firebase.google.com/
 *    2. Kreirajte projekt → Dodajte Web app
 *    3. Kopirajte firebaseConfig objekt ovdje
 *    4. U Firestore konzoli omogućite Firestore + Authentication
 *       (Anonymous, Google, Apple provider).
 *
 * Firestore sigurnosna pravila (starter):
 *   rules_version = '2';
 *   service cloud.firestore {
 *     match /databases/{database}/documents {
 *       // Svaki korisnik čita/piše samo svoje podatke
 *       match /players/{uid} {
 *         allow read, write: if request.auth != null && request.auth.uid == uid;
 *       }
 *       // Ljestvica — svi čitaju, pišu samo vlastiti zapis
 *       match /leaderboard/{uid} {
 *         allow read: if request.auth != null;
 *         allow write: if request.auth != null && request.auth.uid == uid;
 *       }
 *       // Klanovi — čitaju svi autorizirani, pišu samo članovi
 *       match /clans/{clanId} {
 *         allow read: if request.auth != null;
 *         allow write: if request.auth != null
 *                      && resource.data.membri[request.auth.uid] == true;
 *       }
 *     }
 *   }
 */

import { initializeApp, getApps } from 'firebase/app';
import { getAuth }      from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ─── Firebase konfiguracija ───────────────────────────────────────────────────
const FIREBASE_ENV_MAP = {
  apiKey: 'EXPO_PUBLIC_FIREBASE_API_KEY',
  authDomain: 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  projectId: 'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  storageBucket: 'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'EXPO_PUBLIC_FIREBASE_APP_ID',
  measurementId: 'EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID',
};

const firebaseConfig = Object.fromEntries(
  Object.entries(FIREBASE_ENV_MAP).map(([configKey, envKey]) => [configKey, process.env[envKey] ?? '']),
);

const missingConfigKeys = Object.entries(FIREBASE_ENV_MAP)
  .filter(([, envKey]) => (process.env[envKey] ?? '') === '')
  .map(([, envKey]) => envKey);

if (missingConfigKeys.length > 0) {
  const poruka = `[Firebase] Missing required environment variables: ${missingConfigKeys.join(', ')}`;
  if (__DEV__) throw new Error(poruka);
  console.warn(poruka);
}

// Singleton — izbjegava višestruku inicijalizaciju pri hot-reloadu
const app  = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db   = getFirestore(app);

export { app, auth, db };
