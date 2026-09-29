import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { readTheme } from './theme';
import { ContentsIcon, SearchIcon, SettingsGearIcon } from './icons';

const FADE_MS = 220;

interface Props {
  visible: boolean;
  streakCount: number;
  onOpenContents: () => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
}

export function ReadTopBar({ visible, streakCount, onOpenContents, onOpenSearch, onOpenSettings }: Props) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: visible ? 1 : 0, duration: FADE_MS, useNativeDriver: true }).start();
  }, [visible, opacity]);

  return (
    <Animated.View
      pointerEvents={visible ? 'box-none' : 'none'}
      style={[styles.wrap, { opacity }]}
    >
      <BlurView intensity={40} tint="dark" style={[styles.blur, { paddingTop: insets.top }]}>
        <View style={styles.row}>
          <View style={styles.iconGroup}>
            <Pressable onPress={onOpenContents} hitSlop={10}>
              <ContentsIcon />
            </Pressable>
            <Pressable onPress={onOpenSearch} hitSlop={10}>
              <SearchIcon />
            </Pressable>
          </View>
          <View style={styles.iconGroup}>
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>{streakCount}</Text>
            </View>
            <Pressable onPress={onOpenSettings} hitSlop={10}>
              <SettingsGearIcon />
            </Pressable>
          </View>
        </View>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 6 },
  blur: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: readTheme.chromeBorder,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 14,
  },
  iconGroup: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  streakBadge: {
    minWidth: 34,
    height: 26,
    borderRadius: 8,
    backgroundColor: readTheme.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  streakText: { fontSize: 13, fontWeight: '700', color: readTheme.accentText },
});
