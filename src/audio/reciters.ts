export interface Reciter {
  id: string;
  name: string;
  /** everyayah.com data folder name for this reciter's per-ayah recordings. */
  everyAyahFolder: string;
}

// Add more reciters by appending entries here — no code changes required elsewhere.
export const RECITERS: Reciter[] = [
  { id: 'alafasy', name: 'Mishary Alafasy', everyAyahFolder: 'Alafasy_128kbps' },
  { id: 'abdulbasit', name: 'Abdul Basit (Murattal)', everyAyahFolder: 'Abdul_Basit_Murattal_192kbps' },
  { id: 'sudais', name: 'Abdur-Rahman As-Sudais', everyAyahFolder: 'Abdurrahmaan_As-Sudais_192kbps' },
];

export const DEFAULT_RECITER_ID = RECITERS[0].id;

export function getReciter(reciterId: string): Reciter {
  return RECITERS.find((r) => r.id === reciterId) ?? RECITERS[0];
}

export function getReciterAudioUrl(reciterId: string, surah: number, ayah: number): string {
  const reciter = getReciter(reciterId);
  const surahPadded = String(surah).padStart(3, '0');
  const ayahPadded = String(ayah).padStart(3, '0');
  return `https://everyayah.com/data/${reciter.everyAyahFolder}/${surahPadded}${ayahPadded}.mp3`;
}
