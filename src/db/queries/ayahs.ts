import type * as SQLite from 'expo-sqlite';

export interface Ayah {
  surah: number;
  ayahNumber: number;
  text: string;
  juz: number;
  page: number;
}

export interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: string;
  ayahCount: number;
}

interface AyahRow {
  surah: number;
  ayah_number: number;
  text_uthmani: string;
  juz: number;
  page: number;
}

interface SurahRow {
  number: number;
  name: string;
  english_name: string;
  english_name_translation: string;
  revelation_type: string;
  ayah_count: number;
}

function mapAyah(row: AyahRow): Ayah {
  return { surah: row.surah, ayahNumber: row.ayah_number, text: row.text_uthmani, juz: row.juz, page: row.page };
}

function mapSurah(row: SurahRow): Surah {
  return {
    number: row.number,
    name: row.name,
    englishName: row.english_name,
    englishNameTranslation: row.english_name_translation,
    revelationType: row.revelation_type,
    ayahCount: row.ayah_count,
  };
}

export async function getAllSurahs(db: SQLite.SQLiteDatabase): Promise<Surah[]> {
  const rows = await db.getAllAsync<SurahRow>('SELECT * FROM surahs ORDER BY number ASC');
  return rows.map(mapSurah);
}

export async function getAyahsForSurah(db: SQLite.SQLiteDatabase, surah: number): Promise<Ayah[]> {
  const rows = await db.getAllAsync<AyahRow>(
    'SELECT * FROM ayahs WHERE surah = $surah ORDER BY ayah_number ASC',
    { $surah: surah }
  );
  return rows.map(mapAyah);
}

export async function getAyahRange(
  db: SQLite.SQLiteDatabase,
  surah: number,
  ayahStart: number,
  ayahEnd: number
): Promise<Ayah[]> {
  const rows = await db.getAllAsync<AyahRow>(
    'SELECT * FROM ayahs WHERE surah = $surah AND ayah_number >= $start AND ayah_number <= $end ORDER BY ayah_number ASC',
    { $surah: surah, $start: ayahStart, $end: ayahEnd }
  );
  return rows.map(mapAyah);
}

/** All ayahs from (surah, ayahNumber) through the end of the mushaf, in reading order. */
export async function getAyahsFromPoint(
  db: SQLite.SQLiteDatabase,
  surah: number,
  ayahNumber: number
): Promise<Ayah[]> {
  const rows = await db.getAllAsync<AyahRow>(
    `SELECT * FROM ayahs
     WHERE surah > $surah OR (surah = $surah AND ayah_number >= $ayahNumber)
     ORDER BY surah ASC, ayah_number ASC`,
    { $surah: surah, $ayahNumber: ayahNumber }
  );
  return rows.map(mapAyah);
}
