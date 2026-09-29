import * as SQLite from 'expo-sqlite';
import { runMigrations } from './schema';
import { seedAyahsAndSurahs } from './seed';

const DB_NAME = 'quran-srs.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function openAndPrepare(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await runMigrations(db);
  await seedAyahsAndSurahs(db);
  return db;
}

/** Returns the shared, already-migrated-and-seeded database instance. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openAndPrepare();
  }
  return dbPromise;
}
