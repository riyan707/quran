import React, { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Ayah, Surah } from '../../db/queries/ayahs';
import { toEasternArabicNumeral } from '../../utils/arabicNumerals';
import { arabicFont, readTheme } from './theme';

const END_OF_AYAH = '۝'; // ۝

interface Props {
  surah: Surah;
  ayahs: Ayah[];
  onPressAyahEnd?: (ayah: Ayah) => void;
}

/**
 * Continuous, reflowing mushaf text for a surah — NOT the real fixed
 * 15-line-per-page mushaf layout (that needs QPC/King Fahd Complex glyph
 * and per-line word-position data, e.g. Quran.com's per-page/line API;
 * this only has per-ayah text, so lines wrap naturally instead of being
 * justified word-for-word like a real mushaf page).
 */
export function MushafPage({ surah, ayahs, onPressAyahEnd }: Props) {
  const showsBismillah = surah.number !== 1 && surah.number !== 9;

  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <Text style={styles.bannerText}>سُورَةُ {surah.name}</Text>
      </View>

      {showsBismillah && <Text style={styles.bismillah}>بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</Text>}

      <Text style={styles.flow}>
        {ayahs.map((a) => (
          <Fragment key={a.ayahNumber}>
            <Text>{a.text} </Text>
            <Text style={styles.medallion} onPress={() => onPressAyahEnd?.(a)}>
              {END_OF_AYAH + toEasternArabicNumeral(a.ayahNumber)}
            </Text>
            <Text> </Text>
          </Fragment>
        ))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 140 },
  banner: {
    height: 44,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: readTheme.bannerBorder,
    borderRadius: 6,
    backgroundColor: readTheme.bannerBgTop,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: { fontFamily: arabicFont, fontSize: 19, color: '#e2dccd' },
  bismillah: {
    height: 42,
    fontFamily: arabicFont,
    fontSize: 18,
    color: readTheme.bismillah,
    textAlign: 'center',
    marginBottom: 4,
  },
  flow: {
    fontFamily: arabicFont,
    fontSize: 22,
    lineHeight: 44,
    color: readTheme.ayahText,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  medallion: { color: readTheme.medallion, fontSize: 17 },
});
