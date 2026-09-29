import type * as SQLite from 'expo-sqlite';

// Bundled at build time — Metro inlines JSON requires into the JS bundle,
// so no runtime download/asset step is needed to seed the local database.
type AyahRow = [surah: number, ayahNumber: number, text: string, juz: number, page: number];
type SurahRow = {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: string;
  ayahCount: number;
};

const ayahRows = require('../../assets/data/ayahs.json') as AyahRow[];
const surahRows = require('../../assets/data/surahs.json') as SurahRow[];

/** Seeds the static `ayahs` and `surahs` reference tables on first launch only. */
export async function seedAyahsAndSurahs(db: SQLite.SQLiteDatabase): Promise<void> {
  const existing = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM ayahs');
  if (existing && existing.count > 0) {
    return;
  }

  await db.withTransactionAsync(async () => {
    const surahStmt = await db.prepareAsync(
      `INSERT INTO surahs (number, name, english_name, english_name_translation, revelation_type, ayah_count)
       VALUES ($number, $name, $englishName, $englishNameTranslation, $revelationType, $ayahCount)`
    );
    try {
      for (const s of surahRows) {
        await surahStmt.executeAsync({
          $number: s.number,
          $name: s.name,
          $englishName: s.englishName,
          $englishNameTranslation: s.englishNameTranslation,
          $revelationType: s.revelationType,
          $ayahCount: s.ayahCount,
        });
      }
    } finally {
      await surahStmt.finalizeAsync();
    }

    const ayahStmt = await db.prepareAsync(
      `INSERT INTO ayahs (surah, ayah_number, text_uthmani, juz, page) VALUES ($surah, $ayahNumber, $text, $juz, $page)`
    );
    try {
      for (const [surah, ayahNumber, text, juz, page] of ayahRows) {
        await ayahStmt.executeAsync({ $surah: surah, $ayahNumber: ayahNumber, $text: text, $juz: juz, $page: page });
      }
    } finally {
      await ayahStmt.finalizeAsync();
    }
  });
}
