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

// ─── Firebase konfiguracija (projekt: abcd-83adf) ────────────────────────────
const firebaseConfig = {
  apiKey:            'AIzaSyCm-WdZ5QHOi3Q0c1P1S50cG42bjOjlJyo',
  authDomain:        'abcd-83adf.firebaseapp.com',
  projectId:         'abcd-83adf',
  storageBucket:     'abcd-83adf.firebasestorage.app',
  messagingSenderId: '406906984995',
  appId:             '1:406906984995:web:0e42aceaa0b6ed03c42f96',
  measurementId:     'G-HEWRQ52M96',
};
// ─────────────────────────────────────────────────────────────────────────────

// Singleton — izbjegava višestruku inicijalizaciju pri hot-reloadu
const app  = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db   = getFirestore(app);

export { app, auth, db };
