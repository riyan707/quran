import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { readTheme } from './theme';
import { ChevronDownIcon, PauseIcon, PlayIcon } from './icons';

const FADE_MS = 220;

interface Props {
  visible: boolean;
  reciter: string;
  playing: boolean;
  onTogglePlay: () => void;
  onOpenReciterPicker: () => void;
}

/**
 * Docked reciter mini-player: a pill (reciter name, opens the reciter
 * picker) plus a visually separate circular play/pause button. UI only for
 * now — no real playback is wired up yet.
 */
export function ReadMiniPlayer({ visible, reciter, playing, onTogglePlay, onOpenReciterPicker }: Props) {
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: visible ? 1 : 0, duration: FADE_MS, useNativeDriver: true }).start();
  }, [visible, opacity]);

  return (
    <Animated.View pointerEvents={visible ? 'box-none' : 'none'} style={[styles.wrap, { opacity }]}>
      <BlurView intensity={40} tint="dark" style={styles.pill}>
        <Pressable style={styles.reciterZone} onPress={onOpenReciterPicker} hitSlop={8}>
          <Text style={styles.reciterText}>{reciter}</Text>
          <ChevronDownIcon />
        </Pressable>
        <Pressable style={styles.playButton} onPress={onTogglePlay} hitSlop={8}>
          {playing ? <PauseIcon /> : <PlayIcon />}
        </Pressable>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 96, zIndex: 6, alignItems: 'center' },
  pill: {
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: readTheme.pillBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingLeft: 14,
    paddingRight: 6,
    overflow: 'hidden',
  },
  reciterZone: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reciterText: { fontSize: 13, fontWeight: '600', color: readTheme.accent },
  playButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: readTheme.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
