import type * as SQLite from 'expo-sqlite';
import type { UnitType } from '../../srs/chunking';

export interface UserSettings {
  dailyNewItemSize: number;
  dailyNewItemUnit: UnitType;
  selectedReciter: string;
  notificationTime: string | null;
  streakCount: number;
  lastReviewDate: string | null;
}

interface UserSettingsRow {
  daily_new_item_size: number;
  daily_new_item_unit: UnitType;
  selected_reciter: string;
  notification_time: string | null;
  streak_count: number;
  last_review_date: string | null;
}

function mapRow(row: UserSettingsRow): UserSettings {
  return {
    dailyNewItemSize: row.daily_new_item_size,
    dailyNewItemUnit: row.daily_new_item_unit,
    selectedReciter: row.selected_reciter,
    notificationTime: row.notification_time,
    streakCount: row.streak_count,
    lastReviewDate: row.last_review_date,
  };
}

export async function getUserSettings(db: SQLite.SQLiteDatabase): Promise<UserSettings> {
  const row = await db.getFirstAsync<UserSettingsRow>('SELECT * FROM user_settings WHERE id = 1');
  if (!row) {
    throw new Error('user_settings row missing — schema init should have inserted the default row');
  }
  return mapRow(row);
}

export async function updateUserSettings(
  db: SQLite.SQLiteDatabase,
  patch: Partial<Pick<UserSettings, 'dailyNewItemSize' | 'dailyNewItemUnit' | 'selectedReciter' | 'notificationTime'>>
): Promise<void> {
  const current = await getUserSettings(db);
  const next = { ...current, ...patch };
  await db.runAsync(
    `UPDATE user_settings
     SET daily_new_item_size = $size, daily_new_item_unit = $unit, selected_reciter = $reciter, notification_time = $notifTime
     WHERE id = 1`,
    {
      $size: next.dailyNewItemSize,
      $unit: next.dailyNewItemUnit,
      $reciter: next.selectedReciter,
      $notifTime: next.notificationTime,
    }
  );
}

function toDateOnly(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Call once when the user completes at least one review for the day.
 * Consecutive calendar days extend the streak; a gap resets it to 1;
 * a repeat call on the same day is a no-op.
 */
export async function recordReviewForStreak(
  db: SQLite.SQLiteDatabase,
  now: Date = new Date()
): Promise<UserSettings> {
  const current = await getUserSettings(db);
  const today = toDateOnly(now.toISOString());

  if (current.lastReviewDate === today) {
    return current;
  }

  const yesterday = toDateOnly(new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());
  const nextStreak = current.lastReviewDate === yesterday ? current.streakCount + 1 : 1;

  await db.runAsync('UPDATE user_settings SET streak_count = $streak, last_review_date = $today WHERE id = 1', {
    $streak: nextStreak,
    $today: today,
  });

  return { ...current, streakCount: nextStreak, lastReviewDate: today };
}
