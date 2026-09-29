import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFonts, AmiriQuran_400Regular } from '@expo-google-fonts/amiri-quran';
import { useDb } from '@/src/hooks/useDb';
import { getAllSurahs, getAyahsForSurah, type Ayah, type Surah } from '@/src/db/queries/ayahs';
import { getUserSettings } from '@/src/db/queries/settings';
import { SurahPickerModal } from '@/src/components/SurahPickerModal';
import { MushafPage } from '@/src/components/read/MushafPage';
import { ReadTopBar } from '@/src/components/read/ReadTopBar';
import { ReadMiniPlayer } from '@/src/components/read/ReadMiniPlayer';
import { readTheme } from '@/src/components/read/theme';

export default function ReadScreen() {
  const db = useDb();
  const router = useRouter();
  const [fontsLoaded] = useFonts({ AmiriQuran_400Regular });

  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(false);
  const [reciter, setReciter] = useState('Reciter');
  const [streakCount, setStreakCount] = useState(0);
  const [playerPlaying, setPlayerPlaying] = useState(false);

  useEffect(() => {
    if (!db) return;
    getAllSurahs(db).then((list) => {
      setSurahs(list);
      setSelectedSurah((current) => current ?? list.find((s) => s.number === 36) ?? list[0] ?? null);
    });
    getUserSettings(db).then((settings) => {
      setStreakCount(settings.streakCount);
      setReciter(settings.selectedReciter);
    });
  }, [db]);

  useEffect(() => {
    if (!db || !selectedSurah) return;
    getAyahsForSurah(db, selectedSurah.number).then(setAyahs);
  }, [db, selectedSurah]);

  const toggleChrome = useCallback(() => setChromeVisible((v) => !v), []);

  const firstAyah = ayahs[0];

  if (!fontsLoaded) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <Pressable style={styles.tapLayer} onPress={toggleChrome}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {selectedSurah && <MushafPage surah={selectedSurah} ayahs={ayahs} />}
        </ScrollView>
      </Pressable>

      <View style={styles.infoLine} pointerEvents="box-none">
        <Pressable onPress={() => setPickerVisible(true)} hitSlop={8}>
          <Text style={styles.infoText}>{selectedSurah?.englishName ?? ''}</Text>
        </Pressable>
        {firstAyah && <Text style={styles.infoText}>Part {firstAyah.juz}</Text>}
      </View>

      {firstAyah && (
        <View style={styles.pageNumberWrap} pointerEvents="none">
          <View style={styles.pageNumberPill}>
            <Text style={styles.pageNumberText}>{firstAyah.page}</Text>
          </View>
        </View>
      )}

      <ReadTopBar
        visible={chromeVisible}
        streakCount={streakCount}
        onOpenContents={() => {}}
        onOpenSearch={() => {}}
        onOpenSettings={() => router.push('/(tabs)/settings')}
      />

      <ReadMiniPlayer
        visible={chromeVisible}
        reciter={reciter}
        playing={playerPlaying}
        onTogglePlay={() => setPlayerPlaying((p) => !p)}
        onOpenReciterPicker={() => {}}
      />

      <SurahPickerModal
        visible={pickerVisible}
        surahs={surahs}
        onSelect={(s) => {
          setSelectedSurah(s);
          setPickerVisible(false);
        }}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: readTheme.pageBg },
  tapLayer: { flex: 1 },
  scrollContent: { paddingTop: 76 },
  infoLine: {
    position: 'absolute',
    top: 46,
    left: 22,
    right: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoText: { fontSize: 13, color: readTheme.infoText },
  pageNumberWrap: { position: 'absolute', left: 0, right: 0, bottom: 22, alignItems: 'center' },
  pageNumberPill: {
    paddingHorizontal: 18,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: readTheme.borderStrong,
    backgroundColor: readTheme.pageNumberBg,
  },
  pageNumberText: { fontSize: 13, fontWeight: '600', letterSpacing: 0.4, color: '#cfd3d1' },
});
