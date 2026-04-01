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
 *                      && resource.data.members[request.auth.uid] == true;
 *       }
 *     }
 *   }
 */

import { initializeApp, getApps } from 'firebase/app';
import { getAuth }      from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ─── Zamijenite s vašom Firebase konfiguracijom ───────────────────────────────
const firebaseConfig = {
  apiKey:            'YOUR_API_KEY',
  authDomain:        'YOUR_PROJECT_ID.firebaseapp.com',
  projectId:         'YOUR_PROJECT_ID',
  storageBucket:     'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId:             'YOUR_APP_ID',
};
// ─────────────────────────────────────────────────────────────────────────────

// Singleton — izbjegava višestruku inicijalizaciju pri hot-reloadu
const app  = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db   = getFirestore(app);

export { app, auth, db };
