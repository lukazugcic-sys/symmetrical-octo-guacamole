/**
 * src/db/database.js
 *
 * Enkapsulira svu SQLite logiku:
 *   - inicijalizacija baze i tablice kv_store
 *   - dbGet(key)       → Promise<string | null>
 *   - dbSet(key, value) → Promise<void>
 *   - verzijsko migriranje (za buduće promjene sheme)
 *
 * Koristi expo-sqlite v13 novi async API (openDatabaseAsync + execAsync / getFirstAsync).
 * Singleton: baza se otvori jednom i dijeli kroz cijeli životni vijek aplikacije.
 */

import * as SQLite from 'expo-sqlite';

// Trenutna verzija sheme — povećaj za dodavanje novih tablica/stupaca.
const SCHEMA_VERSION = 1;

let _db = null;

// ─── Interna inicijalizacija ──────────────────────────────────────────────────

/**
 * Primijeni migracije od 'fromVersion' do SCHEMA_VERSION.
 * Dodaj blokove kada mijenjate shemu u budućim fazama.
 */
const _migrate = async (db, fromVersion) => {
  for (let v = fromVersion + 1; v <= SCHEMA_VERSION; v++) {
    if (v === 1) {
      // Inicijalna shema — opći key-value store
      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS kv_store (
          key        TEXT PRIMARY KEY NOT NULL,
          value      TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );`
      );
    }
    // Dodaj 'else if (v === 2) { ... }' za buduće migracije
  }
  // Spremi novu verziju
  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
};

// ─── Javno API ────────────────────────────────────────────────────────────────

/**
 * Otvori i inicijaliziraj SQLite bazu.
 * Mora se pozvati jednom (u ucitaj()) prije dbGet / dbSet.
 * Idem pozivi su sigurni — singleton se vraća odmah.
 */
export const initDB = async () => {
  if (_db) return _db;

  const db = await SQLite.openDatabaseAsync('game.db');

  // Dohvati trenutnu verziju sheme
  const versionRow = await db.getFirstAsync('PRAGMA user_version;');
  const currentVersion = versionRow ? (versionRow.user_version ?? 0) : 0;

  if (currentVersion < SCHEMA_VERSION) {
    await _migrate(db, currentVersion);
  }

  _db = db;
  return db;
};

/**
 * Dohvati string vrijednost po ključu.
 * @returns {Promise<string|null>}
 */
export const dbGet = async (key) => {
  if (!_db) await initDB();
  const row = await _db.getFirstAsync(
    'SELECT value FROM kv_store WHERE key = ?;',
    [key]
  );
  return row ? row.value : null;
};

/**
 * Spremi ili ažuriraj string vrijednost za ključ.
 * @returns {Promise<void>}
 */
export const dbSet = async (key, value) => {
  if (!_db) await initDB();
  const now = new Date().toISOString();
  await _db.runAsync(
    `INSERT INTO kv_store (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
    [key, value, now]
  );
};
