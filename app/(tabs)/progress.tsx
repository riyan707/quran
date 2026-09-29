import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useDb } from '@/src/hooks/useDb';
import { getOverallProgress, getProgressByJuz, type OverallProgress, type UnitProgress } from '@/src/db/queries/progress';
import { getUserSettings } from '@/src/db/queries/settings';
import { ProgressGrid } from '@/src/components/ProgressGrid';

export default function ProgressScreen() {
  const db = useDb();
  const [overall, setOverall] = useState<OverallProgress | null>(null);
  const [byJuz, setByJuz] = useState<UnitProgress[]>([]);
  const [streak, setStreak] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!db) return;
      Promise.all([getOverallProgress(db), getProgressByJuz(db), getUserSettings(db)]).then(
        ([overallResult, juzResult, settings]) => {
          setOverall(overallResult);
          setByJuz(juzResult);
          setStreak(settings.streakCount);
        }
      );
    }, [db])
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{overall ? `${overall.percent.toFixed(1)}%` : '—'}</Text>
          <Text style={styles.statLabel}>Memorised</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{streak}</Text>
          <Text style={styles.statLabel}>Day streak</Text>
        </View>
      </View>

      {overall && (
        <Text style={styles.ayahCount}>
          {overall.memorisedAyahs} of {overall.totalAyahs} ayahs
        </Text>
      )}

      <Text style={styles.sectionTitle}>By Juz</Text>
      <ProgressGrid data={byJuz} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: '#f0fdfa',
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: 'center',
  },
  statValue: { fontSize: 28, fontWeight: '800', color: '#0f766e' },
  statLabel: { fontSize: 12, color: '#78716c', marginTop: 4, fontWeight: '600' },
  ayahCount: { textAlign: 'center', color: '#78716c', fontSize: 13 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#78716c', marginTop: 16, textTransform: 'uppercase' },
});
