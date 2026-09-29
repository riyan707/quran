import type * as SQLite from 'expo-sqlite';
import { getAyahsFromPoint, type Ayah } from './ayahs';
import { getScheduledAyahKeys, insertNewItems } from './memorisationItems';
import { chunkAyahs, type UnitType } from '../../srs/chunking';

export type SessionUnitType = Exclude<UnitType, 'custom'>;

export interface MemorisationSession {
  id: number;
  label: string;
  unitType: SessionUnitType;
  dailyNewItemSize: number;
  nextSurah: number;
  nextAyah: number;
  createdAt: string;
}

interface SessionRow {
  id: number;
  label: string;
  unit_type: SessionUnitType;
  daily_new_item_size: number;
  next_surah: number;
  next_ayah: number;
  created_at: string;
}

function mapRow(row: SessionRow): MemorisationSession {
  return {
    id: row.id,
    label: row.label,
    unitType: row.unit_type,
    dailyNewItemSize: row.daily_new_item_size,
    nextSurah: row.next_surah,
    nextAyah: row.next_ayah,
    createdAt: row.created_at,
  };
}

export interface NewSession {
  label: string;
  unitType: SessionUnitType;
  dailyNewItemSize: number;
  startSurah: number;
  startAyah: number;
}

/** Creates a new memorisation track. Does not introduce any items yet — call `introduceNextBatch` next. */
export async function createSession(db: SQLite.SQLiteDatabase, input: NewSession): Promise<MemorisationSession> {
  const result = await db.runAsync(
    `INSERT INTO memorisation_sessions (label, unit_type, daily_new_item_size, next_surah, next_ayah)
     VALUES ($label, $unitType, $dailyNewItemSize, $nextSurah, $nextAyah)`,
    {
      $label: input.label,
      $unitType: input.unitType,
      $dailyNewItemSize: input.dailyNewItemSize,
      $nextSurah: input.startSurah,
      $nextAyah: input.startAyah,
    }
  );
  const row = await db.getFirstAsync<SessionRow>('SELECT * FROM memorisation_sessions WHERE id = $id', {
    $id: result.lastInsertRowId,
  });
  if (!row) throw new Error('failed to create memorisation session');
  return mapRow(row);
}

export async function getSession(db: SQLite.SQLiteDatabase, sessionId: number): Promise<MemorisationSession | null> {
  const row = await db.getFirstAsync<SessionRow>('SELECT * FROM memorisation_sessions WHERE id = $id', {
    $id: sessionId,
  });
  return row ? mapRow(row) : null;
}

/** Every active track — used to pool "ready to learn" batches across all of them. */
export async function getAllSessions(db: SQLite.SQLiteDatabase): Promise<MemorisationSession[]> {
  const rows = await db.getAllAsync<SessionRow>('SELECT * FROM memorisation_sessions ORDER BY created_at ASC');
  return rows.map(mapRow);
}

export async function updateSessionPace(
  db: SQLite.SQLiteDatabase,
  sessionId: number,
  patch: Partial<Pick<MemorisationSession, 'unitType' | 'dailyNewItemSize'>>
): Promise<void> {
  const current = await getSession(db, sessionId);
  if (!current) throw new Error(`session ${sessionId} not found`);
  const next = { ...current, ...patch };
  await db.runAsync('UPDATE memorisation_sessions SET unit_type = $unitType, daily_new_item_size = $size WHERE id = $id', {
    $unitType: next.unitType,
    $size: next.dailyNewItemSize,
    $id: sessionId,
  });
}

export interface IntroducedBatch {
  session: MemorisationSession;
  introduced: Ayah[];
}

/**
 * Pulls the next batch of not-yet-scheduled ayahs from a session's cursor,
 * grouped into `unitType`-sized chunks (defaulting to `batchSize` chunks —
 * pass an override for "do extra today" / "just one more page" etc), creates
 * a brand-new FSRS card for each ayah, and advances the session's cursor
 * past whatever was introduced.
 */
export async function introduceNextBatch(
  db: SQLite.SQLiteDatabase,
  sessionId: number,
  batchSizeOverride?: number,
  now: Date = new Date()
): Promise<IntroducedBatch> {
  const session = await getSession(db, sessionId);
  if (!session) throw new Error(`session ${sessionId} not found`);

  const batchSize = batchSizeOverride ?? session.dailyNewItemSize;
  const upcoming = await getAyahsFromPoint(db, session.nextSurah, session.nextAyah);
  const scheduled = await getScheduledAyahKeys(db);
  const unscheduled = upcoming.filter((a) => !scheduled.has(`${a.surah}:${a.ayahNumber}`));

  if (unscheduled.length === 0 || batchSize <= 0) {
    return { session, introduced: [] };
  }

  let introducedCount: number;
  if (session.unitType === 'ayah') {
    introducedCount = Math.min(batchSize, unscheduled.length);
  } else {
    const chunks = chunkAyahs(unscheduled, session.unitType).slice(0, batchSize);
    introducedCount = chunks.reduce((sum, c) => sum + (c.ayahEnd - c.ayahStart + 1), 0);
  }

  const introduced = unscheduled.slice(0, introducedCount);
  await insertNewItems(
    db,
    sessionId,
    introduced.map((a) => ({ surah: a.surah, ayahNumber: a.ayahNumber })),
    now
  );

  const lastIntroduced = introduced[introduced.length - 1];
  const idxInUpcoming = upcoming.findIndex(
    (a) => a.surah === lastIntroduced.surah && a.ayahNumber === lastIntroduced.ayahNumber
  );
  const cursorAyah = upcoming[idxInUpcoming + 1];
  const nextSurah = cursorAyah ? cursorAyah.surah : lastIntroduced.surah;
  const nextAyah = cursorAyah ? cursorAyah.ayahNumber : lastIntroduced.ayahNumber + 1;

  await db.runAsync('UPDATE memorisation_sessions SET next_surah = $surah, next_ayah = $ayah WHERE id = $id', {
    $surah: nextSurah,
    $ayah: nextAyah,
    $id: sessionId,
  });

  return { session: { ...session, nextSurah, nextAyah }, introduced };
}
