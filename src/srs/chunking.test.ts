import { chunkAyahs, type AyahRef } from './chunking';

function ayahs(...spec: Array<[surah: number, ayah: number, page: number]>): AyahRef[] {
  return spec.map(([surah, ayahNumber, page]) => ({ surah, ayahNumber, page }));
}

describe('chunkAyahs', () => {
  it('produces one chunk per ayah for unit "ayah"', () => {
    const result = chunkAyahs(ayahs([2, 1, 2], [2, 2, 2], [2, 3, 2]), 'ayah');
    expect(result).toEqual([
      { surah: 2, ayahStart: 1, ayahEnd: 1 },
      { surah: 2, ayahStart: 2, ayahEnd: 2 },
      { surah: 2, ayahStart: 3, ayahEnd: 3 },
    ]);
  });

  it('groups a whole page into a single chunk for unit "page"', () => {
    const result = chunkAyahs(ayahs([2, 1, 2], [2, 2, 2], [2, 3, 2], [2, 4, 3]), 'page');
    expect(result).toEqual([
      { surah: 2, ayahStart: 1, ayahEnd: 3 },
      { surah: 2, ayahStart: 4, ayahEnd: 4 },
    ]);
  });

  it('splits a page into three roughly-equal chunks for unit "page_third"', () => {
    const result = chunkAyahs(
      ayahs([2, 1, 5], [2, 2, 5], [2, 3, 5], [2, 4, 5], [2, 5, 5], [2, 6, 5]),
      'page_third'
    );
    expect(result).toEqual([
      { surah: 2, ayahStart: 1, ayahEnd: 2 },
      { surah: 2, ayahStart: 3, ayahEnd: 4 },
      { surah: 2, ayahStart: 5, ayahEnd: 6 },
    ]);
  });

  it('never lets a chunk cross a surah boundary even mid-page', () => {
    const result = chunkAyahs(ayahs([1, 6, 1], [1, 7, 1], [2, 1, 1], [2, 2, 1]), 'page');
    expect(result).toEqual([
      { surah: 1, ayahStart: 6, ayahEnd: 7 },
      { surah: 2, ayahStart: 1, ayahEnd: 2 },
    ]);
  });
});
