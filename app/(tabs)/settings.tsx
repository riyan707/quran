import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useDb } from '@/src/hooks/useDb';
import { getUserSettings, updateUserSettings, type UserSettings } from '@/src/db/queries/settings';
import { RECITERS } from '@/src/audio/reciters';
import { scheduleDailyReminder, cancelDailyReminder } from '@/src/notifications/reminders';
import type { UnitType } from '@/src/srs/chunking';

const UNIT_OPTIONS: { value: Exclude<UnitType, 'custom'>; label: string }[] = [
  { value: 'ayah', label: '1 Ayah' },
  { value: 'page_third', label: '1/3 Page' },
  { value: 'page_half', label: '1/2 Page' },
  { value: 'page', label: 'Full Page' },
];

export default function SettingsScreen() {
  const db = useDb();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [dailySize, setDailySize] = useState('1');
  const [reminderHour, setReminderHour] = useState('7');
  const [reminderMinute, setReminderMinute] = useState('0');

  const load = useCallback(() => {
    if (!db) return;
    getUserSettings(db).then((s) => {
      setSettings(s);
      setDailySize(String(s.dailyNewItemSize));
      if (s.notificationTime) {
        const [h, m] = s.notificationTime.split(':');
        setReminderHour(h);
        setReminderMinute(m);
      }
    });
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const persist = async (patch: Partial<UserSettings>) => {
    if (!db || !settings) return;
    await updateUserSettings(db, patch);
    setSettings({ ...settings, ...patch });
  };

  const handleDailySizeBlur = () => {
    const n = parseInt(dailySize, 10);
    if (Number.isFinite(n) && n > 0) {
      persist({ dailyNewItemSize: n });
    } else if (settings) {
      setDailySize(String(settings.dailyNewItemSize));
    }
  };

  const handleEnableReminder = async () => {
    const hour = Math.min(23, Math.max(0, parseInt(reminderHour, 10) || 0));
    const minute = Math.min(59, Math.max(0, parseInt(reminderMinute, 10) || 0));
    const ok = await scheduleDailyReminder(hour, minute);
    if (!ok) {
      Alert.alert('Permission needed', 'Enable notifications for Quran SRS in system settings to get reminders.');
      return;
    }
    await persist({ notificationTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` });
  };

  const handleDisableReminder = async () => {
    await cancelDailyReminder();
    await persist({ notificationTime: null });
  };

  if (!settings) {
    return <View style={styles.container} />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionLabel}>Daily New Items</Text>
      <View style={styles.optionsRow}>
        {UNIT_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => persist({ dailyNewItemUnit: opt.value })}
            style={[styles.option, settings.dailyNewItemUnit === opt.value && styles.optionSelected]}
          >
            <Text style={[styles.optionText, settings.dailyNewItemUnit === opt.value && styles.optionTextSelected]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={dailySize}
        onChangeText={setDailySize}
        onBlur={handleDailySizeBlur}
        keyboardType="number-pad"
        style={styles.numberInput}
      />

      <Text style={styles.sectionLabel}>Reciter</Text>
      {RECITERS.map((r) => (
        <Pressable key={r.id} style={styles.reciterRow} onPress={() => persist({ selectedReciter: r.id })}>
          <View style={[styles.radio, settings.selectedReciter === r.id && styles.radioSelected]} />
          <Text style={styles.reciterName}>{r.name}</Text>
        </Pressable>
      ))}

      <Text style={styles.sectionLabel}>Daily Reminder</Text>
      <View style={styles.reminderRow}>
        <TextInput
          value={reminderHour}
          onChangeText={setReminderHour}
          keyboardType="number-pad"
          style={styles.timeInput}
          placeholder="HH"
        />
        <Text style={styles.timeColon}>:</Text>
        <TextInput
          value={reminderMinute}
          onChangeText={setReminderMinute}
          keyboardType="number-pad"
          style={styles.timeInput}
          placeholder="MM"
        />
        <Pressable style={styles.reminderButton} onPress={handleEnableReminder}>
          <Text style={styles.reminderButtonText}>{settings.notificationTime ? 'Update' : 'Enable'}</Text>
        </Pressable>
      </View>
      {settings.notificationTime && (
        <>
          <Text style={styles.reminderStatus}>Reminder set for {settings.notificationTime}</Text>
          <Pressable onPress={handleDisableReminder}>
            <Text style={styles.disableLink}>Turn off reminder</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 8, paddingBottom: 60 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#78716c', marginTop: 20, textTransform: 'uppercase' },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  option: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#d6d3d1' },
  optionSelected: { backgroundColor: '#0f766e', borderColor: '#0f766e' },
  optionText: { fontSize: 14, color: '#1c1917', fontWeight: '500' },
  optionTextSelected: { color: '#fff' },
  numberInput: {
    borderWidth: 1,
    borderColor: '#d6d3d1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    marginTop: 8,
    width: 100,
  },
  reciterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: '#d6d3d1' },
  radioSelected: { backgroundColor: '#0f766e', borderColor: '#0f766e' },
  reciterName: { fontSize: 15, color: '#1c1917' },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  timeInput: {
    borderWidth: 1,
    borderColor: '#d6d3d1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    width: 56,
    textAlign: 'center',
  },
  timeColon: { fontSize: 18, fontWeight: '700' },
  reminderButton: { backgroundColor: '#0f766e', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 11 },
  reminderButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  reminderStatus: { fontSize: 13, color: '#78716c', marginTop: 8 },
  disableLink: { fontSize: 13, color: '#dc2626', fontWeight: '600', marginTop: 6 },
});
