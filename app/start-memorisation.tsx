import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDb } from '@/src/hooks/useDb';
import { getAllSurahs, type Surah } from '@/src/db/queries/ayahs';
import { createSession, introduceNextBatch, type SessionUnitType } from '@/src/db/queries/sessions';
import { getUserSettings, updateUserSettings } from '@/src/db/queries/settings';
import type { UnitType } from '@/src/srs/chunking';

const UNIT_OPTIONS: { value: SessionUnitType; label: string }[] = [
  { value: 'ayah', label: '1 Ayah' },
  { value: 'page_third', label: '1/3 Page' },
  { value: 'page_half', label: '1/2 Page' },
  { value: 'page', label: 'Full Page' },
];

function isSessionUnitType(u: UnitType): u is SessionUnitType {
  return u !== 'custom';
}

export default function StartMemorisationScreen() {
  const db = useDb();
  const router = useRouter();
  const params = useLocalSearchParams<{ surah?: string; ayah?: string }>();

  const startSurah = Number(params.surah ?? 1);
  const startAyah = Number(params.ayah ?? 1);

  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [unitType, setUnitType] = useState<SessionUnitType>('ayah');
  const [dailySize, setDailySize] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!db) return;
    Promise.all([getAllSurahs(db), getUserSettings(db)]).then(([surahList, settings]) => {
      setSurahs(surahList);
      if (isSessionUnitType(settings.dailyNewItemUnit)) {
        setUnitType(settings.dailyNewItemUnit);
      }
      setDailySize(String(settings.dailyNewItemSize));
    });
  }, [db]);

  const dailySizeNumber = useMemo(() => {
    const n = parseInt(dailySize, 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }, [dailySize]);

  const startSurahName = surahs.find((s) => s.number === startSurah)?.englishName;

  const handleConfirm = async () => {
    if (!db || submitting) return;
    setSubmitting(true);
    try {
      const label = startSurahName ? `${startSurahName} ${startAyah}` : `Surah ${startSurah}:${startAyah}`;
      const session = await createSession(db, {
        label,
        unitType,
        dailyNewItemSize: dailySizeNumber,
        startSurah,
        startAyah,
      });
      const { introduced } = await introduceNextBatch(db, session.id);
      await updateUserSettings(db, { dailyNewItemUnit: unitType, dailyNewItemSize: dailySizeNumber });

      if (introduced.length === 0) {
        Alert.alert('Nothing to schedule', 'Every ayah from this point onward is already in a memorisation track.');
        return;
      }

      router.replace('/(tabs)/review');
    } catch (e) {
      Alert.alert('Something went wrong', e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionLabel}>Starting point</Text>
      <Text style={styles.startPoint}>
        {startSurahName ? `${startSurahName} (Surah ${startSurah})` : `Surah ${startSurah}`}, Ayah {startAyah} — and
        onward
      </Text>

      <Text style={styles.sectionLabel}>Chunk size for this track</Text>
      <View style={styles.optionsRow}>
        {UNIT_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => setUnitType(opt.value)}
            style={[styles.option, unitType === opt.value && styles.optionSelected]}
          >
            <Text style={[styles.optionText, unitType === opt.value && styles.optionTextSelected]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionLabel}>New items per day</Text>
      <TextInput
        value={dailySize}
        onChangeText={setDailySize}
        keyboardType="number-pad"
        style={styles.input}
        placeholder="1"
      />

      <Pressable
        style={[styles.confirmButton, (submitting || !db) && styles.confirmButtonDisabled]}
        onPress={handleConfirm}
        disabled={submitting || !db}
      >
        <Text style={styles.confirmButtonText}>{submitting ? 'Starting…' : "Start — Today's Batch Now"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 8 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#78716c', marginTop: 16, textTransform: 'uppercase' },
  startPoint: { fontSize: 16, fontWeight: '600', color: '#1c1917' },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  option: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d6d3d1',
  },
  optionSelected: { backgroundColor: '#0f766e', borderColor: '#0f766e' },
  optionText: { fontSize: 14, color: '#1c1917', fontWeight: '500' },
  optionTextSelected: { color: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: '#d6d3d1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    marginTop: 4,
    width: 100,
  },
  confirmButton: {
    marginTop: 28,
    backgroundColor: '#0f766e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmButtonDisabled: { opacity: 0.5 },
  confirmButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
