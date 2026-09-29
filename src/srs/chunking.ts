export type UnitType = 'ayah' | 'page_third' | 'page_half' | 'page' | 'custom';

export interface AyahRef {
  surah: number;
  ayahNumber: number;
  page: number;
}

export interface Chunk {
  surah: number;
  ayahStart: number;
  ayahEnd: number;
}

/**
 * Splits a sequential run of ayahs into memorisation chunks of the given
 * granularity. A chunk never crosses a surah or mushaf-page boundary, so
 * "page" units near the edge of a surah may come out slightly short.
 * `custom` ranges are built directly by the caller, not through this helper.
 */
export function chunkAyahs(ayahs: AyahRef[], unitType: Exclude<UnitType, 'custom'>): Chunk[] {
  if (unitType === 'ayah') {
    return ayahs.map((a) => ({ surah: a.surah, ayahStart: a.ayahNumber, ayahEnd: a.ayahNumber }));
  }

  const groupsPerPage = unitType === 'page' ? 1 : unitType === 'page_half' ? 2 : 3;

  const pageGroups: AyahRef[][] = [];
  let current: AyahRef[] = [];
  for (const a of ayahs) {
    const prev = current[current.length - 1];
    if (prev && (prev.page !== a.page || prev.surah !== a.surah)) {
      pageGroups.push(current);
      current = [];
    }
    current.push(a);
  }
  if (current.length) pageGroups.push(current);

  const chunks: Chunk[] = [];
  for (const group of pageGroups) {
    const size = Math.ceil(group.length / groupsPerPage);
    for (let i = 0; i < group.length; i += size) {
      const slice = group.slice(i, i + size);
      chunks.push({
        surah: slice[0].surah,
        ayahStart: slice[0].ayahNumber,
        ayahEnd: slice[slice.length - 1].ayahNumber,
      });
    }
  }
  return chunks;
}
