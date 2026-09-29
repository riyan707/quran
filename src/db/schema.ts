// Bumped whenever the memorisation-tracking tables change shape. Bumping this
// drops and recreates memorisation_sessions/memorisation_items/review_log
// (ayahs/surahs/user_settings are untouched and never destructively migrated).
export const CURRENT_SCHEMA_VERSION = 2;

export const BASE_SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS ayahs (
  surah INTEGER NOT NULL,
  ayah_number INTEGER NOT NULL,
  text_uthmani TEXT NOT NULL,
  juz INTEGER NOT NULL,
  page INTEGER NOT NULL,
  PRIMARY KEY (surah, ayah_number)
);

CREATE INDEX IF NOT EXISTS idx_ayahs_page ON ayahs(page);
CREATE INDEX IF NOT EXISTS idx_ayahs_juz ON ayahs(juz);

CREATE TABLE IF NOT EXISTS surahs (
  number INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  english_name TEXT NOT NULL,
  english_name_translation TEXT NOT NULL,
  revelation_type TEXT NOT NULL,
  ayah_count INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  daily_new_item_size INTEGER NOT NULL DEFAULT 1,
  daily_new_item_unit TEXT NOT NULL DEFAULT 'ayah',
  selected_reciter TEXT NOT NULL DEFAULT 'alafasy',
  notification_time TEXT,
  streak_count INTEGER NOT NULL DEFAULT 0,
  last_review_date TEXT
);

INSERT OR IGNORE INTO user_settings (id) VALUES (1);
`;

// A "session" is one memorisation track — a starting point plus a chunk
// size/pace. Multiple sessions can be active at once (e.g. Juz Amma daily
// alongside a slow Al-Baqarah track); the daily review queue pools every
// track's due items together regardless of which session they belong to.
// `next_surah`/`next_ayah` is the cursor for where that track's next
// "introduce new ayahs" batch should start from.
export const MEMORISATION_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS memorisation_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  unit_type TEXT NOT NULL CHECK (unit_type IN ('ayah','page_third','page_half','page','custom')),
  daily_new_item_size INTEGER NOT NULL DEFAULT 1,
  next_surah INTEGER NOT NULL,
  next_ayah INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One row per ayah, always — FSRS schedules each ayah independently even
-- when a whole page was introduced together in one learning-phase sitting.
CREATE TABLE IF NOT EXISTS memorisation_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES memorisation_sessions(id) ON DELETE CASCADE,
  surah INTEGER NOT NULL,
  ayah_number INTEGER NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('new','learning','review','relearning')),
  due_date TEXT NOT NULL,
  stability REAL NOT NULL DEFAULT 0,
  difficulty REAL NOT NULL DEFAULT 0,
  elapsed_days REAL NOT NULL DEFAULT 0,
  scheduled_days REAL NOT NULL DEFAULT 0,
  learning_steps INTEGER NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  last_review_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (surah, ayah_number)
);

CREATE INDEX IF NOT EXISTS idx_memorisation_items_due ON memorisation_items(due_date);
CREATE INDEX IF NOT EXISTS idx_memorisation_items_state ON memorisation_items(state);
CREATE INDEX IF NOT EXISTS idx_memorisation_items_session ON memorisation_items(session_id);

CREATE TABLE IF NOT EXISTS review_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES memorisation_items(id) ON DELETE CASCADE,
  reviewed_at TEXT NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('again','hard','good','easy')),
  state_before TEXT NOT NULL,
  state_after TEXT NOT NULL,
  due_after TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_review_log_item ON review_log(item_id);
`;

const DROP_MEMORISATION_SCHEMA_SQL = `
DROP TABLE IF EXISTS review_log;
DROP TABLE IF EXISTS memorisation_items;
DROP TABLE IF EXISTS memorisation_sessions;
`;

export async function runMigrations(db: {
  execAsync: (sql: string) => Promise<unknown>;
  getFirstAsync: <T>(sql: string) => Promise<T | null>;
}): Promise<void> {
  await db.execAsync(BASE_SCHEMA_SQL);

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;

  if (version < CURRENT_SCHEMA_VERSION) {
    await db.execAsync(DROP_MEMORISATION_SCHEMA_SQL);
    await db.execAsync(MEMORISATION_SCHEMA_SQL);
    await db.execAsync(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION}`);
  } else {
    await db.execAsync(MEMORISATION_SCHEMA_SQL);
  }
}
