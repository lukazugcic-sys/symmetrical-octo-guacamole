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
const readConfig = (key, fallback = '') => process.env[key] ?? fallback;
const firebaseConfig = {
  apiKey:            readConfig('EXPO_PUBLIC_FIREBASE_API_KEY'),
  authDomain:        readConfig('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId:         readConfig('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket:     readConfig('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: readConfig('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId:             readConfig('EXPO_PUBLIC_FIREBASE_APP_ID'),
  measurementId:     readConfig('EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID'),
};
const missingConfigKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => value === '')
  .map(([key]) => key);

if (missingConfigKeys.length > 0) {
  console.warn(`[Firebase] Missing EXPO_PUBLIC_FIREBASE_* values for: ${missingConfigKeys.join(', ')}`);
}

// Singleton — izbjegava višestruku inicijalizaciju pri hot-reloadu
const app  = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db   = getFirestore(app);

export { app, auth, db };
