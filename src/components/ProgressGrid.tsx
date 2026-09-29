import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { UnitProgress } from '../db/queries/progress';

function cellColor(fraction: number): string {
  if (fraction <= 0) return '#f5f5f4';
  if (fraction < 0.34) return '#ccfbf1';
  if (fraction < 0.67) return '#5eead4';
  if (fraction < 1) return '#14b8a6';
  return '#0f766e';
}

export function ProgressGrid({ data }: { data: UnitProgress[] }) {
  return (
    <View style={styles.grid}>
      {data.map((cell) => {
        const fraction = cell.total === 0 ? 0 : cell.memorised / cell.total;
        return (
          <View key={cell.unit} style={[styles.cell, { backgroundColor: cellColor(fraction) }]}>
            <Text style={[styles.cellText, fraction >= 0.67 && styles.cellTextLight]}>{cell.unit}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cell: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: { fontSize: 12, fontWeight: '700', color: '#44403c' },
  cellTextLight: { color: '#fff' },
});
