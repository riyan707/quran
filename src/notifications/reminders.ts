import * as Notifications from 'expo-notifications';

/** Requests permission if needed, then replaces any existing reminder with a daily one at hour:minute (local time). */
export async function scheduleDailyReminder(hour: number, minute: number): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let granted = existingStatus === 'granted';
  if (!granted) {
    const { status } = await Notifications.requestPermissionsAsync();
    granted = status === 'granted';
  }
  if (!granted) return false;

  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Quran SRS', body: 'Time for your daily review.' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
  });
  return true;
}

export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
