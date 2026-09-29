// One-time build script: transforms the raw AlQuran Cloud Uthmani-script
// export (scripts/seed-source/quran-uthmani.raw.json) into the compact,
// bundled assets the app seeds its local SQLite database from.
//
// Run with: node scripts/build-seed-data.js
const fs = require('fs');
const path = require('path');

const rawPath = path.join(__dirname, 'seed-source', 'quran-uthmani.raw.json');
const outDir = path.join(__dirname, '..', 'assets', 'data');

const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
const surahs = raw.data.surahs;

// Strip stray BOM / zero-width no-break space characters that Tanzil-derived
// text sometimes carries at the start of the Bismillah ayah.
const cleanText = (t) => t.replace(/﻿/g, '').trim();

/** @type {Array<[number, number, string, number, number]>} */
const ayahRows = [];
/** @type {Array<{number:number,name:string,englishName:string,englishNameTranslation:string,revelationType:string,ayahCount:number}>} */
const surahRows = [];

for (const surah of surahs) {
  surahRows.push({
    number: surah.number,
    name: surah.name,
    englishName: surah.englishName,
    englishNameTranslation: surah.englishNameTranslation,
    revelationType: surah.revelationType,
    ayahCount: surah.ayahs.length,
  });
  for (const ayah of surah.ayahs) {
    // [surah, ayahNumber, text, juz, page]
    ayahRows.push([surah.number, ayah.numberInSurah, cleanText(ayah.text), ayah.juz, ayah.page]);
  }
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'ayahs.json'), JSON.stringify(ayahRows));
fs.writeFileSync(path.join(outDir, 'surahs.json'), JSON.stringify(surahRows, null, 2));

console.log(`Wrote ${ayahRows.length} ayahs across ${surahRows.length} surahs.`);
