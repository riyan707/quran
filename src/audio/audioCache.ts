import * as FileSystem from 'expo-file-system/legacy';
import { getReciterAudioUrl } from './reciters';

const AUDIO_DIR = `${FileSystem.cacheDirectory}ayah-audio/`;

async function ensureAudioDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(AUDIO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(AUDIO_DIR, { intermediates: true });
  }
}

/**
 * Returns a local file:// URI for a reciter's ayah recording, downloading
 * and caching it on first request so repeat reviews play instantly offline.
 *
 * Uses the `expo-file-system/legacy` API deliberately — it's stable across
 * the Expo SDK versions this app needs to run on (Expo Go pins to whatever
 * SDK the installed client supports), unlike the newer File/Directory API.
 */
export async function getLocalAyahAudioUri(reciterId: string, surah: number, ayah: number): Promise<string> {
  await ensureAudioDir();
  const localUri = `${AUDIO_DIR}${reciterId}-${surah}-${ayah}.mp3`;
  const info = await FileSystem.getInfoAsync(localUri);
  if (info.exists) {
    return localUri;
  }
  const remoteUrl = getReciterAudioUrl(reciterId, surah, ayah);
  const result = await FileSystem.downloadAsync(remoteUrl, localUri);
  return result.uri;
}
