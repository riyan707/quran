import type * as SQLite from 'expo-sqlite';

export interface UnitProgress {
  unit: number;
  total: number;
  memorised: number;
}

async function progressByColumn(db: SQLite.SQLiteDatabase, column: 'juz' | 'surah'): Promise<UnitProgress[]> {
  const ayahColumn = column === 'surah' ? 'ay.surah' : 'ay.juz';

  const totals = await db.getAllAsync<{ unit: number; total: number }>(
    `SELECT ${ayahColumn} as unit, COUNT(*) as total FROM ayahs ay GROUP BY ${ayahColumn} ORDER BY unit ASC`
  );
  const memorised = await db.getAllAsync<{ unit: number; memorised: number }>(
    `SELECT ${ayahColumn} as unit, COUNT(*) as memorised
     FROM ayahs ay
     JOIN memorisation_items mi ON ay.surah = mi.surah AND ay.ayah_number = mi.ayah_number
     WHERE mi.state = 'review'
     GROUP BY ${ayahColumn}`
  );
  const memorisedByUnit = new Map(memorised.map((r) => [r.unit, r.memorised]));

  return totals.map((r) => ({ unit: r.unit, total: r.total, memorised: memorisedByUnit.get(r.unit) ?? 0 }));
}

export function getProgressByJuz(db: SQLite.SQLiteDatabase): Promise<UnitProgress[]> {
  return progressByColumn(db, 'juz');
}

export function getProgressBySurah(db: SQLite.SQLiteDatabase): Promise<UnitProgress[]> {
  return progressByColumn(db, 'surah');
}

export interface OverallProgress {
  totalAyahs: number;
  memorisedAyahs: number;
  percent: number;
}

export async function getOverallProgress(db: SQLite.SQLiteDatabase): Promise<OverallProgress> {
  const totalRow = await db.getFirstAsync<{ total: number }>('SELECT COUNT(*) as total FROM ayahs');
  const memorisedRow = await db.getFirstAsync<{ memorised: number }>(
    `SELECT COUNT(*) as memorised FROM memorisation_items WHERE state = 'review'`
  );
  const totalAyahs = totalRow?.total ?? 0;
  const memorisedAyahs = memorisedRow?.memorised ?? 0;
  return { totalAyahs, memorisedAyahs, percent: totalAyahs === 0 ? 0 : (memorisedAyahs / totalAyahs) * 100 };
}

export interface SessionProgress {
  sessionId: number;
  label: string;
  totalIntroduced: number;
  memorised: number;
  inLearningPhase: number;
}

/** Per-track progress — how far along each memorisation session is. */
export async function getProgressBySession(db: SQLite.SQLiteDatabase): Promise<SessionProgress[]> {
  const rows = await db.getAllAsync<{
    session_id: number;
    label: string;
    total_introduced: number;
    memorised: number;
    in_learning_phase: number;
  }>(
    `SELECT
       s.id as session_id,
       s.label as label,
       COUNT(mi.id) as total_introduced,
       SUM(CASE WHEN mi.state = 'review' THEN 1 ELSE 0 END) as memorised,
       SUM(CASE WHEN mi.state != 'review' THEN 1 ELSE 0 END) as in_learning_phase
     FROM memorisation_sessions s
     LEFT JOIN memorisation_items mi ON mi.session_id = s.id
     GROUP BY s.id
     ORDER BY s.created_at ASC`
  );
  return rows.map((r) => ({
    sessionId: r.session_id,
    label: r.label,
    totalIntroduced: r.total_introduced,
    memorised: r.memorised,
    inLearningPhase: r.in_learning_phase,
  }));
}
