import { useCallback, useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import { getLocalAyahAudioUri } from './audioCache';

let audioModeConfigured = false;
function ensureAudioMode() {
  if (audioModeConfigured) return;
  audioModeConfigured = true;
  Audio.setAudioModeAsync({ playsInSilentModeIOS: true }).catch(() => {});
}

export type PlaybackState = 'idle' | 'loading' | 'playing' | 'error';

export function useAyahAudio(reciterId: string, surah: number, ayah: number) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [state, setState] = useState<PlaybackState>('idle');

  useEffect(() => {
    ensureAudioMode();
    setState('idle');
    return () => {
      soundRef.current?.unloadAsync();
      soundRef.current = null;
    };
  }, [reciterId, surah, ayah]);

  const play = useCallback(async () => {
    try {
      setState('loading');
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      const uri = await getLocalAyahAudioUri(reciterId, surah, ayah);
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      soundRef.current = sound;
      setState('playing');
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setState('idle');
        }
      });
    } catch {
      setState('error');
    }
  }, [reciterId, surah, ayah]);

  const stop = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      setState('idle');
    }
  }, []);

  return { state, play, stop };
}
