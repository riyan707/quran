import type * as SQLite from 'expo-sqlite';
import { createNewCard, gradeCard, isInLearningPhase, type CardState, type Grade, type SrsCard } from '../../srs/fsrs';

export interface MemorisationItem {
  id: number;
  sessionId: number;
  surah: number;
  ayahNumber: number;
  state: CardState;
  dueDate: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  lastReviewAt: string | null;
}

interface MemorisationItemRow {
  id: number;
  session_id: number;
  surah: number;
  ayah_number: number;
  state: CardState;
  due_date: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  last_review_at: string | null;
}

function mapRow(row: MemorisationItemRow): MemorisationItem {
  return {
    id: row.id,
    sessionId: row.session_id,
    surah: row.surah,
    ayahNumber: row.ayah_number,
    state: row.state,
    dueDate: row.due_date,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsedDays: row.elapsed_days,
    scheduledDays: row.scheduled_days,
    learningSteps: row.learning_steps,
    reps: row.reps,
    lapses: row.lapses,
    lastReviewAt: row.last_review_at,
  };
}

function rowToCard(row: MemorisationItemRow): SrsCard {
  return {
    state: row.state,
    dueDate: new Date(row.due_date),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsedDays: row.elapsed_days,
    scheduledDays: row.scheduled_days,
    learningSteps: row.learning_steps,
    reps: row.reps,
    lapses: row.lapses,
    lastReview: row.last_review_at ? new Date(row.last_review_at) : null,
  };
}

export interface NewItemAyah {
  surah: number;
  ayahNumber: number;
}

/** Creates a fresh FSRS card (state "new", due immediately) for each ayah and inserts it. */
export async function insertNewItems(
  db: SQLite.SQLiteDatabase,
  sessionId: number,
  ayahs: NewItemAyah[],
  now: Date = new Date()
): Promise<void> {
  if (ayahs.length === 0) return;

  await db.withTransactionAsync(async () => {
    const stmt = await db.prepareAsync(
      `INSERT OR IGNORE INTO memorisation_items
         (session_id, surah, ayah_number, state, due_date, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses)
       VALUES
         ($sessionId, $surah, $ayahNumber, $state, $dueDate, $stability, $difficulty, $elapsedDays, $scheduledDays, $learningSteps, $reps, $lapses)`
    );
    try {
      for (const ayah of ayahs) {
        const card = createNewCard(now);
        await stmt.executeAsync({
          $sessionId: sessionId,
          $surah: ayah.surah,
          $ayahNumber: ayah.ayahNumber,
          $state: card.state,
          $dueDate: card.dueDate.toISOString(),
          $stability: card.stability,
          $difficulty: card.difficulty,
          $elapsedDays: card.elapsedDays,
          $scheduledDays: card.scheduledDays,
          $learningSteps: card.learningSteps,
          $reps: card.reps,
          $lapses: card.lapses,
        });
      }
    } finally {
      await stmt.finalizeAsync();
    }
  });
}

/** New/learning/relearning items due now — the in-session, short-term-requeue queue. */
export async function getLearningPhaseItems(
  db: SQLite.SQLiteDatabase,
  asOf: Date = new Date()
): Promise<MemorisationItem[]> {
  const rows = await db.getAllAsync<MemorisationItemRow>(
    `SELECT * FROM memorisation_items
     WHERE state IN ('new', 'learning', 'relearning') AND due_date <= $asOf
     ORDER BY due_date ASC`,
    { $asOf: asOf.toISOString() }
  );
  return rows.map(mapRow);
}

/** Graduated ("review" state) items due today or earlier, pooled across every active session. */
export async function getReviewPhaseItems(
  db: SQLite.SQLiteDatabase,
  asOf: Date = new Date()
): Promise<MemorisationItem[]> {
  const rows = await db.getAllAsync<MemorisationItemRow>(
    `SELECT * FROM memorisation_items WHERE state = 'review' AND due_date <= $asOf ORDER BY due_date ASC`,
    { $asOf: asOf.toISOString() }
  );
  return rows.map(mapRow);
}

/** `"surah:ayah"` keys for every ayah that already has a card, for de-duping new sessions/batches. */
export async function getScheduledAyahKeys(db: SQLite.SQLiteDatabase): Promise<Set<string>> {
  const rows = await db.getAllAsync<{ surah: number; ayah_number: number }>(
    'SELECT surah, ayah_number FROM memorisation_items'
  );
  return new Set(rows.map((r) => `${r.surah}:${r.ayah_number}`));
}

/** Applies an FSRS grade to an item, persists the new card state, and logs the review. */
export async function gradeItem(
  db: SQLite.SQLiteDatabase,
  itemId: number,
  grade: Grade,
  now: Date = new Date()
): Promise<MemorisationItem> {
  const row = await db.getFirstAsync<MemorisationItemRow>('SELECT * FROM memorisation_items WHERE id = $id', {
    $id: itemId,
  });
  if (!row) {
    throw new Error(`memorisation item ${itemId} not found`);
  }

  const before = rowToCard(row);
  const after = gradeCard(before, grade, now);

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE memorisation_items
       SET state = $state, due_date = $dueDate, stability = $stability, difficulty = $difficulty,
           elapsed_days = $elapsedDays, scheduled_days = $scheduledDays, learning_steps = $learningSteps,
           reps = $reps, lapses = $lapses, last_review_at = $lastReviewAt
       WHERE id = $id`,
      {
        $state: after.state,
        $dueDate: after.dueDate.toISOString(),
        $stability: after.stability,
        $difficulty: after.difficulty,
        $elapsedDays: after.elapsedDays,
        $scheduledDays: after.scheduledDays,
        $learningSteps: after.learningSteps,
        $reps: after.reps,
        $lapses: after.lapses,
        $lastReviewAt: now.toISOString(),
        $id: itemId,
      }
    );
    await db.runAsync(
      `INSERT INTO review_log (item_id, reviewed_at, rating, state_before, state_after, due_after)
       VALUES ($itemId, $reviewedAt, $rating, $stateBefore, $stateAfter, $dueAfter)`,
      {
        $itemId: itemId,
        $reviewedAt: now.toISOString(),
        $rating: grade,
        $stateBefore: before.state,
        $stateAfter: after.state,
        $dueAfter: after.dueDate.toISOString(),
      }
    );
  });

  return mapRow({
    ...row,
    state: after.state,
    due_date: after.dueDate.toISOString(),
    stability: after.stability,
    difficulty: after.difficulty,
    elapsed_days: after.elapsedDays,
    scheduled_days: after.scheduledDays,
    learning_steps: after.learningSteps,
    reps: after.reps,
    lapses: after.lapses,
    last_review_at: now.toISOString(),
  });
}

/** Ids of every item currently mid-learning (new/learning/relearning), due or not — the current "batch." */
export async function getPendingLearningItemIds(db: SQLite.SQLiteDatabase): Promise<number[]> {
  const rows = await db.getAllAsync<{ id: number }>(
    `SELECT id FROM memorisation_items WHERE state IN ('new', 'learning', 'relearning')`
  );
  return rows.map((r) => r.id);
}

export interface LearningSessionProgress {
  remaining: number;
  again: number;
  hard: number;
  goodEasy: number;
}

/** Derives the live "X/Y ayahs · N Again · ..." counter for a set of items from `review_log`, no local bookkeeping needed. */
export async function getLearningSessionProgress(
  db: SQLite.SQLiteDatabase,
  itemIds: number[],
  since: Date
): Promise<LearningSessionProgress> {
  if (itemIds.length === 0) {
    return { remaining: 0, again: 0, hard: 0, goodEasy: 0 };
  }

  const placeholders = itemIds.map((_, i) => `$id${i}`).join(', ');
  const params: Record<string, number | string> = { $since: since.toISOString() };
  itemIds.forEach((id, i) => {
    params[`$id${i}`] = id;
  });

  const remainingRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM memorisation_items WHERE id IN (${placeholders}) AND state != 'review'`,
    params
  );
  const tallyRows = await db.getAllAsync<{ rating: string; count: number }>(
    `SELECT rating, COUNT(*) as count FROM review_log WHERE item_id IN (${placeholders}) AND reviewed_at >= $since GROUP BY rating`,
    params
  );

  let again = 0;
  let hard = 0;
  let goodEasy = 0;
  for (const r of tallyRows) {
    if (r.rating === 'again') again = r.count;
    else if (r.rating === 'hard') hard = r.count;
    else goodEasy += r.count;
  }

  return { remaining: remainingRow?.count ?? 0, again, hard, goodEasy };
}

export { isInLearningPhase };
