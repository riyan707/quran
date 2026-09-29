import React from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Surah } from '../db/queries/ayahs';

interface Props {
  visible: boolean;
  surahs: Surah[];
  onSelect: (surah: Surah) => void;
  onClose: () => void;
}

export function SurahPickerModal({ visible, surahs, onSelect, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.header}>
        <Text style={styles.title}>Surahs</Text>
        <Pressable onPress={onClose} hitSlop={12}>
          <Text style={styles.close}>Close</Text>
        </Pressable>
      </View>
      <FlatList
        data={surahs}
        keyExtractor={(s) => String(s.number)}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => onSelect(item)}>
            <View style={styles.numberBadge}>
              <Text style={styles.numberText}>{item.number}</Text>
            </View>
            <View style={styles.textCol}>
              <Text style={styles.englishName}>{item.englishName}</Text>
              <Text style={styles.meta}>
                {item.englishNameTranslation} · {item.ayahCount} ayahs
              </Text>
            </View>
            <Text style={styles.arabicName}>{item.name}</Text>
          </Pressable>
        )}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '700' },
  close: { fontSize: 15, color: '#0f766e', fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
  },
  numberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0fdfa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: { fontSize: 12, color: '#0f766e', fontWeight: '700' },
  textCol: { flex: 1 },
  englishName: { fontSize: 15, fontWeight: '600', color: '#1c1917' },
  meta: { fontSize: 12, color: '#78716c', marginTop: 2 },
  arabicName: { fontSize: 18, color: '#1c1917' },
});
