import { Audio, AVPlaybackStatus } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { VoiceGuidanceService } from './voiceGuidance';
import { Language } from '@haq/shared';

export interface PlaybackCallbacks {
  onStart?: () => void;
  onFinish?: () => void;
  onError?: (err: Error) => void;
  onProgress?: (positionMs: number, durationMs: number) => void;
}

/**
 * Native Audio Playback Service for Sarvam bulbul:v3 TTS Audio.
 * Uses native Audio.Sound with cached file streaming and automatic resource release.
 */
export class VoicePlaybackService {
  private static activeSound: Audio.Sound | null = null;
  private static activeCacheUri: string | null = null;
  private static currentPlayingId: string | null = null;

  /**
   * Plays real base64 WAV audio synthesized by Sarvam TTS.
   * If audioBase64 is unavailable or fails, gracefully falls back to VoiceGuidanceService (OS TTS)
   * while transparently reporting the fallback source.
   */
  static async playAudio(params: {
    id: string;
    audioBase64?: string;
    textFallback?: string;
    language?: Language;
    callbacks?: PlaybackCallbacks;
  }): Promise<{ source: 'SARVAM_NATIVE' | 'OS_FALLBACK' }> {
    const { id, audioBase64, textFallback, language = 'mr', callbacks } = params;

    // 1. Stop any currently active playback
    await this.stop();

    // 2. If genuine Sarvam audioBase64 is provided, play via Audio.Sound
    if (audioBase64 && audioBase64.trim() !== '') {
      try {
        const cleanBase64 = audioBase64.replace(/^data:audio\/\w+;base64,/, '');

        // Write to local temporary WAV file for 100% reliable MediaPlayer playback
        const tempPath = `${FileSystem.cacheDirectory}sarvam_${Date.now()}.wav`;
        await FileSystem.writeAsStringAsync(tempPath, cleanBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        this.activeCacheUri = tempPath;

        // Configure audio mode for clean media output
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        const sound = new Audio.Sound();
        this.activeSound = sound;
        this.currentPlayingId = id;

        sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
          if (!status.isLoaded) {
            if (status.error) {
              console.warn('[VoicePlaybackService] Status error:', status.error);
              callbacks?.onError?.(new Error(status.error));
              this.cleanup();
            }
            return;
          }

          if (status.isPlaying && status.positionMillis !== undefined && status.durationMillis !== undefined) {
            callbacks?.onProgress?.(status.positionMillis, status.durationMillis);
          }

          if (status.didJustFinish) {
            callbacks?.onFinish?.();
            this.cleanup();
          }
        });

        await sound.loadAsync(
          { uri: tempPath },
          { shouldPlay: true, volume: 1.0 }
        );

        callbacks?.onStart?.();
        return { source: 'SARVAM_NATIVE' };
      } catch (err: any) {
        console.warn('[VoicePlaybackService] Sarvam audio playback failed, trying OS fallback:', err?.message || err);
        await this.cleanup();
      }
    }

    // 3. Fallback: OS TTS using VoiceGuidanceService
    if (textFallback && textFallback.trim() !== '') {
      this.currentPlayingId = id;
      callbacks?.onStart?.();

      await VoiceGuidanceService.speak(textFallback, language, {
        onDone: () => {
          this.currentPlayingId = null;
          callbacks?.onFinish?.();
        },
        onError: () => {
          this.currentPlayingId = null;
          callbacks?.onError?.(new Error('OS TTS playback failed'));
        },
      });

      return { source: 'OS_FALLBACK' };
    }

    throw new Error('NO_AUDIO_OR_TEXT_FOR_PLAYBACK');
  }

  /**
   * Stops active audio playback and releases resources.
   */
  static async stop(): Promise<void> {
    // Stop OS speech engine if running
    await VoiceGuidanceService.stop();

    if (this.activeSound) {
      try {
        const status = await this.activeSound.getStatusAsync();
        if (status.isLoaded) {
          await this.activeSound.stopAsync();
          await this.activeSound.unloadAsync();
        }
      } catch (err) {
        console.warn('[VoicePlaybackService] Stop warning:', err);
      }
    }

    await this.cleanup();
  }

  /**
   * Internal cleanup of temporary sound and cached audio files.
   */
  private static async cleanup(): Promise<void> {
    this.activeSound = null;
    this.currentPlayingId = null;

    if (this.activeCacheUri) {
      const uriToDelete = this.activeCacheUri;
      this.activeCacheUri = null;
      try {
        const info = await FileSystem.getInfoAsync(uriToDelete);
        if (info.exists) {
          await FileSystem.deleteAsync(uriToDelete, { idempotent: true });
        }
      } catch (e) {
        console.warn('[VoicePlaybackService] File cleanup error:', e);
      }
    }
  }

  /**
   * Returns ID of currently playing message, or null if idle.
   */
  static getCurrentPlayingId(): string | null {
    return this.currentPlayingId;
  }

  /**
   * Returns true if audio is actively playing.
   */
  static isPlaying(): boolean {
    return this.currentPlayingId !== null;
  }
}
