import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useDb } from '@/src/hooks/useDb';
import { getAyahRange, type Ayah } from '@/src/db/queries/ayahs';
import {
  getLearningPhaseItems,
  getLearningSessionProgress,
  getPendingLearningItemIds,
  getReviewPhaseItems,
  gradeItem,
  type LearningSessionProgress,
  type MemorisationItem,
} from '@/src/db/queries/memorisationItems';
import { getAllSessions, introduceNextBatch, type MemorisationSession } from '@/src/db/queries/sessions';
import { getUserSettings, recordReviewForStreak } from '@/src/db/queries/settings';
import { useAyahAudio } from '@/src/audio/useAyahAudio';
import type { Grade } from '@/src/srs/fsrs';

const POLL_INTERVAL_MS = 15000;

function ReviewCard({
  item,
  mode,
  reciterId,
  onGraded,
}: {
  item: MemorisationItem;
  mode: 'learning' | 'review';
  reciterId: string;
  onGraded: (grade: Grade) => void;
}) {
  const db = useDb();
  const [ayah, setAyah] = useState<Ayah | null>(null);
  const [revealed, setRevealed] = useState(false);
  const { state: audioState, play } = useAyahAudio(reciterId, item.surah, item.ayahNumber);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (db) {
        getAyahRange(db, item.surah, item.ayahNumber, item.ayahNumber).then((rows) => {
          if (!cancelled) setAyah(rows[0] ?? null);
        });
      }
      return () => {
        cancelled = true;
      };
    }, [db, item.id])
  );

  return (
    <View style={styles.card}>
      <View style={styles.referenceRow}>
        <Text style={styles.reference}>
          Surah {item.surah}, Ayah {item.ayahNumber}
        </Text>
        <View style={[styles.modeBadge, mode === 'learning' ? styles.modeBadgeLearning : styles.modeBadgeReview]}>
          <Text style={styles.modeBadgeText}>{mode === 'learning' ? 'Learning' : 'Review'}</Text>
        </View>
      </View>

      {revealed ? (
        <ScrollView style={styles.textScroll}>
          {ayah && <Text style={styles.arabic}>{ayah.text}</Text>}
        </ScrollView>
      ) : (
        <Pressable style={styles.revealButton} onPress={() => setRevealed(true)}>
          <Text style={styles.revealButtonText}>Recall it, then tap to reveal</Text>
        </Pressable>
      )}

      {revealed && (
        <Pressable style={styles.playButton} onPress={play} disabled={audioState === 'loading'}>
          <Text style={styles.playButtonText}>
            {audioState === 'loading' ? 'Loading audio…' : audioState === 'playing' ? '▸ Playing' : '▸ Play Audio'}
          </Text>
        </Pressable>
      )}

      {revealed && (
        <View style={styles.gradeRow}>
          <GradeButton label="Again" color="#dc2626" onPress={() => onGraded('again')} />
          <GradeButton label="Hard" color="#d97706" onPress={() => onGraded('hard')} />
          <GradeButton label="Good" color="#0f766e" onPress={() => onGraded('good')} />
          <GradeButton label="Easy" color="#16a34a" onPress={() => onGraded('easy')} />
        </View>
      )}
    </View>
  );
}

function GradeButton({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <Pressable style={[styles.gradeButton, { borderColor: color }]} onPress={onPress}>
      <Text style={[styles.gradeButtonText, { color }]}>{label}</Text>
    </Pressable>
  );
}

export default function ReviewScreen() {
  const db = useDb();
  const [ready, setReady] = useState(false);
  const [learningQueue, setLearningQueue] = useState<MemorisationItem[]>([]);
  const [reviewQueue, setReviewQueue] = useState<MemorisationItem[]>([]);
  const [sessions, setSessions] = useState<MemorisationSession[]>([]);
  const [progress, setProgress] = useState<LearningSessionProgress | null>(null);
  const [reciterId, setReciterId] = useState('alafasy');
  const cohortRef = useRef<{ ids: number[]; startedAt: Date }>({ ids: [], startedAt: new Date() });

  const refresh = useCallback(async () => {
    if (!db) return;
    const [due, dueReview, allSessions, pendingIds, settings] = await Promise.all([
      getLearningPhaseItems(db),
      getReviewPhaseItems(db),
      getAllSessions(db),
      getPendingLearningItemIds(db),
      getUserSettings(db),
    ]);
    setLearningQueue(due);
    setReviewQueue(dueReview);
    setSessions(allSessions);
    setReciterId(settings.selectedReciter);
    setReady(true);

    if (pendingIds.length === 0) {
      cohortRef.current = { ids: [], startedAt: new Date() };
      setProgress(null);
      return;
    }

    const stillTracking = cohortRef.current.ids.some((id) => pendingIds.includes(id));
    cohortRef.current = stillTracking
      ? { ids: Array.from(new Set([...cohortRef.current.ids, ...pendingIds])), startedAt: cohortRef.current.startedAt }
      : { ids: pendingIds, startedAt: new Date() };

    const p = await getLearningSessionProgress(db, cohortRef.current.ids, cohortRef.current.startedAt);
    setProgress(p);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const interval = setInterval(refresh, POLL_INTERVAL_MS);
      return () => clearInterval(interval);
    }, [refresh])
  );

  const handleGraded = useCallback(
    async (grade: Grade) => {
      if (!db) return;
      const current = learningQueue[0] ?? reviewQueue[0];
      if (!current) return;
      await gradeItem(db, current.id, grade);
      await recordReviewForStreak(db);
      await refresh();
    },
    [db, learningQueue, reviewQueue, refresh]
  );

  const handleLearnMore = useCallback(
    async (session: MemorisationSession) => {
      if (!db) return;
      await introduceNextBatch(db, session.id);
      await refresh();
    },
    [db, refresh]
  );

  if (!db || !ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const current = learningQueue[0] ?? reviewQueue[0];
  const mode: 'learning' | 'review' = learningQueue[0] ? 'learning' : 'review';
  const waitingOnTimer = !current && !!progress && progress.remaining > 0;

  if (current) {
    return (
      <View style={styles.container}>
        {progress && (
          <Text style={styles.progressLine}>
            {cohortRef.current.ids.length - progress.remaining}/{cohortRef.current.ids.length} ayahs · {progress.again}{' '}
            Again · {progress.hard} Hard · {progress.goodEasy} Good/Easy
          </Text>
        )}
        {!progress && <Text style={styles.queueCount}>{reviewQueue.length} due</Text>}
        <ReviewCard key={current.id} item={current} mode={mode} reciterId={reciterId} onGraded={handleGraded} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.emptyContainer}>
      {waitingOnTimer ? (
        <View style={styles.waitingBlock}>
          <ActivityIndicator />
          <Text style={styles.doneTitle}>Nice pace</Text>
          <Text style={styles.doneSubtitle}>
            {progress && `${cohortRef.current.ids.length - progress.remaining}/${cohortRef.current.ids.length} ayahs so far — `}
            next one will be ready in a moment.
          </Text>
        </View>
      ) : (
        <View style={styles.waitingBlock}>
          <Text style={styles.doneTitle}>All caught up 🎉</Text>
          <Text style={styles.doneSubtitle}>No items are due right now.</Text>
        </View>
      )}

      {sessions.length > 0 && (
        <View style={styles.sessionsBlock}>
          <Text style={styles.sectionTitle}>Your Tracks</Text>
          {sessions.map((s) => (
            <View key={s.id} style={styles.sessionRow}>
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionLabel}>{s.label}</Text>
                <Text style={styles.sessionMeta}>
                  Surah {s.nextSurah}:{s.nextAyah} next · {s.dailyNewItemSize}/day
                </Text>
              </View>
              <Pressable style={styles.learnMoreButton} onPress={() => handleLearnMore(s)}>
                <Text style={styles.learnMoreButtonText}>Learn {s.dailyNewItemSize} more</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  emptyContainer: { flexGrow: 1, padding: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  waitingBlock: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 40 },
  doneTitle: { fontSize: 20, fontWeight: '700' },
  doneSubtitle: { fontSize: 14, color: '#78716c', textAlign: 'center' },
  queueCount: { fontSize: 13, fontWeight: '600', color: '#78716c', marginBottom: 8 },
  progressLine: { fontSize: 13, fontWeight: '600', color: '#78716c', marginBottom: 8 },
  card: { flex: 1, gap: 16 },
  referenceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reference: { fontSize: 14, fontWeight: '600', color: '#0f766e' },
  modeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  modeBadgeLearning: { backgroundColor: '#fef3c7' },
  modeBadgeReview: { backgroundColor: '#f0fdfa' },
  modeBadgeText: { fontSize: 11, fontWeight: '700', color: '#57534e' },
  textScroll: { flex: 1 },
  arabic: { fontSize: 28, lineHeight: 48, textAlign: 'right', writingDirection: 'rtl', color: '#1c1917' },
  revealButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d6d3d1',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealButtonText: { fontSize: 15, color: '#78716c', fontWeight: '500' },
  playButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0fdfa',
  },
  playButtonText: { color: '#0f766e', fontWeight: '600', fontSize: 13 },
  gradeRow: { flexDirection: 'row', gap: 8 },
  gradeButton: { flex: 1, borderWidth: 1.5, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  gradeButtonText: { fontWeight: '700', fontSize: 13 },
  sessionsBlock: { marginTop: 24, gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#78716c', textTransform: 'uppercase' },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
  },
  sessionInfo: { flex: 1 },
  sessionLabel: { fontSize: 15, fontWeight: '600', color: '#1c1917' },
  sessionMeta: { fontSize: 12, color: '#78716c', marginTop: 2 },
  learnMoreButton: { backgroundColor: '#0f766e', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  learnMoreButtonText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
