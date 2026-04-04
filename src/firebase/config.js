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

const REQUIRED_FIREBASE_CONFIG_KEYS = [
  'apiKey',
  'authDomain',
  'projectId',
  'appId',
];

const isMeaningfulFirebaseValue = (value) => {
  if (typeof value !== 'string') return false;
  const normalized = value.trim();
  if (normalized === '') return false;
  return !/^(your[-_ ]|example|changeme)/i.test(normalized);
};

const firebaseConfig = {};
const invalidRequiredEnvKeys = [];

Object.entries(FIREBASE_ENV_MAP).forEach(([configKey, envKey]) => {
  const value = process.env[envKey] ?? '';
  firebaseConfig[configKey] = value;
  if (
    REQUIRED_FIREBASE_CONFIG_KEYS.includes(configKey)
    && !isMeaningfulFirebaseValue(value)
  ) {
    invalidRequiredEnvKeys.push(envKey);
  }
});

let app = null;
let auth = null;
let db = null;
let firebaseEnabled = false;
let firebaseDisabledReason = null;

if (invalidRequiredEnvKeys.length > 0) {
  firebaseDisabledReason = `[Firebase] Disabled local cloud features because required env vars are missing or placeholders: ${invalidRequiredEnvKeys.join(', ')}`;
  console.warn(firebaseDisabledReason);
} else {
  try {
    // Singleton — izbjegava višestruku inicijalizaciju pri hot-reloadu
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
    firebaseEnabled = true;
  } catch (error) {
    firebaseDisabledReason = `[Firebase] Disabled local cloud features after initialization failed: ${error?.message ?? 'Unknown Firebase error'}`;
    console.warn(firebaseDisabledReason);
  }
}

export { app, auth, db, firebaseEnabled, firebaseDisabledReason };
